import {createTestNode} from './createTestNode.js';

export const SuiteStateAttribute = 'data-testsuite';
export const SetupFailureTestId = 'test-suite-setup';

/**
 * Runs the test setup of a page and records whether it made it to the end.
 *
 * Without this marker a crash during setup is indistinguishable from a slow page: every
 * `data-testid` the page never got around to writing simply fails with "element not found",
 * and the actual cause is nowhere in the report.
 *
 * The suite state is written to `<html data-testsuite="done|error">`, which is what the
 * Playwright side waits for before it looks at any individual result.
 */
export async function runTestSuite(main) {
  try {
    await main();
    document.documentElement.setAttribute(SuiteStateAttribute, 'done');
  } catch (error) {
    const message = error?.stack || `${error}`;
    createTestNode(SetupFailureTestId, 'fail', message);
    document.documentElement.setAttribute(SuiteStateAttribute, 'error');
    console.error('test suite setup failed:', error);
  }
}