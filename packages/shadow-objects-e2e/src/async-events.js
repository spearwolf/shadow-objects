import {on} from '@spearwolf/eventize';
import {ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {testCustomEvent, watchCustomEvent} from './test-helpers/testCustomEvent.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const MODULE_URL = '/mod-async-events.js';

const byId = (id) => document.getElementById(id);

/** Waits for a number of animation frames — the window in which an active frame loop would sync. */
const waitFrames = (count) =>
  new Promise((resolve) => {
    let left = count;
    const step = () => (left-- > 0 ? requestAnimationFrame(step) : resolve());
    requestAnimationFrame(step);
  });

runTestSuite(main);

async function main() {
  await customElements.whenDefined('shae-worker');
  await customElements.whenDefined('shae-ent');
  await customElements.whenDefined('shae-prop');

  const env = byId('env');
  const tickEnv = byId('tickEnv');

  // --- ASYNC-3: contextCreated fires as a DOM CustomEvent --------------------------
  // subscribe before start(), the event is dispatched once and never replayed

  const contextCreated = watchCustomEvent(env, 'contextcreated');

  env.start();
  tickEnv.start();

  await testAsyncAction('async-env-ready', () => env.shadowEnv.ready());
  await contextCreated('async-context-created-event');

  await testAsyncAction('async-import-module', () =>
    Promise.all([env.importScript(MODULE_URL), tickEnv.importScript(MODULE_URL)]),
  );

  // --- collectors ------------------------------------------------------------------

  const counted = {counter: [], 'listener-1': [], 'listener-2': [], ticker: []};
  for (const id of Object.keys(counted)) {
    on(byId(id).viewComponent, 'counted', (data) => counted[id].push(data));
  }

  const echoes = {broadcaster: [], 'listener-1': [], 'listener-2': []};
  for (const id of Object.keys(echoes)) {
    on(byId(id).viewComponent, 'broadcastEcho', (data) => echoes[id].push(data));
  }

  await testAsyncAction('async-first-sync', () => env.shadowEnv.syncWait());

  // --- ASYNC-1: a property change produces a message back to the view ---------------

  byId('counter').querySelector('shae-prop[name="n"]').value = 42;

  await testAsyncAction('async-property-change-syncs', () => env.shadowEnv.syncWait());

  await testAsyncAction('async-property-change-echoed', () =>
    waitUntil('the counter to echo 42', () => counted.counter.some((c) => c.value === 42)),
  );

  // --- ASYNC-6 / ASYNC-7: what auto-sync actually controls -------------------------
  //
  // auto-sync governs the *periodic* sync loop, not change-driven syncs: ShaeElement schedules
  // a microtask sync whenever an element changes, regardless of the attribute. The difference is
  // only visible while idle, so that is what we measure — counting AfterSync cycles rather than
  // delivered messages, because an idle sync carries an empty change trail.

  let idleSyncs = 0;
  let tickingSyncs = 0;
  on(env.shadowEnv, ShadowEnv.AfterSync, () => {
    idleSyncs += 1;
  });
  on(tickEnv.shadowEnv, ShadowEnv.AfterSync, () => {
    tickingSyncs += 1;
  });

  const idleBefore = idleSyncs;
  const tickingBefore = tickingSyncs;

  await testAsyncAction('async-idle-window', () => waitFrames(10));

  testBooleanAction('async-no-autosync-stays-idle', () => idleSyncs === idleBefore);

  testBooleanAction('async-autosync-keeps-syncing-while-idle', () => tickingSyncs > tickingBefore);

  // a change still reaches the worker without an explicit sync, even with auto-sync off
  byId('counter').querySelector('shae-prop[name="n"]').value = 43;

  await testAsyncAction('async-change-syncs-itself-without-autosync', () =>
    waitUntil('the counter to echo 43 without an explicit sync', () => counted.counter.some((c) => c.value === 43)),
  );

  byId('ticker').querySelector('shae-prop[name="n"]').value = 77;

  await testAsyncAction('async-autosync-delivers-without-explicit-sync', () =>
    waitUntil('the ticking environment to deliver on its own', () => counted.ticker.some((c) => c.value === 77), 3000),
  );

  // --- ASYNC-9: many changes in one tick coalesce ----------------------------------

  const beforeBurst = counted.counter.length;
  const prop = byId('counter').querySelector('shae-prop[name="n"]');
  for (let i = 100; i < 200; i++) {
    prop.value = i;
  }

  await testAsyncAction('async-burst-syncs', async () => {
    await env.shadowEnv.syncWait();
    await waitUntil('the last value of the burst to arrive', () => counted.counter.some((c) => c.value === 199));
  });

  testBooleanAction('async-burst-coalesced-into-few-messages', () => {
    // 100 assignments must not produce 100 round-trips
    return counted.counter.length - beforeBurst < 10;
  });

  testBooleanAction('async-burst-delivered-the-final-value', () => {
    return counted.counter[counted.counter.length - 1]?.value === 199;
  });

  // --- ASYNC-4: traverseChildren delivers to the whole subtree ---------------------

  byId('broadcaster').viewComponent.dispatchShadowObjectsEvent('broadcast', {round: 1});

  await testAsyncAction('async-broadcast-syncs', async () => {
    await env.shadowEnv.syncWait();
    await waitUntil('the broadcast to reach the origin', () => echoes.broadcaster.length === 1);
  });

  await testAsyncAction('async-broadcast-reached-children', () =>
    waitUntil(
      'the broadcast to reach both descendants',
      () => echoes['listener-1'].length === 1 && echoes['listener-2'].length === 1,
    ),
  );

  // --- ASYNC-5: forward-custom-events over a real worker ---------------------------

  const forwarded = [];
  byId('shouter-all').addEventListener('shouted', (event) => forwarded.push(event.detail));

  byId('shouter-all').viewComponent.dispatchShadowObjectsEvent('shout', {round: 2, eventName: 'shouted'});

  await testAsyncAction('async-forwarded-event-arrives-as-dom-event', async () => {
    await env.shadowEnv.syncWait();
    await waitUntil('the forwarded DOM event', () => forwarded.length === 1);
  });

  testBooleanAction('async-forwarded-event-carries-detail', () => forwarded[0]?.round === 2);

  // the filtered element forwards "allowed" but must swallow "blocked"
  const allowed = [];
  const blocked = [];
  byId('shouter-filtered').addEventListener('allowed', (event) => allowed.push(event.detail));
  byId('shouter-filtered').addEventListener('blocked', (event) => blocked.push(event.detail));

  const filteredVC = byId('shouter-filtered').viewComponent;
  filteredVC.dispatchShadowObjectsEvent('shout', {round: 3, eventName: 'blocked'});
  filteredVC.dispatchShadowObjectsEvent('shout', {round: 4, eventName: 'allowed'});

  await testAsyncAction('async-filtered-forward-syncs', async () => {
    await env.shadowEnv.syncWait();
    await waitUntil('the allowed event to be forwarded', () => allowed.length === 1);
  });

  testBooleanAction('async-filtered-forward-blocks-others', () => blocked.length === 0);

  // --- ASYNC-3b: contextLost fires when the worker element goes away ---------------

  const contextLost = testCustomEvent('async-context-lost-event', env, 'contextlost');
  env.remove();
  await contextLost;
}