import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('async-events', () => {
  runPageTests('/pages/async-events.html', [
    // ASYNC-3: context lifecycle as DOM CustomEvents
    'async-context-created-event',
    'async-env-ready',
    'async-import-module',
    'async-first-sync',
    // ASYNC-1: property change -> message to the view
    'async-property-change-syncs',
    'async-property-change-echoed',
    // ASYNC-13: a change made while a cycle is in flight
    'async-midflight-syncwait-opens-a-new-cycle',
    'async-midflight-syncwait-carries-the-later-change',
    'async-midflight-drained',
    // ASYNC-6 / ASYNC-7: what auto-sync controls
    'async-idle-window',
    'async-no-autosync-stays-idle',
    'async-autosync-keeps-syncing-while-idle',
    'async-change-syncs-itself-without-autosync',
    'async-autosync-delivers-without-explicit-sync',
    // ASYNC-9: coalescing
    'async-burst-syncs',
    'async-burst-coalesced-into-few-messages',
    'async-burst-delivered-the-final-value',
    // ASYNC-4: traverseChildren across the worker boundary
    'async-broadcast-syncs',
    'async-broadcast-reached-children',
    // ASYNC-5: forward-custom-events
    'async-forwarded-event-arrives-as-dom-event',
    'async-forwarded-event-carries-detail',
    'async-filtered-forward-syncs',
    'async-filtered-forward-blocks-others',
    // ASYNC-3b: contextLost on teardown
    'async-context-lost-event',
  ]);
});
