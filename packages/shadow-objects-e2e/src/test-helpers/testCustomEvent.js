import {emit, eventize, off, onceAsync, retain} from '@spearwolf/eventize';
import {createTestNode} from './createTestNode.js';

export async function testCustomEvent(testName, el, eventName, checkCheck, timeout = 5000) {
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

  const waitForAction = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(reject, timeout);

    onceAsync(queue, eventName)
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
