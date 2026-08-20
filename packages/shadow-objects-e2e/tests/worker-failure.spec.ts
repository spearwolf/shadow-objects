import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('worker-failure', () => {
  runPageTests(
    '/pages/worker-failure.html',
    [
      'worker-failure-env-ready',
      'worker-failure-import-module',
      'worker-failure-entity-sync-settles',
      'worker-failure-proxyfailed-dom-event',
      'worker-failure-contextlost-dom-event',
      'worker-failure-reason-is-a-worker-failed-error',
      'worker-failure-env-is-not-ready',
      'worker-failure-proxy-is-destroyed',
      'worker-failure-later-call-rejects-right-away',
      'worker-failure-recovers-with-a-new-proxy',
      'worker-failure-env-is-ready-again',
      'worker-failure-survivor-is-recreated-in-the-new-worker',
    ],
    // the page kills a worker on purpose: the uncaught error and the framework's own report
    // of it both reach the console
    {allowConsoleErrors: true},
  );
});