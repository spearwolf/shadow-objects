import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, VoidToken} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('change props', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="no" id="localEnv"></shae-worker>

      <shae-ent id="a" token="a"></shae-ent>
      <shae-ent id="b"></shae-ent>
    `);

    await Promise.all([customElements.whenDefined('shae-ent'), customElements.whenDefined('shae-worker')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('works as expected', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    await localEnv.start();

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', 666);
    b.viewComponent.setProperty('xyz', [1, 2, 3]);

    let changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail:before').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
        properties: [
          ['foo', 'bar'],
          ['plah', 666],
        ],
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: VoidToken,
        properties: [['xyz', [1, 2, 3]]],
      },
    ]);

    // ---

    a.viewComponent.setProperty('plah', 999);
    a.viewComponent.setProperty('null', null);
    b.viewComponent.removeProperty('xyz');
    b.viewComponent.removeProperty('gibsnich');

    changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail:after').to.deep.equal([
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [
          ['plah', 999],
          ['null', null],
        ],
      },
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: b.uuid,
        properties: [['xyz', undefined]],
      },
    ]);

    // ---

    a.viewComponent.setProperty('phoenix', 23);
    b.append(a);
    a.viewComponent.setProperty('neu', 'new');
    a.viewComponent.removeProperty('null');

    changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail:after:2').to.deep.equal([
      {
        type: ComponentChangeType.SetParent,
        uuid: a.uuid,
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [
          ['phoenix', 23],
          ['neu', 'new'],
          ['null', undefined],
        ],
      },
    ]);
  });

  // The view layer marks a property that is set without a value with a module symbol, and this
  // is the run that would find one on the wire: every change trail entry goes through the
  // structured clone algorithm before a kernel reads it -- `cloneChangeTrail()` in a local
  // environment, `postMessage()` on the way to a worker -- and a symbol there is a
  // DataCloneError, not an entry. Nothing in the unit specs crosses that line, because they
  // hand a trail to the kernel directly.
  it('carries a property set without a value through the clone and into the entity', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    await localEnv.start();

    a.viewComponent.setPropertyWithoutValue('bare');
    a.viewComponent.setProperty('withValue', 1);

    let changeTrail = await localEnv.shadowEnv.syncWait();

    expect(changeTrail, 'changeTrail:bare:create').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
        properties: [['bare'], ['withValue', 1]],
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: VoidToken,
      },
    ]);

    const kernel = localEnv.shadowEnv.envProxy.kernel;

    expect(kernel.getEntity(a.uuid).propKeys(), 'the entity holds the key').to.include('bare');
    expect(kernel.getEntity(a.uuid).getProperty('bare'), 'and no value behind it').to.be.undefined;
    expect(kernel.getEntity(a.uuid).getProperty('withValue'), 'the neighbour keeps its value').to.equal(1);

    // ---

    a.viewComponent.setProperty('bare', 2);
    a.viewComponent.setPropertyWithoutValue('second');
    a.viewComponent.removeProperty('withValue');

    changeTrail = await localEnv.shadowEnv.syncWait();

    // three forms in one entry, and the arity is what tells them apart on the wire
    expect(changeTrail, 'changeTrail:bare:change').to.deep.equal([
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [['bare', 2], ['second'], ['withValue', undefined]],
      },
    ]);

    expect(kernel.getEntity(a.uuid).getProperty('bare'), 'a value takes the place of none').to.equal(2);
    expect(kernel.getEntity(a.uuid).propKeys(), 'the second key arrives the same way').to.include('second');
    expect(kernel.getEntity(a.uuid).getProperty('second'), 'and carries no value either').to.be.undefined;
    expect(kernel.getEntity(a.uuid).getProperty('withValue'), 'the removed one is gone').to.be.undefined;
  });
});
