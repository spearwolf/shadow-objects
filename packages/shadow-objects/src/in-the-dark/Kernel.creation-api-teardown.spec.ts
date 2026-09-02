import {emit, getSubscriptionCount} from '@spearwolf/eventize';
import {getLinksCount, getSignalsCount, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {onDestroy} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject, shadowObjects} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('Shadow Object Creation API', () => {
    // Cross-cutting: `provideContext`, `provideGlobalContext`, `useContext`, `useParentContext`
    // and `useProperty` each keep a signal (and, past the first call per name, a link to the
    // entity-level source) alive for as long as the shadow-object lives. The first two cases below
    // exercise all five members on one shadow-object and check the *global* signalize registry
    // before and after teardown, on both of the paths a shadow-object can leave by -- catching a
    // dropped cleanup line regardless of which of the five it belongs to. The third takes the
    // remaining way into a teardown: a constructor that allocates and then throws, leaving a scope
    // the kernel tears down without a shadow-object ever coming out of it.
    //
    // Each case runs a throwaway "warm-up" shadow-object through the same names first. Reading or
    // providing a context for the first time on an entity also lazily allocates an entity-level (or,
    // for `provideGlobalContext`, kernel-level) signal that outlives any single shadow-object and
    // would otherwise show up as noise in the registry counts; the warm-up settles that allocation
    // before the baseline is taken, so the counts that remain are the shadow-object's own.
    //
    // `getSignalsCount()` and `getLinksCount()` are registry-wide counters, one pair per process,
    // not per test. The three counting cases below take a baseline and compare against it, which
    // only holds while nothing else in the process allocates or frees a signal in between -- so
    // these three must run sequentially. Marking this file (or this block) `concurrent` breaks them.
    describe('signal cleanup on teardown', () => {
      it('destroys every signal and link the five members allocated when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'signalCleanupWarmupB'})
        class SignalCleanupWarmupB {
          constructor({
            provideContext,
            provideGlobalContext,
            useContext,
            useParentContext,
            useProperty,
          }: ShadowObjectCreationAPI) {
            provideContext('signalCleanupCtxB', 'a');
            provideGlobalContext('signalCleanupGlobalCtxB', 'b');
            useContext('signalCleanupCtxB');
            useParentContext('signalCleanupCtxB');
            useProperty('signalCleanupPropB');
          }
        }

        @ShadowObject({registry, token: 'signalCleanupProbeB'})
        class SignalCleanupProbeB {
          constructor({
            provideContext,
            provideGlobalContext,
            useContext,
            useParentContext,
            useProperty,
          }: ShadowObjectCreationAPI) {
            provideContext('signalCleanupCtxB', 'a');
            provideGlobalContext('signalCleanupGlobalCtxB', 'b');
            useContext('signalCleanupCtxB');
            useParentContext('signalCleanupCtxB');
            useProperty('signalCleanupPropB');
          }
        }

        @ShadowObject({registry, token: 'signalCleanupEmptyB'})
        class SignalCleanupEmptyB {}

        expect(SignalCleanupWarmupB).toBeDefined();
        expect(SignalCleanupProbeB).toBeDefined();
        expect(SignalCleanupEmptyB).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'signalCleanupWarmupB', undefined, 0, [['signalCleanupPropB', 'x']]);
        kernel.changeToken(uuid, 'signalCleanupEmptyB');

        const baselineSignals = getSignalsCount();
        const baselineLinks = getLinksCount();

        kernel.changeToken(uuid, 'signalCleanupProbeB');
        expect(getSignalsCount()).toBeGreaterThan(baselineSignals);
        expect(getLinksCount()).toBeGreaterThan(baselineLinks);

        kernel.changeToken(uuid, 'signalCleanupEmptyB');
        expect(getSignalsCount()).toBe(baselineSignals);
        expect(getLinksCount()).toBe(baselineLinks);

        kernel.destroy();
      });

      it('destroys every signal and link the five members allocated when the entity is destroyed', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'signalCleanupWarmupA'})
        class SignalCleanupWarmupA {
          constructor({
            provideContext,
            provideGlobalContext,
            useContext,
            useParentContext,
            useProperty,
          }: ShadowObjectCreationAPI) {
            provideContext('signalCleanupCtxA', 'a');
            provideGlobalContext('signalCleanupGlobalCtxA', 'b');
            useContext('signalCleanupCtxA');
            useParentContext('signalCleanupCtxA');
            useProperty('signalCleanupPropA');
          }
        }

        @ShadowObject({registry, token: 'signalCleanupProbeA'})
        class SignalCleanupProbeA {
          constructor({
            provideContext,
            provideGlobalContext,
            useContext,
            useParentContext,
            useProperty,
          }: ShadowObjectCreationAPI) {
            provideContext('signalCleanupCtxA', 'a');
            provideGlobalContext('signalCleanupGlobalCtxA', 'b');
            useContext('signalCleanupCtxA');
            useParentContext('signalCleanupCtxA');
            useProperty('signalCleanupPropA');
          }
        }

        expect(SignalCleanupWarmupA).toBeDefined();
        expect(SignalCleanupProbeA).toBeDefined();

        const warmupUuid = generateUUID();
        kernel.createEntity(warmupUuid, 'signalCleanupWarmupA', undefined, 0, [['signalCleanupPropA', 'x']]);
        kernel.destroyEntity(warmupUuid);

        const baselineSignals = getSignalsCount();
        const baselineLinks = getLinksCount();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'signalCleanupProbeA', undefined, 0, [['signalCleanupPropA', 'x']]);
        expect(getSignalsCount()).toBeGreaterThan(baselineSignals);
        expect(getLinksCount()).toBeGreaterThan(baselineLinks);

        kernel.destroyEntity(uuid);
        expect(getSignalsCount()).toBe(baselineSignals);
        expect(getLinksCount()).toBe(baselineLinks);

        kernel.destroy();
      });

      it('destroys every signal and link a constructor allocated before it threw', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'signalCleanupWarmupC'})
        class SignalCleanupWarmupC {
          constructor({
            provideContext,
            provideGlobalContext,
            useContext,
            useParentContext,
            useProperty,
          }: ShadowObjectCreationAPI) {
            provideContext('signalCleanupCtxC', 'a');
            provideGlobalContext('signalCleanupGlobalCtxC', 'b');
            useContext('signalCleanupCtxC');
            useParentContext('signalCleanupCtxC');
            useProperty('signalCleanupPropC');
          }
        }

        // The constructor allocates all five members and only then throws, so the scope the kernel
        // tears down is one that was never handed to a shadow-object.
        @ShadowObject({registry, token: 'signalCleanupThrowingC'})
        class SignalCleanupThrowingC {
          constructor({
            provideContext,
            provideGlobalContext,
            useContext,
            useParentContext,
            useProperty,
          }: ShadowObjectCreationAPI) {
            provideContext('signalCleanupCtxC', 'a');
            provideGlobalContext('signalCleanupGlobalCtxC', 'b');
            useContext('signalCleanupCtxC');
            useParentContext('signalCleanupCtxC');
            useProperty('signalCleanupPropC');
            throw new Error('this constructor fails');
          }
        }

        @ShadowObject({registry, token: 'signalCleanupEmptyC'})
        class SignalCleanupEmptyC {}

        expect(SignalCleanupWarmupC).toBeDefined();
        expect(SignalCleanupThrowingC).toBeDefined();
        expect(SignalCleanupEmptyC).toBeDefined();

        // The warm-up settles the lazy entity-level and kernel-level allocations for these names,
        // as in the two cases above. It runs on an entity of its own, because the entity carrying
        // the failing constructor is rolled back and cannot serve as the one holding the baseline.
        const warmupUuid = generateUUID();
        kernel.createEntity(warmupUuid, 'signalCleanupWarmupC', undefined, 0, [['signalCleanupPropC', 'x']]);
        kernel.changeToken(warmupUuid, 'signalCleanupEmptyC');

        const baselineSignals = getSignalsCount();
        const baselineLinks = getLinksCount();

        const uuid = generateUUID();
        expect(() => kernel.createEntity(uuid, 'signalCleanupThrowingC', undefined, 0, [['signalCleanupPropC', 'x']])).toThrow(
          'this constructor fails',
        );

        expect(getSignalsCount(), 'nothing the failed constructor allocated is left behind').toBe(baselineSignals);
        expect(getLinksCount()).toBe(baselineLinks);

        kernel.destroy();
      });

      // The teardown walks the three callback sets first and destroys those five signal maps only
      // afterwards. A destroyed signal keeps its value but stops notifying, so a write made from an
      // `onDestroy` callback travels down the link to the entity-level context signal -- and on to
      // a child reading it -- only as long as the signals outlive the callbacks. The link carrying
      // that write is cut in the last of the three sets, after every other cleanup callback, so the
      // same reach belongs to a write from a `createEffect` cleanup or a `createResource` teardown,
      // which are called from the set before it.
      it('runs the onDestroy callbacks before it destroys the signals the creation API handed out', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'farewellProvider'})
        class FarewellProvider {
          constructor({provideContext, onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            const provider = provideContext('farewellContext', 'first', {clearOnDestroy: false});
            registerDestroy(() => {
              provider.set('farewell');
            });
          }
        }

        @ShadowObject({registry, token: 'farewellProviderEmpty'})
        class FarewellProviderEmpty {}

        expect(FarewellProvider).toBeDefined();
        expect(FarewellProviderEmpty).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'farewellProvider');
        kernel.createEntity(childUuid, 'farewellProviderChild', parentUuid);

        const childContext = kernel.getEntity(childUuid).useContext('farewellContext');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(childContext)).toBe('first');

        kernel.changeToken(parentUuid, 'farewellProviderEmpty');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(childContext)).toBe('farewell');

        kernel.destroy();
      });
    });

    describe('onDestroy', () => {
      it('should call onDestroy callback when entity is destroyed', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const destroyCallback = vi.fn();

        @ShadowObject({registry, token: 'testOnDestroy'})
        class TestOnDestroy {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(destroyCallback);
          }
        }
        expect(TestOnDestroy).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testOnDestroy');

        expect(destroyCallback).not.toHaveBeenCalled();

        kernel.destroyEntity(uuid);

        expect(destroyCallback).toHaveBeenCalledTimes(1);
      });

      it('should call multiple onDestroy callbacks in order', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const callOrder: number[] = [];

        @ShadowObject({registry, token: 'testMultipleOnDestroy'})
        class TestMultipleOnDestroy {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => callOrder.push(1));
            registerDestroy(() => callOrder.push(2));
            registerDestroy(() => callOrder.push(3));
          }
        }
        expect(TestMultipleOnDestroy).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testMultipleOnDestroy');
        kernel.destroyEntity(uuid);

        expect(callOrder).toHaveLength(3);
        expect(callOrder).toContain(1);
        expect(callOrder).toContain(2);
        expect(callOrder).toContain(3);
      });

      it('should call onDestroy callback when the shadow-object leaves the set on a route change', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const destroyCallback = vi.fn();

        @ShadowObject({registry, token: 'routeHost'})
        class RouteHost {}

        @ShadowObject({registry, token: 'routedByFlag'})
        class RoutedByFlag {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(destroyCallback);
          }
        }

        expect(RouteHost).toBeDefined();
        expect(RoutedByFlag).toBeDefined();

        registry.appendRoute('@flag', ['routedByFlag']);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'routeHost', undefined, 0, [['flag', true]]);

        expect(kernel.findShadowObjects(uuid)).toHaveLength(2);
        expect(destroyCallback).not.toHaveBeenCalled();

        kernel.changeProperties(uuid, [['flag', false]]);

        expect(kernel.findShadowObjects(uuid)).toHaveLength(1);
        expect(destroyCallback).toHaveBeenCalledTimes(1);
      });

      it('should call onDestroy callback when the shadow-object leaves the set on a token change', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const destroyCallback = vi.fn();

        @ShadowObject({registry, token: 'tokenBefore'})
        class TokenBefore {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(destroyCallback);
          }
        }

        @ShadowObject({registry, token: 'tokenAfter'})
        class TokenAfter {}

        expect(TokenBefore).toBeDefined();
        expect(TokenAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'tokenBefore');

        expect(destroyCallback).not.toHaveBeenCalled();

        kernel.changeToken(uuid, 'tokenAfter');

        expect(destroyCallback).toHaveBeenCalledTimes(1);
      });

      it('should unsubscribe the creation-API listeners when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const eventHandler = vi.fn();
        const emitter = {};

        @ShadowObject({registry, token: 'listenerBefore'})
        class ListenerBefore {
          constructor({on: subscribe}: ShadowObjectCreationAPI) {
            subscribe(emitter, 'ping', eventHandler);
          }
        }

        @ShadowObject({registry, token: 'listenerAfter'})
        class ListenerAfter {}

        expect(ListenerBefore).toBeDefined();
        expect(ListenerAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'listenerBefore');

        emit(emitter, 'ping');
        expect(eventHandler).toHaveBeenCalledTimes(1);

        kernel.changeToken(uuid, 'listenerAfter');
        eventHandler.mockClear();

        emit(emitter, 'ping');
        expect(eventHandler).not.toHaveBeenCalled();
      });

      it('should call onDestroy exactly once when the constructor leaves the set and enters it again', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const constructions: object[] = [];
        const destroyed: object[] = [];

        @ShadowObject({registry, token: 'toggleHost'})
        class ToggleHost {}

        @ShadowObject({registry, token: 'toggled'})
        class Toggled {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            constructions.push(this);
            registerDestroy(() => destroyed.push(this));
          }
        }

        expect(ToggleHost).toBeDefined();
        expect(Toggled).toBeDefined();

        registry.appendRoute('@flag', ['toggled']);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'toggleHost', undefined, 0, [['flag', true]]);

        expect(constructions).toHaveLength(1);

        kernel.changeProperties(uuid, [['flag', false]]);
        kernel.changeProperties(uuid, [['flag', true]]);

        // the second run is a new instance -- the first one must have been torn down once,
        // and the fresh one must still be alive
        expect(constructions).toHaveLength(2);
        expect(constructions[0]).not.toBe(constructions[1]);
        expect(destroyed).toEqual([constructions[0]]);
      });

      it('should call onDestroy exactly once when the entity is destroyed after the shadow-object already left the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const destroyCallback = vi.fn();

        @ShadowObject({registry, token: 'leaveThenDestroyHost'})
        class LeaveThenDestroyHost {}

        @ShadowObject({registry, token: 'leaveThenDestroy'})
        class LeaveThenDestroy {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(destroyCallback);
          }
        }

        expect(LeaveThenDestroyHost).toBeDefined();
        expect(LeaveThenDestroy).toBeDefined();

        registry.appendRoute('@flag', ['leaveThenDestroy']);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'leaveThenDestroyHost', undefined, 0, [['flag', true]]);

        kernel.changeProperties(uuid, [['flag', false]]);
        expect(destroyCallback).toHaveBeenCalledTimes(1);

        kernel.destroyEntity(uuid);

        expect(destroyCallback).toHaveBeenCalledTimes(1);
      });

      it('should leave no subscription on the entity behind when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'subscriptionHost'})
        class SubscriptionHost {}

        @ShadowObject({registry, token: 'subscriptionGuest'})
        class SubscriptionGuest {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => {});
          }
        }

        expect(SubscriptionHost).toBeDefined();
        expect(SubscriptionGuest).toBeDefined();

        registry.appendRoute('@flag', ['subscriptionGuest']);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'subscriptionHost');
        const entity = kernel.getEntity(uuid);

        const baseline = getSubscriptionCount(entity);

        kernel.changeProperties(uuid, [['flag', true]]);
        expect(getSubscriptionCount(entity)).toBeGreaterThan(baseline);

        kernel.changeProperties(uuid, [['flag', false]]);

        expect(getSubscriptionCount(entity)).toBe(baseline);
      });

      it('should call onDestroy only once when the callback itself drops the shadow-object during entity destruction', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const uuid = generateUUID();
        let calls = 0;

        @ShadowObject({registry, token: 'reentrantBefore'})
        class ReentrantBefore {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => {
              calls += 1;
              // Reaching back into the kernel from a destroy callback finds the shadow-object still
              // listed for its constructor -- the entry is cleaned up after the callbacks have run.
              if (calls === 1) {
                kernel.changeToken(uuid, 'reentrantAfter');
              }
            });
          }
        }

        @ShadowObject({registry, token: 'reentrantAfter'})
        class ReentrantAfter {}

        expect(ReentrantBefore).toBeDefined();
        expect(ReentrantAfter).toBeDefined();

        kernel.createEntity(uuid, 'reentrantBefore');

        kernel.destroyEntity(uuid);

        expect(calls).toBe(1);
      });

      it('runs the onDestroy callbacks before it takes the creation-API subscriptions off', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const emitter = {};
        const handler = vi.fn();

        @ShadowObject({registry, token: 'orderOfTeardown'})
        class OrderOfTeardown {
          constructor({on: subscribe, onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            subscribe(emitter, 'ping', handler);
            registerDestroy(() => {
              // If the creation-API's own subscriptions were already gone by this point, this
              // emit would reach nobody.
              emit(emitter, 'ping', 'last call');
            });
          }
        }
        expect(OrderOfTeardown).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'orderOfTeardown');

        kernel.destroyEntity(uuid);

        expect(handler).toHaveBeenCalledWith('last call');

        kernel.destroy();
      });
    });

    describe('a teardown callback that throws', () => {
      it('runs the remaining onDestroy callbacks of the same shadow-object', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const callOrder: number[] = [];

        @ShadowObject({registry, token: 'throwingOnDestroyOrder'})
        class ThrowingOnDestroyOrder {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => {
              callOrder.push(1);
              throw new Error('first callback fails');
            });
            registerDestroy(() => callOrder.push(2));
            registerDestroy(() => callOrder.push(3));
          }
        }
        expect(ThrowingOnDestroyOrder).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'throwingOnDestroyOrder');

        expect(() => kernel.destroyEntity(uuid)).not.toThrow();

        expect(callOrder).toEqual([1, 2, 3]);

        consoleError.mockRestore();
      });

      it('lets the other shadow-objects of the entity reach their teardown', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const secondDestroyed = vi.fn();

        class ThrowsOnDestroy {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => {
              throw new Error('first shadow-object fails to tear down');
            });
          }
        }

        class ReachesTeardown {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(secondDestroyed);
          }
        }

        shadowObjects.define('twoShadowObjectsTeardown', ThrowsOnDestroy, registry);
        shadowObjects.define('twoShadowObjectsTeardown', ReachesTeardown, registry);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'twoShadowObjectsTeardown');

        expect(() => kernel.destroyEntity(uuid)).not.toThrow();

        expect(secondDestroyed).toHaveBeenCalledTimes(1);

        consoleError.mockRestore();
      });

      it('leaves the kernel without the entity', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        @ShadowObject({registry, token: 'throwsOnDestroyEntityGone'})
        class ThrowsOnDestroyEntityGone {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => {
              throw new Error('teardown fails');
            });
          }
        }
        expect(ThrowsOnDestroyEntityGone).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'throwsOnDestroyEntityGone');

        kernel.destroyEntity(uuid);

        expect(kernel.hasEntity(uuid)).toBe(false);
        expect(kernel.traverseLevelOrderBFS()).toEqual([]);

        consoleError.mockRestore();
      });

      it('releases what the creation api handed out when a createResource cleanup throws', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        class BaseTheme {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext('theme', 'dark');
          }
        }

        class OverlayTheme {
          constructor({provideContext, createResource}: ShadowObjectCreationAPI) {
            provideContext('theme', 'stale');
            createResource(
              () => 'resource',
              () => {
                throw new Error('cleanup fails');
              },
            );
          }
        }

        shadowObjects.define('themeBaseOnly', BaseTheme, registry);
        shadowObjects.define('themeBoth', BaseTheme, registry);
        shadowObjects.define('themeBoth', OverlayTheme, registry);

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        // Starts without OverlayTheme, so the signal count taken below is a baseline neither its
        // provider signal nor its resource signal are part of yet -- BaseTheme and the child stay
        // in the set on both changes and contribute nothing to the delta this case measures.
        kernel.createEntity(parentUuid, 'themeBaseOnly');
        kernel.createEntity(childUuid, 'themeChild', parentUuid);

        const childContext = kernel.getEntity(childUuid).useContext('theme');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(childContext)).toBe('dark');

        const baselineSignals = getSignalsCount();

        kernel.changeToken(parentUuid, 'themeBoth');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(childContext)).toBe('stale');
        expect(getSignalsCount(), 'OverlayTheme allocated a provider signal and a resource signal').toBeGreaterThan(
          baselineSignals,
        );

        expect(() => kernel.changeToken(parentUuid, 'themeBaseOnly')).not.toThrow();

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(childContext)).toBe('dark');
        expect(getSignalsCount(), 'the resource signal is released even though its cleanup throws').toBe(baselineSignals);

        consoleError.mockRestore();

        kernel.destroy();
      });

      it('reports the failure through the console instead of throwing', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const failure = new Error('teardown fails');

        class ThrowsOnDestroyReported {
          constructor({onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
            registerDestroy(() => {
              throw failure;
            });
          }
        }

        shadowObjects.define('reportsThroughConsole', ThrowsOnDestroyReported, registry);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'reportsThroughConsole');

        kernel.destroyEntity(uuid);

        expect(consoleError).toHaveBeenCalledTimes(1);
        const args = consoleError.mock.calls[0];
        expect(args).toContain('ThrowsOnDestroyReported');
        expect(args).toContain(failure);

        consoleError.mockRestore();
      });

      it('lets the token-change teardown of a shadow-object finish when a listener on the shadow-object itself throws', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        let targetInstance: object | undefined;

        const targetHeardPing = vi.fn();

        // The instance is captured through its own constructor, not returned by `shadowObjects.define()`
        // -- the creation API only ever hands the shadow-object its own capabilities, never a way to
        // reach another one, so a real caller of `on(otherShadowObject, onDestroy, …)` needs a
        // reference of its own to give it, the same way this fixture does.
        // `ping()` makes the entity subscription observable: the kernel adds every shadow-object to
        // the entity as an object listener, so an event of that name reaches the method as long as
        // the subscription stands.
        class Target {
          constructor() {
            targetInstance = this;
          }

          ping() {
            targetHeardPing();
          }
        }

        class Listener {
          constructor({on: subscribe}: ShadowObjectCreationAPI) {
            subscribe(targetInstance!, onDestroy, () => {
              throw new Error('listener on the shadow-object fails');
            });
          }
        }

        shadowObjects.define('listenerBoth', Target, registry);
        shadowObjects.define('listenerBoth', Listener, registry);
        shadowObjects.define('listenerOnly', Listener, registry);

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'listenerBoth');

        expect(kernel.findShadowObjects(uuid)).toHaveLength(2);

        const entity = kernel.getEntity(uuid);

        emit(entity, 'ping');
        expect(targetHeardPing).toHaveBeenCalledTimes(1);

        // Target leaves the set, Listener stays -- destroying Target reaches the listener Listener
        // put directly on Target's own `onDestroy` notification, which is what throws here.
        expect(() => kernel.changeToken(uuid, 'listenerOnly')).not.toThrow();

        expect(kernel.findShadowObjects(uuid)).toHaveLength(1);

        // The second half of the same teardown: Target is off the entity as well, so an event the
        // entity receives after the token change no longer reaches it.
        emit(entity, 'ping');
        expect(targetHeardPing).toHaveBeenCalledTimes(1);

        consoleError.mockRestore();

        kernel.destroy();
      });
    });
  });
});
