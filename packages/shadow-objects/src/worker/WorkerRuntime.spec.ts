import {afterEach, beforeEach, describe, expect, it, type MockInstance, vi} from 'vitest';
import {AppliedChangeTrail, ChangeTrail, ComponentChangeType, Destroy, Destroyed, Loaded} from '../constants.js';
import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE, ConsoleLogger, type ConsoleLoggerConfig} from '../utils/ConsoleLogger.js';
import {WorkerRuntime} from './WorkerRuntime.js';

const message = (data: unknown) => ({data}) as MessageEvent;

const globals = globalThis as unknown as Record<string, unknown>;

const createEntity = (uuid: string) => ({type: ComponentChangeType.CreateEntities, uuid, token: 'test-token'});

const changeTrail = (serial: number, ...entries: unknown[]) => ({type: ChangeTrail, serial, changeTrail: entries});

let postMessage: MockInstance;

let consoleLoggerStorage: unknown;
let hadConsoleLoggerStorage = false;

// `ConsoleLogger.sharedConfig` is a process-wide static object: a case that switches a level on
// to assert against the runtime's logger output must not leave that switch on for the cases
// that run after it.
let sharedConfigSnapshot: ConsoleLoggerConfig;

/**
 * `self` is one and the same object for the whole file, and a case only takes its own listener
 * back off when it drives a destroy. A listener left behind by one case would receive the events
 * of every case after it, so every started runtime is written down here and unregistered by the
 * `afterEach` -- which also covers the case that fails halfway through.
 */
const startedRuntimes: WorkerRuntime[] = [];

const startRuntime = () => {
  const runtime = new WorkerRuntime();
  startedRuntimes.push(runtime);
  runtime.start();
  return runtime;
};

describe('WorkerRuntime', () => {
  beforeEach(() => {
    // In happy-dom `self` is the window: `postMessage` does not throw, it delivers to the very
    // `message` listeners this file installs. A `start()` with the real one would feed its own
    // `{type: Loaded}` back into the listener it has just registered, and the router built from
    // that would warn about a message it does not know.
    postMessage = vi.spyOn(self, 'postMessage').mockImplementation(() => undefined);

    hadConsoleLoggerStorage = CONSOLE_LOGGER_STORAGE in globals;
    consoleLoggerStorage = globals[CONSOLE_LOGGER_STORAGE];
    sharedConfigSnapshot = {...ConsoleLogger.sharedConfig};
  });

  afterEach(() => {
    for (const runtime of startedRuntimes.splice(0)) {
      self.removeEventListener('message', runtime.onmessage);
    }

    if (hadConsoleLoggerStorage) {
      globals[CONSOLE_LOGGER_STORAGE] = consoleLoggerStorage;
    } else {
      delete globals[CONSOLE_LOGGER_STORAGE];
    }

    Object.assign(ConsoleLogger.sharedConfig, sharedConfigSnapshot);

    vi.restoreAllMocks();
  });

  it('announces itself as loaded when it starts', () => {
    const addEventListener = vi.spyOn(self, 'addEventListener');

    const runtime = startRuntime();

    expect(addEventListener).toHaveBeenCalledWith('message', runtime.onmessage);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({type: Loaded});
  });

  it('routes the messages that reach the global scope', () => {
    const runtime = startRuntime();

    self.dispatchEvent(new MessageEvent('message', {data: changeTrail(5, createEntity('a'))}));

    expect(runtime.router).toBeDefined();
    expect(runtime.router!.kernel.hasEntity('a')).toBe(true);
    // The router binds `self.postMessage` when it is built, and it is built inside this dispatch --
    // after the spy has taken the place of the original. That is why the confirmation lands here.
    expect(postMessage).toHaveBeenCalledWith({type: AppliedChangeTrail, serial: 5});
  });

  it('stores the console-logger config without building a router', () => {
    const runtime = new WorkerRuntime();

    runtime.onmessage(message({type: CONSOLE_LOGGER, config: {debug: true}}));

    // A subset match, not `toEqual`: reading `this.logger.isDebug` right after installing the
    // config builds the runtime's own `ConsoleLogger`, and where that is the very first one built
    // in the process -- the case a real worker with no `localStorage` is always in -- `loadConfig()`
    // merges the shared defaults into this same slot on top of what was just installed
    // (`ConsoleLogger.ts`'s no-`localStorage` branch). What matters here is that the installed
    // value survives that merge, not the exact shape of the object it ends up sitting in.
    expect(globals[CONSOLE_LOGGER_STORAGE]).toMatchObject({debug: true});
    expect(runtime.router).toBeUndefined();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('reports the installed console-logger config when debug logging is on', () => {
    const runtime = new WorkerRuntime();
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    ConsoleLogger.sharedConfig.enable = true;
    ConsoleLogger.sharedConfig.debug = true;

    runtime.onmessage(message({type: CONSOLE_LOGGER, config: {debug: true}}));

    expect(debug).toHaveBeenCalledWith('%cWorkerRuntime', ConsoleLogger.sharedStyles.debug, 'console-logger config installed', {
      debug: true,
    });
  });

  it('builds its router once and keeps it', () => {
    const runtime = new WorkerRuntime();

    runtime.onmessage(message(changeTrail(1, createEntity('a'))));
    const router = runtime.router;

    runtime.onmessage(message(changeTrail(2, createEntity('b'))));

    expect(runtime.router).toBe(router);
    expect(router!.kernel.hasEntity('a')).toBe(true);
    expect(router!.kernel.hasEntity('b')).toBe(true);
  });

  // The runtime reads the `type` before a router exists, so it checks for itself instead of
  // leaning on the one that is not there yet.
  it.each([null, undefined])('discards a message it cannot read: %s', (value) => {
    const runtime = new WorkerRuntime();
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    ConsoleLogger.sharedConfig.enable = true;
    ConsoleLogger.sharedConfig.debug = true;

    expect(() => runtime.onmessage(message(value))).not.toThrow();

    expect(runtime.router).toBeUndefined();
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug).toHaveBeenCalledWith(
      '%cWorkerRuntime',
      ConsoleLogger.sharedStyles.debug,
      'discarding a message it cannot read',
      value,
    );
  });

  // What the runtime cannot read costs no kernel.
  it('discards message data that is not an object without building a router', () => {
    const runtime = new WorkerRuntime();
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ConsoleLogger.sharedConfig.enable = true;
    ConsoleLogger.sharedConfig.debug = true;

    expect(() => runtime.onmessage(message('nonsense'))).not.toThrow();

    expect(runtime.router).toBeUndefined();
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug).toHaveBeenCalledWith(
      '%cWorkerRuntime',
      ConsoleLogger.sharedStyles.debug,
      'discarding a message it cannot read',
      'nonsense',
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('writes nothing to the console when debug logging is off', () => {
    const runtime = new WorkerRuntime();
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    ConsoleLogger.sharedConfig.debug = false;

    runtime.onmessage(message('nonsense'));

    expect(debug).not.toHaveBeenCalled();
  });

  // `addEventListener` de-dupes the listener on its own, the announcement to the view is de-duped
  // by nobody -- a second `{type: Loaded}` would have the view celebrate a handshake it is long
  // past.
  it('announces itself as loaded only once, however often it is started', () => {
    const addEventListener = vi.spyOn(self, 'addEventListener');

    const runtime = startRuntime();
    runtime.start();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({type: Loaded});
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(runtime.isStarted).toBe(true);
  });

  it('takes its message listener off self and releases its router when a destroy comes through', () => {
    const removeEventListener = vi.spyOn(self, 'removeEventListener');
    const runtime = startRuntime();

    self.dispatchEvent(new MessageEvent('message', {data: {type: Destroy}}));

    expect(postMessage).toHaveBeenCalledWith({type: Destroyed});
    expect(removeEventListener).toHaveBeenCalledWith('message', runtime.onmessage);
    expect(runtime.isStarted).toBe(false);
    expect(runtime.router).toBeUndefined();

    // the actual proof: the listener is off `self`, so nothing of this reaches a router any more
    self.dispatchEvent(new MessageEvent('message', {data: changeTrail(9, createEntity('b'))}));

    expect(runtime.router).toBeUndefined();
  });

  // A destroy is the end of this runtime, not a pause. Were it only a pause, a `start()` would
  // announce a second handshake and the next message would build a kernel behind the barrier the
  // destroy just raised.
  it('stays down once a destroy has come through', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    ConsoleLogger.sharedConfig.enable = true;
    ConsoleLogger.sharedConfig.debug = true;
    const runtime = startRuntime();

    self.dispatchEvent(new MessageEvent('message', {data: {type: Destroy}}));
    postMessage.mockClear();

    runtime.start();
    runtime.onmessage(message(changeTrail(9, createEntity('b'))));

    expect(postMessage).not.toHaveBeenCalled();
    expect(runtime.isStarted).toBe(false);
    expect(runtime.router).toBeUndefined();
    expect(debug).toHaveBeenCalledWith(
      '%cWorkerRuntime',
      ConsoleLogger.sharedStyles.debug,
      'discarding a message that arrived after the teardown',
      ChangeTrail,
    );
  });
});
