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

/**
 * Builds a trail and folds it back into the component, the way a context does once the Shadow
 * Environment has applied it.
 */
function flushTrail(changes: ComponentChanges): IComponentChangeType[] {
  const trail = buildTrail(changes);
  for (const entry of trail) changes.commitChange(entry);
  return trail;
}

/** Builds and commits a first trail, leaving the component in the "already known" state. */
function created(token = 'a', parentUuid?: string, order = 0, autoDestruction = false): ComponentChanges {
  const changes = new ComponentChanges(UUID);
  changes.create(token, parentUuid, order, autoDestruction);
  flushTrail(changes);
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

    it('is no longer new once its creation is committed', () => {
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
      flushTrail(changes);

      expect(changes.changeProperty('a', 1)).toBe(false);
      expect(changes.changeProperty('a', 2)).toBe(true);
    });

    it('cancels a pending change that is reverted before the trail is built', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      flushTrail(changes);

      changes.changeProperty('a', 2);
      changes.changeProperty('a', 1);

      expect(buildTrail(changes)).toEqual([]);
    });

    it('uses a custom isEqual comparator', () => {
      const sameX = (a: {x: number} | undefined, b: {x: number} | undefined) => a?.x === b?.x;
      const changes = created();

      changes.changeProperty('pos', {x: 1}, sameX);
      flushTrail(changes);

      expect(changes.changeProperty('pos', {x: 1}, sameX)).toBe(false);
      expect(changes.changeProperty('pos', {x: 2}, sameX)).toBe(true);
    });

    it('emits an undefined value when a known property is removed', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      flushTrail(changes);

      changes.removeProperty('a');

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['a', undefined]]},
      ]);
    });

    // The entry carries the changes in the order they happened. A removal is not a second change
    // to the same key, so a key that is already queued keeps the place it took.
    it('leaves a queued key where it stands when it is removed', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      changes.changeProperty('b', 2);
      flushTrail(changes);

      changes.changeProperty('a', 11);
      changes.changeProperty('b', 22);
      changes.removeProperty('a');

      expect(buildTrail(changes)).toEqual([
        {
          type: ComponentChangeType.ChangeProperties,
          uuid: UUID,
          properties: [
            ['a', undefined],
            ['b', 22],
          ],
        },
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
      flushTrail(changes);

      changes.changeProperty('a', undefined);
      expect(flushTrail(changes)).toEqual([
        {type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['a', undefined]]},
      ]);

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

  describe('committing a trail entry', () => {
    // Building an entry says what the Shadow Environment is being asked to do; committing it says
    // the environment did it. Only the second one moves the line the next diff is taken against.
    const probes: Array<[string, () => ComponentChanges]> = [
      [
        'a creation',
        () => {
          const changes = new ComponentChanges(UUID);
          changes.create('a');
          return changes;
        },
      ],
      [
        'a parent change',
        () => {
          const changes = created();
          changes.setParent('p');
          return changes;
        },
      ],
      [
        'an order change',
        () => {
          const changes = created();
          changes.changeOrder(5);
          return changes;
        },
      ],
      [
        'a token change',
        () => {
          const changes = created();
          changes.changeToken('b');
          return changes;
        },
      ],
      [
        'a property change',
        () => {
          const changes = created();
          changes.changeProperty('foo', 1);
          return changes;
        },
      ],
      [
        'an event',
        () => {
          const changes = created();
          changes.createEvent('ping', 1);
          return changes;
        },
      ],
    ];

    it.each(probes)('builds %s again while it is uncommitted, and no more once it is committed', (_name, make) => {
      const changes = make();

      const first = buildTrail(changes);
      expect(first).toHaveLength(1);
      expect(buildTrail(changes), 'an entry nobody applied is built again').toEqual(first);

      for (const entry of first) changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([]);
    });

    it('releases the events an entry carried and keeps the ones that arrived behind it', () => {
      const carried = new ArrayBuffer(8);
      const later = new ArrayBuffer(8);
      const changes = created();
      changes.createEvent('first', 1, [carried]);

      const [entry] = buildTrail(changes);
      changes.createEvent('second', 2, [later]);
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([
        {
          type: ComponentChangeType.SendEvents,
          uuid: UUID,
          events: [{type: 'second', data: 2}],
          transferables: [later],
        },
      ]);
    });

    it('leaves the events standing when the entry it commits is of another kind', () => {
      const changes = created();
      changes.createEvent('ping', 1);
      changes.changeToken('b');

      const trail = buildTrail(changes);
      const tokenEntry = trail.find((entry) => entry.type === ComponentChangeType.ChangeToken)!;
      changes.commitChange(tokenEntry);

      expect(buildTrail(changes)).toEqual([
        {type: ComponentChangeType.SendEvents, uuid: UUID, events: [{type: 'ping', data: 1}]},
      ]);
    });

    it('takes exactly the keys of a property entry out of the pending half', () => {
      const changes = created();
      changes.changeProperty('a', 1);
      changes.changeProperty('b', 2);

      const [entry] = buildTrail(changes);
      changes.changeProperty('c', 3);
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['c', 3]]}]);
      expect(changes.getProperties()).toEqual(
        new Map([
          ['a', 1],
          ['b', 2],
          ['c', 3],
        ]),
      );
    });

    // A value can change again while the entry carrying the older one is still on its way out.
    // Releasing the key regardless would drop the newer value on the floor: the Shadow Environment
    // would hold the older one and nothing would ever correct it.
    it('keeps a value that changed again between the build and the commit', () => {
      const changes = created();
      changes.changeProperty('a', 1);

      const [entry] = buildTrail(changes);
      changes.changeProperty('a', 2);
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['a', 2]]}]);
    });

    it('keeps a token that changed again between the build and the commit', () => {
      const changes = created();
      changes.changeToken('b');

      const [entry] = buildTrail(changes);
      changes.changeToken('c');
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeToken, uuid: UUID, token: 'c'}]);
    });
  });

  describe('a change that comes back to the confirmed value while the entry is travelling', () => {
    // The written half is the last *confirmed* state, and it stays behind until the entry that is
    // on its way out is settled. A value the application sets back to the confirmed one is
    // therefore still owed: what the Shadow Environment will hold once that entry lands is what
    // the entry carries, not what the written half says.

    it('keeps a property that is set back to the confirmed value', () => {
      const changes = created();
      changes.changeProperty('a', 0);
      flushTrail(changes);

      changes.changeProperty('a', 1);
      const [entry] = buildTrail(changes);

      changes.changeProperty('a', 0);
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeProperties, uuid: UUID, properties: [['a', 0]]}]);
      expect(changes.getProperties().get('a')).toBe(0);
    });

    it('keeps a token that is set back to the confirmed one', () => {
      const changes = created('a');

      changes.changeToken('b');
      const [entry] = buildTrail(changes);

      changes.changeToken('a');
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.ChangeToken, uuid: UUID, token: 'a'}]);
    });

    it('keeps an order that is set back to the confirmed one', () => {
      const changes = created();

      changes.changeOrder(5);
      const [entry] = buildTrail(changes);

      changes.changeOrder(0);
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.UpdateOrder, uuid: UUID, order: 0}]);
    });

    it('keeps a parent that is set back to the confirmed one', () => {
      const changes = created('a', 'p1');

      changes.setParent('p2');
      const [entry] = buildTrail(changes);

      changes.setParent('p1');
      changes.commitChange(entry);

      expect(buildTrail(changes)).toEqual([{type: ComponentChangeType.SetParent, uuid: UUID, parentUuid: 'p1'}]);
    });
  });
});
