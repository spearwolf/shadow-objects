import {afterAll, describe, expect, it} from 'vitest';
import {ComponentChangeType} from '../constants.js';
import {ComponentContext} from './ComponentContext.js';
import {ViewComponent} from './ViewComponent.js';

describe('ComponentContext', () => {
  const cc = ComponentContext.get();

  afterAll(() => {
    cc.clear();
  });

  it('should be defined', () => {
    expect(ComponentContext).toBeDefined();
  });

  it('should insert create-entities and destroy-entities in change trail', () => {
    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    let changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a'},
      {type: ComponentChangeType.CreateEntities, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
    ]);

    a.destroy();

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
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

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', properties: [['foo', 'bar']]},
      {type: ComponentChangeType.CreateEntities, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
    ]);

    a.setProperty('foo', 'bar');
    a.setProperty('plah', 42);
    b.setProperty('xyz', 123);
    b.setProperty('numberOfTheBeast', 666);

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
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

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([
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

    expect(changes).toHaveLength(4);
    expect(changes).toEqual([
      {type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', order: 100},
      {type: ComponentChangeType.CreateEntities, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
      {type: ComponentChangeType.CreateEntities, uuid: d.uuid, token: 'd', parentUuid: a.uuid, order: 2},
      {type: ComponentChangeType.CreateEntities, uuid: c.uuid, token: 'c', parentUuid: a.uuid, order: 3},
    ]);

    c.removeFromParent();
    c.order = 15;

    b.order = 1;

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: ComponentChangeType.SetParent, uuid: c.uuid, parentUuid: undefined, order: 15},
      {type: ComponentChangeType.UpdateOrder, uuid: b.uuid, order: 1},
    ]);
  });

  it.skip('should restore props from memory', () => {
    let a = new ViewComponent('a');

    a.setProperty('foo', 'bar');

    let changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([{type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', properties: [['foo', 'bar']]}]);

    // ---

    a.setProperty('y', 1);

    console.log('a:before', a);

    a.destroy();
    a = new ViewComponent('a', {uuid: a.uuid});

    a.setProperty('x', 0);

    console.log('a:after', a);

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(1);
    expect(changes).toEqual([{type: ComponentChangeType.ChangeProperties, uuid: a.uuid, properties: [['x', 0]]}]);
  });
});
