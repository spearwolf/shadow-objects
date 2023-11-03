import {expect, test} from '@playwright/test';
import {VfxDisplay} from '@spearwolf/visual-fx-base-element';

test.describe('vfx-display', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/vfx-display.html');
  });

  test('has element', async ({page}) => {
    await expect(page.getByTestId('vfxd')).toBeAttached();
  });

  test('custom element is defined', async ({page}) => {
    expect(
      await page.evaluate(() =>
        customElements
          .whenDefined('vfx-display')
          .then(() => true)
          .catch(() => false),
      ),
    ).toBe(true);
  });

  test('vfx-display started', async ({page}) => {
    expect(
      await page.evaluate(() =>
        window
          .whenDefined<VfxDisplay>(document.querySelector('vfx-display'))
          .then((vfxd: VfxDisplay) => vfxd.display.onceAsync('start'))
          .then(() => true),
      ),
    ).toBe(true);
  });
});
