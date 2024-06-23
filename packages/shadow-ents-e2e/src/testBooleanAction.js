import {createTestNode} from './createTestNode.js';

export function testBooleanAction(name, action) {
  let isOkay = false;
  let errorMessage = 'is falsy';

  try {
    isOkay = Boolean(typeof action === 'function' ? action() : action);
  } catch (error) {
    errorMessage = `${error}`;
  }

  if (isOkay) {
    createTestNode(name, 'ok', 'success');
  } else {
    createTestNode(name, 'fail', errorMessage);
  }
}
