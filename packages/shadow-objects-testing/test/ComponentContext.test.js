import {expect} from '@esm-bundle/chai';
import {on} from '@spearwolf/eventize';
import {ComponentChangeType, ComponentContext, ViewComponent} from '@spearwolf/shadow-objects';
import {unmountAll} from '../src/mount.js';

describe('ComponentContext', () => {
  const cc = ComponentContext.get();

  afterEach(() => {
    unmountAll();
  });

  it('should be defined', () => {
    expect(ComponentContext).to.exist;
  });

  it('should insert create-entities and destroy-entities in change trail', () => {
    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    let changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a'},
      {type: ComponentChangeType.CreateEntities, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
    ]);

    a.destroy();

    changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {type: ComponentChangeType.SetParent, uuid: b.uuid, parentUuid: undefined},
      {type: ComponentChangeType.DestroyEntities, uuid: a.uuid},
    ]);
  });

  it('should insert change-properties in change trail', () => {
    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    a.setProperty('foo', 'bar');
    a.setProperty('plah', 42);
    a.removeProperty('plah');

    let changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', properties: [['foo', 'bar']]},
      {type: ComponentChangeType.CreateEntities, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
    ]);

    a.setProperty('foo', 'bar');
    a.setProperty('plah', 42);
    b.setProperty('xyz', 123);
    b.setProperty('numberOfTheBeast', 666);

    changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {type: ComponentChangeType.ChangeProperties, uuid: a.uuid, properties: [['plah', 42]]},
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: b.uuid,
        properties: [
          ['xyz', 123],
          ['numberOfTheBeast', 666],
        ],
      },
    ]);

    a.removeProperty('gibsnich');
    b.removeProperty('numberOfTheBeast');

    changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {
        type: ComponentChangeType.ChangeProperties,
        uuid: b.uuid,
        properties: [['numberOfTheBeast', undefined]],
      },
    ]);
  });

  it('should insert update-orders in change trail', () => {
    const a = new ViewComponent('a', {order: 100});
    const b = new ViewComponent('b', a);
    const c = new ViewComponent('c', {parent: a, order: 3});
    const d = new ViewComponent('d', {parent: a, order: 2});

    let changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', order: 100},
      {type: ComponentChangeType.CreateEntities, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
      {type: ComponentChangeType.CreateEntities, uuid: d.uuid, token: 'd', parentUuid: a.uuid, order: 2},
      {type: ComponentChangeType.CreateEntities, uuid: c.uuid, token: 'c', parentUuid: a.uuid, order: 3},
    ]);

    c.removeFromParent();
    c.order = 15;

    b.order = 1;

    changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([
      {type: ComponentChangeType.SetParent, uuid: c.uuid, parentUuid: undefined, order: 15},
      {type: ComponentChangeType.UpdateOrder, uuid: b.uuid, order: 1},
    ]);
  });

  it('should restore props from memory', () => {
    let a = new ViewComponent('a');

    a.setProperty('foo', 'bar');

    let changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal(
      [{type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', properties: [['foo', 'bar']]}],
      'a) create',
    );

    // ---

    a.setProperty('y', 1);

    a.destroy();
    a = new ViewComponent('a', {uuid: a.uuid});

    a.setProperty('x', 0);

    changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal(
      [
        {
          type: ComponentChangeType.ChangeProperties,
          uuid: a.uuid,
          properties: [
            ['y', 1],
            ['x', 0],
          ],
        },
      ],
      'b) just change props',
    );
  });

  it('should tell the children of a component to re-request their parents', () => {
    // its own context, because this case asserts on messages instead of on a change trail and
    // therefore never drains one — anything it leaves behind would show up in the next trail
    const ctx = ComponentContext.get('re-request-parent-children');

    const parent = new ViewComponent('parent', {context: ctx});
    const children = ['a', 'b', 'c'].map((token) => new ViewComponent(token, {parent, context: ctx}));

    const received = new Map();
    const count = (key) => received.set(key, (received.get(key) ?? 0) + 1);

    on(parent, ComponentContext.ReRequestParentRoots, () => count('parent'));
    for (const child of children) {
      on(child, ComponentContext.ReRequestParentRoots, () => count(child.uuid));
    }

    ctx.dispatchReRequestParentChildren(parent);

    expect(
      children.map((child) => received.get(child.uuid)),
      'every child is told exactly once',
    ).to.deep.equal([1, 1, 1]);
    expect(received.get('parent'), 'and the component itself is not told at all').to.be.undefined;

    ctx.dispose();
  });

  it('should ignore create and destroy in same change trail', () => {
    const a = new ViewComponent('a');

    a.destroy();

    const changes = cc.buildChangeTrails();

    expect(changes).to.deep.equal([]);
  });
});