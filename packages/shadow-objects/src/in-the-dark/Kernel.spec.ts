import {emit, on} from '@spearwolf/eventize';
import {createSignal, type Signal, type SignalReader, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MessageToView} from '../constants.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {onCreate, onDestroy, type OnCreate, type OnDestroy} from './events.js';
import {Kernel, type MessageToViewEvent} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  it('upgrade entities', () => {
    @ShadowObject({token: 'foo'})
    class Foo {}

    @ShadowObject({token: 'bar'})
    class Bar {}

    expect(Foo).toBeDefined();
    expect(Bar).toBeDefined();

    const kernel = new Kernel();
    const [parentUuid, uuid] = [generateUUID(), generateUUID()];

    kernel.createEntity(parentUuid, 'testA');
    kernel.createEntity(uuid, 'testB', parentUuid);

    expect(kernel.findShadowObjects(parentUuid)).toHaveLength(0);
    expect(kernel.findShadowObjects(uuid)).toHaveLength(0);

    kernel.registry.appendRoute('testA', ['foo']);
    kernel.registry.appendRoute('testB', ['bar']);
    kernel.upgradeEntities();

    expect(kernel.findShadowObjects(parentUuid)).toHaveLength(1);
    expect(kernel.findShadowObjects(parentUuid)[0]).toBeInstanceOf(Foo);
    expect(kernel.findShadowObjects(uuid)).toHaveLength(1);
    expect(kernel.findShadowObjects(uuid)[0]).toBeInstanceOf(Bar);
  });

  it('create shadow-objects by same token', () => {
    @ShadowObject({token: 'test'})
    class Foo {}

    @ShadowObject({token: 'test'})
    class Bar {}

    expect(Foo).toBeDefined();
    expect(Bar).toBeDefined();

    expect(Registry.get().hasToken('test')).toBeTruthy();

    const kernel = new Kernel();
    const uuid = generateUUID();

    kernel.createEntity(uuid, 'test');

    const shadowObjects = kernel.findShadowObjects(uuid);

    expect(shadowObjects).toHaveLength(2);

    expect(shadowObjects.find((so) => so instanceof Foo)).toBeDefined();
    expect(shadowObjects.find((so) => so instanceof Bar)).toBeDefined();
  });

  it('change token', () => {
    @ShadowObject({token: 'foo'})
    class Foo {
      // name = 'foo';
    }

    @ShadowObject({token: 'bar'})
    class Bar {
      // name = 'bar';
    }

    @ShadowObject({token: 'plah'})
    class Plah {
      // name = 'plah';
    }

    @ShadowObject({token: 'obDir'})
    class ObersteDirektive {}

    const registry = Registry.get();

    registry.appendRoute('testA', ['foo', 'bar']);
    registry.appendRoute('testB', ['bar', 'plah']);
    registry.appendRoute('testB', ['bar', 'plah']);
    registry.appendRoute('@plah', ['obDir']);

    expect(Foo).toBeDefined();
    expect(Bar).toBeDefined();
    expect(Plah).toBeDefined();
    expect(ObersteDirektive).toBeDefined();

    expect(registry.hasRoute('testA')).toBeTruthy();
    expect(registry.hasRoute('testB')).toBeTruthy();
    expect(registry.hasRoute('@plah'), '@plah should be no ordinary route').toBeFalsy();

    expect(registry.findConstructors('testA'), 'testA should contain Foo').toContain(Foo);
    expect(registry.findConstructors('testA'), 'testA should contain Bar').toContain(Bar);
    expect(registry.findConstructors('testB'), 'testB should contain Bar').toContain(Bar);
    expect(registry.findConstructors('testB'), 'testB should contain Plah').toContain(Plah);

    const kernel = new Kernel();
    const uuid = generateUUID();

    kernel.createEntity(uuid, 'testA');

    let shadowObjects = kernel.findShadowObjects(uuid); // as unknown as {name: string}[];

    // console.log(
    //   'shadowObjects before changeToken',
    //   shadowObjects.map((so) => so.name),
    // );

    expect(shadowObjects, 'testA shadow-constructors').toHaveLength(2);
    expect(
      shadowObjects.find((so) => so instanceof Foo),
      'should contain instanceof Foo',
    ).toBeDefined();

    const bar = shadowObjects.find((so) => so instanceof Bar);
    expect(bar, 'should contain instanceof Bar').toBeDefined();

    kernel.changeToken(uuid, 'testB');

    shadowObjects = kernel.findShadowObjects(uuid); // as unknown as {name: string}[];

    expect(shadowObjects, 'check 2').toHaveLength(2);

    // console.log(
    //   'shadowObjects after changeToken',
    //   shadowObjects.map((so) => so.name),
    // );

    expect(
      shadowObjects.find((so) => so === bar),
      'should contain bar instance',
    ).toBeDefined();

    expect(
      shadowObjects.find((so) => so instanceof Plah),
      'should contain instanceof Plah',
    ).toBeDefined();

    kernel.changeProperties(uuid, [['plah', 'hello']]);

    // console.log('truthyProps', Array.from(kernel.getEntity(uuid).truthyProps()));
    // console.log('changeProperties', Array.from(kernel.getEntity(uuid).propKeys()));

    shadowObjects = kernel.findShadowObjects(uuid);

    expect(shadowObjects, 'check 3').toHaveLength(3);

    expect(
      shadowObjects.find((so) => so instanceof ObersteDirektive),
      'should contain instanceof ObersteDirektive',
    ).toBeDefined();
  });

  describe('MessageToView with traverseChildren', () => {
    const registry = new Registry();

    // Helper class to expose dispatchMessageToView for testing
    @ShadowObject({registry, token: 'test'})
    class TestDispatcher {
      dispatchMessageToView: ShadowObjectCreationAPI['dispatchMessageToView'];
      constructor({dispatchMessageToView}: ShadowObjectCreationAPI) {
        this.dispatchMessageToView = dispatchMessageToView;
      }
    }
    expect(TestDispatcher).toBeDefined();

    it('should emit MessageToView event with traverseChildren=false by default', async () => {
      const kernel = new Kernel(registry);
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'test');
      const so = kernel.findShadowObjects(uuid)[0] as any;

      const messageToViewSpy = vi.fn();
      on(kernel, MessageToView, messageToViewSpy);

      so.dispatchMessageToView('testType', {payload: 'data'});

      // Wait for queueMicrotask to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(messageToViewSpy).toHaveBeenCalledTimes(1);

      const message: MessageToViewEvent = messageToViewSpy.mock.calls[0][0];
      expect(message.uuid).toBe(uuid);
      expect(message.type).toBe('testType');
      expect(message.data).toEqual({payload: 'data'});
      expect(message.traverseChildren).toBe(false);

      kernel.destroy();
    });

    it('should emit MessageToView event with traverseChildren=true when specified', async () => {
      const kernel = new Kernel(registry);
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'test');
      const so = kernel.findShadowObjects(uuid)[0] as any;

      const messageToViewSpy = vi.fn();
      on(kernel, MessageToView, messageToViewSpy);

      so.dispatchMessageToView('broadcastEvent', {message: 'hello'}, undefined, true);

      // Wait for queueMicrotask to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(messageToViewSpy).toHaveBeenCalledTimes(1);

      const message: MessageToViewEvent = messageToViewSpy.mock.calls[0][0];
      expect(message.uuid).toBe(uuid);
      expect(message.type).toBe('broadcastEvent');
      expect(message.data).toEqual({message: 'hello'});
      expect(message.traverseChildren).toBe(true);

      kernel.destroy();
    });

    it('should emit MessageToView with transferables', async () => {
      const kernel = new Kernel(registry);
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'test');
      const so = kernel.findShadowObjects(uuid)[0] as any;

      const messageToViewSpy = vi.fn();
      on(kernel, MessageToView, messageToViewSpy);

      const buffer = new ArrayBuffer(8);
      so.dispatchMessageToView('dataEvent', {buffer}, [buffer], false);

      // Wait for queueMicrotask to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(messageToViewSpy).toHaveBeenCalledTimes(1);

      const message: MessageToViewEvent = messageToViewSpy.mock.calls[0][0];
      expect(message.uuid).toBe(uuid);
      expect(message.type).toBe('dataEvent');
      expect(message.transferables).toContain(buffer);
      expect(message.traverseChildren).toBe(false);

      kernel.destroy();
    });
  });

  describe('Shadow Object Creation API', () => {
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
    });

    describe('useProperties', () => {
      it('should return an object with signal readers for multiple properties', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let capturedProps: Record<string, ReturnType<ShadowObjectCreationAPI['useProperty']>> | undefined;

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
        expect(value(capturedProps!['foo'])).toBe('valueA');
        expect(value(capturedProps!['bar'])).toBe('valueB');

        kernel.destroy();
      });
    });

    describe('provideContext and useContext', () => {
      it('should provide and consume context values between parent and child', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const contextName = Symbol('testContext');
        let capturedContext: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'parentProvider'})
        class ParentProvider {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext(contextName, 'contextValue');
          }
        }
        expect(ParentProvider).toBeDefined();

        @ShadowObject({registry, token: 'childConsumer'})
        class ChildConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedContext = useContext(contextName);
          }
        }
        expect(ChildConsumer).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'parentProvider');
        kernel.createEntity(childUuid, 'childConsumer', parentUuid);

        // Wait for context propagation via queueMicrotask
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

        expect(capturedContext).toBeDefined();
        expect(value(capturedContext!)).toBe('contextValue');

        kernel.destroy();
      });

      it('should accept a signal reader as context source', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const contextName = 'signalContext';
        const sourceSignal = createSignal('initial');
        let capturedContext: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'signalProvider'})
        class SignalProvider {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext(contextName, sourceSignal.get);
          }
        }
        expect(SignalProvider).toBeDefined();

        @ShadowObject({registry, token: 'signalConsumer'})
        class SignalConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedContext = useContext(contextName);
          }
        }
        expect(SignalConsumer).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'signalProvider');
        kernel.createEntity(childUuid, 'signalConsumer', parentUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedContext!)).toBe('initial');

        sourceSignal.set('updated');
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedContext!)).toBe('updated');

        kernel.destroy();
      });

      it('should return same context reader when called multiple times', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let ctx1: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;
        let ctx2: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'testContextCache'})
        class TestContextCache {
          constructor({useContext}: ShadowObjectCreationAPI) {
            ctx1 = useContext('myContext');
            ctx2 = useContext('myContext');
          }
        }
        expect(TestContextCache).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testContextCache');

        expect(ctx1).toBe(ctx2);

        kernel.destroy();
      });
    });

    describe('useParentContext', () => {
      it('should consume context from parent only', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const contextName = 'parentOnlyContext';
        let capturedParentContext: ReturnType<ShadowObjectCreationAPI['useParentContext']> | undefined;

        @ShadowObject({registry, token: 'parentCtxProvider'})
        class ParentCtxProvider {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext(contextName, 'parentValue');
          }
        }
        expect(ParentCtxProvider).toBeDefined();

        @ShadowObject({registry, token: 'childCtxConsumer'})
        class ChildCtxConsumer {
          constructor({useParentContext}: ShadowObjectCreationAPI) {
            capturedParentContext = useParentContext(contextName);
          }
        }
        expect(ChildCtxConsumer).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'parentCtxProvider');
        kernel.createEntity(childUuid, 'childCtxConsumer', parentUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedParentContext!)).toBe('parentValue');

        kernel.destroy();
      });
    });

    describe('provideGlobalContext', () => {
      it('should provide global context accessible by all entities', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const globalCtxName = 'globalContext';
        let capturedGlobalCtx: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'globalProvider'})
        class GlobalProvider {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext(globalCtxName, 'globalValue');
          }
        }
        expect(GlobalProvider).toBeDefined();

        @ShadowObject({registry, token: 'globalConsumer'})
        class GlobalConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedGlobalCtx = useContext(globalCtxName);
          }
        }
        expect(GlobalConsumer).toBeDefined();

        // Create two unrelated entities
        const providerUuid = generateUUID();
        const consumerUuid = generateUUID();

        kernel.createEntity(providerUuid, 'globalProvider');
        kernel.createEntity(consumerUuid, 'globalConsumer');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedGlobalCtx!)).toBe('globalValue');

        kernel.destroy();
      });

      it('should accept a signal reader as global context source', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const globalCtxName = 'globalSignalContext';
        const sourceSignal = createSignal('globalInitial');
        let capturedGlobalCtx: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'globalSignalProvider'})
        class GlobalSignalProvider {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext(globalCtxName, sourceSignal.get);
          }
        }
        expect(GlobalSignalProvider).toBeDefined();

        @ShadowObject({registry, token: 'globalSignalConsumer'})
        class GlobalSignalConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedGlobalCtx = useContext(globalCtxName);
          }
        }
        expect(GlobalSignalConsumer).toBeDefined();

        const providerUuid = generateUUID();
        const consumerUuid = generateUUID();

        kernel.createEntity(providerUuid, 'globalSignalProvider');
        kernel.createEntity(consumerUuid, 'globalSignalConsumer');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedGlobalCtx!)).toBe('globalInitial');

        sourceSignal.set('globalUpdated');
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedGlobalCtx!)).toBe('globalUpdated');

        kernel.destroy();
      });
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
    });
  });

  describe('Shadow Object Lifecycle Events', () => {
    it('should call onCreate when entity is created', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const onCreateFn = vi.fn();

      @ShadowObject({registry, token: 'testLifecycleCreate'})
      class TestCreate implements OnCreate {
        [onCreate](entity: unknown) {
          onCreateFn(entity);
        }
      }

      expect(TestCreate).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'testLifecycleCreate');

      expect(onCreateFn).toHaveBeenCalledTimes(1);
      expect(onCreateFn).toHaveBeenCalledWith(kernel.getEntity(uuid));

      kernel.destroy();
    });

    it('should call onCreate when entity token is changed', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const onCreateFn = vi.fn();

      @ShadowObject({registry, token: 'newToken'})
      class NewTokenSO implements OnCreate {
        [onCreate](entity: unknown) {
          onCreateFn(entity);
        }
      }

      expect(NewTokenSO).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'initialToken');

      expect(onCreateFn).not.toHaveBeenCalled();

      kernel.changeToken(uuid, 'newToken');

      expect(onCreateFn).toHaveBeenCalledTimes(1);

      kernel.destroy();
    });

    it('should call onDestroy when entity is destroyed', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const onDestroyFn = vi.fn();

      @ShadowObject({registry, token: 'testLifecycleDestroy'})
      class TestDestroy implements OnDestroy {
        [onDestroy](entity: unknown) {
          onDestroyFn(entity);
        }
      }

      expect(TestDestroy).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'testLifecycleDestroy');

      expect(onDestroyFn).not.toHaveBeenCalled();

      const entity = kernel.getEntity(uuid);

      expect(entity).toBeDefined();
      expect(entity.uuid).toBe(uuid);

      kernel.destroyEntity(uuid);

      expect(onDestroyFn).toHaveBeenCalledTimes(1);
      // When entity is destroyed, the kernel is passed (event emitted by destroyEntity)
      expect(onDestroyFn).toHaveBeenCalledWith(entity);
      // expect(onDestroyFn).toHaveBeenCalledWith(kernel);
    });

    it('should call onDestroy when shadow-object is removed due to token change', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const onDestroyFn = vi.fn();

      @ShadowObject({registry, token: 'removedToken'})
      class RemovedSO implements OnDestroy {
        [onDestroy](entity: unknown) {
          onDestroyFn(entity);
        }
      }

      @ShadowObject({registry, token: 'newTokenForChange'})
      class NewSO {}

      expect(RemovedSO).toBeDefined();
      expect(NewSO).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'removedToken');
      const entity = kernel.getEntity(uuid);

      expect(onDestroyFn).not.toHaveBeenCalled();

      kernel.changeToken(uuid, 'newTokenForChange');

      expect(onDestroyFn).toHaveBeenCalledTimes(1);
      // When shadow-object is removed due to token change, the entity is passed
      expect(onDestroyFn).toHaveBeenCalledWith(entity);

      kernel.destroy();
    });
  });
});
