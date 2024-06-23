import {expect, test} from '@playwright/test';

const lookupTestResult = (testId: string) => {
  test(testId, async ({page}) => {
    await expect(page.getByTestId(testId)).toHaveAttribute('data-testresult', 'ok');
  });
};

const lookupTests = (testIds: string[]) => testIds.forEach(lookupTestResult);

test.describe('remote-worker-env', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/remote-worker-env.html');
  });

  lookupTests(['shadow-env-ready', 'shadow-env-import-script', 'shadow-env-isReady', 'shadow-env-1st-sync']);
});
