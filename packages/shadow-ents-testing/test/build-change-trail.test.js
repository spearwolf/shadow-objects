import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, ContextLost} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import sinon from 'sinon';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('build-change-trail', () => {
  beforeEach(async () => {
    render(`
      <shadow-local-env id="localEnv">
        <shadow-entity id="a" token="a">
          <shadow-entity id="b" token="b">
            <shadow-entity id="c" token="c"></shadow-entity>
            <shadow-entity id="d"></shadow-entity>
          </shadow-entity>
        </shadow-entity>
        <shadow-entity id="e" token="e">
          <shadow-entity id="f" token="f"></shadow-entity>
        </shadow-entity>
      </shadow-local-env>`);

    await Promise.all([customElements.whenDefined('shadow-local-env'), customElements.whenDefined('shadow-entity')]);
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('append e to b', () => {
    const [b, e, localEnv] = findElementsById('b', 'e', 'localEnv');

    let changeTrail = localEnv.getComponentContext().buildChangeTrails();

    e.token = 'bee';

    b.append(e);

    changeTrail = localEnv.getComponentContext().buildChangeTrails();

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.SetParent,
        uuid: e.uuid,
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.ChangeToken,
        uuid: e.uuid,
        token: 'bee',
      },
    ]);
  });

  it('a: set properties', () => {
    const [a, localEnv] = findElementsById('a', 'localEnv');

    localEnv.getComponentContext().buildChangeTrails();

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', [1, 2, 3]);

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: a.uuid,
        properties: [
          ['foo', 'bar'],
          ['plah', [1, 2, 3]],
        ],
      },
    ]);
  });

  it('destroy a', () => {
    const [a, b, c, d, localEnv] = findElementsById('a', 'b', 'c', 'd', 'localEnv');

    localEnv.getComponentContext().buildChangeTrails();

    expect(b.parentEntity).to.equal(a);

    a.viewComponent.setProperty('foo', 'bar');
    d.viewComponent.setProperty('plah', 'plah!');
    a.remove();

    const changeTrail = localEnv.getComponentContext().buildChangeTrails();

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: a.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: b.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: c.uuid,
      },
      {
        type: ComponentChangeType.DestroyEntities,
        uuid: d.uuid,
      },
    ]);
  });

  it('resetChangesFromMemory', () => {
    const [a, b, c, d, e, f, localEnv] = findElementsById('a', 'b', 'c', 'd', 'e', 'f', 'localEnv');
    const cc = localEnv.getComponentContext();

    const contextLostSpy = sinon.spy();
    f.viewComponent.on(ContextLost, contextLostSpy);

    let changeTrail = cc.buildChangeTrails();

    cc.resetChangesFromMemory();

    changeTrail = cc.buildChangeTrails();

    expect(contextLostSpy.calledOnce, 'contextLostSpy').to.be.true;

    // console.log('resetChangesFromMemory', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: 'b',
        parentUuid: a.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: c.uuid,
        token: 'c',
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: d.uuid,
        token: '#void',
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: e.uuid,
        token: 'e',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: f.uuid,
        token: 'f',
        parentUuid: e.uuid,
      },
    ]);
  });

  it('resetChangesFromMemory with change gap', () => {
    const [a, b, c, d, e, f, localEnv] = findElementsById('a', 'b', 'c', 'd', 'e', 'f', 'localEnv');
    const cc = localEnv.getComponentContext();

    let changeTrail = cc.buildChangeTrails();

    d.token = 'd';

    a.viewComponent.setProperty('foo', 'bar');

    e.append(c);

    a.viewComponent.sendEventToShadows('event2', 123, ['abc']);
    b.viewComponent.sendEventToShadows('event4', null, [1, 2, 3]);

    cc.resetChangesFromMemory();

    a.viewComponent.sendEventToShadows('event3', {abc: 'def'}, ['xyz', 666]);

    changeTrail = cc.buildChangeTrails();

    // console.log('resetChangesFromMemory with change gap', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
        properties: [['foo', 'bar']],
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: 'b',
        parentUuid: a.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: d.uuid,
        token: 'd',
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: e.uuid,
        token: 'e',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: f.uuid,
        token: 'f',
        parentUuid: e.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: c.uuid,
        token: 'c',
        parentUuid: e.uuid,
      },
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
