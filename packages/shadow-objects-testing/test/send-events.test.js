import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, VoidToken} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shae-ent.js';
import '@spearwolf/shadow-ents/shae-worker.js';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('send events', () => {
  beforeEach(async () => {
    render(`
      <shae-worker local no-autostart auto-sync="no" id="localEnv" no-structured-clone></shae-worker>

      <shae-ent id="a" token="a"></shae-ent>
      <shae-ent id="b"></shae-ent>
    `);

    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
    document.getElementById('localEnv').shadowEnv.destroy();
  });

  it('works as expected', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    await localEnv.start();

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', 666);
    b.viewComponent.setProperty('xyz', [1, 2, 3]);

    a.viewComponent.dispatchShadowObjectsEvent('event1', {foo: 'bar'});

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
      {
        type: ComponentChangeType.SendEvents,
        uuid: a.uuid,
        events: [{type: 'event1', data: {foo: 'bar'}}],
      },
    ]);

    // ---

    a.viewComponent.dispatchShadowObjectsEvent('event2', 123, ['abc']);
    b.viewComponent.dispatchShadowObjectsEvent('event4', null, [1, 2, 3]);
    a.viewComponent.dispatchShadowObjectsEvent('event3', {abc: 'def'}, ['xyz', 666]);

    changeTrail = await localEnv.shadowEnv.syncWait();

    // console.log('changeTrail:after', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail:after').to.deep.equal([
      {
        type: ComponentChangeType.SendEvents,
        uuid: a.uuid,
        events: [
          {type: 'event2', data: 123},
          {type: 'event3', data: {abc: 'def'}},
        ],
        transferables: ['abc', 'xyz', 666],
      },
      {
        type: ComponentChangeType.SendEvents,
        uuid: b.uuid,
        events: [{type: 'event4', data: null}],
        transferables: [1, 2, 3],
      },
    ]);
  });
});
