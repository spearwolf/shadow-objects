import {expect, test} from '@playwright/test';

const lookupTestResult = (testId: string) => {
  test(testId, async ({page}) => {
    await expect(page.getByTestId(testId)).toHaveAttribute('data-testresult', 'ok');
  });
};

const lookupTests = (testIds: string[]) => testIds.forEach(lookupTestResult);

test.describe('auto-destruct (KERN-1)', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/auto-destruct.html');
  });

  lookupTests([
    'auto-destruct-env-ready',
    'auto-destruct-import-module',
    'auto-destruct-result-arrived',
    'auto-destruct-children-were-created',
    'auto-destruct-flagged-child-cascaded',
    'auto-destruct-unflagged-child-promoted-to-root',
  ]);
});