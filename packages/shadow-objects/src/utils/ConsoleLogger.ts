// https://developer.chrome.com/docs/devtools/console/format-style?hl=de

const KEY_PREFIX = 'ConsoleLogger';
const STORAGE_KEY = `${KEY_PREFIX}Storage`;

const IS_LOCALHOST = Boolean(globalThis.location?.host?.startsWith('localhost') ?? false);

const HAS_LOCAL_STORAGE = 'localStorage' in globalThis;

let gInitialized = false;

const asBoolean = (str: string) => {
  switch (str.toLowerCase()) {
    case 'true':
    case 'yes':
    case 'on':
      return true;
    default:
      return false;
  }
};

const getKeyPath = (key: string | string[]): string =>
  [HAS_LOCAL_STORAGE ? KEY_PREFIX : undefined, ...(Array.isArray(key) ? key : [key])].filter(Boolean).join('.');

function loadConfigValue<T>(key: string | string[], as: (val: string) => T = undefined, defaultValue: T): T {
  // @ts-ignore
  const value = HAS_LOCAL_STORAGE ? localStorage.getItem(getKeyPath(key)) : globalThis[STORAGE_KEY]?.get(key);
  return value ? as(value) : defaultValue;
}

function saveConfigValue(key: string | string[], val: string) {
  if (HAS_LOCAL_STORAGE) {
    localStorage.setItem(getKeyPath(key), val);
  } else {
    // @ts-ignore
    if (globalThis[STORAGE_KEY] == null) {
      // @ts-ignore
      globalThis[STORAGE_KEY] = new Map();
      // @ts-ignore
      console.debug('created', {[STORAGE_KEY]: globalThis[STORAGE_KEY]});
    }
    // @ts-ignore
    globalThis[STORAGE_KEY].set(getKeyPath(key), val);
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
  };

  static sharedStyles = {
    debug: 'color: #111; background: #999; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
    info: 'color: #220; background: #89a; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
    warn: 'color: #fa0; background: #a98; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
    error: 'color: #ff0; background: #a00; display: inline-block; padding: 0 0.25em; margin: 0; border-radius: 0.25em',
  };

  static loadConfig() {
    ['enable', 'debug', 'info', 'warn'].forEach((key) => {
      // @ts-ignore
      this.sharedConfig[key] = loadConfigValue(key, asBoolean, this.sharedConfig[key]);
    });

    ['debug', 'info', 'warn', 'error'].forEach((key) => {
      // @ts-ignore
      this.sharedStyles[key] = loadConfigValue(['styles', key], undefined, this.sharedStyles[key]);
    });

    console.log(`${KEY_PREFIX}.loadConfig`, {config: ConsoleLogger.sharedConfig, styles: ConsoleLogger.sharedStyles});

    // @ts-ignore
    globalThis.ConsoleLogger ??= {
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

  constructor(namespace: string) {
    this.namespace = (namespace || '').trim() || KEY_PREFIX;

    if (!gInitialized) {
      ConsoleLogger.loadConfig();
      gInitialized = true;
    }

    const key = [this.namespace, 'enable'];
    this.enable = loadConfigValue(key, asBoolean, this.enable);
    saveConfigValue(key, this.enable ? 'true' : 'false');
  }

  get isDebug() {
    return this.enable && ConsoleLogger.sharedConfig.enable && ConsoleLogger.sharedConfig.debug;
  }

  get isInfo() {
    return this.enable && ConsoleLogger.sharedConfig.enable && ConsoleLogger.sharedConfig.info;
  }

  get isWarn() {
    return this.enable && ConsoleLogger.sharedConfig.enable && ConsoleLogger.sharedConfig.warn;
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
