import {WorkerTimeoutError} from '../WorkerTimeoutError.js';
import {isReadableMessageData} from '../worker/MessageRouter.js';

/**
 * The largest delay a timer actually keeps. `setTimeout()` truncates its delay into a signed
 * 32-bit field, so a larger number comes back out as some other, shorter one: a millisecond
 * past this bound already fires at once. Whatever it lands on, it is not the wait that was
 * asked for, and nothing says so.
 */
export const MaxWorkerTimeout = 2_147_483_647;

export const isTimeout = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MaxWorkerTimeout;

/**
 * Wait for a message of a specific type or reject after a timeout.
 *
 * A deadline that runs out rejects with a `WorkerTimeoutError`.
 *
 * A `signal` rejects the promise the moment it is aborted, with the abort reason,
 * so that a caller does not sit out the timeout waiting for a reply that can no
 * longer arrive.
 */
export const waitForMessageOfType = (
  worker: Worker,
  type: string,
  timeout = 1000,
  guard?: (data: any) => boolean,
  signal?: AbortSignal,
) =>
  new Promise<void>((resolve, reject) => {
    if (timeout !== 0 && timeout !== Infinity && !isTimeout(timeout)) {
      reject(
        new TypeError(
          `cannot wait for a ${type} message: expected a timeout of 1 to ${MaxWorkerTimeout} milliseconds, or 0 or Infinity for no deadline, got ${String(timeout)}`,
        ),
      );
      return;
    }

    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    let timeoutId: number;
    let listener: (event: MessageEvent) => void;

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.removeEventListener('message', listener);
      signal?.removeEventListener('abort', onAbort);
    };

    // a function declaration, so that `cleanup` may reference it above its own definition;
    // it only ever runs when a signal was passed in, since that is the only case where it gets registered below
    function onAbort() {
      cleanup();
      reject(signal!.reason);
    }

    if (timeout !== 0 && timeout !== Infinity) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new WorkerTimeoutError(type, timeout));
      }, timeout) as any;
    }

    listener = (event) => {
      // three readers listen on this channel and answer the same way: a payload that is not
      // an object carries no `type` to route on, and reading through it takes down whoever
      // reads it -- here, into the listener of every request still waiting
      if (!isReadableMessageData(event.data)) return;
      if (event.data.type === type) {
        try {
          if (!guard || guard(event.data)) {
            cleanup();
            resolve();
          }
        } catch (error) {
          cleanup();
          reject(error);
        }
      }
    };

    signal?.addEventListener('abort', onAbort, {once: true});

    worker.addEventListener('message', listener);
  });
