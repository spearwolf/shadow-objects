// https://developer.chrome.com/docs/devtools/console/format-style?hl=de

export const CONSOLE_LOGGER = 'ConsoleLogger';
export const CONSOLE_LOGGER_STORAGE = `${CONSOLE_LOGGER}Storage`;

const IS_LOCALHOST = Boolean(globalThis.location?.host?.startsWith('localhost') ?? false);

// The name `localStorage` says nothing about a usable Storage behind it: node defines an inert
// object on `globalThis`, and a browser with disabled cookies throws a `SecurityError` -- on the
// property access or on the first write. So the capability is probed, not looked up, and the
// storage that passes is kept by reference. Whatever fails here falls back to the plain object
// under `globalThis[CONSOLE_LOGGER_STORAGE]`.
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
    // may be off, or the quota full. It costs one `storage` event pair for the other tabs of
    // this origin, and a full quota sends an otherwise readable Storage into the fallback --
    // both accepted, because every logger writes its own `enable` key in its constructor anyway.
    const probeKey = `${CONSOLE_LOGGER}.probe`;
    storage.setItem(probeKey, probeKey);
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return undefined;
  }
})();

const HAS_LOCAL_STORAGE = gLocalStorage != null;

const ConsoleLogger$ = Symbol.for(CONSOLE_LOGGER);

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

function loadConfigValue<T>(key: string | string[], as: ((val: string) => T) | undefined, defaultValue: T): T {
  const _key = getKeyPath(key);
  // @ts-ignore
  const value = gLocalStorage ? gLocalStorage.getItem(_key) : globalThis[CONSOLE_LOGGER_STORAGE]?.[_key];
  if (value == undefined) return defaultValue;
  // without a converter the stored value is the value: that is how the styles are read
  return as ? as(value) : (value as T);
}

function saveConfigValue(key: string | string[], val: any) {
  if (gLocalStorage) {
    gLocalStorage.setItem(getKeyPath(key), val);
  } else {
    // @ts-ignore
    if (globalThis[CONSOLE_LOGGER_STORAGE] == undefined) {
      // @ts-ignore
      globalThis[CONSOLE_LOGGER_STORAGE] = {};
      // @ts-ignore
      console.debug(`${CONSOLE_LOGGER}: Initialize`, {[CONSOLE_LOGGER_STORAGE]: globalThis[CONSOLE_LOGGER_STORAGE]});
    }
    // @ts-ignore
    globalThis[CONSOLE_LOGGER_STORAGE][getKeyPath(key)] = val;
  }
}

export class ConsoleLogger {
  namespace?: string;

  enable = true;

  static sharedConfig = {
    enable: IS_LOCALHOST,

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
      ['enable', 'debug', 'info', 'warn'].forEach((key) => {
        // @ts-ignore
        this.sharedConfig[key] = loadConfigValue(key, asBoolean, this.sharedConfig[key]);
      });

      ['debug', 'info', 'warn', 'error'].forEach((key) => {
        // @ts-ignore
        this.sharedStyles[key] = loadConfigValue(['styles', key], undefined, this.sharedStyles[key]);
      });

      if (ConsoleLogger.isDebug) {
        console.debug(`${CONSOLE_LOGGER}: Load config from localStorage`, ConsoleLogger.sharedConfig);
      }

      // @ts-ignore
      if (!globalThis[CONSOLE_LOGGER]?.[ConsoleLogger$]) {
        // @ts-ignore
        globalThis[CONSOLE_LOGGER] ??= {
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
      // no localStorage available: in this case we just use globalThis[STORAGE_KEY]
      // @ts-ignore
      if (!globalThis[CONSOLE_LOGGER_STORAGE]?.[ConsoleLogger$]) {
        // @ts-ignore
        globalThis[CONSOLE_LOGGER_STORAGE] = {
          [ConsoleLogger$]: true,
          ...ConsoleLogger.sharedConfig,
          // @ts-ignore
          ...globalThis[CONSOLE_LOGGER_STORAGE],
        };
        // @ts-ignore
        ConsoleLogger.sharedConfig = globalThis[CONSOLE_LOGGER_STORAGE];
        if (ConsoleLogger.isDebug) {
          console.debug(
            `${CONSOLE_LOGGER}: Load config from ${CONSOLE_LOGGER_STORAGE}`,
            // @ts-ignore
            globalThis[CONSOLE_LOGGER_STORAGE],
          );
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

    const key = [this.namespace, 'enable'];
    this.enable = loadConfigValue(key, asBoolean, this.enable);
    saveConfigValue(key, HAS_LOCAL_STORAGE ? (this.enable ? 'true' : 'false') : this.enable);
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
    this.#print('debug', ConsoleLogger.sharedStyles.debug, args);
  }

  info(...args: any[]) {
    this.#print('info', ConsoleLogger.sharedStyles.info, args);
  }

  warn(...args: any[]) {
    this.#print('warn', ConsoleLogger.sharedStyles.warn, args);
  }

  error(...args: any[]) {
    this.#print('error', ConsoleLogger.sharedStyles.error, args);
  }

  #print(level: 'debug' | 'info' | 'warn' | 'error', styles: string, args: any[]) {
    console[level](`%c${this.namespace}`, styles, ...args);
  }
}