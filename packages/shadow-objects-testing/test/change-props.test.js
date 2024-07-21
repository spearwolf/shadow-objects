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

    // console.log('changeTrail:before', JSON.stringify(changeTrail, null, 2));

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

    // console.log('changeTrail:after', JSON.stringify(changeTrail, null, 2));

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

    // console.log('changeTrail:after:2', JSON.stringify(changeTrail, null, 2));

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
});
