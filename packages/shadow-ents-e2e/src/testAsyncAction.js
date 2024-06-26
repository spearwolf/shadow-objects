import {createTestNode} from './createTestNode.js';

export async function testAsyncAction(name, action, timeout = 5000) {
  const waitForAction = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(reject, timeout);
    action()
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch(reject);
  });
  try {
    await waitForAction;
    createTestNode(name, 'ok', 'success');
  } catch (error) {
    createTestNode(name, 'fail', `${error}`);
  }
}
