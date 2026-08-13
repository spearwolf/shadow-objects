import {on} from '@spearwolf/eventize';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Destroy, Destroyed, Loaded} from '../constants.js';
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
 * Asserts that the promise rejects because the worker failed. A plain
 * `rejects.toThrow()` would swallow the timeout rejection as well, which is
 * exactly the hanging call this guards against.
 */
const expectWorkerFailedRejection = async (promise: Promise<unknown>) => {
  const reason = await withTimeout(promise).then(
    () => {
      throw new Error('expected the promise to reject, but it resolved');
    },
    (error) => error,
  );
  expect((reason as Error).name).toBe('WorkerFailedError');
};

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
  });
});