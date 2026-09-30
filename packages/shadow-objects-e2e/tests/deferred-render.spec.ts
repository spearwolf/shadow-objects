import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('deferred-render', () => {
  runPageTests('/pages/deferred-render.html', [
    'deferred-render-definitions-arrive',
    'deferred-render-projected-entities-asked-first',
    // DEFER-1: one host, stamped with importNode and with createElement
    'deferred-render-import-node-adopts',
    'deferred-render-create-element-adopts',
    // DEFER-2: two nested hosts, in both render orders
    'deferred-render-outer-first-builds-the-chain',
    'deferred-render-inner-first-builds-the-chain',
    // DEFER-3: the context of the closest provider reaches the worker-side consumer
    'deferred-render-env-ready',
    'deferred-render-import-module',
    'deferred-render-sync',
    'deferred-render-context-reaches-the-projected-entities',
  ]);
});
