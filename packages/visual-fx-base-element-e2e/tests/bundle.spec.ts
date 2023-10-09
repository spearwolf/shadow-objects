import {expect, test} from '@playwright/test';

test.describe('bundle', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/bundle.html');
  });

  test.describe('simple-greeting', () => {
    test('has element', async ({page}) => {
      await expect(page.getByTestId('sg')).toBeVisible();
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
  });

  test.describe('visual-fx-base', () => {
    test('has element', async ({page}) => {
      await expect(page.getByTestId('vfxb')).toBeVisible();
    });

    test('custom element is defined', async ({page}) => {
      expect(
        await page.evaluate(() =>
          customElements
            .whenDefined('visual-fx-base')
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(true);
    });
  });
});
