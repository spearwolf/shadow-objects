// https://developer.chrome.com/docs/devtools/console/format-style?hl=de

export const CONSOLE_LOGGER = 'ConsoleLogger';
export const CONSOLE_LOGGER_STORAGE = `${CONSOLE_LOGGER}Storage`;

// A loopback host is the one place this library talks by default. `host` carries the port,
// which a prefix test would have to get past -- and a prefix test says yes to every name that
// merely begins with the word, `localhost.example.com` among them, while saying no to the
// addresses that carry no name at all. So the port-free `hostname` is compared against the
// exact set. A browser hands an IPv6 host over in brackets; the bare form is there for a
// realm that does not.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const IS_LOOPBACK_HOST = LOOPBACK_HOSTNAMES.has(globalThis.location?.hostname ?? '');

// The name `localStorage` says nothing about a usable Storage behind it: node defines an inert
// object on `globalThis`, and a browser with disabled cookies throws a `SecurityError` -- on the
// property access or on the first write. So the capability is probed, not looked up, and the
// storage that passes is kept by reference. Whatever fails here falls back to the plain object
// under `globalThis.ConsoleLoggerStorage`.
const gLocalStorage: Storage | undefined = (() => {
  try {
    const storage = (globalThis as {localStorage?: Storage}).localStorage;
    if (
      typeof storage?.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return undefined;
    }
    // The write is what separates a Storage that only looks usable from one that is: cookies
    // may be off, or the quota full. This probe key is the only thing the library writes into a
    // host's storage on its own, and it is removed in the same breath -- everything past this
    // point only reads, until a caller reaches through the handle under `globalThis.ConsoleLogger`.
    // Two costs are accepted for the probe itself: one `storage` event pair for the other tabs of
    // this origin, and a full quota that sends an otherwise readable Storage into the fallback.
    const probeKey = `${CONSOLE_LOGGER}.probe`;
    try {
      storage.setItem(probeKey, probeKey);
    } finally {
      // reached even when `setItem` throws: a storage that takes the write and then fails would
      // otherwise fall through to the fallback with the probe key left behind. One way past
      // "removed in the same breath" stays open -- a `removeItem` that throws is the very call
      // this `finally` makes, and the key survives.
      storage.removeItem(probeKey);
    }
    return storage;
  } catch {
    return undefined;
  }
})();

const HAS_LOCAL_STORAGE = gLocalStorage != null;

const ConsoleLogger$: unique symbol = Symbol.for(CONSOLE_LOGGER);

export interface ConsoleLoggerConfig {
  [ConsoleLogger$]?: boolean;
  enable: boolean;
  debug: boolean;
  info: boolean;
  warn: boolean;
  'styles.debug': string;
  'styles.info': string;
  'styles.warn': string;
  'styles.error': string;
  [key: string]: string | boolean | undefined;
}

export interface ConsoleLoggerControl {
  [ConsoleLogger$]?: boolean;
  enable: boolean;
  debug: boolean;
  info: boolean;
  warn: boolean;
}

// A module-local view of the two globals this library touches, in place of a `declare global`:
// the re-exports in this package's emitted `dist/src/index.d.ts`, published as `src/index.d.ts`,
// reach every consumer's global type space through `ShadowEnv.d.ts`'s import of this module, and
// `ConsoleLogger` is too common a name to claim there uninvited -- an ambient `var ConsoleLogger`
// would collide with a consumer's own global of that name (`TS2403`) and turn a forgotten import
// of this class into a silent pass against the handle instead of a compile error.
const gGlobalSlots = globalThis as typeof globalThis & {
  ConsoleLogger?: ConsoleLoggerControl;
  ConsoleLoggerStorage?: ConsoleLoggerConfig;
};

let gInitialized = false;

const asBoolean = (val: string | boolean) => {
  if (typeof val === 'boolean') return val;
  switch (val.toLowerCase()) {
    case 'true':
    case 'yes':
    case 'on':
      return true;
    default:
      return false;
  }
};

const getKeyPath = (key: string | string[]): string =>
  [HAS_LOCAL_STORAGE ? CONSOLE_LOGGER : undefined, ...(Array.isArray(key) ? key : [key])].filter(Boolean).join('.');

function loadConfigValue<T>(key: string | string[], as: ((val: string | boolean) => T) | undefined, defaultValue: T): T {
  const _key = getKeyPath(key);
  const value = gLocalStorage ? gLocalStorage.getItem(_key) : gGlobalSlots.ConsoleLoggerStorage?.[_key];
  if (value == undefined) return defaultValue;
  // without a converter the stored value is the value: that is how the styles are read
  return as ? as(value) : (value as T);
}

// The four setters of the `globalThis.ConsoleLogger` handle below are the only callers, and those
// exist only inside the `HAS_LOCAL_STORAGE` branch of `loadConfig()` -- so `gLocalStorage` is
// always set whenever this runs. The fallback store under `globalThis.ConsoleLoggerStorage` is
// written by `loadConfig()` alone, and in the worker through `setConsoleLoggerStorage()`.
function saveConfigValue(key: string | string[], val: any) {
  if (gLocalStorage) {
    gLocalStorage.setItem(getKeyPath(key), val);
  }
}

/**
 * The key a config value is stored under. Prefixed with {@link CONSOLE_LOGGER} when it goes
 * into a real Storage, where it shares the namespace with everything else on this origin.
 */
export const consoleLoggerConfigKey = (key: string | string[]): string => getKeyPath(key);

/**
 * Reads a raw config value through whatever storage the capability probe accepted, or from the
 * fallback object store when none did. The way to reach the config from outside this module:
 * `globalThis.localStorage` may be missing, inert or hostile, and asking it directly throws.
 */
export const loadConsoleLoggerConfig = (key: string | string[], defaultValue: string): string =>
  loadConfigValue(key, undefined, defaultValue);

/**
 * Installs a config object as the fallback store, bypassing the storage probe. `WorkerRuntime`
 * calls this with the config a `RemoteWorkerEnv` forwards from the main thread, where there is no
 * `localStorage` to probe in the first place.
 *
 * Once a logger exists in such a thread, `ConsoleLogger.sharedConfig` *is* that store, and the
 * values are written into it rather than a fresh object taking its place in the slot: the shared
 * switches reach every logger of the thread, the ones already built included. One flag stays
 * behind -- a logger reads its own `<namespace>.enable` key when it is built, and a config that
 * arrives afterwards no longer moves it.
 */
export function setConsoleLoggerStorage(config: ConsoleLoggerConfig): void {
  const store = gGlobalSlots.ConsoleLoggerStorage;
  if (store != null && store === ConsoleLogger.sharedConfig) {
    // the marker travels with the merge: it says this object is the live config, and a config
    // that crossed a worker boundary carries no symbol key to say so for itself
    Object.assign(store, config, {[ConsoleLogger$]: true});
    return;
  }
  gGlobalSlots.ConsoleLoggerStorage = config;
}

export class ConsoleLogger {
  namespace?: string;

  enable = true;

  static sharedConfig: ConsoleLoggerConfig = {
    enable: IS_LOOPBACK_HOST,

    debug: false,
    info: true,
    warn: true,

    'styles.debug': 'color: #111; background: #999; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
    'styles.info': 'color: #020; background: #8a8; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
    'styles.warn': 'color: #fa0; background: #a98; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
    'styles.error': 'color: #ff0; background: #a00; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
  };

  static get isEnabled() {
    return ConsoleLogger.sharedConfig.enable;
  }

  static get isDebug() {
    return ConsoleLogger.sharedConfig.enable && ConsoleLogger.sharedConfig.debug;
  }

  static sharedStyles = {
    get debug() {
      return ConsoleLogger.sharedConfig['styles.debug'];
    },
    set debug(val: string) {
      ConsoleLogger.sharedConfig['styles.debug'] = val;
    },
    get info() {
      return ConsoleLogger.sharedConfig['styles.info'];
    },
    set info(val: string) {
      ConsoleLogger.sharedConfig['styles.info'] = val;
    },
    get warn() {
      return ConsoleLogger.sharedConfig['styles.warn'];
    },
    set warn(val: string) {
      ConsoleLogger.sharedConfig['styles.warn'] = val;
    },
    get error() {
      return ConsoleLogger.sharedConfig['styles.error'];
    },
    set error(val: string) {
      ConsoleLogger.sharedConfig['styles.error'] = val;
    },
  };

  static loadConfig() {
    if (HAS_LOCAL_STORAGE) {
      (['enable', 'debug', 'info', 'warn'] as const).forEach((key) => {
        this.sharedConfig[key] = loadConfigValue(key, asBoolean, this.sharedConfig[key]);
      });

      (['debug', 'info', 'warn', 'error'] as const).forEach((key) => {
        this.sharedStyles[key] = loadConfigValue(['styles', key], undefined, this.sharedStyles[key]);
      });

      if (ConsoleLogger.isDebug) {
        console.debug(`${CONSOLE_LOGGER}: Load config from localStorage`, ConsoleLogger.sharedConfig);
      }

      if (!gGlobalSlots.ConsoleLogger?.[ConsoleLogger$]) {
        gGlobalSlots.ConsoleLogger ??= {
          [ConsoleLogger$]: true,

          get enable() {
            return ConsoleLogger.sharedConfig.enable;
          },
          set enable(val: boolean) {
            ConsoleLogger.sharedConfig.enable = val;
            saveConfigValue('enable', val ? 'true' : 'false');
          },
          get debug() {
            return ConsoleLogger.sharedConfig.debug;
          },
          set debug(val: boolean) {
            ConsoleLogger.sharedConfig.debug = val;
            saveConfigValue('debug', val ? 'true' : 'false');
          },
          get info() {
            return ConsoleLogger.sharedConfig.info;
          },
          set info(val: boolean) {
            ConsoleLogger.sharedConfig.info = val;
            saveConfigValue('info', val ? 'true' : 'false');
          },
          get warn() {
            return ConsoleLogger.sharedConfig.warn;
          },
          set warn(val: boolean) {
            ConsoleLogger.sharedConfig.warn = val;
            saveConfigValue('warn', val ? 'true' : 'false');
          },
        };
      }
    } else {
      // no localStorage available: in this case we just use gGlobalSlots.ConsoleLoggerStorage
      if (!gGlobalSlots.ConsoleLoggerStorage?.[ConsoleLogger$]) {
        gGlobalSlots.ConsoleLoggerStorage = {
          [ConsoleLogger$]: true,
          ...ConsoleLogger.sharedConfig,
          ...gGlobalSlots.ConsoleLoggerStorage,
        };
        ConsoleLogger.sharedConfig = gGlobalSlots.ConsoleLoggerStorage;
        if (ConsoleLogger.isDebug) {
          console.debug(`${CONSOLE_LOGGER}: Load config from ${CONSOLE_LOGGER_STORAGE}`, gGlobalSlots.ConsoleLoggerStorage);
        }
      }
    }
  }

  constructor(namespace: string) {
    this.namespace = (namespace || '').trim() || CONSOLE_LOGGER;

    if (!gInitialized) {
      ConsoleLogger.loadConfig();
      gInitialized = true;
    }

    // reads only: the storage of the host is never written here. The only way this library
    // writes to it is through the four setters of the `globalThis.ConsoleLogger` handle above.
    const key = [this.namespace, 'enable'];
    this.enable = loadConfigValue(key, asBoolean, this.enable);
  }

  get isEnabled() {
    return this.enable && ConsoleLogger.sharedConfig.enable;
  }

  get isDebug() {
    return this.isEnabled && ConsoleLogger.sharedConfig.debug;
  }

  get isInfo() {
    return this.isEnabled && ConsoleLogger.sharedConfig.info;
  }

  get isWarn() {
    return this.isEnabled && ConsoleLogger.sharedConfig.warn;
  }

  debug(...args: any[]) {
    if (!this.isDebug) return;
    this.#print('debug', ConsoleLogger.sharedStyles.debug, args);
  }

  info(...args: any[]) {
    if (!this.isInfo) return;
    this.#print('info', ConsoleLogger.sharedStyles.info, args);
  }

  warn(...args: any[]) {
    if (!this.isWarn) return;
    this.#print('warn', ConsoleLogger.sharedStyles.warn, args);
  }

  // An error report names a fault in the calling code, and its author has to see it wherever
  // the application runs -- not only on a loopback host, so `error()` asks no getter.
  error(...args: any[]) {
    this.#print('error', ConsoleLogger.sharedStyles.error, args);
  }

  #print(level: 'debug' | 'info' | 'warn' | 'error', styles: string, args: any[]) {
    console[level](`%c${this.namespace}`, styles, ...args);
  }
}
