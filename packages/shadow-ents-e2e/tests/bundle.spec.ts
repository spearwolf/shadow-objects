import {expect, test} from '@playwright/test';

test.describe('bundle', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/bundle.html');
  });

  test.describe('shadow-entity', () => {
    test('has element', async ({page}) => {
      await expect(page.getByTestId('seBase0')).toBeAttached();
    });

    test('custom element is defined', async ({page}) => {
      expect(
        await page.evaluate(() =>
          customElements
            .whenDefined('shadow-entity')
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(true);
    });
  });

  test.describe('shadow-local-env', () => {
    test('has element', async ({page}) => {
      await expect(page.getByTestId('localEnv0')).toBeAttached();
    });

    test('custom element is defined', async ({page}) => {
      expect(
        await page.evaluate(() =>
          customElements
            .whenDefined('shadow-local-env')
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(true);
    });
  });
});
