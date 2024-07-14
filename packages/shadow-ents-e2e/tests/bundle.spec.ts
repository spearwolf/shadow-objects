import {expect, test} from '@playwright/test';

test.describe('bundle', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/bundle.html');
  });

  test.describe('shae-ent', () => {
    test('has element', async ({page}) => {
      await expect(page.getByTestId('seBase0')).toBeAttached();
    });

    test('custom element is defined', async ({page}) => {
      expect(
        await page.evaluate(() =>
          customElements
            .whenDefined('shae-ent')
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(true);
    });
  });

  test.describe('shae-worker', () => {
    test('has element', async ({page}) => {
      await expect(page.getByTestId('workerCtx0')).toBeAttached();
    });

    test('custom element is defined', async ({page}) => {
      expect(
        await page.evaluate(() =>
          customElements
            .whenDefined('shae-worker')
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(true);
    });
  });
});
