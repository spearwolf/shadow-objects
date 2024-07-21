import {eventize} from '@spearwolf/eventize';
import {createTestNode} from './createTestNode.js';

export async function testCustomEvent(testName, el, eventName, checkCheck, timeout = 5000) {
  const queue = eventize();
  queue.retain(eventName);

  const onEvent = (event) => {
    queue.emit(event.type, event.detail);
  };

  el.addEventListener(eventName, onEvent);

  const unsubscribe = () => {
    el.removeEventListener(eventName, onEvent);
    queue.off();
  };

  const waitForAction = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(reject, timeout);
    queue
      .onceAsync(eventName)
      .then((detail) => {
        if (typeof checkCheck === 'function' && !checkCheck(detail)) {
          throw new Error(`checkCheck failed: "${eventName}" ${detail}`);
        }
      })
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch(reject);
  });
  try {
    await waitForAction;
    createTestNode(testName, 'ok', 'success');
  } catch (error) {
    createTestNode(testName, 'fail', `${error}`);
  } finally {
    unsubscribe();
  }
}
