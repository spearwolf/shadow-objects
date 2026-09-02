import {on} from '@spearwolf/eventize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ComponentChangeType, MessageToView} from '../constants.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {type OnCreate, type OnDestroy, onCreate, onDestroy, onParentChanged, onViewEvent} from './events.js';
import {Kernel, type MessageToViewEvent} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject, shadowObjects} from './ShadowObject.js';

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
    class Foo {}

    @ShadowObject({token: 'bar'})
    class Bar {}

    @ShadowObject({token: 'plah'})
    class Plah {}

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

    let shadowObjects = kernel.findShadowObjects(uuid);

    expect(shadowObjects, 'testA shadow-constructors').toHaveLength(2);
    expect(
      shadowObjects.find((so) => so instanceof Foo),
      'should contain instanceof Foo',
    ).toBeDefined();

    const bar = shadowObjects.find((so) => so instanceof Bar);
    expect(bar, 'should contain instanceof Bar').toBeDefined();

    kernel.changeToken(uuid, 'testB');

    shadowObjects = kernel.findShadowObjects(uuid);

    expect(shadowObjects, 'check 2').toHaveLength(2);

    expect(
      shadowObjects.find((so) => so === bar),
      'should contain bar instance',
    ).toBeDefined();

    expect(
      shadowObjects.find((so) => so instanceof Plah),
      'should contain instanceof Plah',
    ).toBeDefined();

    kernel.changeProperties(uuid, [['plah', 'hello']]);

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

      const message: MessageToViewEvent = messageToViewSpy.mock.calls[0]![0];
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

      const message: MessageToViewEvent = messageToViewSpy.mock.calls[0]![0];
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

      const message: MessageToViewEvent = messageToViewSpy.mock.calls[0]![0];
      expect(message.uuid).toBe(uuid);
      expect(message.type).toBe('dataEvent');
      expect(message.transferables).toContain(buffer);
      expect(message.traverseChildren).toBe(false);

      kernel.destroy();
    });
  });

  // Every notification the kernel fans out goes through the guarded dispatch, so one listener that
  // cannot cope costs no other listener its turn. What it threw is reported through the kernel's
  // logger with the uuid of the entity, and reaches no caller -- neither the teardown, which has no
  // caller left to decide anything, nor the change trail, which must not be refused over a listener.
  describe('a notification listener that throws', () => {
    it('delivers the entity onDestroy notification to the listeners behind it', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const entity = kernel.getEntity(uuid);

      const behind = vi.fn();
      on(entity, onDestroy, () => {
        throw new Error('a listener that cannot cope');
      });
      on(entity, onDestroy, behind);

      expect(() => kernel.destroyEntity(uuid)).not.toThrow();

      expect(behind).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
    });

    it('delivers the onParentChanged notification to the listeners behind it', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const parentUuid = generateUUID();
      const childUuid = generateUUID();
      kernel.createEntity(parentUuid, 'node');
      kernel.createEntity(childUuid, 'node');
      const child = kernel.getEntity(childUuid);

      const behind = vi.fn();
      on(child, onParentChanged, () => {
        throw new Error('a listener that cannot cope');
      });
      on(child, onParentChanged, behind);

      expect(() => kernel.setParent(childUuid, parentUuid)).not.toThrow();

      expect(behind).toHaveBeenCalledTimes(1);
      expect(child.parent?.uuid).toBe(parentUuid);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
    });

    it('delivers a view event to the listeners behind it and keeps the change trail', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const entity = kernel.getEntity(uuid);

      const seen: string[] = [];
      on(entity, onViewEvent, (type: string) => {
        seen.push(`throws:${type}`);
        throw new Error('a listener that cannot cope');
      });
      on(entity, onViewEvent, (type: string) => {
        seen.push(`behind:${type}`);
      });

      // the delivery sits on a building path: unguarded, one listener would refuse the whole trail
      expect(() =>
        kernel.run({
          changeTrail: [
            {
              type: ComponentChangeType.SendEvents,
              uuid,
              events: [
                {type: 'a', data: undefined},
                {type: 'b', data: undefined},
              ],
            },
          ],
        }),
      ).not.toThrow();

      // the listener behind the failing one is served, and so is the event behind the failing one
      expect(seen).toEqual(['throws:a', 'behind:a', 'throws:b', 'behind:b']);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
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
      // The hook is handed the entity the shadow-object was attached to, not the kernel that released it.
      expect(onDestroyFn).toHaveBeenCalledWith(entity);
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

  describe('a lifecycle hook written under its string name', () => {
    it('reports a plain method that shadows the onDestroy symbol', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Defined through `shadowObjects.define()` rather than `@ShadowObject`, so `construct.name`
      // stays the class's own name -- see the comment at the other `ThrowsOnDestroyReported` case
      // above for why the decorator's wrapper class would read differently.
      class OnDestroyAsPlainMethod {
        onDestroy() {}
      }

      shadowObjects.define('onDestroyAsPlainMethod', OnDestroyAsPlainMethod, registry);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'onDestroyAsPlainMethod');

      expect(consoleError).toHaveBeenCalledTimes(1);
      const args = consoleError.mock.calls[0]!;
      expect(args.some((arg) => typeof arg === 'string' && arg.includes('onDestroy'))).toBe(true);
      expect(args).toContain('OnDestroyAsPlainMethod');

      consoleError.mockRestore();
      kernel.destroy();
    });

    it('stays silent for a shadow-object carrying the onDestroy symbol', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      class OnDestroyUnderItsSymbol implements OnDestroy {
        [onDestroy]() {}
      }

      shadowObjects.define('onDestroyUnderItsSymbol', OnDestroyUnderItsSymbol, registry);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'onDestroyUnderItsSymbol');

      expect(consoleError).not.toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
    });

    it('stays silent when the symbol and a same-named plain method are both present', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      class OnDestroySymbolAndPlainMethod implements OnDestroy {
        onDestroy() {}
        [onDestroy]() {}
      }

      shadowObjects.define('onDestroySymbolAndPlainMethod', OnDestroySymbolAndPlainMethod, registry);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'onDestroySymbolAndPlainMethod');

      expect(consoleError).not.toHaveBeenCalled();

      consoleError.mockRestore();
      kernel.destroy();
    });
  });

  // The bookkeeping of the kernel has one way in from the outside, and that is its public
  // surface. A member written with the TypeScript `private` keyword keeps standing on the
  // prototype after the transpile and answers a call from JavaScript, so the shape of the
  // class is asserted here rather than left to the reading of a declaration file.
  describe('the members that carry the bookkeeping of the kernel', () => {
    it('stand off the prototype', () => {
      const names = [
        'getEntityGraphNode',
        'parse',
        'updateShadowObjects',
        'constructShadowObject',
        'createShadowObjects',
        'attachShadowObject',
        'destroyShadowObject',
      ];

      const onPrototype = names.filter((name) => Object.getOwnPropertyNames(Kernel.prototype).includes(name));

      expect(onPrototype, 'reachable from JavaScript').toEqual([]);
    });
  });

  describe('the logger slot holds no setter', () => {
    it('stands on the prototype as a getter without a setter', () => {
      const descriptor = Object.getOwnPropertyDescriptor(Kernel.prototype, 'logger');

      expect(typeof descriptor?.get).toBe('function');
      expect(descriptor?.set).toBeUndefined();
    });

    it('refuses an assignment and keeps the logger it reports through', () => {
      const kernel = new Kernel();
      const logger = kernel.logger;

      expect(() => {
        (kernel as unknown as {logger: unknown}).logger = {};
      }).toThrow(TypeError);

      expect(kernel.logger).toBe(logger);
    });

    it('hands out the same logger on every read', () => {
      const kernel = new Kernel();

      expect(kernel.logger).toBe(kernel.logger);
    });
  });
});
