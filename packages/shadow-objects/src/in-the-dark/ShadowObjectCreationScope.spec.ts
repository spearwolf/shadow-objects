import {emit, eventize, on} from '@spearwolf/eventize';
import {createSignal, type Signal, type SignalReader, value} from '@spearwolf/signalize';
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

  const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

  // A scope that has been through `bindTo()`, which is the state every case below starts from: the
  // creation API is open, and the teardown has a shadow-object to end.
  const boundScope = () => {
    const {kernel, uuid, scope} = makeUnboundScope();
    scope.bindTo(eventize({}), vi.fn(), vi.fn());
    return {kernel, entity: kernel.getEntity(uuid), scope};
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

      // Soft, from here through the rest of this `describe`: the report, its wording and the
      // rewritten {compare} option are three independent halves of a case, and a failure on the
      // first should not hide the other two.
      expect.soft(errorSpy).toHaveBeenCalledTimes(1);
      // `ConsoleLogger` prints its namespace as a styled badge, so the wording of a report starts at
      // the third argument: `console.error('%c<namespace>', styles, ...args)`. The badge is what
      // tells a report through the logger apart from a raw call on the console.
      const call = errorSpy.mock.calls[0];
      expect.soft(call?.[0]).toBe('%cKernel');
      expect
        .soft(call?.[2])
        .toBe(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "useProperty()" is now passed as {compare} argument. Please update your code accordingly.',
        );

      kernel.changeProperties(uuid, [['bareCompareProp', 'second']]);
      expect.soft(compare).toHaveBeenCalled();

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

      expect.soft(errorSpy).toHaveBeenCalledTimes(1);
      expect
        .soft(errorSpy.mock.calls[0]?.[2])
        .toBe(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideContext()" is now passed as {compare} argument. Please update your code accordingly.',
        );
      expect.soft(value(provider!)).toBe('first');

      kernel.changeToken(uuid, 'deprecatedProvideContextEmpty');

      // The compare check is what proves the bare function reached the underlying signal as its
      // {compare} option in the first place -- clearOnDestroy falls back to its default of `true`
      // for a raw, unconverted function just the same (it has no `.clearOnDestroy` property
      // either), so the value assertion below would not by itself tell the rewritten options
      // object apart from no rewrite at all.
      expect.soft(compare).toHaveBeenCalled();
      expect.soft(value(provider!)).toBeUndefined();

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

      expect.soft(errorSpy).toHaveBeenCalledTimes(1);
      expect
        .soft(errorSpy.mock.calls[0]?.[2])
        .toBe(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideGlobalContext()" is now passed as {compare} argument. Please update your code accordingly.',
        );
      expect.soft(value(provider!)).toBe('first');

      kernel.changeToken(uuid, 'deprecatedProvideGlobalContextEmpty');

      expect.soft(compare).toHaveBeenCalled();
      expect.soft(value(provider!)).toBeUndefined();

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
          // The reader stands in the second argument, the source slot. One place further right is
          // the options slot, where a bare function is the deprecated form itself -- this provider
          // would report as well, and the case counts on exactly one report.
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

      expect.soft(errorSpy).toHaveBeenCalledTimes(1);
      expect
        .soft(errorSpy.mock.calls[0]?.[2])
        .toBe(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "useContext()" is now passed as {compare} argument. Please update your code accordingly.',
        );

      // A provider's write reaches the context signal of the entity below one microtask later, so
      // both reads here wait a turn: without the first wait the context is still `undefined`,
      // without the second it still holds 'first'.
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect.soft(value(capturedContext!)).toBe('first');

      sourceSignal.set('second');
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect.soft(compare).toHaveBeenCalled();
      expect.soft(value(capturedContext!)).toBe('second');

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
          // The reader stands in the second argument, the source slot. One place further right is
          // the options slot, where a bare function is the deprecated form itself -- this provider
          // would report as well, and the case counts on exactly one report.
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

      expect.soft(errorSpy).toHaveBeenCalledTimes(1);
      expect
        .soft(errorSpy.mock.calls[0]?.[2])
        .toBe(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "useParentContext()" is now passed as {compare} argument. Please update your code accordingly.',
        );

      // A provider's write reaches the context signal of the entity below one microtask later, so
      // both reads here wait a turn: without the first wait the context is still `undefined`,
      // without the second it still holds 'first'.
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect.soft(value(capturedParentContext!)).toBe('first');

      sourceSignal.set('second');
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect.soft(compare).toHaveBeenCalled();
      expect.soft(value(capturedParentContext!)).toBe('second');

      errorSpy.mockRestore();
      kernel.destroy();
    });
  });

  describe('one name across property, context and parent context', () => {
    // The three cached readers share one body and differ only in the pair of maps each call
    // hands it; nothing in the type system holds that pairing, because `Map`'s method parameters
    // are bivariant. A crossed pair is observable only where one name is read over more than one
    // of the three ways, which is what this case does.
    it('reads the same name as a property, as a context and as a parent context, and gets three values', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      let readers:
        | {
            property: SignalReader<any>;
            context: SignalReader<any>;
            parentContext: SignalReader<any>;
          }
        | undefined;

      @ShadowObject({registry, token: 'oneNameProvider'})
      class OneNameProvider {
        constructor({provideContext}: ShadowObjectCreationAPI) {
          provideContext<string>('shared', 'from the parent');
        }
      }
      expect(OneNameProvider).toBeDefined();

      @ShadowObject({registry, token: 'oneNameReader'})
      class OneNameReader {
        constructor({provideContext, useProperty, useContext, useParentContext}: ShadowObjectCreationAPI) {
          provideContext<string>('shared', 'from this entity');
          readers = {
            property: useProperty<string>('shared'),
            context: useContext<string>('shared'),
            parentContext: useParentContext<string>('shared'),
          };
        }
      }
      expect(OneNameReader).toBeDefined();

      const parentUuid = generateUUID();
      const childUuid = generateUUID();
      kernel.createEntity(parentUuid, 'oneNameProvider');
      kernel.createEntity(childUuid, 'oneNameReader', parentUuid, 0, [['shared', 'from the property']]);

      // `useContext()` settles through a one-microtask collector, and the parent's own context
      // signal settles the same way before the inherited link can carry it down.
      await nextMicrotask();

      expect(value(readers!.property)).toBe('from the property');
      expect(value(readers!.context)).toBe('from this entity');
      expect(value(readers!.parentContext)).toBe('from the parent');

      kernel.destroy();
    });
  });

  describe('provideContext', () => {
    it('registers the clearOnDestroy write once per provider, however often it is asked for', () => {
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

      // The provider signal is the one this scope created, so its value is there without a turn
      // of the microtask queue. Only the hand-over to the entities below is deferred, and no
      // case in this block reads that far.
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

    it('does not let a later call take back an earlier clearOnDestroy opt-out', () => {
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

    it('keys the clearOnDestroy registration by provider signal, not by name, so a provideContext and a provideGlobalContext of the same name each still clear', () => {
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

  describe('a subscription that ends before the teardown', () => {
    // Every subscription the creation API hands out is booked into the scope's cleanup set, so the
    // teardown reaches the ones a shadow-object never ended itself. One that has already been
    // unsubscribed has nothing left for the teardown to do, and an entry left standing holds its
    // callback -- and everything the callback closes over -- for the rest of the object's life.
    const forms: Array<[string, (scope: ShadowObjectCreationScope, other: object, callback: () => void) => () => void]> = [
      ['on, on the entity', (scope, _other, callback) => scope.on('ping', callback)],
      ['on, on another object', (scope, other, callback) => scope.on(other, 'ping', callback)],
      ['once, on the entity', (scope, _other, callback) => scope.once('ping', callback)],
      ['once, on another object', (scope, other, callback) => scope.once(other, 'ping', callback)],
    ];

    it.each(forms)('%s: unsubscribing gives the handle back to the scope', (_label, subscribe) => {
      const {kernel, scope} = boundScope();
      const other = eventize({});

      expect(scope.debugCleanupCounts.secondary, 'the scope starts with nothing booked').toBe(0);

      for (let i = 0; i < 10; i++) {
        const unsubscribe = subscribe(scope, other, () => {});
        expect(scope.debugCleanupCounts.secondary, 'a live subscription is booked').toBe(1);
        unsubscribe();
        expect(scope.debugCleanupCounts.secondary, 'and one that has ended is not').toBe(0);
      }

      kernel.destroy();
    });

    it.each(forms)('%s: one nobody ends is still ended by the teardown', (_label, subscribe) => {
      const {kernel, entity, scope} = boundScope();
      const other = eventize({});
      const callback = vi.fn();

      subscribe(scope, other, callback);
      scope.tearDown();

      emit(entity, 'ping');
      emit(other, 'ping');

      expect(callback).not.toHaveBeenCalled();

      kernel.destroy();
    });
  });

  describe('the creation API past the teardown', () => {
    it('takes no subscription and hands back a handle with nothing behind it', () => {
      const {kernel, entity, scope} = boundScope();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const callback = vi.fn();

      scope.tearDown();

      const unsubscribe = scope.on('ping', callback);
      scope.once('ping', callback);

      emit(entity, 'ping');

      expect(callback, 'nothing was subscribed').not.toHaveBeenCalled();
      expect(scope.debugCleanupCounts.secondary, 'and nothing was booked for a teardown that is over').toBe(0);
      expect(() => unsubscribe(), 'the handle is a real function').not.toThrow();
      expect(errors, 'one line per member').toHaveBeenCalledTimes(2);

      kernel.destroy();
    });

    it('creates no reader and no feed, and hands back one that reads undefined', () => {
      const {kernel, scope} = boundScope();
      vi.spyOn(console, 'error').mockImplementation(() => {});

      scope.tearDown();

      const property = scope.useProperty('size');
      const context = scope.useContext('theme');
      const parentContext = scope.useParentContext('theme');

      expect(scope.debugCleanupCounts.secondary, 'no feed was linked').toBe(0);
      expect(value(property)).toBeUndefined();
      expect(value(context)).toBeUndefined();
      expect(value(parentContext)).toBeUndefined();

      kernel.destroy();
    });

    it('attaches no provider to the entity', async () => {
      const {kernel, entity, scope} = boundScope();
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const reader = entity.useContext('theme');

      scope.tearDown();

      scope.provideContext('theme', 'dark');
      scope.provideGlobalContext('theme', 'dark');

      // the entity hands a context value on a microtask after it is written
      await nextMicrotask();

      expect(scope.debugCleanupCounts.contextFeeds, 'no feed was attached').toBe(0);
      expect(value(reader), 'and the entity heard nothing').toBeUndefined();

      kernel.destroy();
    });

    it('creates no signal, no effect and no resource', () => {
      const {kernel, scope} = boundScope();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const body = vi.fn();
      const factory = vi.fn(() => 'a resource');

      scope.tearDown();

      const signal = scope.createSignal('never');
      const effect = scope.createEffect(body);
      const memo = scope.createMemo(() => 'never');
      const resource = scope.createResource(factory);

      expect(body, 'the effect body never runs').not.toHaveBeenCalled();
      expect(factory, 'the resource factory never runs').not.toHaveBeenCalled();
      expect(effect.destroyed, 'the effect is handed out already destroyed').toBe(true);
      expect(scope.debugCleanupCounts.secondary).toBe(0);
      expect(value(signal.get), 'the value it was called with goes nowhere').toBeUndefined();
      expect(value(memo)).toBeUndefined();
      expect(value(resource.get)).toBeUndefined();

      kernel.destroy();
    });

    it('registers no cleanup and sends nothing on', () => {
      const {kernel, entity, scope} = boundScope();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const toTheView = vi.spyOn(entity, 'dispatchMessageToView').mockImplementation(() => {});
      const heard = vi.fn();
      on(entity, 'ping', heard);

      scope.tearDown();

      scope.onDestroy(vi.fn());
      scope.onViewEvent(vi.fn());
      scope.emit('ping');
      scope.dispatchMessageToView('gone');

      expect(scope.debugCleanupCounts.primary).toBe(0);
      expect(scope.debugCleanupCounts.secondary).toBe(0);
      expect(heard, 'nothing is emitted on the entity').not.toHaveBeenCalled();
      expect(toTheView, 'nothing reaches the view').not.toHaveBeenCalled();

      kernel.destroy();
    });

    it('reports each member of the creation API once', () => {
      const {kernel, scope} = boundScope();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

      scope.tearDown();

      scope.useProperty('a');
      scope.useProperty('b');
      scope.useProperty('c');

      expect(errors, 'one line for useProperty, however many late calls it takes').toHaveBeenCalledTimes(1);
      // `ConsoleLogger` prints its namespace as a styled badge, so the wording of a report starts at
      // the third argument: `console.error('%c<namespace>', styles, ...args)`.
      expect(errors.mock.calls[0]?.[2], 'and it names the member and the scope').toMatch(
        /useProperty\(\).*"TestScope".*has torn down/,
      );

      scope.useContext('a');

      expect(errors, 'a different member is a line of its own').toHaveBeenCalledTimes(2);

      kernel.destroy();
    });

    it('is still open to the cleanup callbacks the teardown itself runs', () => {
      const {kernel, entity, scope} = boundScope();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const toTheView = vi.spyOn(entity, 'dispatchMessageToView').mockImplementation(() => {});

      // A cleanup callback runs while the teardown is under way, and the creation API is what it
      // has to say goodbye with. What it registers there is still swept up by the teardown around
      // it, which is why the API closes at the end of the teardown rather than at its start.
      scope.onDestroy(() => {
        scope.dispatchMessageToView('gone');
        scope.createSignal('a signal of the last moment');
      });

      scope.tearDown();

      expect(toTheView, 'the message reaches the view').toHaveBeenCalledWith('gone', undefined, undefined, false);
      expect(errors, 'and nothing is reported').not.toHaveBeenCalled();
      expect(scope.debugCleanupCounts.secondary, 'what it registered went with the rest').toBe(0);

      kernel.destroy();
    });

    it('reaches an onDestroy callback a cleanup books while the teardown is under way', () => {
      const {kernel, entity, scope} = boundScope();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ownCallback = vi.fn();
      const lateCallback = vi.fn();
      const lateSubscriber = vi.fn();

      scope.onDestroy(ownCallback);

      // The cleanup of an effect runs in the round behind the `onDestroy` callbacks, and it books
      // one of its own. What that callback takes in turn -- a subscription -- lands back in the
      // round the cleanup came from, so both rounds have to come round again.
      scope.createEffect(() => () => {
        scope.onDestroy(() => {
          lateCallback();
          scope.on('ping', lateSubscriber);
        });
      });

      scope.tearDown();

      expect(ownCallback, 'a callback registered before the teardown runs once').toHaveBeenCalledTimes(1);
      expect(lateCallback, 'the callback a cleanup booked runs').toHaveBeenCalledTimes(1);

      emit(entity, 'ping');
      expect(lateSubscriber, 'and the subscription that callback took is released with the rest').not.toHaveBeenCalled();

      expect(errors, 'and nothing is reported').not.toHaveBeenCalled();

      kernel.destroy();
    });
  });
});
