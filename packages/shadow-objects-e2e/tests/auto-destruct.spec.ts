import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('auto-destruct (KERN-1)', () => {
  runPageTests('/pages/auto-destruct.html', [
    'auto-destruct-env-ready',
    'auto-destruct-import-module',
    'auto-destruct-result-arrived',
    'auto-destruct-children-were-created',
    'auto-destruct-flagged-child-cascaded',
    'auto-destruct-unflagged-child-promoted-to-root',
  ]);
});