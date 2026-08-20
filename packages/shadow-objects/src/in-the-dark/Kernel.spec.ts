import {emit, eventize, getSubscriptionCount, on} from '@spearwolf/eventize';
import {
  createEffect,
  createSignal,
  destroySignal,
  getLinksCount,
  getSignalsCount,
  type Signal,
  type SignalReader,
  value,
} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChangeTrailPhase, ComponentChangeType, MessageToView} from '../constants.js';
import type {ICreateEntitiesChange, ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {ComponentChanges} from '../view/ComponentChanges.js';
import type {Entity} from './Entity.js';
import {type OnCreate, type OnDestroy, onCreate, onDestroy} from './events.js';
import {Kernel, type MessageToViewEvent} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject, shadowObjects} from './ShadowObject.js';

// A chain r -> a -> b under one kernel. The breadth-first order over it is exactly the order the
// three entities are created in, which makes a reversed result easy to tell apart from a fresh one.
const makeEntityChain = (kernel: Kernel) => {
  const uuids = [generateUUID(), generateUUID(), generateUUID()];

  kernel.createEntity(uuids[0], 'node');
  kernel.createEntity(uuids[1], 'node', uuids[0]);
  kernel.createEntity(uuids[2], 'node', uuids[1]);

  return uuids;
};

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

      // The five cases below all tear down through the path where the parent entity stays alive
      // and its shadow-object leaves the constructor set (a token change), except the last one,
      // which uses the other path (the entity itself is destroyed) on purpose -- see its own
      // comment.
      describe('clearOnDestroy', () => {
        it('leaves the provider signal -- and what a child reads through useContext -- in place when clearOnDestroy is false', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'contextKeptOnLeave'})
          class ContextKeptOnLeave {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('keptContext', 'first', {clearOnDestroy: false});
            }
          }
          expect(ContextKeptOnLeave).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'contextKeptOnLeave');
          kernel.createEntity(childUuid, 'contextKeptOnLeaveChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('keptContext');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');
          expect(value(childContext)).toBe('first');

          kernel.changeToken(parentUuid, 'contextKeptOnLeaveEmpty');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');
          expect(value(childContext)).toBe('first');

          kernel.destroy();
        });

        it('clears the provider signal back to undefined on this path when clearOnDestroy defaults to true', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'contextDefaultProviderOnLeave'})
          class ContextDefaultProviderOnLeave {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('defaultProviderContext', 'first');
            }
          }
          expect(ContextDefaultProviderOnLeave).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'contextDefaultProviderOnLeave');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'contextDefaultProviderOnLeaveEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('reads clearOnDestroy on every call, not only on the one that creates the provider', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'contextClearOnSecondCall'})
          class ContextClearOnSecondCall {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              // The first call creates the provider and opts out of the clear. The second call for
              // the same name finds the provider already there and takes the default, and its
              // `clearOnDestroy` has to count all the same -- every call adds to the teardown, not
              // just the one that allocated the signal.
              provider = provideContext('secondCallContext', 'first', {clearOnDestroy: false});
              provideContext('secondCallContext');
            }
          }
          expect(ContextClearOnSecondCall).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'contextClearOnSecondCall');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'contextClearOnSecondCallEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('carries that clear to a child reading through useContext', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          @ShadowObject({registry, token: 'contextDefaultOnLeave'})
          class ContextDefaultOnLeave {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('defaultContext', 'first');
            }
          }
          expect(ContextDefaultOnLeave).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'contextDefaultOnLeave');
          kernel.createEntity(childUuid, 'contextDefaultOnLeaveChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('defaultContext');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('first');

          // On this path nothing but the write itself carries the clear: the parent entity lives
          // on, keeps its context signal, and the child stays linked to it throughout. The write
          // to `undefined` gets through because the link from this provider to the entity-level
          // context signal is cut after every other cleanup callback. The case below reaches the
          // same `undefined` over the other path, and by an entirely different route.
          kernel.changeToken(parentUuid, 'contextDefaultOnLeaveEmpty');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBeUndefined();

          kernel.destroy();
        });

        it('carries that clear to a child reading through useContext when the parent entity is destroyed', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          @ShadowObject({registry, token: 'contextDefaultOnParentDestroy'})
          class ContextDefaultOnParentDestroy {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('defaultContextParentDestroy', 'first');
            }
          }
          expect(ContextDefaultOnParentDestroy).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'contextDefaultOnParentDestroy');
          kernel.createEntity(childUuid, 'contextDefaultOnParentDestroyChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('defaultContextParentDestroy');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('first');

          // Here neither the `clearOnDestroy` callback nor the teardown of the parent's context
          // signal is what the child sees. `Kernel.destroyEntity()` detaches every surviving child
          // first, and detaching re-binds the child's inherited signal from the parent to the
          // kernel's root context, which holds nothing under this name -- that is the `undefined`.
          // Only afterwards does the parent emit `onDestroy`, by which time no link points at the
          // child any more. The case stands as the counterpart to the one above: both paths end at
          // `undefined`, each for its own reason.
          kernel.destroyEntity(parentUuid);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBeUndefined();

          kernel.destroy();
        });
      });

      // Several shadow-objects of one entity may provide the same context name. They all feed the
      // one entity-side signal of that name, so a consumer reads whatever was written last -- after
      // construction that is the value of the last constructor in the set. When one of them leaves,
      // the entity hands the name back to a provider that is still there, rather than leaving the
      // consumers with what the departure wrote.
      //
      // The constructor sets below are built without the decorator: `@ShadowObject` takes exactly
      // one token, and these cases need two tokens pointing at the same class, so that a token
      // change drops one constructor and leaves the other in place. `updateShadowObjects()` does
      // not re-run a constructor that is already in use, so the staying shadow-object is untouched.
      describe('two shadow-objects providing the same context name', () => {
        it('hands the context to the provider that stays when the other one leaves the constructor set', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext), 'the last constructor of the set wrote last').toBe('overlay');

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext), 'the provider that stays pushes its value again').toBe('dark');

          kernel.destroy();
        });

        it('takes the value of the provider attached last among several that stay', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class MidTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'mid');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', MidTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeWithoutOverlay', BaseTheme, registry);
          shadowObjects.define('themeWithoutOverlay', MidTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeWithoutOverlay');

          // Two providers stay and both hold a value, so the hand-over has to choose between them.
          // It goes to the one attached last, which keeps the precedence that holds among living
          // providers: the later attachment already outranked the earlier one before the departure.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('mid');

          kernel.destroy();
        });

        it('hands the context over even where both providers hold the same value', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          // Nothing about the staying provider changes here: its value was already the one the
          // context is meant to end up with, and its signal is never written to. Only the hand-over
          // pushes it through again, so this case fails wherever the departure is allowed to have
          // the last word just because the two providers were indistinguishable.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('takes the context from a provider that opted out of clearOnDestroy', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay', {clearOnDestroy: false});
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          // `clearOnDestroy: false` keeps the leaving provider from writing `undefined`, but it does
          // not entitle its value to outlive it on an entity that still has a provider of the name.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('skips a remaining provider that holds nothing', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class EmptyTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', EmptyTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeWithoutOverlay', BaseTheme, registry);
          shadowObjects.define('themeWithoutOverlay', EmptyTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeWithoutOverlay');

          // The empty provider is the one attached last, but it holds nothing, so the hand-over
          // walks past it to the one that does.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('passes over a provider whose signal was destroyed', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          // A Shadow Object owns the signal it is handed and may end it early. That kills the feed
          // without the release the entity handed out ever running, so the entity still lists a feed
          // whose source holds a value and whose writes go nowhere.
          class ZombieTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              destroySignal(provideContext('theme', 'zombie'));
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', ZombieTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeWithoutOverlay', BaseTheme, registry);
          shadowObjects.define('themeWithoutOverlay', ZombieTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeWithoutOverlay');

          // The dead feed is the last one holding a value, so a hand-over that only looked at the
          // value would elect it and then write nothing at all, leaving the clear of the departing
          // provider standing over a provider that is very much alive.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('walks back over several providers that leave in one token change', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class MidTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'mid');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', MidTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

          const seen: unknown[] = [];
          const effect = createEffect(() => {
            seen.push(childContext());
          });

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

          // Two departures in one synchronous run, so the walk runs twice and has to land on a different feed
          // the second time -- first on the overlay provider at the top, which is itself about to leave, then
          // on the base one at the bottom. The departures follow the order in which the constructors were
          // used, so the middle one goes first and leaves the top one as the last attachment still holding a
          // value. What a consumer sees of that is only where it ended, because the entity collects the writes
          // to its context signal and flushes them one microtask later; `seen` therefore holds the value that
          // stood before the token change and the one that stands after it, never a value from in between: the
          // context signal takes only the last of the buffered writes, whichever way the walk went.
          expect(seen).toEqual(['overlay', 'dark']);

          effect.destroy();
          kernel.destroy();
        });

        it('writes undefined once the last provider of the name is gone', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeNone');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBeUndefined();

          kernel.destroy();
        });

        it('hands the context back when a later provider throws in its constructor', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          class ThrowingTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'half-built');
              throw new Error('no theme for you');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeWithThrower', BaseTheme, registry);
          shadowObjects.define('themeWithThrower', ThrowingTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          // The scope of a constructor that throws is torn down on the spot, and that teardown runs
          // the same hand-over: the half-built provider goes, the entity keeps the one that stays.
          expect(() => kernel.changeToken(parentUuid, 'themeWithThrower')).toThrow('no theme for you');

          expect(kernel.hasEntity(parentUuid)).toBe(true);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('hands the context over even when the leaving provider throws in its onDestroy callback', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext, onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
              provideContext('theme', 'stale');
              registerDestroy(() => {
                throw new Error('this destroy callback fails');
              });
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('stale');

          const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

          expect(() => kernel.changeToken(parentUuid, 'themeBaseOnly')).not.toThrow();

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');
          expect(kernel.findShadowObjects(parentUuid)).toHaveLength(1);

          consoleError.mockRestore();

          kernel.destroy();
        });
      });

      // `useContext()` links its own local reader to the entity-level context signal. The two
      // cases below hold the *reader* side of that wire (not a downstream consumer of it): it
      // stops following the parent once this shadow-object's own teardown runs, on either of the
      // two paths it can run through. Two independent pieces of `Kernel.ts` teardown code reach
      // that same outcome -- the explicit link-destroy this shadow-object registered, and the
      // fact that the reader's own signal is destroyed a few lines later, which severs any link
      // still pointing at it as a side effect of that destruction. Either one alone already stops
      // the reader from following; only removing both at once reproduces a reader that keeps
      // updating past its own teardown.
      describe('teardown', () => {
        it('stops following the parent context when the shadow-object leaves the set', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'readerFreezeParent'})
          class ReaderFreezeParent {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('readerFreezeCtx', 'first');
            }
          }
          expect(ReaderFreezeParent).toBeDefined();

          let reader: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

          @ShadowObject({registry, token: 'readerFreezeChildBefore'})
          class ReaderFreezeChildBefore {
            constructor({useContext}: ShadowObjectCreationAPI) {
              reader = useContext('readerFreezeCtx');
            }
          }

          @ShadowObject({registry, token: 'readerFreezeChildAfter'})
          class ReaderFreezeChildAfter {}

          expect(ReaderFreezeChildBefore).toBeDefined();
          expect(ReaderFreezeChildAfter).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'readerFreezeParent');
          kernel.createEntity(childUuid, 'readerFreezeChildBefore', parentUuid);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.changeToken(childUuid, 'readerFreezeChildAfter');

          provider!.set('second');
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.destroy();
        });

        it('stops following the parent context when the entity is destroyed', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'readerFreezeParentA'})
          class ReaderFreezeParentA {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('readerFreezeCtxA', 'first');
            }
          }
          expect(ReaderFreezeParentA).toBeDefined();

          let reader: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

          @ShadowObject({registry, token: 'readerFreezeChildA'})
          class ReaderFreezeChildA {
            constructor({useContext}: ShadowObjectCreationAPI) {
              reader = useContext('readerFreezeCtxA');
            }
          }
          expect(ReaderFreezeChildA).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'readerFreezeParentA');
          kernel.createEntity(childUuid, 'readerFreezeChildA', parentUuid);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.destroyEntity(childUuid);

          provider!.set('second');
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.destroy();
        });
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

      it('notifies its reader once when the kernel moves the entity to another parent', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const seen: unknown[] = [];

        @ShadowObject({registry, token: 'ctxFromA'})
        class CtxFromA {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext('movedCtx', 'from-a');
          }
        }
        expect(CtxFromA).toBeDefined();

        @ShadowObject({registry, token: 'ctxFromB'})
        class CtxFromB {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext('movedCtx', 'from-b');
          }
        }
        expect(CtxFromB).toBeDefined();

        @ShadowObject({registry, token: 'ctxReader'})
        class CtxReader {
          constructor({useParentContext, createEffect}: ShadowObjectCreationAPI) {
            const ctx = useParentContext('movedCtx');
            // The explicit dependency is what makes the effect follow the context: without it the
            // effect runs once and sees none of the values that arrive afterwards.
            createEffect(() => {
              seen.push(value(ctx));
            }, [ctx]);
          }
        }
        expect(CtxReader).toBeDefined();

        const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

        kernel.createEntity(aUuid, 'ctxFromA');
        kernel.createEntity(bUuid, 'ctxFromB');
        kernel.createEntity(cUuid, 'ctxReader', aUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

        expect(seen).toEqual(['from-a']);

        kernel.setParent(cUuid, bUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

        expect(seen, 'the move is one change to the reader, not several').toEqual(['from-a', 'from-b']);

        kernel.destroy();
      });

      // Mirrors 'stops following the parent context when the shadow-object leaves the set' under
      // `useContext` above -- `useParentContext()` links its own local reader to the entity-level
      // source the exact same way, on the exact same teardown path.
      it('stops following the parent context when the shadow-object leaves the set', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let provider: Signal<string | undefined> | undefined;

        @ShadowObject({registry, token: 'parentReaderFreezeParent'})
        class ParentReaderFreezeParent {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provider = provideContext('parentReaderFreezeCtx', 'first');
          }
        }
        expect(ParentReaderFreezeParent).toBeDefined();

        let reader: ReturnType<ShadowObjectCreationAPI['useParentContext']> | undefined;

        @ShadowObject({registry, token: 'parentReaderFreezeChildBefore'})
        class ParentReaderFreezeChildBefore {
          constructor({useParentContext}: ShadowObjectCreationAPI) {
            reader = useParentContext('parentReaderFreezeCtx');
          }
        }

        @ShadowObject({registry, token: 'parentReaderFreezeChildAfter'})
        class ParentReaderFreezeChildAfter {}

        expect(ParentReaderFreezeChildBefore).toBeDefined();
        expect(ParentReaderFreezeChildAfter).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'parentReaderFreezeParent');
        kernel.createEntity(childUuid, 'parentReaderFreezeChildBefore', parentUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(reader!)).toBe('first');

        kernel.changeToken(childUuid, 'parentReaderFreezeChildAfter');

        provider!.set('second');
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(reader!)).toBe('first');

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

      // A global context is resolved on two levels. Within one entity every shadow-object that
      // provides the name feeds the one signal that entity contributes to the kernel-wide chain, so
      // the hand-over of `provideContext` applies unchanged. Across entities the chain itself
      // decides: it takes the first entry that holds something, so an entity falling empty lets the
      // next one through on its own.
      it('hands the global context to the provider that stays on the same entity', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        class BaseTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'dark');
          }
        }

        class OverlayTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'overlay');
          }
        }

        shadowObjects.define('globalThemeBoth', BaseTheme, registry);
        shadowObjects.define('globalThemeBoth', OverlayTheme, registry);
        shadowObjects.define('globalThemeBaseOnly', BaseTheme, registry);

        const providerUuid = generateUUID();
        const consumerUuid = generateUUID();

        kernel.createEntity(providerUuid, 'globalThemeBoth');
        kernel.createEntity(consumerUuid, 'globalThemeConsumer');

        const consumerContext = kernel.getEntity(consumerUuid).useContext('globalTheme');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('overlay');

        kernel.changeToken(providerUuid, 'globalThemeBaseOnly');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('dark');

        kernel.destroy();
      });

      it('lets another entity hold the global context when the one that had it goes', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        class BaseTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'dark');
          }
        }

        class OverlayTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'overlay');
          }
        }

        shadowObjects.define('globalThemeOverlay', OverlayTheme, registry);
        shadowObjects.define('globalThemeBase', BaseTheme, registry);

        const overlayUuid = generateUUID();
        const baseUuid = generateUUID();
        const consumerUuid = generateUUID();

        // The overlay entity joins the chain first, so it is the first entry that holds a value.
        kernel.createEntity(overlayUuid, 'globalThemeOverlay');
        kernel.createEntity(baseUuid, 'globalThemeBase');
        kernel.createEntity(consumerUuid, 'globalThemeConsumer');

        const consumerContext = kernel.getEntity(consumerUuid).useContext('globalTheme');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('overlay');

        kernel.changeToken(overlayUuid, 'globalThemeNone');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('dark');

        kernel.destroy();
      });

      // Mirrors the `clearOnDestroy` cases under `provideContext and useContext` above --
      // `provideGlobalContext` runs through the same `clearOnDestroy ?? true` check on its own
      // map (`contextRootProviders`), so it earns the same cases on its own provider signal, plus
      // one for a consumer entity that reads the cleared value through `useContext`. That both
      // members' own signal (not just their downstream readers) actually gets torn down on both
      // teardown paths is covered together, for all five context/property members at once, by
      // 'signal cleanup on teardown' below.
      describe('clearOnDestroy', () => {
        it('leaves the provider signal in place when clearOnDestroy is false', () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'globalContextKeptOnLeave'})
          class GlobalContextKeptOnLeave {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              provider = provideGlobalContext('globalKeptContext', 'first', {clearOnDestroy: false});
            }
          }
          expect(GlobalContextKeptOnLeave).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'globalContextKeptOnLeave');

          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'globalContextKeptOnLeaveEmpty');

          expect(value(provider!)).toBe('first');

          kernel.destroy();
        });

        it('clears the provider signal back to undefined on this path when clearOnDestroy defaults to true', () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'globalContextDefaultOnLeave'})
          class GlobalContextDefaultOnLeave {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              provider = provideGlobalContext('globalDefaultContext', 'first');
            }
          }
          expect(GlobalContextDefaultOnLeave).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'globalContextDefaultOnLeave');

          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'globalContextDefaultOnLeaveEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('reads clearOnDestroy on every call, not only on the one that creates the provider', () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'globalContextClearOnSecondCall'})
          class GlobalContextClearOnSecondCall {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              // The first call creates the provider and opts out of the clear. The second call for
              // the same name finds the provider already there and takes the default, and its
              // `clearOnDestroy` has to count all the same -- every call adds to the teardown, not
              // just the one that allocated the signal.
              provider = provideGlobalContext('globalSecondCallContext', 'first', {clearOnDestroy: false});
              provideGlobalContext('globalSecondCallContext');
            }
          }
          expect(GlobalContextClearOnSecondCall).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'globalContextClearOnSecondCall');

          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'globalContextClearOnSecondCallEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('carries that clear to a consumer entity reading through useContext', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          @ShadowObject({registry, token: 'globalContextClearedOnLeave'})
          class GlobalContextClearedOnLeave {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              provideGlobalContext('globalClearedContext', 'first');
            }
          }
          expect(GlobalContextClearedOnLeave).toBeDefined();

          // Two unrelated root entities. The consumer has no shadow-object of its own; it reads
          // the global context straight off the entity.
          const providerUuid = generateUUID();
          const consumerUuid = generateUUID();

          kernel.createEntity(providerUuid, 'globalContextClearedOnLeave');
          kernel.createEntity(consumerUuid, 'globalContextClearedOnLeaveConsumer');

          const consumerContext = kernel.getEntity(consumerUuid).useContext('globalClearedContext');

          // The value travels to the consumer through the entity's deferred context update, which
          // is why this case is async where the three above, reading the provider signal itself,
          // are not.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(consumerContext)).toBe('first');

          kernel.changeToken(providerUuid, 'globalContextClearedOnLeaveEmpty');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(consumerContext)).toBeUndefined();

          kernel.destroy();
        });
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

        // Defined through `shadowObjects.define()` rather than `@ShadowObject`, so `construct.name`
        // stays the class's own name -- the decorator wraps its target in a subclass of its own,
        // `class __ShadowObject extends target { … }`, and the displayName below would read that
        // wrapper's name instead.
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

  describe('autoDestructionOnParentRemoval flows through change trail', () => {
    it('ComponentChanges.create() carries the autoDestructionOnParentRemoval flag in the trail entry', () => {
      const uuid = generateUUID();
      const parentUuid = generateUUID();

      const changes = new ComponentChanges(uuid);
      changes.create('testToken', parentUuid, 0, true);

      const trail: ICreateEntitiesChange[] = [];
      changes.buildChangeTrail(trail as any, ChangeTrailPhase.StructuralChanges);

      expect(trail).toHaveLength(1);
      expect(trail[0]).toMatchObject({
        type: ComponentChangeType.CreateEntities,
        uuid,
        token: 'testToken',
        parentUuid,
        autoDestructionOnParentRemoval: true,
      });
    });

    it('ComponentChanges.create() omits the flag when false (default)', () => {
      const uuid = generateUUID();

      const changes = new ComponentChanges(uuid);
      changes.create('testToken');

      const trail: ICreateEntitiesChange[] = [];
      changes.buildChangeTrail(trail as any, ChangeTrailPhase.StructuralChanges);

      expect(trail[0]).not.toHaveProperty('autoDestructionOnParentRemoval');
    });

    it('Kernel.run() applies autoDestructionOnParentRemoval from a CreateEntities trail entry', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const destroyCallback = vi.fn();

      @ShadowObject({registry, token: 'testKern1'})
      class TestKern1 {
        constructor({onDestroy: register, entity}: ShadowObjectCreationAPI) {
          register(() => destroyCallback(entity.uuid));
        }
      }
      expect(TestKern1).toBeDefined();

      const parentUuid = generateUUID();
      const childUuid = generateUUID();

      kernel.run({
        changeTrail: [
          {
            type: ComponentChangeType.CreateEntities,
            uuid: parentUuid,
            token: 'testKern1',
          },
          {
            type: ComponentChangeType.CreateEntities,
            uuid: childUuid,
            token: 'testKern1',
            parentUuid,
            autoDestructionOnParentRemoval: true,
          } as ICreateEntitiesChange,
        ],
      });

      expect(kernel.getEntity(childUuid).autoDestructionOnParentRemoval).toBe(true);

      kernel.destroyEntity(parentUuid);

      expect(destroyCallback).toHaveBeenCalledWith(childUuid);
      expect(destroyCallback).toHaveBeenCalledWith(parentUuid);
    });
  });

  describe('re-parenting maintains autoDestructionOnParentRemoval subscription', () => {
    it('child re-parented away survives destruction of the original parent', () => {
      const kernel = new Kernel(new Registry());

      const [parentAUuid, parentBUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentAUuid, 'pA');
      kernel.createEntity(parentBUuid, 'pB');
      kernel.createEntity(childUuid, 'c', parentAUuid, 0, undefined, true);

      kernel.setParent(childUuid, parentBUuid);

      kernel.destroyEntity(parentAUuid);

      expect(kernel.hasEntity(childUuid), 'child should survive destruction of original parent').toBe(true);
    });

    it('child re-parented to a new parent is destroyed when the new parent is destroyed', () => {
      const kernel = new Kernel(new Registry());

      const [parentAUuid, parentBUuid, childUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(parentAUuid, 'pA');
      kernel.createEntity(parentBUuid, 'pB');
      kernel.createEntity(childUuid, 'c', parentAUuid, 0, undefined, true);

      kernel.setParent(childUuid, parentBUuid);

      kernel.destroyEntity(parentBUuid);

      expect(kernel.hasEntity(childUuid), 'child should be destroyed with new parent').toBe(false);
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

  describe('BFS cache is invalidated on programmatic destruction', () => {
    it('traverseLevelOrderBFS does not return stale entities after auto-destruct cascade', () => {
      const kernel = new Kernel(new Registry());

      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(parentUuid, 'p');
      kernel.createEntity(childUuid, 'c', parentUuid, 0, undefined, true);

      // prime the BFS cache
      const before = kernel.traverseLevelOrderBFS();
      expect(before.map((e) => e.uuid)).toEqual(expect.arrayContaining([parentUuid, childUuid]));

      kernel.destroyEntity(parentUuid);

      // BFS must reflect that both entities are gone (not return cached/stale entries)
      const after = kernel.traverseLevelOrderBFS();
      expect(after.map((e) => e.uuid)).not.toContain(parentUuid);
      expect(after.map((e) => e.uuid)).not.toContain(childUuid);
    });
  });

  describe('setParent with unknown UUID does not orphan the entity', () => {
    it('Kernel.setParent with non-existent parent UUID throws and preserves the original parent link', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid] = [generateUUID(), generateUUID()];
      const ghostUuid = generateUUID();

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid);

      expect(kernel.getEntity(bUuid).parentUuid).toBe(aUuid);

      expect(() => kernel.setParent(bUuid, ghostUuid)).toThrow();

      expect(kernel.getEntity(bUuid).parentUuid, 'child must keep its original parent').toBe(aUuid);
      expect(
        kernel.getEntity(aUuid).children.map((c) => c.uuid),
        'parent must still know its child',
      ).toContain(bUuid);
    });

    it('Entity.parentUuid setter with non-existent UUID throws and preserves the original parent link', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid] = [generateUUID(), generateUUID()];
      const ghostUuid = generateUUID();

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid);

      const b = kernel.getEntity(bUuid);
      expect(b.parentUuid).toBe(aUuid);

      expect(() => {
        b.parentUuid = ghostUuid;
      }).toThrow();

      expect(b.parentUuid, 'child must keep its original parent').toBe(aUuid);
      expect(kernel.getEntity(aUuid).children.map((c) => c.uuid)).toContain(bUuid);
    });
  });

  describe('setParent without an order keeps the current one', () => {
    it('re-parenting an entity does not reset its order to 0', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b');
      kernel.createEntity(cUuid, 'c', aUuid, 5);

      expect(kernel.getEntity(cUuid).order).toBe(5);

      // a SetParent change only carries an order when it changed — this is the change trail
      // that ComponentChanges.makeSetParentChange() produces for an unchanged order
      kernel.setParent(cUuid, bUuid);

      expect(kernel.getEntity(cUuid).parentUuid).toBe(bUuid);
      expect(kernel.getEntity(cUuid).order, 'the order must survive a re-parent').toBe(5);
    });

    it('an explicit order still wins', () => {
      const kernel = new Kernel(new Registry());

      const [aUuid, bUuid] = [generateUUID(), generateUUID()];

      kernel.createEntity(aUuid, 'a');
      kernel.createEntity(bUuid, 'b', aUuid, 5);

      kernel.setParent(bUuid, aUuid, 0);

      expect(kernel.getEntity(bUuid).order).toBe(0);
    });
  });

  describe('cache-hit on creation-API helpers warns when options would be dropped', () => {
    it('useProperty warns on a second call with a different compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/useProperty/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/foo/);

      warnSpy.mockRestore();
    });

    it('useProperty does not warn when the second call passes the same compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('useProperty does not warn when the second call omits options', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('useContext warns on a second call with a different compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/useContext/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/ctx/);

      warnSpy.mockRestore();
    });

    it('useParentContext warns on a second call with a different compare function', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/useParentContext/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/pctx/);

      warnSpy.mockRestore();
    });
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

  describe('entity lookup and the change trail', () => {
    it('findEntity() answers with the entity behind a uuid it holds', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      kernel.createEntity(uuid, 'entity');

      expect(kernel.findEntity(uuid)).toBe(kernel.getEntity(uuid));

      kernel.destroy();
    });

    it('findEntity() answers undefined for a uuid it does not hold', () => {
      const kernel = new Kernel(new Registry());

      expect(kernel.findEntity(generateUUID())).toBeUndefined();

      kernel.destroy();
    });

    // Both calls describe the entity tree, so both name an entity the view believes to be there:
    // a uuid the kernel does not hold is a disagreement, and the caller has to hear about it.
    it('getEntity() and changeProperties() throw for a uuid the kernel does not hold', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();

      expect(() => kernel.getEntity(uuid)).toThrow(/not found/);
      expect(() => kernel.changeProperties(uuid, [['a', 1]])).toThrow(/not found/);

      kernel.destroy();
    });

    // An event carries no structure, and the entity it was meant for may have been torn down
    // between the two sides.
    it('dispatchEventsToEntity() ignores events for an entity the kernel does not hold', () => {
      const kernel = new Kernel(new Registry());

      expect(() => kernel.dispatchEventsToEntity(generateUUID(), [{type: 'ping', data: 1}])).not.toThrow();

      kernel.destroy();
    });

    it('run() applies the entries behind a send-events entry for an entity that is gone', () => {
      const kernel = new Kernel(new Registry());
      const lateUuid = generateUUID();

      expect(() =>
        kernel.run({
          changeTrail: [
            {type: ComponentChangeType.SendEvents, uuid: generateUUID(), events: [{type: 'ping', data: 1}]},
            {type: ComponentChangeType.CreateEntities, uuid: lateUuid, token: 'late'},
          ],
        }),
      ).not.toThrow();

      // the entry behind the stray event is what this case is about: a single event for an
      // entity that is gone must not cost the rest of the change trail
      expect(kernel.hasEntity(lateUuid)).toBe(true);

      kernel.destroy();
    });
  });

  describe('traverseLevelOrderBFS', () => {
    it('hands out a fresh array on every call', () => {
      const kernel = new Kernel(new Registry());
      makeEntityChain(kernel);

      expect(kernel.traverseLevelOrderBFS()).not.toBe(kernel.traverseLevelOrderBFS());

      kernel.destroy();
    });

    it('keeps its own order when a caller reverses the array it got', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      const before = kernel.traverseLevelOrderBFS().map((e) => e.uuid);
      expect(before).toEqual([rUuid, aUuid, bUuid]);

      kernel.traverseLevelOrderBFS().reverse();

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual(before);

      kernel.destroy();
    });

    it('upgrades the entities from the root down after a caller reversed an earlier result', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      const created: string[] = [];

      @ShadowObject({registry, token: 'node'})
      class FirstRecorder implements OnCreate {
        [onCreate](entity: Entity) {
          created.push(entity.uuid);
        }
      }
      expect(FirstRecorder).toBeDefined();

      const [rUuid] = makeEntityChain(kernel);

      created.length = 0;

      // Nothing between this line and the upgrade may change the entity tree: a structural change
      // rebuilds the cache and would make the case pass for the wrong reason.
      kernel.traverseLevelOrderBFS().reverse();

      // a second constructor for the same token is what gives the upgrade something to create
      @ShadowObject({registry, token: 'node'})
      class SecondRecorder implements OnCreate {
        [onCreate](entity: Entity) {
          created.push(entity.uuid);
        }
      }
      expect(SecondRecorder).toBeDefined();

      kernel.upgradeEntities();

      expect(created.at(0), 'a shadow object reaches the parent before it reaches the child').toBe(rUuid);

      kernel.destroy();
    });

    it('terminates when a children list points back at an ancestor', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      // `addChild()` writes a children list without touching the parent link, so no ancestor check
      // on the parent path can cover the ring it lays here
      kernel.getEntity(bUuid).addChild(kernel.getEntity(aUuid));

      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([rUuid, aUuid, bUuid]);

      kernel.destroy();
    });
  });

  describe('getEntityGraph', () => {
    it('terminates when a children list points back at an ancestor', () => {
      const kernel = new Kernel(new Registry());
      const [rUuid, aUuid, bUuid] = makeEntityChain(kernel);

      // the ring the debugging tool is most likely to be pointed at
      kernel.getEntity(bUuid).addChild(kernel.getEntity(aUuid));

      const graph = kernel.getEntityGraph();

      expect(graph.map((node) => node.entity.uuid)).toEqual([rUuid]);
      expect(graph[0].children.map((node) => node.entity.uuid)).toEqual([aUuid]);
      expect(graph[0].children[0].children.map((node) => node.entity.uuid)).toEqual([bUuid]);
      expect(graph[0].children[0].children[0].children, 'the entity that is already in the graph is not written twice').toEqual(
        [],
      );

      kernel.destroy();
    });
  });

  describe('kernel teardown', () => {
    // Three roots in creation order; the teardown walks them the other way round, so `c` goes first
    // and `a` is the one that sits behind the callback that throws.
    const makeRoots = (kernel: Kernel) => {
      const uuids = [generateUUID(), generateUUID(), generateUUID()];
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

      expect(seen, 'the failing callback costs its own entity, not the ones behind it').toEqual([cUuid, bUuid, aUuid]);
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
  });

  describe('cycles in the entity tree', () => {
    it('refuses a setParent() that would put an entity below its own descendant', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, , cUuid] = makeEntityChain(kernel);

      expect(() => kernel.setParent(aUuid, cUuid)).toThrow();

      kernel.destroy();
    });

    it('leaves the entity where it was when it refuses the new parent', () => {
      const kernel = new Kernel(new Registry());
      const [aUuid, bUuid, cUuid] = makeEntityChain(kernel);

      kernel.updateOrder(cUuid, 3);

      expect(() => kernel.setParent(aUuid, cUuid)).toThrow();

      expect(kernel.getEntity(aUuid).parentUuid, 'the refused entity is still a root').toBeUndefined();
      expect(kernel.getEntity(bUuid).parentUuid).toBe(aUuid);
      expect(kernel.getEntity(cUuid).parentUuid).toBe(bUuid);
      expect(kernel.getEntity(cUuid).order).toBe(3);
      expect(kernel.traverseLevelOrderBFS().map((e) => e.uuid)).toEqual([aUuid, bUuid, cUuid]);

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
});