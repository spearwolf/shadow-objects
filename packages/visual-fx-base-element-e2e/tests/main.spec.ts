import {expect, test} from '@playwright/test';

test('has title', async ({page}) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/spearwolf\/visual-fx-base-element-e2e/);
});

test('has element', async ({page}) => {
  await page.goto('/');

  await expect(page.getByTestId('hello')).toBeVisible();
});
