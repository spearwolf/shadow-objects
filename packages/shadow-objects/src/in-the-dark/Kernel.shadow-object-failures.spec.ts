import {emit} from '@spearwolf/eventize';
import {createSignal, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChangeTrailRefusedError} from '../ChangeTrailRefusedError.js';
import {ComponentChangeType} from '../constants.js';
import {EntityUuidInUseError} from '../EntityUuidInUseError.js';
import type {IComponentChangeType, ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {type OnCreate, type OnDestroy, onCreate, onDestroy} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject, shadowObjects} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('upgradeEntities with an entity that is destroyed while the upgrade runs', () => {
    it('skips the destroyed entity and upgrades the ones behind it', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      @ShadowObject({registry, token: 'destroysTheNextEntity'})
      class DestroysTheNextEntity implements OnCreate {
        [onCreate]() {
          kernel.destroyEntity(bUuid);
        }
      }

      @ShadowObject({registry, token: 'marker'})
      class Marker {}

      expect(DestroysTheNextEntity).toBeDefined();
      expect(Marker).toBeDefined();

      kernel.createEntity(aUuid, 'entA');
      kernel.createEntity(bUuid, 'entB');
      kernel.createEntity(cUuid, 'entC');

      // 'entB' has no route of its own, so the upgrade carries an empty constructor set for it.
      registry.appendRoute('entA', ['destroysTheNextEntity']);
      registry.appendRoute('entC', ['marker']);

      // The upgrade walks a snapshot of the entity tree. Entity A destroys B from its
      // [onCreate], so B is gone by the time the snapshot reaches it.
      expect(() => kernel.upgradeEntities()).not.toThrow();

      expect(kernel.hasEntity(bUuid)).toBe(false);

      // C sits behind B in the snapshot and must still have been upgraded.
      expect(kernel.findShadowObjects(cUuid)).toHaveLength(1);
      expect(kernel.findShadowObjects(cUuid)[0]).toBeInstanceOf(Marker);

      kernel.destroy();
    });

    it('skips an entity the destroy pass removed from the snapshot', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      @ShadowObject({registry, token: 'destroysTheFirstEntity'})
      class DestroysTheFirstEntity implements OnDestroy {
        [onDestroy]() {
          kernel.destroyEntity(aUuid);
        }
      }

      @ShadowObject({registry, token: 'marker'})
      class Marker {}

      expect(DestroysTheFirstEntity).toBeDefined();
      expect(Marker).toBeDefined();

      // the route has to exist before the entity, otherwise it never gets the shadow object
      // whose [onDestroy] the upgrade is about
      registry.appendRoute('entC', ['destroysTheFirstEntity']);

      kernel.createEntity(aUuid, 'entA');
      kernel.createEntity(bUuid, 'entB');
      kernel.createEntity(cUuid, 'entC');

      expect(kernel.findShadowObjects(cUuid)).toHaveLength(1);

      // dropping the route is what makes the destroy pass tear that shadow object down
      registry.clearRoute('entC');
      registry.appendRoute('entB', ['marker']);

      // The destroy pass walks the snapshot in reverse — C, B, A. C destroys A from its
      // [onDestroy], so A is gone by the time the pass reaches it.
      expect(() => kernel.upgradeEntities()).not.toThrow();

      expect(kernel.hasEntity(aUuid)).toBe(false);

      // B sits behind C in the reversed snapshot and must still have been upgraded.
      expect(kernel.findShadowObjects(bUuid)).toHaveLength(1);
      expect(kernel.findShadowObjects(bUuid)[0]).toBeInstanceOf(Marker);

      kernel.destroy();
    });
  });

  describe('a creation that fails halfway through', () => {
    it('leaves no entity behind when a shadow-object constructor throws', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      @ShadowObject({registry, token: 'failingCreation'})
      class FailingCreation {
        constructor() {
          throw new Error('this constructor fails');
        }
      }
      expect(FailingCreation).toBeDefined();

      const uuid = generateUUID();

      expect(() => kernel.createEntity(uuid, 'failingCreation')).toThrow('this constructor fails');

      expect(kernel.hasEntity(uuid)).toBe(false);
      expect(kernel.findEntity(uuid)).toBeUndefined();

      // Both walks run over the root registration, which no reader of the kernel hands out directly.
      expect(kernel.traverseLevelOrderBFS(), 'the entity is not among the roots either').toEqual([]);
      expect(kernel.getEntityGraph()).toEqual([]);

      kernel.destroy();
    });

    it('leaves the parent without the child when a shadow-object constructor throws', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      @ShadowObject({registry, token: 'failingCreation'})
      class FailingCreation {
        constructor() {
          throw new Error('this constructor fails');
        }
      }
      expect(FailingCreation).toBeDefined();

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'node');

      expect(() => kernel.createEntity(childUuid, 'failingCreation', parentUuid)).toThrow('this constructor fails');

      expect(kernel.getEntity(parentUuid).children, 'the parent holds no half-created child').toEqual([]);
      expect(kernel.hasEntity(childUuid)).toBe(false);
      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([parentUuid]);

      kernel.destroy();
    });

    it('destroys the shadow-objects that were already standing', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyed: string[] = [];

      // `Registry.findConstructors()` hands the constructors back in registration order, so the first
      // shadow-object stands by the time the second one fails.
      @ShadowObject({registry, token: 'halfBuilt'})
      class Standing {
        constructor({onDestroy}: ShadowObjectCreationAPI) {
          onDestroy(() => destroyed.push('standing'));
        }
      }

      @ShadowObject({registry, token: 'halfBuilt'})
      class Failing {
        constructor() {
          throw new Error('this constructor fails');
        }
      }

      expect(Standing).toBeDefined();
      expect(Failing).toBeDefined();

      const uuid = generateUUID();

      expect(() => kernel.createEntity(uuid, 'halfBuilt')).toThrow('this constructor fails');

      expect(destroyed, 'the shadow-object that made it gets its regular teardown').toEqual(['standing']);

      kernel.destroy();
    });

    it('ends the effects the failing constructor had already created', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const testSignal = createSignal(0);
      const effectFn = vi.fn();

      @ShadowObject({registry, token: 'failingEffect'})
      class FailingEffect {
        constructor({createEffect}: ShadowObjectCreationAPI) {
          createEffect(() => {
            effectFn(testSignal.get());
          });
          throw new Error('this constructor fails');
        }
      }
      expect(FailingEffect).toBeDefined();

      const uuid = generateUUID();

      expect(() => kernel.createEntity(uuid, 'failingEffect')).toThrow('this constructor fails');

      // Counting from what happened rather than from a fixed number keeps the case off the question
      // whether a fresh effect runs once right away.
      const runs = effectFn.mock.calls.length;

      testSignal.set(1);

      expect(effectFn, 'a constructor that does not reach its end leaves nothing running behind').toHaveBeenCalledTimes(runs);

      kernel.destroy();
    });

    it('leaves no entity behind when the parent uuid is unknown', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      expect(() => kernel.createEntity(uuid, 'node', 'no-such-parent')).toThrow();

      expect(kernel.hasEntity(uuid)).toBe(false);

      kernel.destroy();
    });
  });

  describe('createEntity with a uuid the kernel already holds', () => {
    it('refuses the second creation and names the uuid', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'node');

      expect(() => kernel.createEntity(uuid, 'other')).toThrow(EntityUuidInUseError);

      let refusal: unknown;
      try {
        kernel.createEntity(uuid, 'other');
      } catch (error) {
        refusal = error;
      }

      expect((refusal as EntityUuidInUseError).uuid, 'the uuid is part of the promise, not just of the message').toBe(uuid);

      kernel.destroy();
    });

    it('leaves the entity that stands untouched', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyed: string[] = [];

      @ShadowObject({registry, token: 'keeper'})
      class Keeper {
        constructor({onDestroy: onScopeDestroy, provideContext, useProperty}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => destroyed.push('keeper'));
          provideContext('probe', 42);
          useProperty('x');
        }
      }
      expect(Keeper).toBeDefined();

      const uuid = generateUUID();

      kernel.createEntity(uuid, 'keeper', undefined, 0, [['x', 7]]);

      const before = kernel.getEntity(uuid);
      const soBefore = kernel.findShadowObjects(uuid);

      expect(soBefore).toHaveLength(1);

      expect(() => kernel.createEntity(uuid, 'node', undefined, 0, [['x', 99]])).toThrow(EntityUuidInUseError);

      // The context signal is fed through a deferred update, so the read waits one microtask out.
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(kernel.getEntity(uuid), 'the entity behind the uuid is the very same one').toBe(before);
      expect(kernel.findShadowObjects(uuid), 'its shadow objects stand as they were').toEqual(soBefore);
      expect(destroyed, 'nothing of it was torn down').toEqual([]);
      expect(before.getProperty('x'), 'the properties of the refused creation land nowhere').toBe(7);
      expect(value(before.useContext('probe')), 'its contexts keep their value').toBe(42);
      expect(kernel.getEntityGraph()[0]!.token, 'its token is the one it was created with').toBe('keeper');

      kernel.destroy();
    });

    it('holds nothing of the refused creation', () => {
      const kernel = new Kernel(new Registry());
      const [a, b] = [generateUUID(), generateUUID()];

      kernel.createEntity(a, 'node');
      kernel.createEntity(b, 'node');

      expect(() => kernel.createEntity(b, 'node', a)).toThrow(EntityUuidInUseError);

      // The guard stands ahead of every write the creation makes, so there is nothing to roll back.
      expect(kernel.getEntity(a).children, 'the parent named by the refused creation stays childless').toEqual([]);
      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([a, b]);
      expect(kernel.getEntity(b).parentUuid).toBeUndefined();

      kernel.destroy();
    });

    it('refuses the change trail at that entry and says how far it got', () => {
      const kernel = new Kernel(new Registry());
      const uuids: [string, string] = [generateUUID(), generateUUID()];

      const changeTrail: IComponentChangeType[] = [
        {type: ComponentChangeType.CreateEntities, uuid: uuids[0], token: 'node'},
        {type: ComponentChangeType.CreateEntities, uuid: uuids[0], token: 'node'},
        {type: ComponentChangeType.CreateEntities, uuid: uuids[1], token: 'node'},
      ];

      let refusal: unknown;
      try {
        kernel.run({changeTrail});
      } catch (error) {
        refusal = error;
      }

      expect(refusal).toBeInstanceOf(ChangeTrailRefusedError);

      const refused = refusal as ChangeTrailRefusedError;
      expect(refused.appliedCount).toBe(1);
      expect(refused.entryCount).toBe(3);
      expect(refused.cause).toBeInstanceOf(EntityUuidInUseError);

      expect(kernel.hasEntity(uuids[0])).toBe(true);
      expect(kernel.hasEntity(uuids[1]), 'the entries behind the refused one were never attempted').toBe(false);

      kernel.destroy();
    });
  });

  describe('a token change with a shadow-object hook that throws', () => {
    // Both shadow-objects leave the constructor set at once, and the kernel takes them down in the
    // order their constructors were registered: the throwing one first, the sibling behind it.
    const makeEntityWithFailingTeardown = () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];
      const heard: string[] = [];

      @ShadowObject({registry, token: 'leavingToken'})
      class FailingTeardown implements OnDestroy {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => seen.push('failing scope'));
        }

        // Named after the event, which is how a shadow-object attached to an entity is reached: once
        // the kernel takes it off the entity, nothing arrives here any more.
        ping() {
          heard.push('failing');
        }

        [onDestroy]() {
          seen.push('failing');
          throw new Error('this teardown fails');
        }
      }

      @ShadowObject({registry, token: 'leavingToken'})
      class Sibling implements OnDestroy {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => seen.push('sibling scope'));
        }

        [onDestroy]() {
          seen.push('sibling');
        }
      }

      expect(FailingTeardown).toBeDefined();
      expect(Sibling).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'leavingToken');

      return {kernel, uuid, entity: kernel.getEntity(uuid), seen, heard};
    };

    it('does not hand the throw to the caller', () => {
      const {kernel, uuid} = makeEntityWithFailingTeardown();

      expect(() => kernel.changeToken(uuid, 'nextToken')).not.toThrow();

      expect(kernel.hasEntity(uuid), 'the entity lives on -- only its shadow-objects left').toBe(true);

      kernel.destroy();
    });

    it('notifies the shadow-object behind the one that throws', () => {
      const {kernel, uuid, seen} = makeEntityWithFailingTeardown();

      kernel.changeToken(uuid, 'nextToken');

      expect(seen, 'the failing hook costs its own shadow-object, not the one behind it').toEqual([
        'failing',
        'failing scope',
        'sibling',
        'sibling scope',
      ]);

      kernel.destroy();
    });

    it('tears down the creation scope of the shadow-object that throws', () => {
      const {kernel, uuid, seen} = makeEntityWithFailingTeardown();

      kernel.changeToken(uuid, 'nextToken');

      expect(seen, 'a hook that throws does not keep its own scope alive').toContain('failing scope');
      expect(kernel.findShadowObjects(uuid), 'neither shadow-object is left in the bookkeeping').toEqual([]);

      kernel.destroy();
    });

    it('takes the shadow-object that throws off the entity', () => {
      const {kernel, uuid, entity, heard} = makeEntityWithFailingTeardown();

      emit(entity, 'ping');
      expect(heard, 'an attached shadow-object hears the events of its entity').toEqual(['failing']);

      kernel.changeToken(uuid, 'nextToken');
      emit(entity, 'ping');

      expect(heard, 'a shadow-object that has left is no longer a listener of the entity').toEqual(['failing']);

      kernel.destroy();
    });
  });

  describe('a shadow-object whose onCreate throws', () => {
    // The entity is built on a token without constructors and only then changed over, so the
    // shadow-object that fails meets an entity that goes on living: whatever the kernel does not take
    // off such an entity stays visible -- in the bookkeeping, in the effects and in the events it hears.
    const makeEntityWithFailingOnCreate = () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyed: string[] = [];
      const heard: string[] = [];
      const testSignal = createSignal(0);
      const effectFn = vi.fn();

      @ShadowObject({registry, token: 'failingOnCreate'})
      class FailingOnCreate implements OnCreate, OnDestroy {
        constructor({createEffect: createScopeEffect}: ShadowObjectCreationAPI) {
          createScopeEffect(() => {
            effectFn(testSignal.get());
          });
        }

        // Named after the event, which is how a shadow-object attached to an entity is reached: once
        // the kernel takes it off the entity, nothing arrives here any more.
        ping() {
          heard.push('failing');
        }

        [onCreate]() {
          throw new Error('this onCreate fails');
        }

        [onDestroy]() {
          destroyed.push('failing');
        }
      }
      expect(FailingOnCreate).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');

      return {kernel, uuid, entity: kernel.getEntity(uuid), destroyed, heard, testSignal, effectFn};
    };

    it('hands the error to the caller and leaves the entity without it', () => {
      const {kernel, uuid} = makeEntityWithFailingOnCreate();

      expect(() => kernel.changeToken(uuid, 'failingOnCreate')).toThrow('this onCreate fails');

      expect(kernel.hasEntity(uuid), 'the entity lives on -- only the shadow-object is gone').toBe(true);
      expect(kernel.findShadowObjects(uuid), 'a creation that did not reach its end lists nothing').toEqual([]);

      kernel.destroy();
    });

    it('runs the class-side destroy hook of the shadow-object it takes down', () => {
      const {kernel, uuid, destroyed} = makeEntityWithFailingOnCreate();

      expect(() => kernel.changeToken(uuid, 'failingOnCreate')).toThrow('this onCreate fails');

      expect(destroyed, 'a shadow-object that was attached hears its teardown, and hears it once').toEqual(['failing']);

      kernel.destroy();
    });

    it('ends the effects the constructor had already created', () => {
      const {kernel, uuid, testSignal, effectFn} = makeEntityWithFailingOnCreate();

      expect(() => kernel.changeToken(uuid, 'failingOnCreate')).toThrow('this onCreate fails');

      // Counting from what happened rather than from a fixed number keeps the case off the question
      // whether a fresh effect runs once right away.
      const runs = effectFn.mock.calls.length;

      testSignal.set(1);

      expect(effectFn, 'the creation scope goes with the shadow-object, effects included').toHaveBeenCalledTimes(runs);

      kernel.destroy();
    });

    it('takes the shadow-object off the entity', () => {
      const {kernel, uuid, entity, heard} = makeEntityWithFailingOnCreate();

      expect(() => kernel.changeToken(uuid, 'failingOnCreate')).toThrow('this onCreate fails');

      emit(entity, 'ping');

      expect(heard, 'a shadow-object whose creation failed is no listener of the entity').toEqual([]);

      kernel.destroy();
    });

    it('takes the shadow-object down where it stands, ahead of the entity around it', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];

      // `Registry.findConstructors()` hands the constructors back in registration order, so the
      // sibling stands by the time the second one reaches its `[onCreate]`. Which of the two is told
      // first is what tells the two teardowns apart: the one the failing creation runs itself, and
      // the one the entity runs when the creation of the entity is taken back around it.
      @ShadowObject({registry, token: 'failingOnCreateWithSibling'})
      class Standing implements OnDestroy {
        [onDestroy]() {
          seen.push('standing');
        }
      }

      @ShadowObject({registry, token: 'failingOnCreateWithSibling'})
      class FailingOnCreate implements OnCreate, OnDestroy {
        [onCreate]() {
          throw new Error('this onCreate fails');
        }

        [onDestroy]() {
          seen.push('failing');
        }
      }

      expect(Standing).toBeDefined();
      expect(FailingOnCreate).toBeDefined();

      const uuid = generateUUID();

      expect(() => kernel.createEntity(uuid, 'failingOnCreateWithSibling')).toThrow('this onCreate fails');

      expect(kernel.hasEntity(uuid), 'the entity the failed creation was made for is gone').toBe(false);
      expect(seen, 'the shadow-object ends with its own creation, before the entity teardown reaches the sibling').toEqual([
        'failing',
        'standing',
      ]);

      kernel.destroy();
    });
  });

  describe('a shadow-object rebuild that fails halfway through', () => {
    // One constructor per token that gets through and, on the token being changed to, one behind it
    // that does not: the entity is therefore halfway into the new token when the throw comes.
    const makeEntityWithFailingTokenChange = () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const built: number[] = [];
      const counted: unknown[] = [];
      const destroyed: string[] = [];

      let serial = 0;

      @ShadowObject({registry, token: 'oldToken'})
      class OldStanding {
        constructor({useProperty, createEffect: createScopeEffect}: ShadowObjectCreationAPI) {
          serial += 1;
          built.push(serial);

          const count = useProperty<number>('count');
          createScopeEffect(() => {
            counted.push(count());
          });
        }
      }

      @ShadowObject({registry, token: 'newToken'})
      class NewStanding {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => destroyed.push('new standing'));
        }
      }

      @ShadowObject({registry, token: 'newToken'})
      class NewFailing {
        constructor() {
          throw new Error('this constructor fails');
        }
      }

      expect(OldStanding).toBeDefined();
      expect(NewStanding).toBeDefined();
      expect(NewFailing).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'oldToken');

      return {kernel, uuid, built, counted, destroyed, OldStanding};
    };

    it('puts the previous token back', () => {
      const {kernel, uuid} = makeEntityWithFailingTokenChange();

      expect(() => kernel.changeToken(uuid, 'newToken')).toThrow('this constructor fails');

      expect(kernel.hasEntity(uuid), 'the entity lives on').toBe(true);
      expect(kernel.getEntityGraph()[0]!.token, 'an entity carries the token whose shadow-objects it has').toBe('oldToken');

      kernel.destroy();
    });

    it('builds the shadow-objects of the previous token again', () => {
      const {kernel, uuid, built} = makeEntityWithFailingTokenChange();

      const before = kernel.findShadowObjects(uuid);
      expect(before).toHaveLength(1);

      expect(() => kernel.changeToken(uuid, 'newToken')).toThrow('this constructor fails');

      const after = kernel.findShadowObjects(uuid);

      expect(after, 'the entity carries one shadow-object of the previous token again').toHaveLength(1);
      expect(built, 'the constructor of the previous token ran a second time').toEqual([1, 2]);
      expect(after[0], 'the restored shadow-object is one of its own, not the one that left').not.toBe(before[0]);

      kernel.destroy();
    });

    it('takes the shadow-objects of the new token down again', () => {
      const {kernel, uuid, destroyed, OldStanding} = makeEntityWithFailingTokenChange();

      expect(() => kernel.changeToken(uuid, 'newToken')).toThrow('this constructor fails');

      expect(destroyed, 'the shadow-object of the new token that stood hears its teardown').toEqual(['new standing']);

      const remaining = kernel.findShadowObjects(uuid);

      expect(remaining, 'nothing of the new token is left on the entity').toHaveLength(1);
      expect(remaining[0]).toBeInstanceOf(OldStanding);

      kernel.destroy();
    });

    it('the restored shadow-objects work again', () => {
      const {kernel, uuid, counted} = makeEntityWithFailingTokenChange();

      expect(() => kernel.changeToken(uuid, 'newToken')).toThrow('this constructor fails');

      const runs = counted.length;

      kernel.changeProperties(uuid, [['count', 7]]);

      expect(counted.slice(runs), 'the property reader of the restored shadow-object is bound to the entity').toEqual([7]);

      kernel.destroy();
    });

    it('a failed property change takes the new shadow-objects back and leaves the properties written', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyed: string[] = [];

      @ShadowObject({registry, token: 'baseToken'})
      class Base {}

      @ShadowObject({registry, token: 'joiningToken'})
      class JoiningStanding {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => destroyed.push('joining standing'));
        }
      }

      @ShadowObject({registry, token: 'joiningToken'})
      class JoiningFailing {
        constructor() {
          throw new Error('this constructor fails');
        }
      }

      expect(Base).toBeDefined();
      expect(JoiningStanding).toBeDefined();
      expect(JoiningFailing).toBeDefined();

      // A truthy property routes to a second token, so writing it is what brings the two constructors in.
      registry.appendRoute('@flag', ['joiningToken']);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'baseToken');

      const before = kernel.findShadowObjects(uuid);
      expect(before).toHaveLength(1);

      expect(() => kernel.changeProperties(uuid, [['flag', true]])).toThrow('this constructor fails');

      expect(
        kernel.getEntity(uuid).getProperty('flag'),
        'the property was written before the constructors ran and stays written',
      ).toBe(true);
      expect(destroyed, 'the shadow-object the property brought in is taken down again').toEqual(['joining standing']);
      expect(kernel.findShadowObjects(uuid), 'the entity carries what it carried before the call').toEqual(before);

      kernel.destroy();
    });

    it('a constructor that destroys its own entity leaves nothing to take back', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const built: string[] = [];

      @ShadowObject({registry, token: 'survivingToken'})
      class Surviving {
        constructor() {
          built.push('surviving');
        }
      }

      @ShadowObject({registry, token: 'selfDestroyingToken'})
      class SelfDestroying {
        constructor({entity}: ShadowObjectCreationAPI) {
          // The kernel comes out of the closure of this test rather than the creation API, which
          // hands out the entity and not the kernel holding it.
          kernel.destroyEntity(entity.uuid);
          throw new Error('this constructor fails');
        }
      }

      expect(Surviving).toBeDefined();
      expect(SelfDestroying).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'survivingToken');

      expect(built).toEqual(['surviving']);

      expect(() => kernel.changeToken(uuid, 'selfDestroyingToken')).toThrow('this constructor fails');

      expect(kernel.hasEntity(uuid), 'an entity its own constructor destroyed stays destroyed').toBe(false);
      expect(kernel.findShadowObjects(uuid)).toEqual([]);
      expect(built, 'nothing is built onto an entity the kernel no longer holds').toEqual(['surviving']);

      kernel.destroy();
    });

    it('an upgrade keeps the token it never wrote and does not bring back what its first pass took', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyed: string[] = [];

      // Defined on the kernel rather than through the decorator, because the failing constructor has to
      // join the set after the entity stands -- that is what an upgrade is for.
      class Routed {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => destroyed.push('routed'));
        }
      }

      class UpgradeFailing {
        constructor() {
          throw new Error('this constructor fails');
        }
      }

      shadowObjects.define('routedToken', Routed, registry);
      registry.appendRoute('@extra', ['routedToken']);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'baseToken', undefined, 0, [['extra', true]]);

      expect(kernel.findShadowObjects(uuid)).toHaveLength(1);

      registry.clearRoute('@extra');
      shadowObjects.define('baseToken', UpgradeFailing, registry);

      // `upgradeEntities()` takes down in one pass over the entity tree and builds in the next, so the
      // rollback of the failing call knows nothing of what the first pass took -- at this entity as much
      // as at any other.
      expect(() => kernel.upgradeEntities()).toThrow('this constructor fails');

      expect(kernel.getEntityGraph()[0]!.token, 'no token was written here, so none is put back').toBe('baseToken');
      expect(destroyed, 'the first pass took the routed shadow-object down').toEqual(['routed']);
      expect(kernel.findShadowObjects(uuid), 'and the entity is left standing without it').toEqual([]);

      kernel.destroy();
    });
  });
});
