import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('shae-worker', () => {
  runPageTests('/pages/shae-worker.html', [
    'shae-worker-whenDefined',
    'worker0-ns',
    'worker0-is-remote-env',
    'worker0-env-contextCreated',
    'worker0-env-ready',
    'worker1-ns',
    'worker1-is-local-env',
    'worker1-env-contextCreated',
    'worker1-env-ready',
  ]);
});