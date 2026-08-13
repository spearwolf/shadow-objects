import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('create-element', () => {
  runPageTests(
    '/pages/create-element.html',
    [
      // the path that works
      'create-element-markup-path-upgrades',
      'create-element-markup-path-has-view-component',
      // DEFECT-1 — see KNOWN-DEFECTS.md
      'create-element-shae-ent-upgrades',
      'create-element-shae-prop-upgrades',
      'create-element-shae-worker-upgrades',
      'create-element-appended-entity-becomes-live',
    ],
    {
      knownFailures: [
        'create-element-shae-ent-upgrades',
        'create-element-shae-prop-upgrades',
        'create-element-shae-worker-upgrades',
        'create-element-appended-entity-becomes-live',
      ],
      // the aborted upgrades surface as uncaught constructor errors, which is the defect itself
      allowConsoleErrors: true,
    },
  );
});