import {eventize} from '@spearwolf/eventize';
import {createSignal, type Signal, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {ShadowObjectCreationAPI, ShadowObjectType} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';
import {ShadowObjectCreationScope} from './ShadowObjectCreationScope.js';

describe('ShadowObjectCreationScope', () => {
  // The scope is built by hand rather than through an entity creation, because the kernel binds
  // every scope it makes exactly once: a second, refused binding has no way in through it.
  const makeUnboundScope = () => {
    const kernel = new Kernel(new Registry());
    const uuid = generateUUID();
    kernel.createEntity(uuid, 'node');

    return {
      kernel,
      uuid,
      scope: new ShadowObjectCreationScope(kernel.getEntity(uuid), kernel.logger, 'TestScope', new Set<string>()),
    };
  };

  afterEach(() => {
    Registry.get().clear();
    // A `console.error` spy that a failing assertion leaves un-restored would otherwise carry its
    // call count into the next test -- `vi.spyOn` returns the very same spy instance on a target
    // that is already spied. Restoring here, independent of how the test body ends, keeps every
    // case's warning count its own.
    vi.restoreAllMocks();
  });

  // The deprecation report falls once per kernel and member name, and every case below builds a
  // kernel of its own -- so a case's report is its own, whatever the cases before it did. Two
  // cases sharing one kernel would share that list, and the second of them would see nothing.
  describe('the deprecated isEqual argument', () => {
    // The list of names already reported belongs to the kernel: an application running two shadow
    // environments has two kernels, and the second of them has to hear about the deprecated call
    // form just as the first did. A list living as long as the module reports to whichever kernel
    // got there first and to no other.
    it('useProperty: reports the deprecated call form to every kernel that meets it', () => {
      const registry = new Registry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compare = vi.fn((a: unknown, b: unknown) => a === b);

      @ShadowObject({registry, token: 'deprecatedUsePropertyPerKernel'})
      class DeprecatedUsePropertyPerKernel {
        constructor({useProperty}: ShadowObjectCreationAPI) {
          useProperty('bareComparePerKernel', compare);
        }
      }
      expect(DeprecatedUsePropertyPerKernel).toBeDefined();

      const first = new Kernel(registry);
      const second = new Kernel(registry);

      first.createEntity(generateUUID(), 'deprecatedUsePropertyPerKernel', undefined, 0, [['bareComparePerKernel', 'first']]);
      second.createEntity(generateUUID(), 'deprecatedUsePropertyPerKernel', undefined, 0, [['bareComparePerKernel', 'first']]);

      expect(errorSpy).toHaveBeenCalledTimes(2);

      first.destroy();
      second.destroy();
    });

    it('useProperty: reports once per kernel with the full deprecation text, and the function then reaches the signal as {compare}', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compare = vi.fn((a: unknown, b: unknown) => a === b);

      @ShadowObject({registry, token: 'deprecatedUseProperty'})
      class DeprecatedUseProperty {
        constructor({useProperty}: ShadowObjectCreationAPI) {
          useProperty('bareCompareProp', compare);
          useProperty('bareCompareProp', compare);
        }
      }
      expect(DeprecatedUseProperty).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'deprecatedUseProperty', undefined, 0, [['bareCompareProp', 'first']]);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      // `ConsoleLogger` prints its namespace as a styled badge, so the wording of a report starts at
      // the third argument: `console.error('%c<namespace>', styles, ...args)`. The badge is what
      // tells a report through the logger apart from a raw call on the console.
      const call = errorSpy.mock.calls[0]!;
      expect(call[0]).toBe('%cKernel');
      expect(call[2]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useProperty()" is now passed as {compare} argument. Please update your code accordingly.',
      );

      kernel.changeProperties(uuid, [['bareCompareProp', 'second']]);
      expect(compare).toHaveBeenCalled();

      errorSpy.mockRestore();
      kernel.destroy();
    });

    it('provideContext: reports once per kernel with the full deprecation text, the function then reaches the signal as {compare}, and clearOnDestroy still defaults to true', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compare = vi.fn((a: unknown, b: unknown) => a === b);
      let provider: Signal<string | undefined> | undefined;

      @ShadowObject({registry, token: 'deprecatedProvideContext'})
      class DeprecatedProvideContext {
        constructor({provideContext}: ShadowObjectCreationAPI) {
          provider = provideContext<string>('bareCompareContext', 'first', compare);
          provideContext<string>('bareCompareContext', 'first', compare);
        }
      }
      expect(DeprecatedProvideContext).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'deprecatedProvideContext');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]![2]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      expect(value(provider!)).toBe('first');

      kernel.changeToken(uuid, 'deprecatedProvideContextEmpty');

      // The compare check is what proves the bare function reached the underlying signal as its
      // {compare} option in the first place -- clearOnDestroy falls back to its default of `true`
      // for a raw, unconverted function just the same (it has no `.clearOnDestroy` property
      // either), so the value assertion below would not by itself tell the rewritten options
      // object apart from no rewrite at all.
      expect(compare).toHaveBeenCalled();
      expect(value(provider!)).toBeUndefined();

      errorSpy.mockRestore();
      kernel.destroy();
    });

    it('provideGlobalContext: reports once per kernel with the full deprecation text, the function then reaches the signal as {compare}, and clearOnDestroy still defaults to true', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const compare = vi.fn((a: unknown, b: unknown) => a === b);
      let provider: Signal<string | undefined> | undefined;

      @ShadowObject({registry, token: 'deprecatedProvideGlobalContext'})
      class DeprecatedProvideGlobalContext {
        constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
          provider = provideGlobalContext<string>('bareCompareGlobalContext', 'first', compare);
          provideGlobalContext<string>('bareCompareGlobalContext', 'first', compare);
        }
      }
      expect(DeprecatedProvideGlobalContext).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'deprecatedProvideGlobalContext');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]![2]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideGlobalContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      expect(value(provider!)).toBe('first');

      kernel.changeToken(uuid, 'deprecatedProvideGlobalContextEmpty');

      expect(compare).toHaveBeenCalled();
      expect(value(provider!)).toBeUndefined();

      errorSpy.mockRestore();
      kernel.destroy();
    });

    it('useContext: reports once per kernel with the full deprecation text, and the function then reaches the reader as {compare}', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sourceSignal = createSignal('first');
      const compare = vi.fn((a: unknown, b: unknown) => a === b);
      let capturedContext: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

      @ShadowObject({registry, token: 'deprecatedUseContextProvider'})
      class DeprecatedUseContextProvider {
        constructor({provideContext}: ShadowObjectCreationAPI) {
          provideContext('bareCompareReadContext', sourceSignal.get);
        }
      }
      expect(DeprecatedUseContextProvider).toBeDefined();

      @ShadowObject({registry, token: 'deprecatedUseContext'})
      class DeprecatedUseContext {
        constructor({useContext}: ShadowObjectCreationAPI) {
          capturedContext = useContext('bareCompareReadContext', compare);
          useContext('bareCompareReadContext', compare);
        }
      }
      expect(DeprecatedUseContext).toBeDefined();

      const parentUuid = generateUUID();
      const childUuid = generateUUID();
      kernel.createEntity(parentUuid, 'deprecatedUseContextProvider');
      kernel.createEntity(childUuid, 'deprecatedUseContext', parentUuid);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]![2]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(capturedContext!)).toBe('first');

      sourceSignal.set('second');
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(compare).toHaveBeenCalled();
      expect(value(capturedContext!)).toBe('second');

      errorSpy.mockRestore();
      kernel.destroy();
    });

    it('useParentContext: reports once per kernel with the full deprecation text, and the function then reaches the reader as {compare}', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sourceSignal = createSignal('first');
      const compare = vi.fn((a: unknown, b: unknown) => a === b);
      let capturedParentContext: ReturnType<ShadowObjectCreationAPI['useParentContext']> | undefined;

      @ShadowObject({registry, token: 'deprecatedUseParentContextProvider'})
      class DeprecatedUseParentContextProvider {
        constructor({provideContext}: ShadowObjectCreationAPI) {
          provideContext('bareCompareParentContext', sourceSignal.get);
        }
      }
      expect(DeprecatedUseParentContextProvider).toBeDefined();

      @ShadowObject({registry, token: 'deprecatedUseParentContext'})
      class DeprecatedUseParentContext {
        constructor({useParentContext}: ShadowObjectCreationAPI) {
          capturedParentContext = useParentContext('bareCompareParentContext', compare);
          useParentContext('bareCompareParentContext', compare);
        }
      }
      expect(DeprecatedUseParentContext).toBeDefined();

      const parentUuid = generateUUID();
      const childUuid = generateUUID();
      kernel.createEntity(parentUuid, 'deprecatedUseParentContextProvider');
      kernel.createEntity(childUuid, 'deprecatedUseParentContext', parentUuid);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]![2]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useParentContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(capturedParentContext!)).toBe('first');

      sourceSignal.set('second');
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(compare).toHaveBeenCalled();
      expect(value(capturedParentContext!)).toBe('second');

      errorSpy.mockRestore();
      kernel.destroy();
    });
  });

  describe('provideContext', () => {
    it('registers the clearOnDestroy write once per provider, however often it is asked for', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      let provider: Signal<string | undefined> | undefined;

      @ShadowObject({registry, token: 'repeatedProvideContext'})
      class RepeatedProvideContext {
        constructor({provideContext}: ShadowObjectCreationAPI) {
          provider = provideContext<string>('repeated', 'first');
          provideContext<string>('repeated');
          provideContext<string>('repeated');
          provideContext<string>('repeated');
          provideContext<string>('repeated');
        }
      }
      expect(RepeatedProvideContext).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'repeatedProvideContext');

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(provider!)).toBe('first');

      // `Signal.prototype.set` has only a getter -- `provider.set = fn` throws a `TypeError`. The
      // instance is extensible, so `defineProperty` still lands a data property that shadows the
      // getter, and calls made through it reach the original writer underneath.
      const writes: unknown[] = [];
      const origSet = provider!.set;
      Object.defineProperty(provider, 'set', {
        value: (...args: Parameters<typeof origSet>) => {
          writes.push(args[0]);
          return origSet(...args);
        },
        configurable: true,
      });

      kernel.changeToken(uuid, 'repeatedProvideContextEmpty');

      expect(writes).toEqual([undefined]);
      expect(value(provider!)).toBeUndefined();

      kernel.destroy();
    });

    it('does not let a later call take back an earlier clearOnDestroy opt-out', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      let provider: Signal<string | undefined> | undefined;

      @ShadowObject({registry, token: 'stickyClearOnDestroy'})
      class StickyClearOnDestroy {
        constructor({provideContext}: ShadowObjectCreationAPI) {
          provider = provideContext<string>('sticky', 'first', {clearOnDestroy: false});
          provideContext<string>('sticky');
          provideContext<string>('sticky', undefined, {clearOnDestroy: false});
        }
      }
      expect(StickyClearOnDestroy).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'stickyClearOnDestroy');

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(provider!)).toBe('first');

      const writes: unknown[] = [];
      const origSet = provider!.set;
      Object.defineProperty(provider, 'set', {
        value: (...args: Parameters<typeof origSet>) => {
          writes.push(args[0]);
          return origSet(...args);
        },
        configurable: true,
      });

      kernel.changeToken(uuid, 'stickyClearOnDestroyEmpty');

      expect(writes, 'one call asking for the clearing is enough, and no later call takes it back').toEqual([undefined]);
      expect(value(provider!)).toBeUndefined();

      kernel.destroy();
    });

    it('keys the clearOnDestroy registration by provider signal, not by name, so a provideContext and a provideGlobalContext of the same name each still clear', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      let contextProvider: Signal<string | undefined> | undefined;
      let globalProvider: Signal<string | undefined> | undefined;

      @ShadowObject({registry, token: 'sharedNameProviders'})
      class SharedNameProviders {
        constructor({provideContext, provideGlobalContext}: ShadowObjectCreationAPI) {
          contextProvider = provideContext<string>('shared', 'ctxFirst');
          globalProvider = provideGlobalContext<string>('shared', 'globalFirst');
        }
      }
      expect(SharedNameProviders).toBeDefined();

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'sharedNameProviders');

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(contextProvider!)).toBe('ctxFirst');
      expect(value(globalProvider!)).toBe('globalFirst');

      // A Set keyed by name alone would see 'shared' already registered once the context provider's
      // clearOnDestroy write is added, and skip the global provider's -- the two live in different
      // maps (#contextProviders vs. #contextRootProviders) but would collide in a name-keyed set.
      const contextWrites: unknown[] = [];
      const origContextSet = contextProvider!.set;
      Object.defineProperty(contextProvider, 'set', {
        value: (...args: Parameters<typeof origContextSet>) => {
          contextWrites.push(args[0]);
          return origContextSet(...args);
        },
        configurable: true,
      });

      const globalWrites: unknown[] = [];
      const origGlobalSet = globalProvider!.set;
      Object.defineProperty(globalProvider, 'set', {
        value: (...args: Parameters<typeof origGlobalSet>) => {
          globalWrites.push(args[0]);
          return origGlobalSet(...args);
        },
        configurable: true,
      });

      kernel.changeToken(uuid, 'sharedNameProvidersEmpty');

      expect(contextWrites, 'the provideContext provider of "shared" clears').toEqual([undefined]);
      expect(globalWrites, 'the provideGlobalContext provider of the same name clears too').toEqual([undefined]);

      kernel.destroy();
    });
  });

  describe('bindTo', () => {
    it('refuses a second binding and keeps the first one', () => {
      const {kernel, uuid, scope} = makeUnboundScope();

      const releaseFirst = vi.fn();
      const forgetFirst = vi.fn();
      const releaseSecond = vi.fn();
      const forgetSecond = vi.fn();

      scope.bindTo(eventize({}), releaseFirst, forgetFirst);

      expect(() => scope.bindTo(eventize({}), releaseSecond, forgetSecond)).toThrow(/already bound/);

      kernel.destroyEntity(uuid);

      expect(releaseFirst, 'the handles of the first binding are the ones the teardown runs').toHaveBeenCalledTimes(1);
      expect(forgetFirst).toHaveBeenCalledTimes(1);
      expect(releaseSecond, 'a refused binding leaves no handles behind').not.toHaveBeenCalled();
      expect(forgetSecond).not.toHaveBeenCalled();

      kernel.destroy();
    });

    it('refuses a binding after the teardown', () => {
      const {kernel, scope} = makeUnboundScope();

      const releaseFirst = vi.fn();
      const forgetFirst = vi.fn();
      const releaseSecond = vi.fn();
      const forgetSecond = vi.fn();

      scope.bindTo(eventize({}), releaseFirst, forgetFirst);
      scope.tearDown();

      expect(() => scope.bindTo(eventize({}), releaseSecond, forgetSecond)).toThrow(/torn down/);

      expect(releaseSecond, 'a refused binding leaves no handles behind').not.toHaveBeenCalled();
      expect(forgetSecond).not.toHaveBeenCalled();

      kernel.destroy();
    });
  });

  describe('tearDown', () => {
    it('lets go of the shadow-object and both kernel handles', () => {
      const {kernel, scope} = makeUnboundScope();

      const shadowObject = {} as ShadowObjectType;
      const releaseScope = vi.fn();
      const forgetShadowObject = vi.fn();

      scope.bindTo(shadowObject, releaseScope, forgetShadowObject);

      // `debugHandles` reads the same four fields `tearDown()` clears -- checking it before and
      // after is a direct read of what the fix changes, not an inference from what a garbage
      // collector happened to do with them.
      let handles = scope.debugHandles;
      expect(handles.shadowObject, 'the scope holds the shadow-object once bound').toBe(shadowObject);
      expect(handles.releaseScope, 'the scope holds the kernel release once bound').toBe(releaseScope);
      expect(handles.forgetShadowObject, 'the scope holds the other kernel release once bound').toBe(forgetShadowObject);
      expect(handles.unsubscribeFromEntityDestroy, 'the scope holds its entity subscription once bound').toBeDefined();

      scope.tearDown();

      handles = scope.debugHandles;
      expect(handles.shadowObject, 'the shadow-object is let go of').toBeUndefined();
      expect(handles.releaseScope, 'the kernel release is let go of').toBeUndefined();
      expect(handles.forgetShadowObject, 'the other kernel release is let go of').toBeUndefined();
      expect(handles.unsubscribeFromEntityDestroy, 'the entity subscription is let go of').toBeUndefined();

      expect(() => scope.bindTo({} as ShadowObjectType, vi.fn(), vi.fn())).toThrow(/torn down/);

      kernel.destroy();
    });

    it('refuses a binding on a scope that tore down without ever being bound', () => {
      const {kernel, scope} = makeUnboundScope();

      scope.tearDown();

      expect(() => scope.bindTo(eventize({}), vi.fn(), vi.fn())).toThrow(/torn down/);

      kernel.destroy();
    });
  });
});
