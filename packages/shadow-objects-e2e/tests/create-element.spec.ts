import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('create-element', () => {
  runPageTests('/pages/create-element.html', [
    // the markup path
    'create-element-markup-path-upgrades',
    'create-element-markup-path-has-view-component',
    // the programmatic path
    'create-element-shae-ent-upgrades',
    'create-element-shae-prop-upgrades',
    'create-element-shae-worker-upgrades',
    'create-element-appended-entity-becomes-live',
  ]);
});