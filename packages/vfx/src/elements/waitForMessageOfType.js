/**
 * Wait for a message of a specific type or reject after a timeout.
 *
 * @param {Worker} worker the web worker to listen for messages from
 * @param {string} type message type to wait for
 * @param {number=} timeout in milliseconds (use 0 or Infinity to disable)
 *
 * @returns {Promise<void>}
 */
export const waitForMessageOfType = (worker, type, timeout = 1000) =>
  new Promise((resolve, reject) => {
    let timeoutId;
    let listener;

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.removeEventListener('message', listener);
    };

    if (timeout !== 0 && timeout !== Infinity) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for message of type: ${type}`));
      }, timeout);
    }

    listener = (event) => {
      if (event.data.type === type) {
        cleanup();
        resolve();
      }
    };

    worker.addEventListener('message', listener);
  });
