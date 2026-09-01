import {on} from '@spearwolf/eventize';
import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const MODULE_URL = '/mod-auto-destruct-dom.js';

const byId = (id) => document.getElementById(id);

runTestSuite(main);

async function main() {
  await customElements.whenDefined('shae-worker');
  await customElements.whenDefined('shae-ent');
  await customElements.whenDefined('shae-prop');

  const env = byId('env');
  env.start();

  await testAsyncAction('auto-destruct-dom-env-ready', () => env.shadowEnv.ready());
  await testAsyncAction('auto-destruct-dom-import-module', () => env.importScript(MODULE_URL));

  const shadowEnv = env.shadowEnv;
  const observerVC = byId('observer').viewComponent;

  const snapshots = [];
  on(observerVC, 'snapshot', (data) => snapshots.push(data));

  let round = 0;

  /**
   * Syncs, then asks the worker what it holds. The answer is both the assertion material and the
   * barrier: everything sent before it has arrived by the time it lands.
   */
  const snapshot = async () => {
    // Two syncs, not one. A view event travels in the same change trail as the DOM mutations that
    // were made before it, and the worker processes the event ahead of that trail's removals — so
    // a single cycle would report the state from before the mutation under test. The first sync
    // carries the mutations alone, the second one the question about them.
    await shadowEnv.syncWait();

    const current = ++round;
    observerVC.dispatchShadowObjectsEvent('requestSnapshot', {round: current});
    await shadowEnv.syncWait();
    await waitUntil(`snapshot round ${current}`, () => snapshots.some((s) => s.round === current));
    return snapshots.find((s) => s.round === current);
  };

  const find = (snap, label) => snap.entities.find((e) => e.label === label);

  let snap;
  await testAsyncAction('auto-destruct-dom-initial-snapshot', async () => {
    snap = await snapshot();
  });

  // --- the flag reaches the entity, and only where the markup says so ----------------

  testBooleanAction('auto-destruct-dom-flag-arrived-from-markup', () => {
    const flagged = ['kernel-flagged', 'dom-flagged'].every((label) => find(snap, label)?.autoDestruct === true);
    const unflagged = ['kernel-unflagged', 'dom-unflagged', 'kernel-doomed', 'dom-doomed'].every(
      (label) => find(snap, label)?.autoDestruct === false,
    );
    return flagged && unflagged;
  });

  // --- a DOM removal takes the whole subtree, flag or no flag ------------------------
  //
  // The view detaches a component's children before it destroys the component, and each child
  // element leaving the document destroys its own entity anyway. The flag has no say here.

  byId('dom-doomed').remove();

  snap = await snapshot();

  testBooleanAction('auto-destruct-dom-removal-takes-both-children', () => {
    return ['dom-doomed', 'dom-flagged', 'dom-unflagged'].every((label) => find(snap, label)?.alive === false);
  });

  // --- a kernel destroy is the occasion the flag was written for ---------------------
  //
  // Nothing below touches the DOM of these entities again: the view then holds view components
  // without entities, and a further change trail on them would make the worker report errors.

  observerVC.dispatchShadowObjectsEvent('destroyEntity', {label: 'kernel-doomed'});

  snap = await snapshot();

  testBooleanAction('auto-destruct-dom-kernel-destroy-cascades-the-flagged-child', () => {
    const entry = find(snap, 'kernel-flagged');
    return entry?.alive === false && entry?.destroyed === true;
  });

  testBooleanAction('auto-destruct-dom-kernel-destroy-promotes-the-unflagged-child', () => {
    const entry = find(snap, 'kernel-unflagged');
    return entry?.alive === true && entry?.destroyed === false && entry?.parentUuid == null;
  });
}
