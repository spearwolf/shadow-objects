import {getSubscriptionCount, on, Priority} from '@spearwolf/eventize';
import {createSignal} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MessageToView} from '../constants.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {type OnDestroy, onDestroy} from './events.js';
import {Kernel, type MessageToViewEvent} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('Entity destruction', () => {
    it('Entity destruction should destroy children', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyCallback = vi.fn();

      @ShadowObject({registry, token: 'testOnDestroy'})
      class TestOnDestroy {
        constructor({onDestroy, entity}: ShadowObjectCreationAPI) {
          onDestroy(() => destroyCallback(entity.uuid));
        }
      }
      expect(TestOnDestroy).toBeDefined();

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'testOnDestroy');
      kernel.createEntity(childUuid, 'testOnDestroy', parentUuid, 0, undefined, true);

      expect(destroyCallback).not.toHaveBeenCalled();

      kernel.destroyEntity(parentUuid);

      expect(destroyCallback).toHaveBeenNthCalledWith(1, childUuid);
      expect(destroyCallback).toHaveBeenNthCalledWith(2, parentUuid);
    });
  });

  describe('destroyEntity does not leak children', () => {
    it('children without auto-destruct flag are promoted to root, not orphaned', () => {
      const kernel = new Kernel(new Registry());

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'p');
      kernel.createEntity(childUuid, 'c', parentUuid);

      kernel.destroyEntity(parentUuid);

      expect(kernel.hasEntity(childUuid), 'child should still exist').toBe(true);
      expect(kernel.getEntity(childUuid).hasParent, 'child should have no parent (be root)').toBe(false);

      const roots = kernel.traverseLevelOrderBFS().filter((e) => !e.hasParent);
      const rootUuids = roots.map((e) => e.uuid);
      expect(rootUuids, 'orphaned child must appear as a root').toContain(childUuid);
    });

    it('children with auto-destruct flag are cascaded when parent is destroyed', () => {
      const kernel = new Kernel(new Registry());

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'p');
      kernel.createEntity(childUuid, 'c', parentUuid, 0, undefined, true);

      kernel.destroyEntity(parentUuid);

      expect(kernel.hasEntity(childUuid), 'child with auto-destruct should be removed').toBe(false);
    });

    it('mixed children: flagged ones cascade, unflagged ones become roots', () => {
      const kernel = new Kernel(new Registry());

      const [parentUuid, flaggedUuid, unflaggedUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'p');
      kernel.createEntity(flaggedUuid, 'f', parentUuid, 0, undefined, true);
      kernel.createEntity(unflaggedUuid, 'u', parentUuid);

      kernel.destroyEntity(parentUuid);

      expect(kernel.hasEntity(flaggedUuid)).toBe(false);
      expect(kernel.hasEntity(unflaggedUuid)).toBe(true);
      expect(kernel.getEntity(unflaggedUuid).hasParent).toBe(false);
    });
  });

  describe('kernel teardown', () => {
    // Three roots in creation order; the teardown walks them the other way round, so `c` goes first
    // and `a` is the one that sits behind the callback that throws.
    const makeRoots = (kernel: Kernel) => {
      const uuids: [string, string, string] = [generateUUID(), generateUUID(), generateUUID()];
      for (const uuid of uuids) {
        kernel.createEntity(uuid, 'node');
      }
      return uuids;
    };

    it('runs the destroy callbacks behind one that throws', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid, cUuid] = makeRoots(kernel);

      const seen: string[] = [];

      for (const uuid of [aUuid, cUuid]) {
        on(kernel.getEntity(uuid), onDestroy, () => {
          seen.push(uuid);
        });
      }

      on(kernel.getEntity(bUuid), onDestroy, () => {
        seen.push(bUuid);
        throw new Error('this teardown fails');
      });

      expect(() => kernel.destroy()).not.toThrow();

      expect(seen, 'a callback that throws leaves the entities behind it in the sweep untouched').toEqual([cUuid, bUuid, aUuid]);
    });

    it('holds no entity any more when a destroy callback throws', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid, cUuid] = makeRoots(kernel);

      on(kernel.getEntity(bUuid), onDestroy, () => {
        throw new Error('this teardown fails');
      });

      kernel.destroy();

      for (const uuid of [aUuid, bUuid, cUuid]) {
        expect(kernel.hasEntity(uuid)).toBe(false);
      }

      expect(kernel.debugEntityCounts, 'the cached traversal order goes too, half-failed teardown or not').toEqual({
        entities: 0,
        rootEntities: 0,
        traversal: 0,
        traversalReversed: 0,
      });
    });

    it('lets go of the cached traversal order along with the entities', () => {
      const kernel = new Kernel(new Registry());
      makeRoots(kernel);

      expect(kernel.traverseLevelOrderBFS(), 'the walk fills the cache the teardown has to release').toHaveLength(3);
      expect(kernel.debugEntityCounts).toEqual({entities: 3, rootEntities: 3, traversal: 3, traversalReversed: 3});

      kernel.destroy();

      expect(kernel.debugEntityCounts, 'a destroyed kernel holds no entity in any of its four stores').toEqual({
        entities: 0,
        rootEntities: 0,
        traversal: 0,
        traversalReversed: 0,
      });

      expect(kernel.traverseLevelOrderBFS(), 'and the walk still answers, with nothing in it').toEqual([]);
    });

    // No failing callback here on purpose: with one, the statement would hang on whether the
    // callback gets its turn at all.
    it('hands a destroy callback the root contexts it still holds', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'node');

      const rootCtx = kernel.findOrCreateRootContext('ctx');
      let sameContext: boolean | undefined;

      on(kernel.getEntity(uuid), onDestroy, () => {
        sameContext = kernel.findOrCreateRootContext('ctx') === rootCtx;
      });

      kernel.destroy();

      expect(sameContext, 'a shadow object reading a global context while it is torn down reaches the path the kernel held').toBe(
        true,
      );
    });

    it('still delivers the message a destroy callback sends towards the view', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      @ShadowObject({registry, token: 'farewell'})
      class Farewell implements OnDestroy {
        dispatchMessageToView: ShadowObjectCreationAPI['dispatchMessageToView'];
        constructor({dispatchMessageToView}: ShadowObjectCreationAPI) {
          this.dispatchMessageToView = dispatchMessageToView;
        }

        [onDestroy]() {
          this.dispatchMessageToView('farewell');
        }
      }
      expect(Farewell).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'farewell');

      const seen: string[] = [];
      on(kernel, MessageToView, (message: MessageToViewEvent) => seen.push(message.type));

      kernel.destroy();

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(seen, 'what an onDestroy hands to a microtask still reaches the listeners').toEqual(['farewell']);
    });

    it('takes its own subscriptions off once the queued messages are through', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];
      on(kernel, MessageToView, (message: MessageToViewEvent) => seen.push(message.type));

      kernel.destroy();

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(getSubscriptionCount(kernel), 'a destroyed kernel holds no listener of its own').toBe(0);

      kernel.dispatchMessageToView({uuid: generateUUID(), type: 'after'});

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(seen, 'and a message dispatched afterwards reaches nobody').toEqual([]);
    });

    it('takes off a listener registered in the window before the unsubscribe microtask has run', async () => {
      const kernel = new Kernel(new Registry());

      kernel.destroy();

      on(kernel, MessageToView, () => {});

      expect(getSubscriptionCount(kernel), 'the registration in the window lands like any other').toBe(1);

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(getSubscriptionCount(kernel), 'gone once the microtask has run, same as one registered before destroy()').toBe(0);
    });
  });

  describe('an entity teardown with a shadow-object hook that throws', () => {
    // `Registry.findConstructors()` hands the constructors back in registration order, and the kernel
    // notifies the shadow-objects of an entity in the order it created them: the throwing one is the
    // one that comes first, and the sibling behind it is what the case is about.
    const makeEntityWithFailingTeardown = () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];
      const testSignal = createSignal(0);
      const effectFn = vi.fn();

      // Read while the creation scope of the sibling tears down. The entity clears its properties in
      // its own teardown, so a non-empty count here is what tells the two apart in time.
      let propCountDuringScopeTeardown: number | undefined;

      @ShadowObject({registry, token: 'failingTeardown'})
      class FailingTeardown implements OnDestroy {
        [onDestroy]() {
          seen.push('failing');
          throw new Error('this teardown fails');
        }
      }

      @ShadowObject({registry, token: 'failingTeardown'})
      class Sibling implements OnDestroy {
        constructor({onDestroy: onScopeDestroy, createEffect, entity}: ShadowObjectCreationAPI) {
          createEffect(() => {
            effectFn(testSignal.get());
          });
          onScopeDestroy(() => {
            seen.push('sibling scope');
            propCountDuringScopeTeardown = entity.propEntries().length;
          });
        }

        [onDestroy]() {
          seen.push('sibling');
        }
      }

      expect(FailingTeardown).toBeDefined();
      expect(Sibling).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'failingTeardown', undefined, 0, [['label', 'hello']]);

      return {
        kernel,
        uuid,
        entity: kernel.getEntity(uuid),
        seen,
        testSignal,
        effectFn,
        getPropCountDuringScopeTeardown: () => propCountDuringScopeTeardown,
      };
    };

    it('does not hand the throw to the caller', () => {
      const {kernel, uuid} = makeEntityWithFailingTeardown();

      expect(() => kernel.destroyEntity(uuid)).not.toThrow();

      kernel.destroy();
    });

    it('holds neither the entity nor its shadow-objects afterwards', () => {
      const {kernel, uuid} = makeEntityWithFailingTeardown();

      kernel.destroyEntity(uuid);

      expect(kernel.hasEntity(uuid)).toBe(false);
      expect(kernel.findShadowObjects(uuid)).toEqual([]);
      expect(kernel.traverseLevelOrderBFS(), 'the entity is not among the roots either').toEqual([]);

      kernel.destroy();
    });

    it('notifies the shadow-object behind the one that throws', () => {
      const {kernel, uuid, seen} = makeEntityWithFailingTeardown();

      kernel.destroyEntity(uuid);

      expect(seen, 'the failing hook costs its own shadow-object, not the one behind it').toEqual([
        'failing',
        'sibling',
        'sibling scope',
      ]);

      kernel.destroy();
    });

    it('ends the creation scope of the sibling and the entity itself', () => {
      const {kernel, uuid, entity, testSignal, effectFn} = makeEntityWithFailingTeardown();

      kernel.destroyEntity(uuid);

      // Counting from what happened rather than from a fixed number keeps the case off the question
      // whether a fresh effect runs once right away.
      const runs = effectFn.mock.calls.length;

      testSignal.set(1);

      expect(effectFn, 'the scope of the sibling is torn down, effects included').toHaveBeenCalledTimes(runs);
      expect(entity.propEntries(), 'the entity has run its own teardown').toEqual([]);

      kernel.destroy();
    });

    // The three groups listening to the destruction of an entity are told in a fixed order -- the
    // shadow-objects, then their creation scopes, then the entity itself -- and each of them relies on
    // what the one before it leaves standing. The case above pins the first boundary through `seen`;
    // this one pins the second, which `seen` cannot reach because the entity keeps no record of when
    // it ran.
    it('lets the entity release its own state only once every creation scope is through', () => {
      const {kernel, uuid, seen, getPropCountDuringScopeTeardown} = makeEntityWithFailingTeardown();

      kernel.destroyEntity(uuid);

      expect(seen, 'the scopes come after the shadow-objects').toEqual(['failing', 'sibling', 'sibling scope']);
      expect(
        getPropCountDuringScopeTeardown(),
        'a teardown callback still reads the properties of the entity it belongs to',
      ).toBe(1);

      kernel.destroy();
    });
  });

  describe('an entity teardown with a listener on the entity that throws', () => {
    // The kernel tells each shadow-object of an entity on its own and then sends one destruction
    // notification to whatever else listens on that entity. Behind the foreign listeners in that one
    // delivery sit the creation scopes at `Priority.Low` and the entity's own release at
    // `Priority.Min` -- so a foreign listener that throws is in front of both.
    const makeEntityWithBystander = (throwingListener: 'through the creation api' | 'at the highest priority') => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];
      const testSignal = createSignal(0);
      const effectFn = vi.fn();

      // Read while the creation scope of the bystander tears down. The entity clears its properties in
      // its own release, so a non-empty count here is what tells the two apart in time.
      let propCountDuringScopeTeardown: number | undefined;

      @ShadowObject({registry, token: 'withBystander'})
      class Bystander {
        constructor({onDestroy: onScopeDestroy, createEffect, entity}: ShadowObjectCreationAPI) {
          createEffect(() => {
            effectFn(testSignal.get());
          });
          onScopeDestroy(() => {
            seen.push('bystander scope');
            propCountDuringScopeTeardown = entity.propEntries().length;
          });
        }
      }

      // A callback taken through the creation API carries no priority of its own, which puts it at
      // `Priority.Normal` -- ahead of every creation scope and ahead of the entity.
      @ShadowObject({registry, token: 'withBystander'})
      class Saboteur {
        constructor({on: onEntity}: ShadowObjectCreationAPI) {
          if (throwingListener === 'through the creation api') {
            onEntity(onDestroy, () => {
              seen.push('failing listener');
              throw new Error('this listener fails');
            });
          }
        }
      }

      expect(Bystander).toBeDefined();
      expect(Saboteur).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'withBystander', undefined, 0, [['label', 'hello']]);

      const entity = kernel.getEntity(uuid);

      // The other end of the range: nothing about this one comes from the creation API, and it runs
      // before every other listener on the entity. It is where an auto-destructing child registers.
      if (throwingListener === 'at the highest priority') {
        on(entity, onDestroy, Priority.Max, () => {
          seen.push('failing listener');
          throw new Error('this listener fails');
        });
      }

      return {
        kernel,
        uuid,
        entity,
        seen,
        testSignal,
        effectFn,
        getPropCountDuringScopeTeardown: () => propCountDuringScopeTeardown,
      };
    };

    it('leaves the creation scope of a shadow-object its teardown', () => {
      const {kernel, uuid, testSignal, effectFn, seen} = makeEntityWithBystander('through the creation api');

      kernel.destroyEntity(uuid);

      // Counting from what happened rather than from a fixed number keeps the case off the question
      // whether a fresh effect runs once right away.
      const runs = effectFn.mock.calls.length;

      testSignal.set(1);

      expect(seen, 'the failing listener ran').toContain('failing listener');
      expect(effectFn, 'the scope of the bystander is torn down, effects included').toHaveBeenCalledTimes(runs);

      kernel.destroy();
    });

    it('leaves the entity its own release', () => {
      const {kernel, uuid, entity} = makeEntityWithBystander('through the creation api');

      kernel.destroyEntity(uuid);

      expect(entity.propEntries(), 'the entity has run its own release').toEqual([]);

      kernel.destroy();
    });

    it('leaves both to a listener that runs ahead of everything else on the entity', () => {
      const {kernel, uuid, entity, testSignal, effectFn, seen} = makeEntityWithBystander('at the highest priority');

      kernel.destroyEntity(uuid);

      const runs = effectFn.mock.calls.length;

      testSignal.set(1);

      expect(seen, 'the failing listener ran').toEqual(['failing listener', 'bystander scope']);
      expect(effectFn, 'the scope of the bystander is torn down, effects included').toHaveBeenCalledTimes(runs);
      expect(entity.propEntries(), 'the entity has run its own release').toEqual([]);

      kernel.destroy();
    });

    it('releases the entity only once every creation scope is through', () => {
      const {kernel, uuid, getPropCountDuringScopeTeardown} = makeEntityWithBystander('through the creation api');

      kernel.destroyEntity(uuid);

      expect(
        getPropCountDuringScopeTeardown(),
        'a teardown callback still reads the properties of the entity it belongs to',
      ).toBe(1);

      kernel.destroy();
    });

    it('hands the throw to nobody and holds nothing afterwards', () => {
      const {kernel, uuid} = makeEntityWithBystander('through the creation api');

      expect(() => kernel.destroyEntity(uuid)).not.toThrow();

      expect(kernel.hasEntity(uuid)).toBe(false);
      expect(kernel.findShadowObjects(uuid)).toEqual([]);
      expect(kernel.traverseLevelOrderBFS(), 'the entity is not among the roots either').toEqual([]);

      kernel.destroy();
    });
  });

  describe('an entity teardown whose removeFromParent throws', () => {
    // `removeFromParent()` runs first in `destroyEntity()`, ahead of the shadow-object notifications,
    // the creation scopes and the entity's own release. Overwriting the instance method is what stands
    // in for a parent link the detachment cannot walk -- the entity carries no such state on its own
    // that a test could break from the outside.
    it('still notifies the shadow-object, tears down its creation scope and releases the entity', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const seen: string[] = [];

      @ShadowObject({registry, token: 'removeFromParentFails'})
      class Recorder implements OnDestroy {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => {
            seen.push('creation scope');
          });
        }

        [onDestroy]() {
          seen.push('shadow-object hook');
        }
      }
      expect(Recorder).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'removeFromParentFails', undefined, 0, [['label', 'hello']]);

      const entity = kernel.getEntity(uuid);
      entity.removeFromParent = () => {
        throw new Error('removeFromParent fails');
      };

      expect(() => kernel.destroyEntity(uuid)).not.toThrow();

      expect(seen, 'the shadow-object and its creation scope are still notified').toEqual([
        'shadow-object hook',
        'creation scope',
      ]);
      expect(entity.propEntries(), 'the entity has run its own release').toEqual([]);
      expect(kernel.hasEntity(uuid), 'the kernel no longer holds the entity').toBe(false);
      expect(consoleError, 'the failure is reported').toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
    });

    it('leaves the walk over the entity tree, and the kernel teardown behind it, intact', () => {
      const kernel = new Kernel(new Registry());
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const parentUuid = generateUUID();
      const childUuid = generateUUID();
      kernel.createEntity(parentUuid, 'node');
      kernel.createEntity(childUuid, 'node', parentUuid);

      kernel.getEntity(childUuid).removeFromParent = () => {
        throw new Error('removeFromParent fails');
      };

      kernel.destroyEntity(childUuid);

      expect(kernel.hasEntity(childUuid), 'the kernel let the entity go all the same').toBe(false);
      expect(
        kernel.getEntity(parentUuid).children.map((e) => e.uuid),
        'and the detachment that failed left it in the children list of its parent',
      ).toEqual([childUuid]);

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([parentUuid]);
      expect(() => kernel.destroy()).not.toThrow();

      expect(kernel.debugEntityCounts, 'the teardown got all the way through').toEqual({
        entities: 0,
        rootEntities: 0,
        traversal: 0,
        traversalReversed: 0,
      });

      consoleError.mockRestore();
    });
  });

  describe('the destruction notification of an entity', () => {
    // The order the four groups are told in is part of what a teardown callback may rely on: it reads
    // the entity, and the entity is still whole. Anything registered below `Priority.Low` therefore
    // runs behind the creation scopes and still ahead of the entity's own release.
    it('reaches the shadow-objects, the foreign listeners, the creation scopes and the entity in that order', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];

      @ShadowObject({registry, token: 'ordered'})
      class Recorder implements OnDestroy {
        constructor({onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => {
            seen.push('creation scope');
          });
        }

        [onDestroy]() {
          seen.push('shadow-object hook');
        }
      }

      expect(Recorder).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'ordered', undefined, 0, [['label', 'hello']]);

      const entity = kernel.getEntity(uuid);

      let propCountBelowTheScopes: number | undefined;

      on(entity, onDestroy, Priority.Max, () => {
        seen.push('listener at the highest priority');
      });
      on(entity, onDestroy, () => {
        seen.push('listener without a priority');
      });
      on(entity, onDestroy, -20000, () => {
        seen.push('listener below the creation scopes');
        propCountBelowTheScopes = entity.propEntries().length;
      });

      kernel.destroyEntity(uuid);

      expect(seen).toEqual([
        'shadow-object hook',
        'listener at the highest priority',
        'listener without a priority',
        'creation scope',
        'listener below the creation scopes',
      ]);
      expect(propCountBelowTheScopes, 'the entity releases behind the last listener on it').toBe(1);
      expect(entity.propEntries(), 'and it has released once the destruction is through').toEqual([]);

      kernel.destroy();
    });

    // The lowest priority belongs to whoever registers there. Nothing of the kernel's own sits on
    // this notification below the creation scopes, so the delivery runs the whole ladder down and
    // the entity is still whole when the last listener reads it.
    it('delivers a listener on the lowest priority ahead of the release', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'lowest-priority', undefined, 0, [['label', 'hello']]);

      const entity = kernel.getEntity(uuid);

      const seen: string[] = [];
      let propCountAtTheLowestPriority: number | undefined;

      on(entity, onDestroy, Priority.Max, () => seen.push('max'));
      on(entity, onDestroy, Priority.High, () => seen.push('high'));
      on(entity, onDestroy, Priority.Normal, () => seen.push('normal'));
      on(entity, onDestroy, Priority.Low, () => seen.push('low'));
      on(entity, onDestroy, Priority.Min, () => {
        seen.push('min');
        propCountAtTheLowestPriority = entity.propEntries().length;
      });

      kernel.destroyEntity(uuid);

      expect(seen, 'every step of the ladder is delivered').toEqual(['max', 'high', 'normal', 'low', 'min']);
      expect(propCountAtTheLowestPriority, 'and the entity is whole when the last one runs').toBe(1);
      expect(entity.propEntries(), 'it releases once the delivery is through').toEqual([]);

      kernel.destroy();
    });

    // A subscription taken through the creation API belongs to the creation scope that handed it
    // out, and that scope tears down at `Priority.Low` and releases everything it handed out. A
    // shadow object therefore cannot reach below its own scope this way -- the entity-side listener
    // next to it, registered directly, is reached.
    it('leaves a creation-api subscription below the creation scopes unreached', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const seen: string[] = [];

      @ShadowObject({registry, token: 'scoped-listener'})
      class ScopedListener {
        constructor({on: onEntity, onDestroy: onScopeDestroy}: ShadowObjectCreationAPI) {
          onScopeDestroy(() => seen.push('creation scope'));
          onEntity(onDestroy, Priority.Min, () => seen.push('creation api at the lowest priority'));
        }
      }

      expect(ScopedListener).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'scoped-listener');

      const entity = kernel.getEntity(uuid);
      on(entity, onDestroy, Priority.Min, () => seen.push('listener at the lowest priority'));

      kernel.destroyEntity(uuid);

      expect(seen).toEqual(['creation scope', 'listener at the lowest priority']);

      kernel.destroy();
    });

    // The release of an entity is reachable from outside: `kernel.getEntity(uuid)` hands the entity over,
    // and the method the kernel calls directly behind the destruction notification is the same one that
    // caller can call. That it happens once is a promise to whoever holds an entity, and the kernel builds
    // on it: it calls the release itself, and a caller who called it first pays nothing for the second one.
    it('releases the entity once, however often the release is called', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const uuid = generateUUID();
      const childUuid = generateUUID();

      kernel.createEntity(uuid, 'released-once', undefined, 0, [['label', 'hello']]);
      kernel.createEntity(childUuid, 'released-once', uuid);

      const entity = kernel.getEntity(uuid);

      kernel.destroyEntity(uuid);

      const afterDestruction = {
        props: entity.propEntries(),
        children: entity.children.length,
        parent: entity.parent,
      };

      expect(() => {
        entity[onDestroy]();
        entity[onDestroy]();
      }, 'a repeated release does not throw').not.toThrow();

      expect(entity.propEntries()).toEqual(afterDestruction.props);
      expect(entity.children.length).toBe(afterDestruction.children);
      expect(entity.parent).toBe(afterDestruction.parent);
      expect(kernel.hasEntity(uuid), 'and it leaves the kernel where it is').toBe(false);

      kernel.destroy();
    });
  });
});
