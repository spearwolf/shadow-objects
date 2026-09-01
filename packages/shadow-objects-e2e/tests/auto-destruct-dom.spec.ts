import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('auto-destruct-dom', () => {
  runPageTests('/pages/auto-destruct-dom.html', [
    'auto-destruct-dom-env-ready',
    'auto-destruct-dom-import-module',
    'auto-destruct-dom-initial-snapshot',
    // the flag travels from the markup into the entity
    'auto-destruct-dom-flag-arrived-from-markup',
    // a DOM removal takes the subtree whatever the flag says
    'auto-destruct-dom-removal-takes-both-children',
    // a kernel destroy is where the flag decides
    'auto-destruct-dom-kernel-destroy-cascades-the-flagged-child',
    'auto-destruct-dom-kernel-destroy-promotes-the-unflagged-child',
  ]);
});
