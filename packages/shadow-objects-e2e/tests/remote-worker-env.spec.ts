import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('remote-worker-env', () => {
  runPageTests('/pages/remote-worker-env.html', [
    'shadow-env-ready',
    'shadow-env-importScript',
    'shadow-env-isReady',
    'shadow-env-1st-sync',
    'shadow-env-hello',
  ]);
});