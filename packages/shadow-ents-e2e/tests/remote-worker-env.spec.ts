import {expect, test} from '@playwright/test';

test.describe('remote-worker-env', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/remote-worker-env.html');
  });

  test('shadow-env-ready', async ({page}) => {
    await expect(page.getByTestId('shadow-env-ready')).toHaveAttribute('data-testresult', 'ok');
  });

  test('shadow-env-import-script', async ({page}) => {
    await expect(page.getByTestId('shadow-env-import-script')).toHaveAttribute('data-testresult', 'ok');
  });
});
