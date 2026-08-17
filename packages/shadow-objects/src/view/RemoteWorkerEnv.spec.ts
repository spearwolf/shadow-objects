import {on} from '@spearwolf/eventize';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Destroy, Destroyed, Loaded} from '../constants.js';
import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from '../utils/ConsoleLogger.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';
import {RemoteWorkerEnv} from './RemoteWorkerEnv.js';

const {FakeWorker, workers} = vi.hoisted(() => {
  class FakeWorker {
    listeners = new Map<string, Set<(event: any) => void>>();
    posted: any[] = [];
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

    postMessage(data: any) {
      this.posted.push(data);
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

const startEnv = async () => {
  const env = new RemoteWorkerEnv();
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
});