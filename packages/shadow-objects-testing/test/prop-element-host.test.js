import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import {findElementsById} from '../src/findElementsById.js';
import {mount, unmountAll} from '../src/mount.js';
import {render} from '../src/render.js';

/**
 * A `<shae-prop>` asks for the entity above it and takes the first one that answers. Only a
 * `<shae-ent>` answers such a request — a `<shae-prop>` in between passes it on, and the flag
 * `isShaeEntElement` keeps meaning "this is a `<shae-ent>`" and nothing else.
 */
describe('shae-prop host lookup', () => {
  beforeEach(async () => {
    render(`
      <shae-ent id="host" token="host">
        <shae-prop id="outer" name="outer" value="1">
          <shae-prop id="inner" name="inner" value="2"></shae-prop>
        </shae-prop>
      </shae-ent>
    `);

    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('does not identify itself as an entity element', () => {
    const [outer] = findElementsById('outer');

    expect(outer.isShaePropElement).to.be.true;
    expect(outer.isShaeEntElement).to.be.undefined;
  });

  // Mutation that turns this red: give `ShaePropElement` a `shaeRequestEntParent` listener that
  // calls `answer(this)` — the inner prop then binds to the outer one instead of to the entity.
  it('walks past a nested shae-prop to the real host entity', () => {
    const [host, outer, inner] = findElementsById('host', 'outer', 'inner');

    expect(outer.entNode).to.equal(host);
    expect(inner.entNode, 'the inner prop must not mistake the outer prop for its host').to.equal(host);
  });
});

/**
 * The host of a `<shae-prop>` is the closest entity above it in the flattened tree — the tree the
 * user sees, with shadow roots opened up and slotted content sitting where it is projected to.
 *
 * These cases run in real Chromium because every one of them stands on a mechanism happy-dom does
 * not reproduce: shadow roots, slot assignment, and closed boundaries that hide their content from
 * every node reference the outside holds.
 *
 * Assertions go through `entNode?.id`, never through element identity: in the red state the
 * message then names two ids instead of two serialized elements.
 */

/**
 * The element decides one microtask after `disconnectedCallback` whether it really left the tree,
 * and the environments sync on a microtask of their own. One turn of the task queue covers both.
 */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The property list of the change-properties entry for `uuid`, or `undefined` if there is none. */
const propsOf = (trail, uuid) =>
  trail.find((entry) => entry.type === ComponentChangeType.ChangeProperties && entry.uuid === uuid)?.properties;

describe('shae-prop host lookup across shadow boundaries', () => {
  afterEach(() => {
    unmountAll();
  });

  it('binds to the entity around its shadow host', async () => {
    const container = mount('<shae-ent id="sr-host" token="host"><div id="sr-div"></div></shae-ent>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#sr-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-prop id="sr-prop" name="inside" value="42"></shae-prop>';

    const prop = shadowRoot.getElementById('sr-prop');

    expect(prop.entNode?.id).to.equal('sr-host');
  });

  it('binds to the entity that holds the slot it is projected into', async () => {
    const container = mount('<shae-ent id="sp-outer" token="outer"><div id="sp-div"></div></shae-ent>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const div = container.querySelector('#sp-div');
    const shadowRoot = div.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="sp-inner" token="inner"><slot></slot></shae-ent>';

    // the slot stands before the element that gets projected into it: the assignment is then in
    // place the moment the element connects
    div.insertAdjacentHTML('beforeend', '<shae-prop id="sp-prop" name="inside" value="42"></shae-prop>');

    const prop = container.querySelector('#sp-prop');

    expect(prop.entNode?.id).to.equal('sp-inner');
  });

  it('binds across a closed shadow boundary', async () => {
    const container = mount('<shae-ent id="cp-outer" token="outer"><div id="cp-div"></div></shae-ent>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const div = container.querySelector('#cp-div');
    // the return value of `attachShadow` is the only handle on a closed root — `div.shadowRoot`
    // stays `null` for it, which is the whole point of the mode
    const shadowRoot = div.attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = '<shae-ent id="cp-inner" token="inner"><slot></slot></shae-ent>';

    div.insertAdjacentHTML('beforeend', '<shae-prop id="cp-prop" name="inside" value="42"></shae-prop>');

    const prop = container.querySelector('#cp-prop');

    expect(prop.entNode?.id).to.equal('cp-inner');
  });

  it('lets go of its host when it moves to a place with no entity above it', async () => {
    const container = mount(`
      <shae-ent id="hl-host" ns="ns-9a-hl" token="host">
        <shae-prop id="hl-prop" name="x" value="7" type="number"></shae-prop>
      </shae-ent>
      <div id="hl-elsewhere"></div>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const ent = container.querySelector('#hl-host');
    const prop = container.querySelector('#hl-prop');
    const ctx = ComponentContext.get('ns-9a-hl');

    // the first trail creates the entity, so the property sits in a `CreateEntities` entry here
    const created = ctx.buildChangeTrails().find((entry) => entry.uuid === ent.uuid);
    expect(created?.properties, 'the property starts out on the entity').to.deep.equal([['x', 7]]);

    container.querySelector('#hl-elsewhere').append(prop);
    await nextTask();

    expect(prop.entNode?.id, 'nothing above it answers, so it has no host').to.be.undefined;
    expect(propsOf(ctx.buildChangeTrails(), ent.uuid), 'and the entity it left loses the property').to.deep.equal([
      ['x', undefined],
    ]);

    prop.value = 42;
    await nextTask();

    expect(ctx.buildChangeTrails(), 'a value written from there reaches nothing at all').to.have.lengthOf(0);
  });

  // A property belongs to the closest entity, whatever namespace that entity is in.
  // Mutation that turns this red: give the host request of `ShaePropElement` an `ns` of its own
  // (`ns: GlobalNS`) — `ns-inner` then skips the request and the outer entity answers instead.
  it('the nearest entity answers, regardless of its namespace', async () => {
    const container = mount(`
      <shae-ent id="ns-outer" token="outer">
        <shae-ent id="ns-inner" ns="ns-9a" token="inner">
          <shae-prop id="ns-prop" name="inside" value="42"></shae-prop>
        </shae-ent>
      </shae-ent>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const prop = container.querySelector('#ns-prop');

    expect(prop.entNode?.id).to.equal('ns-inner');
  });
});