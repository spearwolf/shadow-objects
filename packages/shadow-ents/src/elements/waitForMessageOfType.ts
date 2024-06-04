/**
 * Wait for a message of a specific type or reject after a timeout.
 */
export const waitForMessageOfType = (worker: Worker, type: string, timeout = 1000, guard?: (data: any) => boolean) =>
  new Promise<void>((resolve, reject) => {
    let timeoutId: number;
    // eslint-disable-next-line prefer-const
    let listener: (event: MessageEvent) => void;

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.removeEventListener('message', listener);
    };

    if (timeout !== 0 && timeout !== Infinity) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for message of type: ${type}`));
      }, timeout) as any;
    }

    listener = (event) => {
      if (event.data.type === type) {
        if (!guard || guard(event.data)) {
          cleanup();
          resolve();
        }
      }
    };

    worker.addEventListener('message', listener);
  });
