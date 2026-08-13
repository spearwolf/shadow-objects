/**
 * Polls until `predicate` returns true.
 *
 * Preferably you wait on a concrete event instead. This exists for the cases where the thing to
 * wait for is an accumulated state ("all seven entities have reported in") rather than a single
 * signal. The timeout is an abort condition, not a sleep: the check runs as fast as the event
 * loop allows and returns the moment the condition holds.
 */
export async function waitUntil(label, predicate, timeout = 5000) {
  const deadline = performance.now() + timeout;
  while (!predicate()) {
    if (performance.now() > deadline) {
      throw new Error(`timed out after ${timeout}ms waiting for: ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}