import {afterAll, describe, expect, it} from 'vitest';
import {EntityChangeType} from '../constants.js';
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

  it('should insert create-entity and destroy-entites in change trail', () => {
    const a = new ViewComponent('a');
    const b = new ViewComponent('b', a);

    let changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: EntityChangeType.CreateEntity, uuid: a.uuid, token: 'a'},
      {type: EntityChangeType.CreateEntity, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
    ]);

    a.destroy();

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: EntityChangeType.SetParent, uuid: b.uuid, parentUuid: undefined},
      {type: EntityChangeType.DestroyEntity, uuid: a.uuid},
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
      {type: EntityChangeType.CreateEntity, uuid: a.uuid, token: 'a', properties: [['foo', 'bar']]},
      {type: EntityChangeType.CreateEntity, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
    ]);

    a.setProperty('foo', 'bar');
    a.setProperty('plah', 42);
    b.setProperty('xyz', 123);
    b.setProperty('numberOfTheBeast', 666);

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: EntityChangeType.ChangeProperties, uuid: a.uuid, properties: [['plah', 42]]},
      {
        type: EntityChangeType.ChangeProperties,
        uuid: b.uuid,
        properties: [
          ['xyz', 123],
          ['numberOfTheBeast', 666],
        ],
      },
    ]);
  });

  it('should insert update-orders in change trail', () => {
    const a = new ViewComponent('a', undefined, 100);
    const b = new ViewComponent('b', a);
    const c = new ViewComponent('c', a, 3);
    const d = new ViewComponent('d', a, 2);

    let changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(4);
    expect(changes).toEqual([
      {type: EntityChangeType.CreateEntity, uuid: a.uuid, token: 'a', order: 100},
      {type: EntityChangeType.CreateEntity, uuid: b.uuid, token: 'b', parentUuid: a.uuid},
      {type: EntityChangeType.CreateEntity, uuid: d.uuid, token: 'd', parentUuid: a.uuid, order: 2},
      {type: EntityChangeType.CreateEntity, uuid: c.uuid, token: 'c', parentUuid: a.uuid, order: 3},
    ]);

    c.removeFromParent();
    c.order = 15;

    b.order = 1;

    changes = cc.buildChangeTrails();

    expect(changes).toHaveLength(2);
    expect(changes).toEqual([
      {type: EntityChangeType.SetParent, uuid: c.uuid, parentUuid: undefined, order: 15},
      {type: EntityChangeType.UpdateOrder, uuid: b.uuid, order: 1},
    ]);
  });
});