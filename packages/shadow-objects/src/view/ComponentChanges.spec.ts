import {describe, expect, it} from 'vitest';
import {ChangeTrailPhase, ComponentChangeType, VoidToken} from '../constants.js';
import type {IComponentChangeType} from '../types.js';
import {ComponentChanges} from './ComponentChanges.js';

const UUID = 'c-1';

/** Runs the three trail phases in the same order as {@link ComponentContext.buildChangeTrails}. */
function buildTrail(changes: ComponentChanges): IComponentChangeType[] {
  const trail: IComponentChangeType[] = [];
  changes.buildChangeTrail(trail, ChangeTrailPhase.StructuralChanges);
  changes.buildChangeTrail(trail, ChangeTrailPhase.ContentUpdates);
  changes.buildChangeTrail(trail, ChangeTrailPhase.Removal);
  return trail;
}

/** Builds a first trail and clears it, leaving the component in the "already known" state. */
function created(token = 'a', parentUuid?: string, order = 0, autoDestruction = false): ComponentChanges {
  const changes = new ComponentChanges(UUID);
  changes.create(token, parentUuid, order, autoDestruction);
  buildTrail(changes);
  changes.clear();
  return changes;
}

describe('ComponentChanges', () => {
  describe('lifecycle flags', () => {
    it('starts as new, uncreated and undestroyed', () => {
      const changes = new ComponentChanges(UUID);

      expect(changes.uuid).toBe(UUID);
      expect(changes.isNew).toBe(true);
      expect(changes.isCreated).toBe(false);
      expect(changes.isDestroyed).toBe(false);
      expect(changes.hasChanges()).toBe(false);
    });

    it('is created and has changes after create()', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');

      expect(changes.isCreated).toBe(true);
      expect(changes.isDestroyed).toBe(false);
      expect(changes.hasChanges()).toBe(true);
    });

    it('is no longer new after the first clear()', () => {
      const changes = created();

      expect(changes.isNew).toBe(false);
      expect(changes.hasChanges()).toBe(false);
    });

    it('is destroyed after destroy()', () => {
      const changes = created();
      changes.destroy();

      expect(changes.isDestroyed).toBe(true);
      expect(changes.isCreated).toBe(false);
    });

    it('counts a create after a destroy as created again', () => {
      const changes = created();
      changes.destroy();
      changes.create('a');

      expect(changes.isCreated).toBe(true);
      expect(changes.isDestroyed).toBe(false);
    });

    it('stays destroyed when destroy and create cancel each other out', () => {
      const changes = created();
      changes.create('a');
      changes.destroy();
      changes.destroy();

      expect(changes.isDestroyed).toBe(true);
    });
  });

  describe('create', () => {
    it('emits a create-entities entry with the token', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a'}]);
    });

    it('defaults to the void token', () => {
      const changes = new ComponentChanges(UUID);
      changes.create();

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.CreateEntities, uuid: UUID, token: VoidToken}]);
    });

    it('carries the parent uuid', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a', 'parent-1');

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a', parentUuid: 'parent-1'},
      ]);
    });

    it('carries a non-zero order', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a', undefined, 42);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a', order: 42}]);
    });

    it('omits the default order', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a', undefined, 0);

      expect(buildTrail(changes)[0]).not.toHaveProperty('order');
    });

    it('carries autoDestructionOnParentRemoval only when set', () => {
      const on = new ComponentChanges(UUID);
      on.create('a', undefined, 0, true);
      expect(buildTrail(on)[0]).toHaveProperty('autoDestructionOnParentRemoval', true);

      const off = new ComponentChanges(UUID);
      off.create('a', undefined, 0, false);
      expect(buildTrail(off)[0]).not.toHaveProperty('autoDestructionOnParentRemoval');
    });

    it('folds pending properties into the create entry', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');
      changes.changeProperty('foo', 'bar');
      changes.changeProperty('num', 42);

      expect(buildTrail(changes)).toEqual([
        {
          type: ComponentChangeType.CreateEntities,
          uuid: UUID,
          token: 'a',
          properties: [
            ['foo', 'bar'],
            ['num', 42],
          ],
        },
      ]);
    });

    it('drops undefined properties from the create entry', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');
      changes.changeProperty('foo', 'bar');
      changes.changeProperty('gone', undefined);

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a', properties: [['foo', 'bar']]},
      ]);
    });
  });

  describe('destroy', () => {
    it('emits nothing when a component is created and destroyed within the same trail', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');
      changes.createEvent('ignored', 1);
      changes.destroy();

      expect(buildTrail(changes)).toEqual([]);
    });

    it('emits a destroy-entities entry for a known component', () => {
      const changes = created();
      changes.destroy();

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: UUID}]);
    });

    it('still delivers pending events before the destroy entry', () => {
      const changes = created();
      changes.createEvent('bye', {n: 1});
      changes.destroy();

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.SendEvents, uuid: UUID, events: [{type: 'bye', data: {n: 1}}]},
        {type: ComponentChangeType.DestroyEntities, uuid: UUID},
      ]);
    });

    it('emits no structural change for a destroyed component', () => {
      const changes = created();
      changes.changeToken('other');
      changes.destroy();

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: UUID}]);
    });
  });

  describe('token', () => {
    it('emits a change-token entry', () => {
      const changes = created('a');
      changes.changeToken('b');

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeToken, uuid: UUID, token: 'b'}]);
    });

    it('emits nothing when the token is unchanged', () => {
      const changes = created('a');
      changes.changeToken('a');

      expect(changes.hasChanges()).toBe(false);
      expect(buildTrail(changes)).toEqual([]);
    });

    it('cancels a pending token change that is reverted', () => {
      const changes = created('a');
      changes.changeToken('b');
      changes.changeToken('a');

      expect(buildTrail(changes)).toEqual([]);
    });

    it('falls back to the void token for an undefined token', () => {
      const changes = created('a');
      changes.changeToken(undefined);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeToken, uuid: UUID, token: VoidToken}]);
    });

    it('keeps the create-token when a pending create is reset to the void token', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');
      changes.changeToken(VoidToken);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.CreateEntities, uuid: UUID, token: VoidToken}]);
    });

    it('keeps the create-token when a pending create is reset to undefined', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');
      changes.changeToken(undefined);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.CreateEntities, uuid: UUID, token: VoidToken}]);
    });
  });

  describe('parent and order', () => {
    it('emits a set-parent entry', () => {
      const changes = created('a');
      changes.setParent('parent-1');

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'parent-1'}]);
    });

    it('emits a set-parent entry with an undefined parent when moving to the root', () => {
      const changes = created('a', 'parent-1');
      changes.setParent(undefined);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: undefined}]);
    });

    it('emits nothing when a root component is moved to the root again', () => {
      const changes = created('a');
      changes.setParent(undefined);

      expect(buildTrail(changes)).toEqual([]);
    });

    it('emits an update-order entry', () => {
      const changes = created('a');
      changes.changeOrder(7);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.UpdateOrder, uuid: UUID, order: 7}]);
    });

    it('emits nothing when the order is unchanged', () => {
      const changes = created('a', undefined, 7);
      changes.changeOrder(7);

      expect(changes.hasChanges()).toBe(false);
      expect(buildTrail(changes)).toEqual([]);
    });

    it('folds a simultaneous order change into the set-parent entry', () => {
      const changes = created('a');
      changes.setParent('parent-1');
      changes.changeOrder(3);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'parent-1', order: 3}]);
    });

    it('emits the token change alongside a structural change', () => {
      const changes = created('a');
      changes.setParent('parent-1');
      changes.changeToken('b');

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'parent-1'},
        {type: ComponentChangeType.ChangeToken, uuid: UUID, token: 'b'},
      ]);
    });
  });

  describe('properties', () => {
    it('emits a change-properties entry in the order the properties changed', () => {
      const changes = created();
      changes.changeProperty('b', 2);
      changes.changeProperty('a', 1);

      expect(buildTrail(changes)).toEqual([
        {
          type: ComponentChangeType.ChangeProperties,
          uuid: UUID,
          properties: [
            ['b', 2],
            ['a', 1],
          ],
        },
      ]);
    });

    it('moves a property that changes twice to the end, keeping the most recent change last', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      changes.changeProperty('b', 2);
      changes.changeProperty('a', 11);

      expect(buildTrail(changes)).toEqual([
        {
          type: ComponentChangeType.ChangeProperties,
          uuid: UUID,
          properties: [
            ['b', 2],
            ['a', 11],
          ],
        },
      ]);
    });

    it('reports whether a value actually changed', () => {
      const changes = created();

      expect(changes.changeProperty('a', 1)).toBe(true);
      buildTrail(changes);
      changes.clear();

      expect(changes.changeProperty('a', 1)).toBe(false);
      expect(changes.changeProperty('a', 2)).toBe(true);
    });

    it('cancels a pending change that is reverted before the trail is built', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      buildTrail(changes);
      changes.clear();

      changes.changeProperty('a', 2);
      changes.changeProperty('a', 1);

      expect(buildTrail(changes)).toEqual([]);
    });

    it('uses a custom isEqual comparator', () => {
      const sameX = (a: {x: number} | undefined, b: {x: number} | undefined) => a?.x === b?.x;
      const changes = created();

      changes.changeProperty('pos', {x: 1}, sameX);
      buildTrail(changes);
      changes.clear();

      expect(changes.changeProperty('pos', {x: 1}, sameX)).toBe(false);
      expect(changes.changeProperty('pos', {x: 2}, sameX)).toBe(true);
    });

    it('emits an undefined value when a known property is removed', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      buildTrail(changes);
      changes.clear();

      changes.removeProperty('a');

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['a', undefined]]},
      ]);
    });

    it('emits nothing when removing an unknown property', () => {
      const changes = created();
      changes.removeProperty('nope');

      expect(changes.hasChanges()).toBe(false);
      expect(buildTrail(changes)).toEqual([]);
    });

    it('cancels a pending change when the property is removed before the trail is built', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      changes.removeProperty('a');

      expect(buildTrail(changes)).toEqual([]);
    });

    it('treats a value set to undefined as a removal', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      buildTrail(changes);
      changes.clear();

      changes.changeProperty('a', undefined);
      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['a', undefined]]},
      ]);
      changes.clear();

      changes.removeProperty('a');
      expect(buildTrail(changes)).toEqual([]);
    });
  });

  describe('events', () => {
    it('emits a send-events entry', () => {
      const changes = created();
      changes.createEvent('foo', 1);
      changes.createEvent('bar', {a: 2});

      expect(buildTrail(changes)).toEqual([
        {
          type: ComponentChangeType.SendEvents,
          uuid: UUID,
          events: [
            {type: 'foo', data: 1},
            {type: 'bar', data: {a: 2}},
          ],
        },
      ]);
    });

    it('emits events for a component that is created in the same trail', () => {
      const changes = new ComponentChanges(UUID);
      changes.create('a');
      changes.createEvent('foo', 1);

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.CreateEntities, uuid: UUID, token: 'a'},
        {type: ComponentChangeType.SendEvents, uuid: UUID, events: [{type: 'foo', data: 1}]},
      ]);
    });

    it('collects transferables and removes duplicates', () => {
      const a = new ArrayBuffer(8);
      const b = new ArrayBuffer(8);
      const changes = created();

      changes.createEvent('one', 1, [a, b]);
      changes.createEvent('two', 2, [b]);

      const trail = buildTrail(changes);

      expect(trail).toHaveLength(1);
      expect((trail[0] as {transferables: Transferable[]}).transferables).toEqual([a, b]);
    });

    it('omits the transferables key when there are none', () => {
      const changes = created();
      changes.createEvent('one', 1);

      expect(buildTrail(changes)[0]).not.toHaveProperty('transferables');
    });

    it('drops events after clear()', () => {
      const changes = created();
      changes.createEvent('foo', 1);
      changes.clear();

      expect(buildTrail(changes)).toEqual([]);
    });

    it('moves events and transferables to another changes instance', () => {
      const buffer = new ArrayBuffer(8);
      const source = created();
      source.createEvent('foo', 1, [buffer]);

      const target = created();
      source.transferEventsTo(target);

      expect(buildTrail(source)).toEqual([]);
      expect(buildTrail(target)).toEqual([
        {
          type: ComponentChangeType.SendEvents,
          uuid: UUID,
          events: [{type: 'foo', data: 1}],
          transferables: [buffer],
        },
      ]);
    });

    it('merges transferables when both instances hold some', () => {
      const a = new ArrayBuffer(8);
      const b = new ArrayBuffer(8);

      const source = created();
      source.createEvent('from-source', 1, [a]);

      const target = created();
      target.createEvent('from-target', 2, [b]);

      source.transferEventsTo(target);

      const trail = buildTrail(target);

      expect((trail[0] as {events: unknown[]}).events).toEqual([
        {type: 'from-target', data: 2},
        {type: 'from-source', data: 1},
      ]);
      expect((trail[0] as {transferables: Transferable[]}).transferables).toEqual([b, a]);
    });
  });
});