import {createSignal, type Signal, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

// The one-warning-per-realm flags in ShadowObjectCreationScope.ts live at module scope: within one
// file, only the first bare-compare-function call for a given member name warns, no matter which
// `it` block makes that call. Each case below is therefore the ONLY caller of its member's
// deprecated form in this whole file -- warning and effect live together in a single `it`, so there
// is exactly one call site per member and no ordering between cases to depend on. Do not add a
// second bare-compare-function call for any of these five members anywhere else in this file, and
// do not split a case's warning half from its effect half into another `it`.
//
// The isolation this relies on is per test *file*: vitest runs each spec file in its own module
// instance unless `--no-isolate` is passed (`vitest.config.ts` does not lower `isolate`). A future
// case added to `Kernel.spec.ts` that also passes a bare compare function would, under
// `--no-isolate`, share these same flags and could flip one before this file's own case runs.
describe('ShadowObjectCreationScope', () => {
  afterEach(() => {
    Registry.get().clear();
    // A `console.warn` spy that a failing assertion leaves un-restored would otherwise carry its
    // call count into the next test -- `vi.spyOn` returns the very same spy instance on a target
    // that is already spied. Restoring here, independent of how the test body ends, keeps every
    // case's warning count its own.
    vi.restoreAllMocks();
  });

  describe('the deprecated isEqual argument', () => {
    it('useProperty: warns once per realm with the full deprecation text, and the function then reaches the signal as {compare}', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useProperty()" is now passed as {compare} argument. Please update your code accordingly.',
      );

      kernel.changeProperties(uuid, [['bareCompareProp', 'second']]);
      expect(compare).toHaveBeenCalled();

      warnSpy.mockRestore();
      kernel.destroy();
    });

    it('provideContext: warns once per realm with the full deprecation text, the function then reaches the signal as {compare}, and clearOnDestroy still defaults to true', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toBe(
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

      warnSpy.mockRestore();
      kernel.destroy();
    });

    it('provideGlobalContext: warns once per realm with the full deprecation text, the function then reaches the signal as {compare}, and clearOnDestroy still defaults to true', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideGlobalContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      expect(value(provider!)).toBe('first');

      kernel.changeToken(uuid, 'deprecatedProvideGlobalContextEmpty');

      expect(compare).toHaveBeenCalled();
      expect(value(provider!)).toBeUndefined();

      warnSpy.mockRestore();
      kernel.destroy();
    });

    it('useContext: warns once per realm with the full deprecation text, and the function then reaches the reader as {compare}', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(capturedContext!)).toBe('first');

      sourceSignal.set('second');
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(compare).toHaveBeenCalled();
      expect(value(capturedContext!)).toBe('second');

      warnSpy.mockRestore();
      kernel.destroy();
    });

    it('useParentContext: warns once per realm with the full deprecation text, and the function then reaches the reader as {compare}', async () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toBe(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useParentContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );

      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(value(capturedParentContext!)).toBe('first');

      sourceSignal.set('second');
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(compare).toHaveBeenCalled();
      expect(value(capturedParentContext!)).toBe('second');

      warnSpy.mockRestore();
      kernel.destroy();
    });
  });
});