import {describe, expect, it, vi} from 'vitest';
import {Loaded} from '../constants.js';
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
    const promise = waitForMessageOfType(worker as unknown as Worker, Loaded);

    worker.reply({type: Loaded});

    await expect(promise).resolves.toBeUndefined();
  });

  it('discards a payload it cannot read', async () => {
    const worker = new FakeWorker();
    const promise = waitForMessageOfType(worker as unknown as Worker, Loaded);

    expect(() => worker.reply(null)).not.toThrow();
    expect(() => worker.reply(undefined)).not.toThrow();

    worker.reply({type: Loaded});

    await expect(promise).resolves.toBeUndefined();
  });

  it('ignores a primitive payload', async () => {
    const worker = new FakeWorker();
    let resolved = false;
    const promise = waitForMessageOfType(worker as unknown as Worker, Loaded).then((value) => {
      resolved = true;
      return value;
    });

    worker.reply(42);
    worker.reply('ready');

    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);

    worker.reply({type: Loaded});

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects a wait that runs out of time with a WorkerTimeoutError', async () => {
    try {
      vi.useFakeTimers();

      const worker = new FakeWorker();
      // caught through `then`, not awaited: a wait that never runs out would hang the whole run
      const settled = waitForMessageOfType(worker as unknown as Worker, Loaded, 1234).then(
        () => undefined,
        (reason: unknown) => reason,
      );

      await vi.advanceTimersByTimeAsync(1234);

      const reason = await settled;
      expect(reason, 'the deadline has a class of its own').toBeInstanceOf(WorkerTimeoutError);
      expect((reason as WorkerTimeoutError).messageType, 'and names the reply that stayed out').toBe(Loaded);
      expect((reason as WorkerTimeoutError).timeout, 'and the number it waited').toBe(1234);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('a deadline no timer can keep', () => {
    it.each([
      ['NaN', NaN],
      ['a negative number', -1],
      ['a number past the 32-bit signed bound', 2_147_483_648],
      ['a non-number', 'nope' as unknown as number],
    ])('rejects %s with a TypeError', async (_label, timeout) => {
      try {
        vi.useFakeTimers();

        const worker = new FakeWorker();
        const settled = waitForMessageOfType(worker as unknown as Worker, Loaded, timeout).then(
          () => undefined,
          (reason: unknown) => reason,
        );

        await vi.advanceTimersByTimeAsync(1);

        const reason = await settled;
        expect(reason).toBeInstanceOf(TypeError);
        expect((reason as TypeError).message).toContain(String(timeout));
        expect(worker.listeners.get('message') ?? new Set()).toEqual(new Set());
      } finally {
        vi.useRealTimers();
      }
    });

    it('still arms no timer for 0', async () => {
      try {
        vi.useFakeTimers();

        const worker = new FakeWorker();
        const settled = waitForMessageOfType(worker as unknown as Worker, Loaded, 0);
        let resolved = false;
        settled.then(() => {
          resolved = true;
        });

        await vi.advanceTimersByTimeAsync(10_000_000);
        expect(resolved).toBe(false);

        worker.reply({type: Loaded});
        await expect(settled).resolves.toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });

    it('still arms no timer for Infinity', async () => {
      try {
        vi.useFakeTimers();

        const worker = new FakeWorker();
        const settled = waitForMessageOfType(worker as unknown as Worker, Loaded, Infinity);
        let resolved = false;
        settled.then(() => {
          resolved = true;
        });

        await vi.advanceTimersByTimeAsync(10_000_000);
        expect(resolved).toBe(false);

        worker.reply({type: Loaded});
        await expect(settled).resolves.toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
