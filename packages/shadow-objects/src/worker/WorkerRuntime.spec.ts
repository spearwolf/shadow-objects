import {afterEach, beforeEach, describe, expect, it, type MockInstance, vi} from 'vitest';
import {AppliedChangeTrail, ChangeTrail, ComponentChangeType, Loaded} from '../constants.js';
import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from '../utils/ConsoleLogger.js';
import {WorkerRuntime} from './WorkerRuntime.js';

const message = (data: unknown) => ({data}) as MessageEvent;

const globals = globalThis as unknown as Record<string, unknown>;

const createEntity = (uuid: string) => ({type: ComponentChangeType.CreateEntities, uuid, token: 'test-token'});

const changeTrail = (serial: number, ...entries: unknown[]) => ({type: ChangeTrail, serial, changeTrail: entries});

let postMessage: MockInstance;

let consoleLoggerStorage: unknown;
let hadConsoleLoggerStorage = false;

/**
 * `self` is one and the same object for the whole file, and the runtime offers no way to take its
 * `message` listener back off. A listener left behind by one case would receive the events of
 * every case after it, so every started runtime is written down here and unregistered by the
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

    expect(globals[CONSOLE_LOGGER_STORAGE]).toEqual({debug: true});
    expect(runtime.router).toBeUndefined();
    expect(postMessage).not.toHaveBeenCalled();
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

  // Recorded as it behaves today, not as it ought to behave: reading `event.data.type` is the
  // first thing the runtime does, and it happens before the router is built -- so a nullish
  // payload takes the runtime down before a kernel even exists.
  it.each([null, undefined])('throws when the message data is %s', (value) => {
    const runtime = new WorkerRuntime();

    expect(() => runtime.onmessage(message(value))).toThrow(TypeError);
    expect(runtime.router).toBeUndefined();
  });

  // The runtime keeps no check of its own: everything that is not nullish goes to the router,
  // which then decides what to do with it.
  it('hands message data that is not an object to the router', () => {
    const runtime = new WorkerRuntime();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => runtime.onmessage(message('nonsense'))).not.toThrow();

    expect(runtime.router).toBeDefined();
    expect(warn).toHaveBeenCalledWith('[MessageRouter] unknown message', 'nonsense');
  });
});