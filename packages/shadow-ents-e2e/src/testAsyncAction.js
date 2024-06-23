import {createTestNode} from './createTestNode.js';

export async function testAsyncAction(name, action) {
  try {
    await Promise.resolve(action());
    createTestNode(name, 'ok', 'success');
  } catch (error) {
    createTestNode(name, 'fail', `${error}`);
  }
}
