import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('bundle', () => {
  runPageTests('/pages/bundle.html', [
    // BUNDLE-3: the single-file build is what is running here
    'bundle-flag-is-set',
    'bundle-elements-defined',
    // BUNDLE-1: the declared entity tree
    'bundle-entities-have-view-components',
    'bundle-tree-structure-is-correct',
    'bundle-cross-namespace-child-is-root',
    // BUNDLE-2: property type parsing
    'bundle-string-property-parsed',
    'bundle-boolean-property-parsed',
    'bundle-number-array-property-parsed',
    // BUNDLE-4: a functional round-trip through the inlined worker
    'bundle-worker-env-ready',
    'bundle-worker-import-module',
    'bundle-worker-round-trip',
  ]);
});