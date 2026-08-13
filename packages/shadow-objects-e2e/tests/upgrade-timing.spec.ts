import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('upgrade-timing', () => {
  runPageTests('/pages/upgrade-timing.html', [
    'upgrade-markup-existed-before-definition',
    'upgrade-definitions-arrive',
    // UPG-1: markup parsed before the definitions
    'upgrade-pre-existing-elements-are-upgraded',
    'upgrade-pre-existing-elements-have-view-components',
    'upgrade-pre-existing-hierarchy-is-correct',
    // UPG-4: markup injected before the definitions
    'upgrade-pre-injected-markup-is-upgraded',
    // UPG-3: shae-prop registers only after shae-ent
    'upgrade-shae-prop-is-defined-after-shae-ent',
    'upgrade-pre-existing-props-found-their-host',
    // UPG-1/2: everything reaches the worker, properties included
    'upgrade-env-ready',
    'upgrade-import-module',
    'upgrade-first-sync',
    'upgrade-entities-reached-the-worker',
    'upgrade-hierarchy-reached-the-worker',
    'upgrade-properties-survived-the-upgrade',
    // UPG-5: elements added after the definitions
    'upgrade-post-definition-sync',
    'upgrade-post-definition-element-matches-pre-existing',
  ]);
});