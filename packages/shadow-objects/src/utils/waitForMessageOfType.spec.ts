import {describe, expect, it, vi} from 'vitest';
import {WorkerTimeoutError} from '../WorkerTimeoutError.js';
import {waitForMessageOfType} from './waitForMessageOfType.js';

// A worker double of the same build as `src/view/RemoteWorkerEnv.spec.ts:23-77`: `reply()` calls
// the registered listeners directly, in a loop, instead of going through a real `EventTarget`.
// happy-dom's `dispatchEvent` swallows a throw from a listener and still returns `true`, so a
// real `EventTarget` here would never let a listener's throw reach the test.
class FakeWorker {
  listeners = new Map<string, Set<(event: any) => void>>();

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

  postMessage(_data: any) {
    // nothing to do -- the test drives replies through `reply()` instead
  }

  reply(data: any) {
    for (const listener of [...(this.listeners.get('message') ?? [])]) listener({data});
  }
}

describe('waitForMessageOfType', () => {
  it('resolves on the awaited type', async () => {
    const worker = new FakeWorker();
    const promise = waitForMessageOfType(worker as unknown as Worker, 'ready');

    worker.reply({type: 'ready'});

    await expect(promise).resolves.toBeUndefined();
  });

  it('discards a payload it cannot read', async () => {
    const worker = new FakeWorker();
    const promise = waitForMessageOfType(worker as unknown as Worker, 'ready');

    expect(() => worker.reply(null)).not.toThrow();
    expect(() => worker.reply(undefined)).not.toThrow();

    worker.reply({type: 'ready'});

    await expect(promise).resolves.toBeUndefined();
  });

  it('ignores a primitive payload', async () => {
    const worker = new FakeWorker();
    let resolved = false;
    const promise = waitForMessageOfType(worker as unknown as Worker, 'ready').then((value) => {
      resolved = true;
      return value;
    });

    worker.reply(42);
    worker.reply('ready');

    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);

    worker.reply({type: 'ready'});

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects a wait that runs out of time with a WorkerTimeoutError', async () => {
    try {
      vi.useFakeTimers();

      const worker = new FakeWorker();
      // caught through `then`, not awaited: a wait that never runs out would hang the whole run
      const settled = waitForMessageOfType(worker as unknown as Worker, 'ready', 1234).then(
        () => undefined,
        (reason: unknown) => reason,
      );

      await vi.advanceTimersByTimeAsync(1234);

      const reason = await settled;
      expect(reason, 'the deadline has a class of its own').toBeInstanceOf(WorkerTimeoutError);
      expect((reason as WorkerTimeoutError).messageType, 'and names the reply that stayed out').toBe('ready');
      expect((reason as WorkerTimeoutError).timeout, 'and the number it waited').toBe(1234);
    } finally {
      vi.useRealTimers();
    }
  });
});
