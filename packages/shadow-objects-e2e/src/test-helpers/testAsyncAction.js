import {createTestNode} from './createTestNode.js';

export async function testAsyncAction(name, action, timeout = 5000) {
  const waitForAction = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`"${name}" did not settle within ${timeout}ms`)), timeout);
    (typeof action === 'function' ? action() : action)
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
    createTestNode(name, 'ok', 'success');
  } catch (error) {
    createTestNode(name, 'fail', `${error?.stack || error}`);
  }
}
