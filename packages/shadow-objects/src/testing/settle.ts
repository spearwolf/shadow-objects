/**
 * Waits until the microtask queue is empty, including everything it grows while it is drained.
 *
 * A single `await Promise.resolve()` clears one generation of microtasks and lies about the rest,
 * and the Kernel produces more than one: `dispatchMessageToView()` queues a microtask of its own,
 * and the `MicrotaskCollector` behind the Entity Contexts is documented to accept writes from
 * inside its own delivery, which schedules the next round. A macrotask hop waits for all of them.
 *
 * `MessageChannel` rather than `setTimeout`, because a test that installs fake timers is a test
 * that has frozen `setTimeout`, and a `settle()` that never resolves under fake timers is an
 * afternoon of debugging per consumer. A message port is not a timer. The `setTimeout` fallback
 * covers a realm that has no `MessageChannel`.
 */
export function settle(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof MessageChannel === 'function') {
      const channel = new MessageChannel();
      // Assigning `onmessage` starts the port; no explicit `start()` is needed.
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(undefined);
    } else {
      setTimeout(resolve, 0);
    }
  });
}
