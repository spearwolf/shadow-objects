import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * A `<shae-prop>` binds a property to the entity above it. This spec pins what happens when that
 * binding ends: the element leaves the tree, its `name` changes, or it moves to another entity.
 *
 * It runs in real Chromium, because the answer depends on custom element reactions in their
 * specified order — `disconnectedCallback` runs synchronously and before the microtask checkpoint
 * that decides whether the element is gone for good or only on its way to another parent.
 *
 * Two surfaces are read, and each is read once. The change trail is where the mechanism shows: it
 * says how the property leaves, in the shape the wire carries. The kernel of a local environment is
 * where the result shows: it says that the shadow object no longer has it. A case that only reads
 * the result would stay green for a repair that produced it some other way.
 *
 * Every case brings its own ids and its own namespace, so the file does not depend on the order its
 * cases run in.
 */

/**
 * The element decides whether it really left the tree one microtask after `disconnectedCallback`,
 * and the environments sync on a microtask of their own. One turn of the task queue covers both.
 */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The property list of the change-properties entry for `uuid`, or `undefined` if there is none. */
const propsOf = (trail, uuid) =>
  trail.find((entry) => entry.type === ComponentChangeType.ChangeProperties && entry.uuid === uuid)?.properties;

/** The property list the entity would be created with right now — its state, not its last trail. */
const stateOf = (ctx, uuid) => {
  ctx.reCreateChanges();
  const trail = ctx.buildChangeTrails();
  return trail.find((entry) => entry.type === ComponentChangeType.CreateEntities && entry.uuid === uuid)?.properties;
};

/** The same state as an object, for the cases that ask what an entity holds and not in which order. */
const stateMapOf = (ctx, uuid) => Object.fromEntries(stateOf(ctx, uuid) ?? []);

afterEach(() => {
  unmountAll();
});

describe('shae-prop and the end of its binding', () => {
  it('removing the element writes the removal into the change trail', async () => {
    const container = mount(
      '<shae-ent id="e-pl1" ns="pl-1" token="probe"><shae-prop id="x-pl1" name="x" value="7" type="number"></shae-prop></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pl1');
    const ctx = ComponentContext.get('pl-1');

    const first = ctx.buildChangeTrails();
    expect(first.find((entry) => entry.uuid === ent.uuid)?.properties, 'the property arrives first').to.deep.equal([['x', 7]]);

    container.querySelector('#x-pl1').remove();
    await nextTask();

    const trail = ctx.buildChangeTrails();

    expect(trail, 'the removal is the only thing the trail carries').to.have.lengthOf(1);
    expect(trail[0], 'and it has the shape removeProperty() produces').to.deep.equal({
      type: ComponentChangeType.ChangeProperties,
      uuid: ent.uuid,
      properties: [['x', undefined]],
    });
  });

  it('the property is gone from the state the change trail left behind', async () => {
    const container = mount(
      '<shae-ent id="e-pl2" ns="pl-2" token="probe"><shae-prop id="x-pl2" name="x" value="7" type="number"></shae-prop></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pl2');
    const ctx = ComponentContext.get('pl-2');

    ctx.buildChangeTrails();

    container.querySelector('#x-pl2').remove();
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateOf(ctx, ent.uuid), 'an entity recreated from this context carries no x').to.deep.equal(undefined);
  });

  it('the shadow object loses the property', async () => {
    const container = mount(
      '<shae-worker id="env-pl3" local auto-sync="off" ns="pl-3"></shae-worker>' +
        '<shae-ent id="e-pl3" ns="pl-3" token="probe"><shae-prop id="x-pl3" name="x" value="7" type="number"></shae-prop></shae-ent>',
    );
    await Promise.all(['shae-worker', 'shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const env = container.querySelector('#env-pl3');
    const ent = container.querySelector('#e-pl3');

    await env.shadowEnv.ready();
    await env.shadowEnv.syncWait();

    const kernel = env.shadowEnv.envProxy.kernel;

    expect(kernel.getEntity(ent.uuid).getProperty('x'), 'the shadow object has it before').to.equal(7);

    container.querySelector('#x-pl3').remove();
    await nextTask();
    await env.shadowEnv.syncWait();

    // the entity keeps a signal per key it has ever seen, so that a reader handed out for `x`
    // keeps working. "The shadow object lost the property" is therefore an `x` that reads
    // undefined — the key stays visible in `propKeys()` and `propEntries()`, without a value
    expect(kernel.getEntity(ent.uuid).getProperty('x'), 'and nothing after').to.be.undefined;
    expect(kernel.getEntity(ent.uuid).propEntries(), 'the key survives its value').to.deep.equal([['x', undefined]]);
  });

  it('renaming the element takes the old property with it', async () => {
    const container = mount(
      '<shae-ent id="e-pl4" ns="pl-4" token="probe"><shae-prop id="x-pl4" name="x" value="7" type="number"></shae-prop></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pl4');
    const ctx = ComponentContext.get('pl-4');

    ctx.buildChangeTrails();

    container.querySelector('#x-pl4').setAttribute('name', 'y');
    await nextTask();

    expect(propsOf(ctx.buildChangeTrails(), ent.uuid), 'the name it left is cleared before the new one is set').to.deep.equal([
      ['x', undefined],
      ['y', 7],
    ]);
  });

  it('moving the element to another entity clears the property on the entity it left', async () => {
    const container = mount(
      '<shae-ent id="a-pl5" ns="pl-5" token="probe"><shae-prop id="x-pl5" name="x" value="7" type="number"></shae-prop></shae-ent>' +
        '<shae-ent id="b-pl5" ns="pl-5" token="probe"></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const a = container.querySelector('#a-pl5');
    const ctx = ComponentContext.get('pl-5');

    ctx.buildChangeTrails();

    container.querySelector('#b-pl5').append(container.querySelector('#x-pl5'));
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateOf(ctx, a.uuid), 'the entity it left holds nothing anymore').to.deep.equal(undefined);
  });

  it('a second element declaring the same name keeps the property alive', async () => {
    // a property belongs to the entity, and two elements may declare the same name. The last one
    // to write wins the value; the property is gone only once the last of them lets go
    const container = mount(
      '<shae-ent id="e-pl9" ns="pl-9" token="probe">' +
        '<shae-prop id="a-pl9" name="x" value="1" type="number"></shae-prop>' +
        '<shae-prop id="b-pl9" name="x" value="2" type="number"></shae-prop>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pl9');
    const ctx = ComponentContext.get('pl-9');

    ctx.buildChangeTrails();

    container.querySelector('#a-pl9').remove();
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateMapOf(ctx, ent.uuid), 'the element still there goes on declaring it').to.deep.equal({x: 2});
  });

  it('renaming one of two elements leaves the name to the other', async () => {
    const container = mount(
      '<shae-ent id="e-pla" ns="pl-a" token="probe">' +
        '<shae-prop id="a-pla" name="x" value="1" type="number"></shae-prop>' +
        '<shae-prop id="b-pla" name="x" value="2" type="number"></shae-prop>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pla');
    const ctx = ComponentContext.get('pl-a');

    ctx.buildChangeTrails();

    container.querySelector('#a-pla').setAttribute('name', 'y');
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateMapOf(ctx, ent.uuid), 'the old name stays with its remaining declarant').to.deep.equal({x: 2, y: 1});
  });

  it('moving one of two elements away leaves the name to the other', async () => {
    const container = mount(
      '<shae-ent id="a-plb" ns="pl-b" token="probe">' +
        '<shae-prop id="p1-plb" name="x" value="1" type="number"></shae-prop>' +
        '<shae-prop id="p2-plb" name="x" value="2" type="number"></shae-prop>' +
        '</shae-ent>' +
        '<shae-ent id="b-plb" ns="pl-b" token="probe"></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const a = container.querySelector('#a-plb');
    const b = container.querySelector('#b-plb');
    const ctx = ComponentContext.get('pl-b');

    ctx.buildChangeTrails();

    b.append(container.querySelector('#p1-plb'));
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateMapOf(ctx, a.uuid), 'the entity it left keeps what the other one declares').to.deep.equal({x: 2});
    expect(stateMapOf(ctx, b.uuid), 'and the entity it reaches gets the value it carries').to.deep.equal({x: 1});
  });

  it('a move inside the same entity keeps the property', async () => {
    // `append` takes the element out and puts it back under the same host in one tick. Neither
    // `entNode$` nor `name$` moves, so nothing rewrites the value afterwards — anything that
    // clears the property on the way out leaves it cleared, with nothing left to restore it
    const container = mount(
      '<shae-ent id="e-pld" ns="pl-d" token="probe">' +
        '<shae-prop id="x-pld" name="x" value="7" type="number"></shae-prop>' +
        '<span id="pin-pld"></span>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pld');
    const ctx = ComponentContext.get('pl-d');

    ctx.buildChangeTrails();

    ent.append(container.querySelector('#x-pld'));
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateMapOf(ctx, ent.uuid), 'the property is where it was').to.deep.equal({x: 7});
  });

  // the counterpart of `moving the element to another entity clears the property on the entity it
  // left`: together the two say where the property is after a move. On its own this one is hard to
  // break — the value effect rewrites the property on the entity the element reaches whatever the
  // binding effect did before it, so it survives every single-step mistake in the cleanup. Its
  // sharper sibling is `moving one of two elements away leaves the name to the other`, which reads
  // both entities at once
  it('a move to another entity leaves the property with the entity it arrives at', async () => {
    const container = mount(
      '<shae-ent id="a-pl6" ns="pl-6" token="probe"><shae-prop id="x-pl6" name="x" value="7" type="number"></shae-prop></shae-ent>' +
        '<shae-ent id="b-pl6" ns="pl-6" token="probe"></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const b = container.querySelector('#b-pl6');
    const ctx = ComponentContext.get('pl-6');

    ctx.buildChangeTrails();

    b.append(container.querySelector('#x-pl6'));
    await nextTask();

    ctx.buildChangeTrails();

    expect(stateOf(ctx, b.uuid), 'the entity it arrives at has it').to.deep.equal([['x', 7]]);
  });

  it('removing the whole entity leaves the destruction as the only change', async () => {
    // the entity is destroyed and takes its properties with it, so the trail carries the
    // destruction and nothing else.
    //
    // This case cannot rule out an over-eager cleanup on the element side, and does not claim to:
    // `ShaeEntElement.disconnectedCallback` clears the component context synchronously, ahead of
    // the reaction on the child, so by the time any code in `<shae-prop>` runs the view component
    // has no context left and `removeProperty` cannot reach a trail whatever it does. What holds
    // that promise is `removeProperty on a destroyed component writes nothing` in
    // `view-component-context-switch.test.js`, where the call can be made at the one moment it
    // would still land
    const container = mount(
      '<shae-ent id="e-pl7" ns="pl-7" token="probe"><shae-prop id="x-pl7" name="x" value="7" type="number"></shae-prop></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pl7');
    const uuid = ent.uuid;
    const ctx = ComponentContext.get('pl-7');

    ctx.buildChangeTrails();

    ent.remove();
    await nextTask();

    const trail = ctx.buildChangeTrails();

    expect(propsOf(trail, uuid), 'no property change accompanies the destruction').to.be.undefined;
    expect(
      trail.map((entry) => entry.type),
      'the destruction is all there is',
    ).to.deep.equal([ComponentChangeType.DestroyEntities]);
  });

  it('a property that never reached a trail leaves nothing behind', async () => {
    // arriving and leaving between two trails cancel each other out: nobody on the other side ever
    // heard of this property, so announcing its removal would be an update about nothing
    const container = mount('<shae-ent id="e-pl8" ns="pl-8" token="probe"></shae-ent>');
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-pl8');
    const ctx = ComponentContext.get('pl-8');

    ctx.buildChangeTrails();

    ent.insertAdjacentHTML('beforeend', '<shae-prop id="x-pl8" name="x" value="7" type="number"></shae-prop>');
    container.querySelector('#x-pl8').remove();
    await nextTask();

    expect(ctx.buildChangeTrails(), 'nothing reaches the trail').to.deep.equal([]);
    expect(stateOf(ctx, ent.uuid), 'and the entity holds nothing either').to.be.undefined;
  });

  it('an element without a name declares nothing and takes nothing back', async () => {
    const container = mount(
      '<shae-ent id="e-plc" ns="pl-c" token="probe">' +
        '<shae-prop id="named-plc" name="x" value="7" type="number"></shae-prop>' +
        '<shae-prop id="bare-plc" value="9"></shae-prop>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const ent = container.querySelector('#e-plc');
    const ctx = ComponentContext.get('pl-c');

    ctx.buildChangeTrails();

    container.querySelector('#bare-plc').remove();
    await nextTask();

    expect(ctx.buildChangeTrails(), 'nothing reaches the trail').to.deep.equal([]);
    expect(stateMapOf(ctx, ent.uuid), 'and the property beside it is untouched').to.deep.equal({x: 7});
  });
});