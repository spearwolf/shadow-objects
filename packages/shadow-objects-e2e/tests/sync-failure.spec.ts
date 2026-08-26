import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('sync-failure', () => {
  runPageTests(
    '/pages/sync-failure.html',
    [
      'sync-failure-env-ready',
      'sync-failure-modules-imported',
      'sync-failure-healthy-cycle-first',
      'sync-failure-syncwait-rejects',
      'sync-failure-dom-event',
      'sync-failure-reason-names-the-refusal',
      'sync-failure-detail-carries-the-refused-change-trail',
      'sync-failure-aftersync-did-not-fire',
      'sync-failure-is-not-a-proxy-failure',
      'sync-failure-refused-entry-is-sent-again',
      'sync-failure-environment-still-syncs',
    ],
    // the page has the worker's kernel refuse a change trail on purpose, and both sides put the
    // failure on the record: the worker from its message router, the view from its environment
    {allowConsoleErrors: true},
  );
});
