import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('shae-worker', () => {
  runPageTests('/pages/shae-worker.html', [
    'shae-worker-whenDefined',
    'worker0-ns',
    'worker0-is-remote-env',
    'worker0-env-contextCreated',
    'worker0-env-ready',
    'worker1-ns',
    'worker1-is-local-env',
    'worker1-env-contextCreated',
    'worker1-env-ready',
    'shae-worker-import-structure-module',
    'shae-worker-global-snapshot',
    'shae-worker-local-snapshot',
    'shae-worker-global-entities-reached-the-worker',
    'shae-worker-local-entities-reached-the-worker',
    'shae-worker-ent0-is-root',
    'shae-worker-ent0_1-parent-is-ent0',
    'shae-worker-ent0_2-parent-is-ent0',
    'shae-worker-foo-parent-is-ent0',
    'shae-worker-ent0_3_1-parent-is-ent0',
    'shae-worker-ent1-is-root',
    'shae-worker-ent1_1-parent-is-ent1',
    'shae-worker-ent-a-parent-is-ent1',
    'shae-worker-ant-b-parent-is-ent1',
    'shae-worker-ent1_2_1-parent-is-ant-b',
    'shae-worker-ent1_3_2-parent-is-ant-b',
    'shae-worker-isolated-ns-entities-are-roots',
    'shae-worker-isolated-ns-entities-reach-no-worker',
    'shae-worker-view-and-worker-agree',
  ]);
});