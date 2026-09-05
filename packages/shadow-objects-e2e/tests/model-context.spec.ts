import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('model-context', () => {
  runPageTests('/pages/model-context.html', [
    'mc-envs-ready',
    'mc-envs-import-module',
    'mc-first-sync',
    'mc-expose-resolves',
    'mc-expose-registers-five-tools',
    'mc-list-envs-names-both-environments',
    'mc-get-entity-tree-crosses-the-wire',
    'mc-get-entity-tree-honours-limits',
    'mc-get-entity-answers-with-ancestors',
    'mc-find-entities-by-token',
    'mc-find-entities-needs-a-criterion',
    'mc-get-registry-lists-foo',
    'mc-unknown-namespace-is-an-error',
    'mc-redaction-hides-a-property',
    'mc-result-is-json-safe',
    'mc-dispose-takes-the-tools-back',
  ]);
});
