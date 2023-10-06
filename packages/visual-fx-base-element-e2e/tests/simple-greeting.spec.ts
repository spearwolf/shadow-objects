import {expect, test} from '@playwright/test';

test.beforeEach('get / -', async ({page}) => {
  await page.goto('/');
});

test('has element', async ({page}) => {
  await expect(page.getByTestId('hello')).toBeVisible();
});

test('custom element is defined', async ({page}) => {
  expect(
    await page.evaluate(() =>
      customElements
        .whenDefined('simple-greeting')
        .then(() => true)
        .catch(() => false),
    ),
  ).toBe(true);
});
