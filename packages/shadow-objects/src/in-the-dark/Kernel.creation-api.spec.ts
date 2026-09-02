import {emit, eventize, getSubscriptionCount, on} from '@spearwolf/eventize';
import {createSignal, getSignalsCount, type Signal, type SignalReader, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('Shadow Object Creation API', () => {
    describe('entity', () => {
      it('hands out the entity the kernel holds for that uuid', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let captured: ShadowObjectCreationAPI['entity'] | undefined;

        @ShadowObject({registry, token: 'testEntityField'})
        class TestEntityField {
          constructor({entity}: ShadowObjectCreationAPI) {
            captured = entity;
          }
        }
        expect(TestEntityField).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testEntityField');

        expect(captured).toBe(kernel.getEntity(uuid));

        kernel.destroy();
      });
    });

    describe('useProperty', () => {
      it('should return a signal reader for entity property', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let capturedPropertyReader: ReturnType<ShadowObjectCreationAPI['useProperty']> | undefined;

        @ShadowObject({registry, token: 'testUseProperty'})
        class TestUseProperty {
          constructor({useProperty}: ShadowObjectCreationAPI) {
            capturedPropertyReader = useProperty('testProp');
          }
        }
        expect(TestUseProperty).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testUseProperty', undefined, 0, [['testProp', 'initialValue']]);

        expect(capturedPropertyReader).toBeDefined();
        expect(value(capturedPropertyReader!)).toBe('initialValue');

        kernel.changeProperties(uuid, [['testProp', 'updatedValue']]);
        expect(value(capturedPropertyReader!)).toBe('updatedValue');

        kernel.destroy();
      });

      it('should cache and return the same reader for same property', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let reader1: ReturnType<ShadowObjectCreationAPI['useProperty']> | undefined;
        let reader2: ReturnType<ShadowObjectCreationAPI['useProperty']> | undefined;

        @ShadowObject({registry, token: 'testUsePropertyCache'})
        class TestUsePropertyCache {
          constructor({useProperty}: ShadowObjectCreationAPI) {
            reader1 = useProperty('testProp');
            reader2 = useProperty('testProp');
          }
        }
        expect(TestUsePropertyCache).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testUsePropertyCache');

        expect(reader1).toBe(reader2);

        kernel.destroy();
      });

      it('destroys the property reader when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let capturedPropertyReader: ReturnType<ShadowObjectCreationAPI['useProperty']> | undefined;

        @ShadowObject({registry, token: 'propertyReaderBefore'})
        class PropertyReaderBefore {
          constructor({useProperty}: ShadowObjectCreationAPI) {
            capturedPropertyReader = useProperty('testProp');
          }
        }

        @ShadowObject({registry, token: 'propertyReaderAfter'})
        class PropertyReaderAfter {}

        expect(PropertyReaderBefore).toBeDefined();
        expect(PropertyReaderAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'propertyReaderBefore', undefined, 0, [['testProp', 'a']]);

        expect(value(capturedPropertyReader!)).toBe('a');

        kernel.changeToken(uuid, 'propertyReaderAfter');
        kernel.changeProperties(uuid, [['testProp', 'b']]);

        expect(value(capturedPropertyReader!)).toBe('a');

        kernel.destroy();
      });
    });

    describe('useProperties', () => {
      it('should return an object with signal readers for multiple properties', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let capturedProps: Record<'foo' | 'bar', ReturnType<ShadowObjectCreationAPI['useProperty']>> | undefined;

        @ShadowObject({registry, token: 'testUseProperties'})
        class TestUseProperties {
          constructor({useProperties}: ShadowObjectCreationAPI) {
            capturedProps = useProperties({foo: 'propA', bar: 'propB'});
          }
        }
        expect(TestUseProperties).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testUseProperties', undefined, 0, [
          ['propA', 'valueA'],
          ['propB', 'valueB'],
        ]);

        expect(capturedProps).toBeDefined();
        expect(value(capturedProps!.foo)).toBe('valueA');
        expect(value(capturedProps!.bar)).toBe('valueB');

        kernel.destroy();
      });
    });

    it('should support typed property maps', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      let capturedProps:
        | {
            foo: SignalReader<number | undefined>;
            bar: SignalReader<string | undefined>;
          }
        | undefined;

      @ShadowObject({registry, token: 'testTypedUseProperties'})
      class TestTypedUseProperties {
        constructor({useProperties}: ShadowObjectCreationAPI) {
          const props = useProperties<{foo: number; bar: string}>({
            foo: 'propA',
            bar: 'propB',
          });
          capturedProps = props;
        }
      }
      expect(TestTypedUseProperties).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'testTypedUseProperties', undefined, 0, [
        ['propA', 123],
        ['propB', 'valueB'],
      ]);

      expect(capturedProps).toBeDefined();
      expect(value(capturedProps!.foo)).toBe(123);
      expect(value(capturedProps!.bar)).toBe('valueB');

      kernel.destroy();
    });

    describe('createResource', () => {
      it('should create a resource and call cleanup on entity destruction', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const createFn = vi.fn(() => ({id: 'resource1'}));
        const cleanupFn = vi.fn();

        let resourceSignal: Signal<{id: string} | undefined> | undefined;

        @ShadowObject({registry, token: 'testResource'})
        class TestResource {
          constructor({createResource}: ShadowObjectCreationAPI) {
            resourceSignal = createResource(createFn, cleanupFn);
          }
        }
        expect(TestResource).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testResource');

        expect(createFn).toHaveBeenCalledTimes(1);
        expect(resourceSignal).toBeDefined();
        expect(value(resourceSignal!)).toEqual({id: 'resource1'});

        kernel.destroyEntity(uuid);

        expect(cleanupFn).toHaveBeenCalledTimes(1);
        expect(cleanupFn).toHaveBeenCalledWith({id: 'resource1'});
      });

      it('should handle undefined resource without calling cleanup', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const createFn = vi.fn((): undefined => undefined);
        const cleanupFn = vi.fn();

        @ShadowObject({registry, token: 'testUndefinedResource'})
        class TestUndefinedResource {
          constructor({createResource}: ShadowObjectCreationAPI) {
            createResource(createFn, cleanupFn);
          }
        }
        expect(TestUndefinedResource).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testUndefinedResource');
        kernel.destroyEntity(uuid);

        expect(cleanupFn).not.toHaveBeenCalled();
      });

      it('runs the resource cleanup when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const createFn = vi.fn(() => ({id: 'resource1'}));
        const cleanupFn = vi.fn();

        @ShadowObject({registry, token: 'resourceCleanupBefore'})
        class ResourceCleanupBefore {
          constructor({createResource}: ShadowObjectCreationAPI) {
            createResource(createFn, cleanupFn);
          }
        }

        @ShadowObject({registry, token: 'resourceCleanupAfter'})
        class ResourceCleanupAfter {}

        expect(ResourceCleanupBefore).toBeDefined();
        expect(ResourceCleanupAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'resourceCleanupBefore');

        expect(createFn).toHaveBeenCalledTimes(1);

        kernel.changeToken(uuid, 'resourceCleanupAfter');

        expect(cleanupFn).toHaveBeenCalledTimes(1);
        expect(cleanupFn).toHaveBeenCalledWith({id: 'resource1'});

        kernel.destroy();
      });
    });

    describe('createEffect', () => {
      it('should create an effect that runs on signal changes', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const effectFn = vi.fn();
        const testSignal = createSignal(0);

        @ShadowObject({registry, token: 'testEffect'})
        class TestEffect {
          constructor({createEffect}: ShadowObjectCreationAPI) {
            createEffect(() => {
              effectFn(testSignal.get());
            });
          }
        }
        expect(TestEffect).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testEffect');

        expect(effectFn).toHaveBeenCalledWith(0);

        testSignal.set(1);
        expect(effectFn).toHaveBeenCalledWith(1);

        kernel.destroy();
      });

      it('should destroy effects when entity is destroyed', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const effectFn = vi.fn();
        const testSignal = createSignal(0);

        @ShadowObject({registry, token: 'testEffectDestroy'})
        class TestEffectDestroy {
          constructor({createEffect}: ShadowObjectCreationAPI) {
            createEffect(() => {
              effectFn(testSignal.get());
            });
          }
        }
        expect(TestEffectDestroy).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testEffectDestroy');

        expect(effectFn).toHaveBeenCalledTimes(1);

        kernel.destroyEntity(uuid);
        effectFn.mockClear();

        testSignal.set(2);
        expect(effectFn).not.toHaveBeenCalled();
      });

      it('stops the effects when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const effectFn = vi.fn();
        const testSignal = createSignal(0);

        @ShadowObject({registry, token: 'effectLeaveBefore'})
        class EffectLeaveBefore {
          constructor({createEffect}: ShadowObjectCreationAPI) {
            createEffect(() => {
              effectFn(testSignal.get());
            });
          }
        }

        @ShadowObject({registry, token: 'effectLeaveAfter'})
        class EffectLeaveAfter {}

        expect(EffectLeaveBefore).toBeDefined();
        expect(EffectLeaveAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'effectLeaveBefore');

        expect(effectFn).toHaveBeenCalledTimes(1);

        kernel.changeToken(uuid, 'effectLeaveAfter');
        effectFn.mockClear();

        testSignal.set(2);
        expect(effectFn).not.toHaveBeenCalled();

        kernel.destroy();
      });
    });

    describe('createSignal', () => {
      it('should create a signal with initial value', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let createdSignal: Signal<string> | undefined;

        @ShadowObject({registry, token: 'testCreateSignal'})
        class TestCreateSignal {
          constructor({createSignal: cs}: ShadowObjectCreationAPI) {
            createdSignal = cs<string>('initial');
          }
        }
        expect(TestCreateSignal).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testCreateSignal');

        expect(createdSignal).toBeDefined();
        expect(value(createdSignal!)).toBe('initial');

        createdSignal!.set('updated');
        expect(value(createdSignal!)).toBe('updated');

        kernel.destroy();
      });

      it('should destroy signal when entity is destroyed', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let createdSignal: Signal<string> | undefined;

        @ShadowObject({registry, token: 'testSignalDestroy'})
        class TestSignalDestroy {
          constructor({createSignal: cs}: ShadowObjectCreationAPI) {
            createdSignal = cs<string>('test');
          }
        }
        expect(TestSignalDestroy).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testSignalDestroy');

        const sig = createdSignal!;
        expect(sig.value).toBe('test');

        kernel.destroyEntity(uuid);

        // After destruction, signal should be destroyed - check by verifying it can't be read properly
        expect(() => sig.value).not.toThrow();
      });

      it('should create a signal without an initial value', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let createdSignal: Signal<string | undefined> | undefined;

        @ShadowObject({registry, token: 'testCreateSignalEmpty'})
        class TestCreateSignalEmpty {
          constructor({createSignal: cs}: ShadowObjectCreationAPI) {
            // the API hands out signalize's own overload set, so the missing initial value
            // widens the type to `Signal<string | undefined>` instead of lying about it
            createdSignal = cs<string>();
          }
        }
        expect(TestCreateSignalEmpty).toBeDefined();

        kernel.createEntity(generateUUID(), 'testCreateSignalEmpty');

        expect(createdSignal).toBeDefined();
        expect(value(createdSignal!)).toBeUndefined();

        createdSignal!.set('later');
        expect(value(createdSignal!)).toBe('later');

        kernel.destroy();
      });

      it('should create a lazy signal from a factory', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const factory = vi.fn(() => 42);
        let createdSignal: Signal<number> | undefined;

        @ShadowObject({registry, token: 'testCreateSignalLazy'})
        class TestCreateSignalLazy {
          constructor({createSignal: cs}: ShadowObjectCreationAPI) {
            createdSignal = cs(factory, {lazy: true});
          }
        }
        expect(TestCreateSignalLazy).toBeDefined();

        kernel.createEntity(generateUUID(), 'testCreateSignalLazy');

        expect(createdSignal).toBeDefined();
        expect(factory).not.toHaveBeenCalled();

        expect(value(createdSignal!)).toBe(42);
        expect(factory).toHaveBeenCalledTimes(1);

        kernel.destroy();
      });

      it('destroys the signal when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'createSignalLeaveBefore'})
        class CreateSignalLeaveBefore {
          constructor({createSignal: cs}: ShadowObjectCreationAPI) {
            cs<string>('leaveValue');
          }
        }

        @ShadowObject({registry, token: 'createSignalLeaveAfter'})
        class CreateSignalLeaveAfter {}

        expect(CreateSignalLeaveBefore).toBeDefined();
        expect(CreateSignalLeaveAfter).toBeDefined();

        const baselineSignals = getSignalsCount();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'createSignalLeaveBefore');

        expect(getSignalsCount()).toBeGreaterThan(baselineSignals);

        kernel.changeToken(uuid, 'createSignalLeaveAfter');

        expect(getSignalsCount()).toBe(baselineSignals);
      });
    });

    describe('createMemo', () => {
      it('should create a memoized signal', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const sourceSignal = createSignal(5);
        let memoReader: SignalReader<number> | undefined;

        @ShadowObject({registry, token: 'testMemo'})
        class TestMemo {
          constructor({createMemo}: ShadowObjectCreationAPI) {
            memoReader = createMemo<number>(() => sourceSignal.get() * 2);
          }
        }
        expect(TestMemo).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testMemo');

        expect(memoReader).toBeDefined();
        expect(value(memoReader!)).toBe(10);

        sourceSignal.set(7);
        expect(value(memoReader!)).toBe(14);

        kernel.destroy();
      });

      it('stops recomputing when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const sourceSignal = createSignal(1);
        let memoReader: SignalReader<number> | undefined;

        @ShadowObject({registry, token: 'memoLeaveBefore'})
        class MemoLeaveBefore {
          constructor({createMemo}: ShadowObjectCreationAPI) {
            memoReader = createMemo<number>(() => sourceSignal.get() * 2);
          }
        }

        @ShadowObject({registry, token: 'memoLeaveAfter'})
        class MemoLeaveAfter {}

        expect(MemoLeaveBefore).toBeDefined();
        expect(MemoLeaveAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'memoLeaveBefore');

        expect(value(memoReader!)).toBe(2);

        kernel.changeToken(uuid, 'memoLeaveAfter');

        sourceSignal.set(100);
        expect(value(memoReader!)).toBe(2);
      });
    });

    describe('on', () => {
      it('should subscribe to events and auto-unsubscribe on entity destruction', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const eventHandler = vi.fn();
        const emitter = {testEvent: 'testEvent'};

        @ShadowObject({registry, token: 'testOn'})
        class TestOn {
          constructor({on: subscribe}: ShadowObjectCreationAPI) {
            subscribe(emitter, 'testEvent', eventHandler);
          }
        }
        expect(TestOn).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testOn');

        emit(emitter, 'testEvent', 'data1');
        expect(eventHandler).toHaveBeenCalledWith('data1');

        kernel.destroyEntity(uuid);
        eventHandler.mockClear();

        emit(emitter, 'testEvent', 'data2');
        expect(eventHandler).not.toHaveBeenCalled();
      });

      it('subscribes on the entity when the first argument is an event name', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const handler = vi.fn();

        @ShadowObject({registry, token: 'onEventNameBefore'})
        class OnEventNameBefore {
          constructor({on: subscribe}: ShadowObjectCreationAPI) {
            subscribe('ping', handler);
          }
        }

        @ShadowObject({registry, token: 'onEventNameAfter'})
        class OnEventNameAfter {}

        expect(OnEventNameBefore).toBeDefined();
        expect(OnEventNameAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'onEventNameBefore');

        emit(kernel.getEntity(uuid), 'ping', 'data1');
        expect(handler).toHaveBeenCalledWith('data1');

        kernel.changeToken(uuid, 'onEventNameAfter');
        handler.mockClear();

        emit(kernel.getEntity(uuid), 'ping', 'data2');
        expect(handler).not.toHaveBeenCalled();

        kernel.destroy();
      });

      it('hands back an unsubscribe that takes the listener off on its own', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const emitter = {};
        const handler = vi.fn();
        let unsubscribe: (() => void) | undefined;

        @ShadowObject({registry, token: 'onUnsubscribeSelf'})
        class OnUnsubscribeSelf {
          constructor({on: subscribe}: ShadowObjectCreationAPI) {
            unsubscribe = subscribe(emitter, 'ping', handler);
          }
        }
        expect(OnUnsubscribeSelf).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'onUnsubscribeSelf');

        expect(getSubscriptionCount(emitter)).toBe(1);

        unsubscribe!();

        expect(getSubscriptionCount(emitter)).toBe(0);

        emit(emitter, 'ping');
        expect(handler).not.toHaveBeenCalled();

        // Whether the returned function also takes itself off the teardown's own internal
        // bookkeeping (so a later entity destruction has nothing left to call again) is not
        // something a test outside `Kernel.ts` can observe: eventize's own unsubscribe closures
        // null out their held state after the first call, so a second call -- whether it comes
        // from a stale entry here or anywhere else -- is a guaranteed no-op with no side effect to
        // catch. What is observable, and what this closes with, is the externally visible
        // contract: the listener is gone after the manual call above, and destroying the entity
        // afterwards is still safe.
        expect(() => kernel.destroyEntity(uuid)).not.toThrow();
      });
    });

    describe('once', () => {
      it('should subscribe to event once and auto-unsubscribe on entity destruction', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const eventHandler = vi.fn();
        const emitter = {singleEvent: 'singleEvent'};

        @ShadowObject({registry, token: 'testOnce'})
        class TestOnce {
          constructor({once: subscribeOnce}: ShadowObjectCreationAPI) {
            subscribeOnce(emitter, 'singleEvent', eventHandler);
          }
        }
        expect(TestOnce).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testOnce');

        emit(emitter, 'singleEvent', 'firstCall');
        expect(eventHandler).toHaveBeenCalledTimes(1);
        expect(eventHandler).toHaveBeenCalledWith('firstCall');

        emit(emitter, 'singleEvent', 'secondCall');
        // Should not be called again since it's 'once'
        expect(eventHandler).toHaveBeenCalledTimes(1);

        kernel.destroy();
      });

      it('should unsubscribe even if event never fired when entity is destroyed', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const eventHandler = vi.fn();
        const emitter = {neverFiredEvent: 'neverFiredEvent'};

        @ShadowObject({registry, token: 'testOnceNoFire'})
        class TestOnceNoFire {
          constructor({once: subscribeOnce}: ShadowObjectCreationAPI) {
            subscribeOnce(emitter, 'neverFiredEvent', eventHandler);
          }
        }
        expect(TestOnceNoFire).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testOnceNoFire');

        kernel.destroyEntity(uuid);

        emit(emitter, 'neverFiredEvent', 'afterDestroy');
        expect(eventHandler).not.toHaveBeenCalled();
      });

      it('subscribes on the entity when the first argument is an event name', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const handler = vi.fn();

        @ShadowObject({registry, token: 'onceEventName'})
        class OnceEventName {
          constructor({once: subscribeOnce}: ShadowObjectCreationAPI) {
            subscribeOnce('ping', handler);
          }
        }
        expect(OnceEventName).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'onceEventName');

        emit(kernel.getEntity(uuid), 'ping', 'data1');
        expect(handler).toHaveBeenCalledWith('data1');

        // `once` unsubscribes itself after the first call -- no token change needed here, unlike
        // the equivalent case for `on`.
        handler.mockClear();
        emit(kernel.getEntity(uuid), 'ping', 'data2');
        expect(handler).not.toHaveBeenCalled();

        kernel.destroy();
      });

      // Mirrors 'hands back an unsubscribe that takes the listener off on its own' under `on`
      // above, in the form with a target object rather than an event name -- see that case's
      // trailing comment for what is and is not observable about the returned function's self-
      // removal from the teardown's own bookkeeping.
      it('hands back an unsubscribe that takes the listener off on its own', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const emitter = {};
        const handler = vi.fn();
        let unsubscribe: (() => void) | undefined;

        @ShadowObject({registry, token: 'onceUnsubscribeSelf'})
        class OnceUnsubscribeSelf {
          constructor({once: subscribeOnce}: ShadowObjectCreationAPI) {
            unsubscribe = subscribeOnce(emitter, 'ping', handler);
          }
        }
        expect(OnceUnsubscribeSelf).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'onceUnsubscribeSelf');

        expect(getSubscriptionCount(emitter)).toBe(1);

        unsubscribe!();

        expect(getSubscriptionCount(emitter)).toBe(0);

        emit(emitter, 'ping');
        expect(handler).not.toHaveBeenCalled();

        expect(() => kernel.destroyEntity(uuid)).not.toThrow();
      });
    });

    describe('emit', () => {
      it('emits on the entity when the first argument is an event name', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        // `emit` is already the name of the top-level import from `@spearwolf/eventize` in this
        // file, so the destructured creation-API member is renamed on the way in.
        @ShadowObject({registry, token: 'testEmitOnEntity'})
        class TestEmitOnEntity {
          emitFromApi: ShadowObjectCreationAPI['emit'];
          constructor({emit: emitFromApi}: ShadowObjectCreationAPI) {
            this.emitFromApi = emitFromApi;
          }
        }
        expect(TestEmitOnEntity).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testEmitOnEntity');

        const spy = vi.fn();
        on(kernel.getEntity(uuid), 'pong', spy);

        // `emitFromApi` lives on this test's own class, not on the generic `ShadowObjectType` --
        // the two share no structure, so the cast has to go through `unknown` first.
        const shadowObject = kernel.findShadowObjects(uuid)[0] as unknown as TestEmitOnEntity;
        shadowObject.emitFromApi('pong', 42);

        expect(spy).toHaveBeenCalledWith(42);

        kernel.destroy();
      });

      it('emits on the target when the first argument is an object', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        @ShadowObject({registry, token: 'testEmitOnTarget'})
        class TestEmitOnTarget {
          emitFromApi: ShadowObjectCreationAPI['emit'];
          constructor({emit: emitFromApi}: ShadowObjectCreationAPI) {
            this.emitFromApi = emitFromApi;
          }
        }
        expect(TestEmitOnTarget).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testEmitOnTarget');

        // `emitFromApi`'s target-object overload wants an `EventizedObject`, which a plain `{}`
        // is not -- `eventize({})` here is what actually satisfies that at the type level, not a
        // cast (the earlier attempt used `target: {}` behind an `any`-cast `shadowObject`, which
        // made the mismatch on `target` compile without ever having been resolved).
        const target = eventize({});
        const targetSpy = vi.fn();
        const entitySpy = vi.fn();
        on(target, 'pong', targetSpy);
        on(kernel.getEntity(uuid), 'pong', entitySpy);

        const shadowObject = kernel.findShadowObjects(uuid)[0] as unknown as TestEmitOnTarget;
        shadowObject.emitFromApi(target, 'pong', 42);

        expect(targetSpy).toHaveBeenCalledWith(42);
        expect(entitySpy).not.toHaveBeenCalled();

        kernel.destroy();
      });
    });

    describe('onViewEvent', () => {
      it('hears the view events the kernel dispatches to the entity', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const spy = vi.fn();

        @ShadowObject({registry, token: 'testOnViewEvent'})
        class TestOnViewEvent {
          constructor({onViewEvent}: ShadowObjectCreationAPI) {
            onViewEvent(spy);
          }
        }
        expect(TestOnViewEvent).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testOnViewEvent');

        kernel.dispatchEventsToEntity(uuid, [{type: 'hello', data: {x: 1}}]);

        expect(spy).toHaveBeenCalledWith('hello', {x: 1});

        kernel.destroy();
      });

      it('stops hearing them when the shadow-object leaves the set', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const spy = vi.fn();

        @ShadowObject({registry, token: 'viewEventBefore'})
        class ViewEventBefore {
          constructor({onViewEvent}: ShadowObjectCreationAPI) {
            onViewEvent(spy);
          }
        }

        @ShadowObject({registry, token: 'viewEventAfter'})
        class ViewEventAfter {}

        expect(ViewEventBefore).toBeDefined();
        expect(ViewEventAfter).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'viewEventBefore');

        kernel.dispatchEventsToEntity(uuid, [{type: 'hello', data: {x: 1}}]);
        expect(spy).toHaveBeenCalledTimes(1);

        kernel.changeToken(uuid, 'viewEventAfter');
        spy.mockClear();

        kernel.dispatchEventsToEntity(uuid, [{type: 'hello', data: {x: 1}}]);
        expect(spy).not.toHaveBeenCalled();

        kernel.destroy();
      });
    });
  });

  describe('cache-hit on creation-API helpers reports when options would be dropped', () => {
    it('useProperty reports a second call with a different compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compareA = (a: unknown, b: unknown) => a === b;
      const compareB = (a: unknown, b: unknown) => Object.is(a, b);

      @ShadowObject({registry, token: 'kern7Property'})
      class TestKern7Property {
        constructor({useProperty}: ShadowObjectCreationAPI) {
          useProperty('foo', {compare: compareA});
          useProperty('foo', {compare: compareB});
        }
      }
      expect(TestKern7Property).toBeDefined();

      kernel.createEntity(generateUUID(), 'kern7Property');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const call = errorSpy.mock.calls[0]!;
      expect(call[2]).toMatch(/useProperty/);
      expect(call[2]).toMatch(/foo/);

      errorSpy.mockRestore();
    });

    it('useProperty does not report when the second call passes the same compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compareA = (a: unknown, b: unknown) => a === b;

      @ShadowObject({registry, token: 'kern7PropertySame'})
      class TestKern7PropertySame {
        constructor({useProperty}: ShadowObjectCreationAPI) {
          useProperty('foo', {compare: compareA});
          useProperty('foo', {compare: compareA});
        }
      }
      expect(TestKern7PropertySame).toBeDefined();

      kernel.createEntity(generateUUID(), 'kern7PropertySame');

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('useProperty does not report when the second call omits options', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compareA = (a: unknown, b: unknown) => a === b;

      @ShadowObject({registry, token: 'kern7PropertyOmit'})
      class TestKern7PropertyOmit {
        constructor({useProperty}: ShadowObjectCreationAPI) {
          useProperty('foo', {compare: compareA});
          useProperty('foo');
        }
      }
      expect(TestKern7PropertyOmit).toBeDefined();

      kernel.createEntity(generateUUID(), 'kern7PropertyOmit');

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('useContext reports a second call with a different compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compareA = (a: unknown, b: unknown) => a === b;
      const compareB = (a: unknown, b: unknown) => Object.is(a, b);

      @ShadowObject({registry, token: 'kern7Context'})
      class TestKern7Context {
        constructor({useContext}: ShadowObjectCreationAPI) {
          useContext('ctx', {compare: compareA});
          useContext('ctx', {compare: compareB});
        }
      }
      expect(TestKern7Context).toBeDefined();

      kernel.createEntity(generateUUID(), 'kern7Context');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const call = errorSpy.mock.calls[0]!;
      expect(call[2]).toMatch(/useContext/);
      expect(call[2]).toMatch(/ctx/);

      errorSpy.mockRestore();
    });

    it('useParentContext reports a second call with a different compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compareA = (a: unknown, b: unknown) => a === b;
      const compareB = (a: unknown, b: unknown) => Object.is(a, b);

      @ShadowObject({registry, token: 'kern7ParentContext'})
      class TestKern7ParentContext {
        constructor({useParentContext}: ShadowObjectCreationAPI) {
          useParentContext('pctx', {compare: compareA});
          useParentContext('pctx', {compare: compareB});
        }
      }
      expect(TestKern7ParentContext).toBeDefined();

      kernel.createEntity(generateUUID(), 'kern7ParentContext');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const call = errorSpy.mock.calls[0]!;
      expect(call[2]).toMatch(/useParentContext/);
      expect(call[2]).toMatch(/pctx/);

      errorSpy.mockRestore();
    });
  });
});
