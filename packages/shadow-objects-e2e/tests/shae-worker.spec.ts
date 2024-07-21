import {test} from '@playwright/test';
import {lookupTests} from './lookupTests.js';

test.describe('shae-worker', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/shae-worker.html');
  });

  lookupTests([
    'shae-worker-whenDefined',
    'worker0-ns',
    'worker0-is-remote-env',
    'worker0-env-ready',
    'worker1-ns',
    'worker1-is-local-env',
    'worker1-env-ready',
  ]);
});
