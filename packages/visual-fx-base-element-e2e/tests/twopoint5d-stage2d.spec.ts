import {expect, test} from '@playwright/test';

test.describe('twopoint5d-stage2d', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/twopoint5d-stage2d.html');
  });

  test('has element', async ({page}) => {
    await expect(page.getByTestId('s2d')).toBeAttached();
  });

  test('custom element is defined', async ({page}) => {
    expect(
      await page.evaluate(() =>
        customElements
          .whenDefined('twopoint5d-stage2d')
          .then(() => true)
          .catch(() => false),
      ),
    ).toBe(true);
  });
});
