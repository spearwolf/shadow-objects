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
    // of it both reach the console. The third entry only matches on the engines that have it:
    // Firefox and WebKit raise the worker's uncaught error on the page as well, Chromium keeps
    // it in the worker. The `uncaught: ` origin tag is what tells it apart from the first entry.
    {
      expectedErrors: [
        /^console\.error: .*RemoteWorkerEnv.*the shadow object took the worker down/,
        /^console\.error: .*ShadowEnv.*the environment proxy failed/,
        /^uncaught: .*the shadow object took the worker down/,
      ],
    },
  );
});
