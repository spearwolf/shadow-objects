import {on} from '@spearwolf/eventize';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  AppliedChangeTrail,
  ChangeTrail,
  ComponentChangeType,
  Destroy,
  Destroyed,
  ImportedModule,
  Loaded,
  MessageToView,
  WorkerChangeTrailTimeout,
  WorkerConfigureTimeout,
  WorkerDestroyTimeout,
  WorkerLoadTimeout,
} from '../constants.js';
import type {ChangeTrailType, ISendEvents, IUpdateOrderChange} from '../types.js';
import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from '../utils/ConsoleLogger.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';
import {RemoteWorkerEnv, type RemoteWorkerEnvOptions} from './RemoteWorkerEnv.js';

const {FakeWorker, workers} = vi.hoisted(() => {
  class FakeWorker {
    listeners = new Map<string, Set<(event: any) => void>>();
    posted: any[] = [];
    transferred: (Transferable[] | undefined)[] = [];
    terminateCount = 0;

    addEventListener(type: string, listener: (event: any) => void) {
      let listeners = this.listeners.get(type);
      if (!listeners) {
        listeners = new Set();
        this.listeners.set(type, listeners);
      }
      listeners.add(listener);
    }

    removeEventListener(type: string, listener: (event: any) => void) {
      this.listeners.get(type)?.delete(listener);
    }

    postMessage(data: any, transfer?: Transferable[]) {
      this.posted.push(data);
      this.transferred.push(transfer);
    }

    terminate() {
      this.terminateCount++;
    }

    // --- test-side triggers ---

    dispatch(type: string, event: any) {
      for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
    }

    reply(data: any) {
      this.dispatch('message', {data});
    }

    fail(message = 'boom') {
      this.dispatch('error', {
        type: 'error',
        message,
        filename: 'shadow-objects.worker.js',
        lineno: 1,
        colno: 1,
        error: new Error(message),
      });
    }

    failToDeserialize() {
      this.dispatch('messageerror', {type: 'messageerror', data: undefined});
    }
  }

  const workers: FakeWorker[] = [];
  return {FakeWorker, workers};
});

vi.mock('../create-worker.js', () => ({
  default: () => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker as unknown as Worker;
  },
}));

const withTimeout = <T>(promise: Promise<T>, ms = 250) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

/**
 * Asserts that the promise rejects, and with which error. Naming the error is what keeps the
 * assertion honest: `withTimeout()` rejects with a plain `Error` of its own, so a check that
 * only asks for a rejection would go green on exactly the hanging call this guards against.
 */
const expectRejection = async (promise: Promise<unknown>, name: string) => {
  const reason = await withTimeout(promise).then(
    () => {
      throw new Error('expected the promise to reject, but it resolved');
    },
    (error) => error,
  );
  expect((reason as Error).name).toBe(name);
  return reason as Error;
};

const expectWorkerFailedRejection = (promise: Promise<unknown>) => expectRejection(promise, 'WorkerFailedError');

const expectWorkerDestroyedRejection = (promise: Promise<unknown>) => expectRejection(promise, 'WorkerDestroyedError');

/** Lets a `.finally()` chained onto an already settled promise run. */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

const startEnv = async (options?: RemoteWorkerEnvOptions) => {
  const env = new RemoteWorkerEnv(options);
  const started = env.start();
  const worker = workers.at(-1)!;
  worker.reply({type: Loaded});
  await started;
  return {env, worker};
};

describe('RemoteWorkerEnv', () => {
  beforeEach(() => {
    workers.length = 0;
  });

  describe('worker failure', () => {
    it('rejects a start() that is still waiting for the worker to load', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();

      const worker = workers.at(-1)!;
      worker.fail('cannot import module');

      await expectWorkerFailedRejection(started);

      // the failure path terminated it; the catch in start() must not do so a second time
      expect(worker.terminateCount).toBe(1);
    });

    it('rejects a pending applyChangeTrail instead of waiting for the change trail timeout', async () => {
      const {env, worker} = await startEnv();

      const pending = env.applyChangeTrail([], true);
      worker.fail();

      await expectWorkerFailedRejection(pending);
    });

    it('rejects a pending importScript instead of waiting for the configure timeout', async () => {
      const {env, worker} = await startEnv();

      const pending = env.importScript('./some-module.js');
      worker.failToDeserialize();

      await expectWorkerFailedRejection(pending);
    });

    it('rejects a workerLoaded that is still pending when the worker fails', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const worker = workers.at(-1)!;
      const pending = env.workerLoaded;

      worker.fail();

      await expectWorkerFailedRejection(pending);
      await expectWorkerFailedRejection(started);
    });

    it('emits workerFailed with the reason', async () => {
      const {env, worker} = await startEnv();

      const failedSpy = vi.fn();
      on(env, 'workerFailed', failedSpy);

      worker.fail('kaboom');

      expect(failedSpy).toHaveBeenCalledTimes(1);

      const event = failedSpy.mock.calls[0][0];
      expect(event.env).toBe(env);
      expect(event.type).toBe('error');
      expect(event.message).toContain('kaboom');
      expect(event.reason.name).toBe('WorkerFailedError');
    });

    it('replays workerFailed to a listener that subscribes afterwards', async () => {
      const {env, worker} = await startEnv();

      worker.fail();

      const failedSpy = vi.fn();
      on(env, 'workerFailed', failedSpy);

      expect(failedSpy).toHaveBeenCalledTimes(1);
    });

    it('marks itself destroyed and terminates the worker', async () => {
      const {env, worker} = await startEnv();

      worker.fail();

      expect(env.isDestroyed).toBe(true);
      expect(worker.terminateCount).toBe(1);
    });

    it('reports only the first failure', async () => {
      const {env, worker} = await startEnv();

      const failedSpy = vi.fn();
      on(env, 'workerFailed', failedSpy);

      worker.fail();
      worker.failToDeserialize();

      expect(failedSpy).toHaveBeenCalledTimes(1);
      expect(worker.terminateCount).toBe(1);
    });

    it('announces the failure even when the proxy-failed callback throws', async () => {
      const {env, worker} = await startEnv();

      const failedSpy = vi.fn();
      on(env, 'workerFailed', failedSpy);

      (env as IShadowObjectEnvProxy).onProxyFailed = () => {
        throw new Error('a consumer that cannot cope');
      };

      expect(() => worker.fail('kaboom')).not.toThrow();

      expect(failedSpy).toHaveBeenCalledTimes(1);
      expect(failedSpy.mock.calls[0][0].reason.name).toBe('WorkerFailedError');
      expect(env.isDestroyed).toBe(true);
      expect(worker.terminateCount).toBe(1);
    });

    // eventize puts the value into the keeper only after the dispatch has run through, so a
    // listener that throws would take the replay for every later subscriber with it -- and
    // `WorkerFailed` is documented as retained (`docs/api-reference.md`, RemoteWorkerEnv events)
    it('replays workerFailed to a later listener even when the first one throws', async () => {
      const {env, worker} = await startEnv();

      on(env, 'workerFailed', () => {
        throw new Error('a consumer that cannot cope');
      });

      expect(() => worker.fail('kaboom')).not.toThrow();

      const late = vi.fn();
      on(env, 'workerFailed', late);

      expect(late, 'the retained failure is still there for whoever comes after').toHaveBeenCalledTimes(1);
      expect(late.mock.calls[0][0].reason.name).toBe('WorkerFailedError');
    });

    it('rejects calls issued after the failure right away', async () => {
      const {env, worker} = await startEnv();

      worker.fail();

      await expectWorkerFailedRejection(env.applyChangeTrail([], true));
      await expectWorkerFailedRejection(env.importScript('./late.js'));
      await expectWorkerFailedRejection(env.start());
      await expectWorkerFailedRejection(env.workerLoaded);
    });

    it('stays quiet when the worker reports an error after destroy()', async () => {
      const {env, worker} = await startEnv();

      const failedSpy = vi.fn();
      on(env, 'workerFailed', failedSpy);

      env.destroy();
      worker.reply({type: Destroyed});
      worker.fail();

      expect(failedSpy).not.toHaveBeenCalled();
    });

    it('pins the event name', () => {
      expect(RemoteWorkerEnv.WorkerFailed).toBe('workerFailed');
    });
  });

  describe('the load announcement', () => {
    // the same keeper rule as for the failure, and it bites harder here: `workerLoaded` reads the
    // retained value, so an environment that never stored it hands out a promise that waits for a
    // failure or a teardown instead of resolving. The emit runs from a microtask, so a throw that
    // escapes has no caller left to reach
    it('replays workerLoaded to a later listener even when the first one throws', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const worker = workers.at(-1)!;

      on(env, RemoteWorkerEnv.WorkerLoaded, () => {
        throw new Error('a consumer that cannot cope');
      });

      worker.reply({type: Loaded});
      await started;
      await flushMicrotasks();

      const late = vi.fn();
      on(env, RemoteWorkerEnv.WorkerLoaded, late);

      expect(late, 'the retained handshake is still there for whoever comes after').toHaveBeenCalledTimes(1);
      expect(late.mock.calls[0][0]).toBe(env);

      // the promise is built on that same replay
      await expect(withTimeout(env.workerLoaded)).resolves.toBe(env);

      env.destroy();
      worker.reply({type: Destroyed});
    });

    it('pins the event name', () => {
      expect(RemoteWorkerEnv.WorkerLoaded).toBe('workerLoaded');
    });
  });

  describe('teardown while starting', () => {
    it('leaves the worker to destroy() when the load reply arrives after the teardown began', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const worker = workers.at(-1)!;

      // the teardown overtakes the load handshake — the worker is up, but nobody wants it any more
      env.destroy();
      expect(worker.posted.at(-1)).toEqual({type: Destroy});

      worker.reply({type: Loaded});
      await started.catch(() => {});

      // destroy() is still waiting for the Destroyed reply, so the worker has to stay alive
      // long enough to run its own teardown
      expect(worker.terminateCount).toBe(0);

      worker.reply({type: Destroyed});
      await flushMicrotasks();

      expect(worker.terminateCount).toBe(1);
    });

    it('rejects a start() the teardown overtakes while the worker stays silent', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();

      // no reply from this worker, ever — without the teardown settling it, the call would
      // sit out WorkerLoadTimeout and then report a timeout instead of the actual reason
      env.destroy();

      await expectWorkerDestroyedRejection(started);
    });

    it('rejects a workerLoaded the teardown overtakes while the worker stays silent', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const pending = env.workerLoaded;

      env.destroy();

      await expectWorkerDestroyedRejection(pending);
      await expectWorkerDestroyedRejection(started);
    });

    it('rejects a workerLoaded whose worker answers only after the teardown', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const worker = workers.at(-1)!;
      const pending = env.workerLoaded;

      env.destroy();
      worker.reply({type: Loaded});
      worker.reply({type: Destroyed});

      // the load handshake completed, but nobody hands out an environment that is gone
      await expectWorkerDestroyedRejection(started);
      await expectWorkerDestroyedRejection(pending);
    });

    it('rejects a start() torn down after the load reply but before it settles', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const worker = workers.at(-1)!;

      // the reply is in, so the handshake no longer listens for the teardown — the check that
      // catches this one sits between the handshake and the WorkerLoaded event
      worker.reply({type: Loaded});
      env.destroy();
      worker.reply({type: Destroyed});

      await expectWorkerDestroyedRejection(started);
    });
  });

  describe('after destroy', () => {
    const destroyed = async () => {
      const {env, worker} = await startEnv();
      env.destroy();
      // settles the Destroyed handshake so its 5s timer does not stay open past the case
      worker.reply({type: Destroyed});
      return {env, worker};
    };

    it('rejects applyChangeTrail instead of throwing a TypeError', async () => {
      const {env} = await destroyed();

      await expectWorkerDestroyedRejection(env.applyChangeTrail([], true));
    });

    it('rejects importScript instead of throwing a TypeError', async () => {
      const {env} = await destroyed();

      await expectWorkerDestroyedRejection(env.importScript('./late.js'));
    });

    it('settles the requests that were in flight when the teardown arrived', async () => {
      const {env, worker} = await startEnv();

      const pendingChangeTrail = env.applyChangeTrail([], true);
      const pendingImport = env.importScript('./in-flight.js');

      env.destroy();
      worker.reply({type: Destroyed});

      // their replies can no longer arrive, so neither of them waits out its own timeout
      await expectWorkerDestroyedRejection(pendingChangeTrail);
      await expectWorkerDestroyedRejection(pendingImport);
    });

    it('turns a start() away instead of spawning a worker nobody can reach', async () => {
      const {env} = await destroyed();
      const workerCount = workers.length;

      await expectWorkerDestroyedRejection(env.start());

      // the decisive part: a second thread would run on with no reference left to stop it
      expect(workers.length, 'workers created after the teardown').toBe(workerCount);
    });

    it('rejects a start() that is torn down while it waits for the worker', async () => {
      const env = new RemoteWorkerEnv();
      const started = env.start();
      const worker = workers.at(-1)!;

      env.destroy();
      worker.reply({type: Loaded});
      worker.reply({type: Destroyed});

      await expectWorkerDestroyedRejection(started);
    });

    it('rejects a second start() that is torn down before it hands out the environment', async () => {
      const {env, worker} = await startEnv();

      // the environment is up, so this call takes the already-started branch and only waits
      // for the load promise, which resolves from the retained event one microtask later
      const started = env.start();
      env.destroy();
      worker.reply({type: Destroyed});

      await expectWorkerDestroyedRejection(started);
    });

    it('still reports a worker failure rather than the teardown that followed it', async () => {
      const {env, worker} = await startEnv();

      worker.fail();

      // the teardown comes second and must not put its own reason over the failure that caused it
      env.destroy();
      env.destroy();

      await expectWorkerFailedRejection(env.start());
      await expectWorkerFailedRejection(env.workerLoaded);
      await expectWorkerFailedRejection(env.applyChangeTrail([], true));
      await expectWorkerFailedRejection(env.importScript('./late.js'));
    });

    it('counts as destroyed even when no worker was ever spawned', async () => {
      const env = new RemoteWorkerEnv();

      env.destroy();

      expect(env.isDestroyed).toBe(true);
      await expectWorkerDestroyedRejection(env.start());
      expect(workers.length, 'workers created after the teardown').toBe(0);
    });

    it('tears down once, however often destroy() is called', async () => {
      const {env, worker} = await startEnv();

      env.destroy();
      env.destroy();

      expect(worker.posted.filter((message) => message.type === Destroy)).toHaveLength(1);

      worker.reply({type: Destroyed});
      await flushMicrotasks();

      expect(worker.terminateCount).toBe(1);
    });

    // `.finally()` passes a rejection on, so without a `catch()` closing the chain a silent worker
    // ends five seconds after the teardown in an unhandled rejection that belongs to nobody.
    // On the fake timers: `startEnv()` gets through on microtasks alone, the load handshake needs
    // no real timer of its own.
    it('terminates the worker and reports it when the teardown is never acknowledged', async () => {
      try {
        // inside the try, so that a throw anywhere below still gives the real timers back --
        // fake ones left standing would hang `flushMicrotasks()` in every case after this one
        vi.useFakeTimers();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const {env, worker} = await startEnv();

        env.destroy();
        expect(worker.terminateCount, 'the worker gets its own teardown window').toBe(0);

        await vi.advanceTimersByTimeAsync(WorkerDestroyTimeout);

        expect(worker.terminateCount, 'and does not outlive it').toBe(1);
        expect(warn, 'the silence is reported instead of ending as an unhandled rejection').toHaveBeenCalledTimes(1);
      } finally {
        vi.restoreAllMocks();
        vi.useRealTimers();
      }
    });
  });

  describe('change trails', () => {
    // the trail is a snapshot that travels on to the consumers after this call, as
    // `ShadowEnv.AfterSync` when the environment applies it and as `ShadowEnv.SyncFailed` when it
    // refuses it -- `docs/api-reference.md` promises that of `buildChangeTrails()`, and the
    // promise holds for both environments or for neither
    it('keeps the transferables on the change trail it was handed', async () => {
      const {env, worker} = await startEnv();

      const buffer = new ArrayBuffer(8);
      const carrier: ISendEvents = {
        type: ComponentChangeType.SendEvents,
        uuid: 'a',
        events: [{type: 'blob', data: 'payload'}],
        transferables: [buffer],
      };
      const plain: IUpdateOrderChange = {type: ComponentChangeType.UpdateOrder, uuid: 'b', order: 1};
      const trail: ChangeTrailType = [carrier, plain];

      await env.applyChangeTrail(trail, false);

      expect(worker.posted.at(-1).type).toBe(ChangeTrail);
      expect(carrier.transferables, 'the trail the caller keeps still carries them').toEqual([buffer]);
      expect(worker.posted.at(-1).changeTrail[0].transferables, 'the message does not').toBeUndefined();
      expect(worker.transferred.at(-1), 'they travel as the transfer list instead').toEqual([buffer]);
      expect(worker.posted.at(-1).changeTrail[1], 'an entry without them is passed through as it is').toBe(plain);
    });

    // the number is the only link between a request and its confirmation; one that jumps is
    // worthless to any later diagnosis
    it('numbers only the change trails it asks a confirmation for', async () => {
      const {env, worker} = await startEnv();

      await env.applyChangeTrail([], false);
      expect(worker.posted.at(-1).serial, 'a trail nobody waits for travels without a serial').toBeUndefined();

      const first = env.applyChangeTrail([], true);
      expect(worker.posted.at(-1).serial).toBe(1);
      worker.reply({type: AppliedChangeTrail, serial: 1});
      await first;

      await env.applyChangeTrail([], false);

      const second = env.applyChangeTrail([], true);
      expect(worker.posted.at(-1).serial, 'the sequence on the wire has no gaps').toBe(2);
      worker.reply({type: AppliedChangeTrail, serial: 2});
      await second;
    });

    // the serial decides who a confirmation concerns -- even when it carries an error
    it('settles only the request the confirmation belongs to', async () => {
      const {env, worker} = await startEnv();

      const first = env.applyChangeTrail([], true);
      const second = env.applyChangeTrail([], true);

      let secondSettled = false;
      second.then(
        () => {
          secondSettled = true;
        },
        () => {
          secondSettled = true;
        },
      );

      worker.reply({type: AppliedChangeTrail, serial: 1, error: 'the first trail failed'});

      await expect(first).rejects.toBe('the first trail failed');
      await flushMicrotasks();
      expect(secondSettled, 'a failure of another trail decides nothing here').toBe(false);

      worker.reply({type: AppliedChangeTrail, serial: 2});
      await second;
    });
  });

  describe('module imports', () => {
    // two imports can be on the wire at the same time, and the worker answers each one with its
    // own url (`worker/MessageRouter.ts`, the Configure branch)
    it('settles only the import the confirmation belongs to', async () => {
      const {env, worker} = await startEnv();

      const first = env.importScript('./first.js');
      const second = env.importScript('./second.js');

      // the urls the environment resolved -- `importScript` matches on the absolute form it sent
      const firstUrl = worker.posted.at(-2).importModule;
      const secondUrl = worker.posted.at(-1).importModule;

      let secondSettled = false;
      second.then(
        () => {
          secondSettled = true;
        },
        () => {
          secondSettled = true;
        },
      );

      worker.reply({type: ImportedModule, url: firstUrl, error: 'module has no "shadowObjects" export'});

      await expect(first).rejects.toBe('module has no "shadowObjects" export');
      await flushMicrotasks();
      expect(secondSettled, 'a module that failed to import says nothing about another one').toBe(false);

      worker.reply({type: ImportedModule, url: secondUrl});
      await second;
    });
  });

  describe('the listeners on the worker', () => {
    it('takes its listeners off the worker when the environment is torn down', async () => {
      const {env, worker} = await startEnv();

      const messages = vi.fn();
      (env as IShadowObjectEnvProxy).onMessageToView = messages;

      env.destroy();

      // the window this is about: the worker is still alive, waiting to acknowledge, and through
      // the listeners it would keep the environment and everything it references reachable.
      // The `message` slot is not empty here -- the wait for the acknowledgement holds one of
      // its own -- so what pins it is that nothing of this environment answers any more
      worker.reply({type: MessageToView, data: {uuid: 'a', type: 'ping'}});
      expect(messages, 'a message after the teardown reaches nobody').not.toHaveBeenCalled();
      expect(worker.listeners.get('error')?.size ?? 0, 'error, while the worker is still alive').toBe(0);
      expect(worker.listeners.get('messageerror')?.size ?? 0, 'messageerror, while the worker is still alive').toBe(0);

      worker.reply({type: Destroyed});
      await flushMicrotasks();

      // the acknowledgement takes the waiting listener with it, and nothing of ours is left
      expect(worker.listeners.get('message')?.size ?? 0, 'message').toBe(0);
      expect(worker.listeners.get('error')?.size ?? 0, 'error').toBe(0);
      expect(worker.listeners.get('messageerror')?.size ?? 0, 'messageerror').toBe(0);
    });

    // the third path: no failure, no teardown -- the load handshake simply runs out of time and
    // `start()` unwinds on its own
    it('takes its listeners off a start() that runs out of time', async () => {
      try {
        vi.useFakeTimers();
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const env = new RemoteWorkerEnv();
        const started = env.start().then(
          () => undefined,
          (reason: Error) => reason,
        );
        const worker = workers.at(-1)!;

        await vi.advanceTimersByTimeAsync(WorkerLoadTimeout);

        expect((await started)?.message, 'the handshake reports its own timeout').toContain(
          'Timeout waiting for message of type',
        );
        expect(env.isDestroyed, 'a start that failed is not a teardown').toBe(false);
        expect(worker.terminateCount, 'the start that failed owns the worker it created').toBe(1);
        expect(error, 'the failure is reported').toHaveBeenCalled();

        expect(worker.listeners.get('message')?.size ?? 0, 'message').toBe(0);
        expect(worker.listeners.get('error')?.size ?? 0, 'error').toBe(0);
        expect(worker.listeners.get('messageerror')?.size ?? 0, 'messageerror').toBe(0);
      } finally {
        vi.restoreAllMocks();
        vi.useRealTimers();
      }
    });

    // the failure path terminates right away, so the unsubscribe costs it nothing and makes the
    // rule one that knows no second case
    it('takes its listeners off the worker when it fails', async () => {
      const {env, worker} = await startEnv();

      worker.fail();

      expect(env.isDestroyed).toBe(true);
      expect(worker.listeners.get('message')?.size ?? 0, 'message').toBe(0);
      expect(worker.listeners.get('error')?.size ?? 0, 'error').toBe(0);
      expect(worker.listeners.get('messageerror')?.size ?? 0, 'messageerror').toBe(0);
    });
  });

  describe('console-logger config for the worker', () => {
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;

    const withLocalStorage = async (descriptor: PropertyDescriptor, run: () => Promise<void>) => {
      Object.defineProperty(globalThis, 'localStorage', {configurable: true, ...descriptor});
      try {
        await run();
      } finally {
        Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
      }
    };

    it('reads the worker config from its key below the ConsoleLogger namespace', async () => {
      const key = `${CONSOLE_LOGGER}.RemoteWorkerEnv.workerConfig`;
      localStorage.setItem(key, JSON.stringify({debug: true}));
      try {
        const {env, worker} = await startEnv();

        expect(worker.posted[0].config.debug, 'the stored config overrides the shared one').toBe(true);

        env.destroy();
        worker.reply({type: Destroyed});
      } finally {
        localStorage.removeItem(key);
      }
    });

    it('starts when the stored worker config is not readable as JSON', async () => {
      const key = `${CONSOLE_LOGGER}.RemoteWorkerEnv.workerConfig`;
      localStorage.setItem(key, '{"debug": true');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const {env, worker} = await startEnv();

        expect(worker.posted[0].type, 'the worker is configured before the handshake').toBe(CONSOLE_LOGGER);
        expect(worker.posted[0].config.debug, 'an unusable value counts as no config at all').toBe(false);
        expect(
          warn.mock.calls.some((args) => args.some((arg) => typeof arg === 'string' && arg.includes(key))),
          'the warning names the storage key',
        ).toBe(true);

        env.destroy();
        worker.reply({type: Destroyed});
      } finally {
        warn.mockRestore();
        localStorage.removeItem(key);
      }
    });

    it.each([
      ['[1,2]', 'an array'],
      ['null', 'null'],
      ['0', 'a number'],
      ['"debug"', 'a string'],
    ])('treats a stored config of %s (%s) like a missing one', async (stored) => {
      const key = `${CONSOLE_LOGGER}.RemoteWorkerEnv.workerConfig`;

      // the config the worker gets with no key set at all is the yardstick every one of these
      // values has to match: valid JSON that is not a plain object contributes nothing, exactly
      // like an absent key would
      const {env: referenceEnv, worker: referenceWorker} = await startEnv();
      const baseline = referenceWorker.posted[0].config;
      referenceEnv.destroy();
      referenceWorker.reply({type: Destroyed});

      localStorage.setItem(key, stored);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const {env, worker} = await startEnv();

        expect(worker.posted[0].config, 'contributes nothing beyond the shared config').toEqual(baseline);
        expect(
          warn.mock.calls.some((args) => args.some((arg) => typeof arg === 'string' && arg.includes(key))),
          'the warning names the storage key',
        ).toBe(true);

        env.destroy();
        worker.reply({type: Destroyed});
      } finally {
        warn.mockRestore();
        localStorage.removeItem(key);
      }
    });

    it('starts when reading globalThis.localStorage throws', async () => {
      // a browser with cookies disabled: the property access itself is a SecurityError
      await withLocalStorage(
        {
          get() {
            throw new Error('SecurityError: access to localStorage is denied for this document');
          },
        },
        async () => {
          const {env, worker} = await startEnv();

          expect(worker.posted[0].type, 'the worker is configured before the handshake').toBe(CONSOLE_LOGGER);

          env.destroy();
          worker.reply({type: Destroyed});
        },
      );
    });

    it('configures the worker from the fallback store when no Storage is usable', async () => {
      // the capability is probed while the module evaluates, so the hostile global has to be in
      // place before the import — this is the inert object node puts on globalThis
      await withLocalStorage({value: {}}, async () => {
        vi.resetModules();
        try {
          const {RemoteWorkerEnv: FreshRemoteWorkerEnv} = await import('./RemoteWorkerEnv.js');

          const env = new FreshRemoteWorkerEnv();
          const started = env.start();
          const worker = workers.at(-1)!;
          worker.reply({type: Loaded});
          await started;

          expect(worker.posted[0].type).toBe(CONSOLE_LOGGER);
          expect(worker.posted[0].config).toBeTypeOf('object');

          env.destroy();
          worker.reply({type: Destroyed});
        } finally {
          delete (globalThis as unknown as Record<string, unknown>)[CONSOLE_LOGGER];
          delete (globalThis as unknown as Record<string, unknown>)[CONSOLE_LOGGER_STORAGE];
          vi.resetModules();
        }
      });
    });
  });
  describe('the timeouts', () => {
    /**
     * The four resolved timeouts of a fresh environment, so a case can name the one key it is
     * about and let the assertion carry the other three.
     */
    const defaultTimeouts = {
      loadTimeout: WorkerLoadTimeout,
      configureTimeout: WorkerConfigureTimeout,
      changeTrailTimeout: WorkerChangeTrailTimeout,
      destroyTimeout: WorkerDestroyTimeout,
    };

    it('default to the four constants', () => {
      expect(new RemoteWorkerEnv().timeouts).toEqual(defaultTimeouts);
    });

    it.each(Object.keys(defaultTimeouts) as (keyof typeof defaultTimeouts)[])(
      'take the %s option and leave the other three on their constant',
      (key) => {
        const env = new RemoteWorkerEnv({[key]: 1234});

        expect(env.timeouts).toEqual({...defaultTimeouts, [key]: 1234});
      },
    );

    // The four cases below are the only proof that a value taken in is also a value acted on.
    // Each of them asserts both sides of its deadline: still open one millisecond before it,
    // over one millisecond later. Only the second half tells the configured number apart from
    // the constant it stands in for -- with the constant in force, nothing happens at either mark.
    //
    // None of them awaits the call it is about. A call that never settles would suspend the
    // case instead of failing it, and a suspended case takes the whole file with it, so the
    // outcome is parked in `settled` and asserted from there.
    const trackSettled = (promise: Promise<unknown>) => {
      const state = {value: 'pending' as unknown};
      void promise.then(
        (value) => {
          state.value = value ?? 'resolved';
        },
        (error: Error) => {
          state.value = error;
        },
      );
      return state;
    };

    const expectTimedOut = (settled: {value: unknown}) => {
      expect((settled.value as Error)?.message, 'and then, by its own clock').toContain('Timeout waiting for message of type');
    };

    it('cut the load handshake off at the loadTimeout', async () => {
      try {
        // inside the try, so a throw anywhere below still hands the real timers back
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const env = new RemoteWorkerEnv({loadTimeout: 1234});
        const settled = trackSettled(env.start());

        await vi.advanceTimersByTimeAsync(1233);
        expect(settled.value, 'not before its time').toBe('pending');

        await vi.advanceTimersByTimeAsync(1);
        expectTimedOut(settled);
      } finally {
        vi.restoreAllMocks();
        vi.useRealTimers();
      }
    });

    it('cut a change trail that waits for confirmation off at the changeTrailTimeout', async () => {
      try {
        vi.useFakeTimers();

        const {env} = await startEnv({changeTrailTimeout: 1234});
        const settled = trackSettled(env.applyChangeTrail([], true));

        await vi.advanceTimersByTimeAsync(1233);
        expect(settled.value, 'not before its time').toBe('pending');

        await vi.advanceTimersByTimeAsync(1);
        expectTimedOut(settled);
      } finally {
        vi.useRealTimers();
      }
    });

    it('cut a module import off at the configureTimeout', async () => {
      try {
        vi.useFakeTimers();

        const {env} = await startEnv({configureTimeout: 1234});
        const settled = trackSettled(env.importScript('/mod.js'));

        await vi.advanceTimersByTimeAsync(1233);
        expect(settled.value, 'not before its time').toBe('pending');

        await vi.advanceTimersByTimeAsync(1);
        expectTimedOut(settled);
      } finally {
        vi.useRealTimers();
      }
    });

    it('terminate a worker that does not acknowledge the teardown at the destroyTimeout', async () => {
      try {
        vi.useFakeTimers();
        // the silence of the worker is reported; without this it writes into the test output
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const {env, worker} = await startEnv({destroyTimeout: 1234});
        env.destroy();

        await vi.advanceTimersByTimeAsync(1233);
        expect(worker.terminateCount, 'not before its time').toBe(0);

        await vi.advanceTimersByTimeAsync(1);
        expect(worker.terminateCount, 'and then, by its own clock').toBe(1);
      } finally {
        vi.restoreAllMocks();
        vi.useRealTimers();
      }
    });

    // The rule is the same for all four keys, so one key stands in for them -- and it is the
    // teardown, because that is where a refused value has teeth: nothing but the timeout gets
    // the worker terminated once the acknowledgement stays away.
    it.each([0, Infinity, -1, NaN, 'nope'])('refuse %s and report it, and the constant stays', (value) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const env = new RemoteWorkerEnv({destroyTimeout: value as number});

        expect(env.timeouts.destroyTimeout).toBe(WorkerDestroyTimeout);
        expect(error, 'a value that quietly disappears is the one nobody goes looking for').toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0].join(' '), 'the report names the option').toContain('destroyTimeout');
      } finally {
        vi.restoreAllMocks();
      }
    });

    // Where the scale ends. `setTimeout()` truncates its delay to a signed 32-bit field, so a
    // value above that fires after about a millisecond rather than waiting -- a timeout meant
    // generously would be an immediate one, and nothing would say so. The two cases pin both
    // sides of the largest delay a timer keeps.
    it('take 2147483647, the largest delay a timer keeps', () => {
      expect(new RemoteWorkerEnv({loadTimeout: 2_147_483_647}).timeouts.loadTimeout).toBe(2_147_483_647);
    });

    it('refuse the millisecond past it and report it, and the constant stays', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const env = new RemoteWorkerEnv({loadTimeout: 2_147_483_648});

        expect(env.timeouts.loadTimeout, 'a value that would fire at once is not a longer wait').toBe(WorkerLoadTimeout);
        expect(error).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0].join(' '), 'the report names the option').toContain('loadTimeout');
      } finally {
        vi.restoreAllMocks();
      }
    });

    // The guard for the case above: this one is green either way today, and turns red the day
    // somebody lets a value through that arms no timer at all.
    it('terminate the worker after the default when the destroy timeout was refused', async () => {
      try {
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const {env, worker} = await startEnv({destroyTimeout: Infinity});
        env.destroy();

        await vi.advanceTimersByTimeAsync(WorkerDestroyTimeout);

        expect(worker.terminateCount, 'a teardown reaches its terminate() by a clock of its own').toBe(1);
      } finally {
        vi.restoreAllMocks();
        vi.useRealTimers();
      }
    });
  });
});