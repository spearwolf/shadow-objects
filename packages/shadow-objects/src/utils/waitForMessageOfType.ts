import {isReadableMessageData} from '../worker/MessageRouter.js';

/**
 * Wait for a message of a specific type or reject after a timeout.
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
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    let timeoutId: number;
    // eslint-disable-next-line prefer-const
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
        reject(new Error(`Timeout waiting for message of type: ${type}`));
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