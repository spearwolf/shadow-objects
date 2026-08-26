import {expect} from '@esm-bundle/chai';
import {on} from '@spearwolf/eventize';
import {ComponentChangeType, ComponentContext, ContextLost} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import sinon from 'sinon';
import {findElementsById} from '../src/findElementsById.js';
import {render} from '../src/render.js';

describe('build-change-trail', () => {
  const cc = ComponentContext.get();

  beforeEach(async () => {
    render(`
      <shae-ent id="a" token="a">
        <shae-ent id="b" token="b">
          <shae-ent id="c" token="c"></shae-ent>
          <shae-ent id="d"></shae-ent>
        </shae-ent>
      </shae-ent>
      <shae-ent id="e" token="e">
        <shae-ent id="f" token="f"></shae-ent>
      </shae-ent>`);

    await customElements.whenDefined('shae-ent');
  });

  afterEach(() => {
    cc.clear();
  });

  it('append e to b', () => {
    const [b, e] = findElementsById('b', 'e');

    let changeTrail = cc.buildChangeTrails();

    // console.log('append e to b (1st)', JSON.stringify(changeTrail, null, 2));

    e.token = 'bee';

    b.append(e);

    changeTrail = cc.buildChangeTrails();

    // console.log('append e to b (2nd)', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail').to.deep.equal([
      // --- I) structural changes ---
      {
        type: ComponentChangeType.SetParent,
        uuid: e.uuid,
        parentUuid: b.uuid,
      },
      // --- II) content changes ---
      {
        type: ComponentChangeType.ChangeToken,
        uuid: e.uuid,
        token: 'bee',
      },
    ]);
  });

  it('a: set properties', () => {
    const [a] = findElementsById('a');

    cc.buildChangeTrails();

    a.viewComponent.setProperty('foo', 'bar');
    a.viewComponent.setProperty('plah', [1, 2, 3]);

    const changeTrail = cc.buildChangeTrails();

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
    const [a, b, c, d] = findElementsById('a', 'b', 'c', 'd');

    cc.buildChangeTrails();

    expect(b.entParentNode).to.equal(a);

    a.viewComponent.setProperty('foo', 'bar');
    d.viewComponent.setProperty('plah', 'plah!');
    a.remove();

    const changeTrail = cc.buildChangeTrails();

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

  it('reCreateChanges', () => {
    const [a, b, c, d, e, f] = findElementsById('a', 'b', 'c', 'd', 'e', 'f');

    const contextLostSpy = sinon.spy();
    on(f.viewComponent, ContextLost, contextLostSpy);

    let changeTrail = cc.buildChangeTrails();

    cc.reCreateChanges();

    changeTrail = cc.buildChangeTrails();

    expect(contextLostSpy.calledOnce, 'contextLostSpy').to.be.true;

    // console.log('reCreateChanges', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: e.uuid,
        token: 'e',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: 'b',
        parentUuid: a.uuid,
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
        parentUuid: b.uuid,
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: d.uuid,
        token: '#void',
        parentUuid: b.uuid,
      },
    ]);
  });

  it('reCreateChanges with change gap', () => {
    const [a, b, c, d, e, f] = findElementsById('a', 'b', 'c', 'd', 'e', 'f');

    let changeTrail = cc.buildChangeTrails();

    d.token = 'd';

    a.viewComponent.setProperty('foo', 'bar');

    e.append(c);

    a.viewComponent.dispatchShadowObjectsEvent('event2', 123, ['abc']);
    b.viewComponent.dispatchShadowObjectsEvent('event4', null, [1, 2, 3]);

    cc.reCreateChanges();

    a.viewComponent.dispatchShadowObjectsEvent('event3', {abc: 'def'}, ['xyz', 666]);

    changeTrail = cc.buildChangeTrails();

    // console.log('reCreateChanges with change gap', JSON.stringify(changeTrail, null, 2));

    expect(changeTrail, 'changeTrail').to.deep.equal([
      {
        type: ComponentChangeType.CreateEntities,
        uuid: a.uuid,
        token: 'a',
        properties: [['foo', 'bar']],
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: e.uuid,
        token: 'e',
      },
      {
        type: ComponentChangeType.CreateEntities,
        uuid: b.uuid,
        token: 'b',
        parentUuid: a.uuid,
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
        type: ComponentChangeType.CreateEntities,
        uuid: d.uuid,
        token: 'd',
        parentUuid: b.uuid,
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
