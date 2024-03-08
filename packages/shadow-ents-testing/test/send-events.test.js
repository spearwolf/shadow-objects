import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, VoidToken} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {findElementsById} from '../src/findElementsById.js';
import {nextChangeTrail} from '../src/nextSyncEvent.js';
import {render} from '../src/render.js';

describe('chasend events', () => {
  beforeEach(async () => {
    render(`
      <shadow-local-env id="localEnv" no-structured-clone>
        <shadow-entity id="a" token="a"></shadow-entity>
        <shadow-entity id="b"></shadow-entity>
      </shadow-local-env>`);

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('works as expected', async () => {
    const [a, b, localEnv] = findElementsById('a', 'b', 'localEnv');

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', 666);
    b.viewComponent.setProperty('xyz', [1, 2, 3]);

    a.viewComponent.sendEvent('event1', {foo: 'bar'});

    let changeTrail = await nextChangeTrail(localEnv.getLocalEnv());

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

    a.viewComponent.sendEvent('event2', 123, ['abc']);
    b.viewComponent.sendEvent('event4', null, [1, 2, 3]);
    a.viewComponent.sendEvent('event3', {abc: 'def'}, ['xyz', 666]);

    changeTrail = await nextChangeTrail(localEnv.getLocalEnv());

    console.log('changeTrail:after', JSON.stringify(changeTrail, null, 2));

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
