/**
 * Polls until `predicate` returns true.
 *
 * Preferably you wait on a concrete event instead. This exists for the cases where the thing to
 * wait for is an accumulated state ("all seven entities have reported in") rather than a single
 * signal. The timeout is an abort condition, not a sleep: the check runs as fast as the event
 * loop allows and returns the moment the condition holds.
 *
 * Most calls happen inside a `testAsyncAction`, and of the two nested deadlines only the one
 * that fires first shapes the report: this one names the condition it was waiting for, the outer
 * one only names the action. The default here is smaller than `testAsyncAction`'s so that in the
 * common case it is this deadline that fires first.
 */
export async function waitUntil(label, predicate, timeout = 4000) {
  const deadline = performance.now() + timeout;
  while (!predicate()) {
    if (performance.now() > deadline) {
      throw new Error(`timed out after ${timeout}ms waiting for: ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
