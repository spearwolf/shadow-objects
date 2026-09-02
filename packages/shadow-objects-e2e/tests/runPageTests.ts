import {expect, type Page, test} from '@playwright/test';

export interface PageTestsOptions {
  /**
   * Every recorded console error or uncaught exception must be covered by an entry here, or the
   * extra test at the end of the page fails. A string matches as a substring, a `RegExp` runs
   * through `test()` and must not carry the `g` flag — `lastIndex` would otherwise make a match
   * depend on the order tests run in. Matching is against the recorded line together with its
   * origin tag, `console.error: ` or `uncaught: `, so a pattern can say which of the two it means.
   * An entry is a permission, not a requirement — which errors a page actually reports differs
   * between engines (Chromium reports a worker's uncaught error to the environment only; Firefox
   * and WebKit additionally raise it on the page).
   */
  expectedErrors?: (string | RegExp)[];

  /** How long to wait for the page to finish its setup. */
  setupTimeout?: number;

  /**
   * Test ids that document a known defect and are therefore expected to fail.
   *
   * They are asserted the normal way and marked with `test.fail()`, so the suite stays green
   * while the defect exists — and turns red the moment it is fixed, which is the reminder to
   * drop the entry. See `KNOWN-DEFECTS.md`.
   */
  knownFailures?: string[];
}

/**
 * Loads a test page and turns the results it recorded into one Playwright test per id.
 *
 * The pages do their own asserting and write the outcome into `data-testresult` /
 * `data-testoutput` nodes; this helper is the bridge to the report. Two things it does that a
 * bare `toHaveAttribute` does not:
 *
 * - It waits for the `data-testsuite` marker from `runTestSuite`, so a page that dies during
 *   setup fails right away with its stack trace instead of running into the locator timeout.
 * - It reports `data-testoutput` as the failure message, so the reason a check failed reaches
 *   the report instead of being reduced to `expected "ok", got "fail"`.
 *
 * Every test loads its own page. That costs a page load per assertion, but keeps the cases
 * independent: one red result must not hide the ones behind it.
 */
export function runPageTests(pageUrl: string, testIds: string[], options: PageTestsOptions = {}) {
  const {expectedErrors = [], setupTimeout = 15000, knownFailures = []} = options;

  interface LoadResult {
    errors: string[];
    /** 'done' when the page ran its setup to the end, otherwise why it did not. */
    setupFailure?: string;
  }

  const loadPage = async (page: Page): Promise<LoadResult> => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(`uncaught: ${error.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto(pageUrl);

    try {
      await page.waitForSelector('html[data-testsuite]', {state: 'attached', timeout: setupTimeout});
    } catch {
      return {errors, setupFailure: `no data-testsuite marker within ${setupTimeout}ms — the page hung during setup`};
    }

    const state = await page.locator('html').getAttribute('data-testsuite');
    if (state === 'done') return {errors};

    const failure = page.getByTestId('test-suite-setup');
    const reason = (await failure.count()) > 0 ? await failure.getAttribute('data-testoutput') : 'no reason recorded';

    return {errors, setupFailure: reason ?? 'no reason recorded'};
  };

  // Reported separately so an aborted setup shows up as one clear failure rather than only as
  // a wave of missing results.
  test('test suite setup', async ({page}) => {
    const {setupFailure} = await loadPage(page);
    expect(setupFailure, `${pageUrl} did not finish its setup: ${setupFailure}`).toBeUndefined();
  });

  for (const testId of testIds) {
    test(testId, async ({page}) => {
      if (knownFailures.includes(testId)) {
        test.fail();
      }

      const {setupFailure} = await loadPage(page);

      const node = page.getByTestId(testId);

      // A page that aborted still keeps every result it managed to write, and those stay
      // meaningful: they show how far it got before it died.
      if ((await node.count()) === 0) {
        // awaited on purpose: an unawaited retrying assertion neither blocks nor fails, and the
        // test would fall through to the generic "expected ok, received null" below
        await expect(
          node,
          setupFailure
            ? `"${testId}" was never reached — the page aborted its setup: ${setupFailure}`
            : `the page recorded no result for "${testId}"`,
        ).toHaveCount(1);
      }

      const result = await node.getAttribute('data-testresult');
      const output = await node.getAttribute('data-testoutput');

      expect(result, output ?? 'no output recorded').toBe('ok');
    });
  }

  const covers = (error: string, pattern: string | RegExp) =>
    typeof pattern === 'string' ? error.includes(pattern) : pattern.test(error);

  const errorsTitle = expectedErrors.length === 0 ? 'no uncaught or logged errors' : 'no unexpected console errors';

  test(errorsTitle, async ({page}) => {
    const {errors} = await loadPage(page);

    const unexpected = errors.filter((error) => !expectedErrors.some((pattern) => covers(error, pattern)));

    expect(
      unexpected,
      [
        `${pageUrl} recorded errors that no entry in expectedErrors covers:`,
        ...unexpected,
        expectedErrors.length > 0 ? `expected: ${expectedErrors.map(String).join(' | ')}` : 'this page expects no errors',
      ].join('\n'),
    ).toEqual([]);

    if (expectedErrors.length > 0) {
      expect(
        errors.length,
        `${pageUrl} names expected errors but reported none — expectedErrors is stale: ${expectedErrors.map(String).join(' | ')}`,
      ).toBeGreaterThan(0);
    }
  });
}
