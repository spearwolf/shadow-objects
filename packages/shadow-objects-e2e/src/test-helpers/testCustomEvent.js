import {emit, eventize, off, onceAsync, retain} from '@spearwolf/eventize';
import {createTestNode} from './createTestNode.js';

/**
 * Starts listening right away and hands back the function that turns the event into a test result.
 *
 * Splitting the two matters for events that are dispatched exactly once and are never replayed,
 * such as `contextcreated`: the listener has to be attached before the first `await`, while the
 * timeout must not start running until the caller actually waits for it. Arming and timing in
 * one call means every unrelated `await` in between eats from the same budget — on a cold worker
 * start that is enough to fail an event that arrives perfectly on time.
 *
 * The event itself is not lost in the meantime: the queue retains it.
 *
 * @returns {(testName: string, checkCheck?: (detail: unknown) => boolean, timeout?: number) => Promise<void>}
 */
export function watchCustomEvent(el, eventName) {
  const queue = eventize();
  retain(queue, eventName);

  const onEvent = (event) => {
    emit(queue, event.type, event.detail);
  };

  el.addEventListener(eventName, onEvent);

  const unsubscribe = () => {
    el.removeEventListener(eventName, onEvent);
    off(queue);
  };

  return async (testName, checkCheck, timeout = 5000) => {
    const waitForAction = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`"${testName}" did not receive a "${eventName}" event within ${timeout}ms`)),
        timeout,
      );

      onceAsync(queue, eventName)
        .then((detail) => {
          if (typeof checkCheck === 'function' && !checkCheck(detail)) {
            throw new Error(`checkCheck failed: "${eventName}" ${JSON.stringify(detail)}`);
          }
        })
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });

    try {
      await waitForAction;
      createTestNode(testName, 'ok', 'success');
    } catch (error) {
      createTestNode(testName, 'fail', `${error?.stack || error}`);
    } finally {
      unsubscribe();
    }
  };
}

/**
 * Arms the listener and waits for the event in one go. Only correct when the caller awaits the
 * result immediately — otherwise use {@link watchCustomEvent}.
 */
export async function testCustomEvent(testName, el, eventName, checkCheck, timeout = 5000) {
  return watchCustomEvent(el, eventName)(testName, checkCheck, timeout);
}