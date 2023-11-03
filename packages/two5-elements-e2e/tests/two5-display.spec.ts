import {expect, test} from '@playwright/test';
import {VfxDisplay} from '@spearwolf/two5-elements';

test.describe('two5-display', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/two5-display.html');
  });

  test('has element', async ({page}) => {
    await expect(page.getByTestId('vfxd')).toBeAttached();
  });

  test('custom element is defined', async ({page}) => {
    expect(
      await page.evaluate(() =>
        customElements
          .whenDefined('two5-display')
          .then(() => true)
          .catch(() => false),
      ),
    ).toBe(true);
  });

  test('two5-display started', async ({page}) => {
    expect(
      await page.evaluate(() =>
        window
          .whenDefined<VfxDisplay>(document.querySelector('two5-display'))
          .then((vfxd: VfxDisplay) => vfxd.display.onceAsync('start'))
          .then(() => true),
      ),
    ).toBe(true);
  });
});
