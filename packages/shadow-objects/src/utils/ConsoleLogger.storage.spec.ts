import {afterEach, describe, expect, it, vi} from 'vitest';
import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from './ConsoleLogger.js';

// A host can offer the name `localStorage` without offering a Storage: node defines an inert
// object on `globalThis`, and a browser with cookies disabled throws a `SecurityError` -- either
// on the property access or on the first write. Every case here installs such a global and loads
// a fresh copy of the module, because the capability is probed once, while the module evaluates.
//
// `vitest.setup.ts` puts a working Storage on `globalThis` for every spec, so the hostile global
// has to be installed per case; a spec that relies on the environment alone would test nothing.

const globalRecord = globalThis as unknown as Record<string, unknown>;

const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;

const importWithLocalStorage = async (descriptor: PropertyDescriptor): Promise<typeof import('./ConsoleLogger.js')> => {
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, ...descriptor});
  vi.resetModules();
  return import('./ConsoleLogger.js');
};

const securityError = () => {
  throw new Error('SecurityError: access to localStorage is denied for this document');
};

describe('ConsoleLogger storage capability', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
    delete globalRecord[CONSOLE_LOGGER];
    delete globalRecord[CONSOLE_LOGGER_STORAGE];
    vi.resetModules();
  });

  it('constructs a logger when globalThis.localStorage is an inert object', async () => {
    // this is what node puts on globalThis without `--localstorage-file`
    const {ConsoleLogger} = await importWithLocalStorage({value: {}});

    expect(() => new ConsoleLogger('inert-storage')).not.toThrow();
    expect(globalRecord[CONSOLE_LOGGER_STORAGE], 'the config falls back to the global object store').toBeTypeOf('object');
  });

  it('constructs a logger when reading globalThis.localStorage throws', async () => {
    const {ConsoleLogger} = await importWithLocalStorage({get: securityError});

    expect(() => new ConsoleLogger('unreadable-storage')).not.toThrow();
    expect(globalRecord[CONSOLE_LOGGER_STORAGE], 'the config falls back to the global object store').toBeTypeOf('object');
  });

  it('constructs a logger when writing to localStorage throws', async () => {
    const {ConsoleLogger} = await importWithLocalStorage({
      value: {getItem: () => null, setItem: securityError, removeItem: () => undefined},
    });

    expect(() => new ConsoleLogger('read-only-storage')).not.toThrow();
    expect(globalRecord[CONSOLE_LOGGER_STORAGE], 'the config falls back to the global object store').toBeTypeOf('object');
  });

  it('constructs a logger when localStorage takes a write but has no getItem', async () => {
    // a write probe alone would accept this one: it takes `setItem` and `removeItem` and only
    // gives up when the config is read back
    const {ConsoleLogger} = await importWithLocalStorage({
      value: {setItem: () => undefined, removeItem: () => undefined},
    });

    expect(() => new ConsoleLogger('write-only-storage')).not.toThrow();
    expect(globalRecord[CONSOLE_LOGGER_STORAGE], 'the config falls back to the global object store').toBeTypeOf('object');
  });

  it('keeps using a localStorage that works without writing to it', async () => {
    const key = `${CONSOLE_LOGGER}.usable-storage.enable`;
    try {
      const {ConsoleLogger} = await importWithLocalStorage(localStorageDescriptor);

      new ConsoleLogger('usable-storage');

      expect(localStorage.getItem(key), 'the constructor writes no key to localStorage').toBeNull();
      expect(globalRecord[CONSOLE_LOGGER_STORAGE], 'no fallback store is created').toBeUndefined();
    } finally {
      localStorage.removeItem(key);
    }
  });

  it('adds no per-namespace key to the fallback store', async () => {
    const {ConsoleLogger} = await importWithLocalStorage({value: {}});

    new ConsoleLogger('quiet-namespace');

    const fallbackStore = globalRecord[CONSOLE_LOGGER_STORAGE];
    expect(fallbackStore, 'the config falls back to the global object store').toBeTypeOf('object');
    expect(Object.keys(fallbackStore as object)).not.toContain('quiet-namespace.enable');
  });
});