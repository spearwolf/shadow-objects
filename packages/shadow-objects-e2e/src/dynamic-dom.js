import {on} from '@spearwolf/eventize';
import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const MODULE_URL = '/mod-dynamic-dom.js';

const byId = (id) => document.getElementById(id);

/**
 * Appends a `<shae-ent token="tracked">` with a label and returns it.
 *
 * Built from markup because one string describes the whole fixture — the entity, its property
 * element and both their attributes. The programmatic path is checked on its own page
 * (`create-element.html`).
 */
const appendEnt = (parent, label) => {
  parent.insertAdjacentHTML(
    'beforeend',
    `<shae-ent token="tracked"><shae-prop name="label" value="${label}"></shae-prop></shae-ent>`,
  );
  return parent.lastElementChild;
};

runTestSuite(main);

async function main() {
  await customElements.whenDefined('shae-worker');
  await customElements.whenDefined('shae-ent');
  await customElements.whenDefined('shae-prop');

  const env = byId('env');
  env.start();

  await testAsyncAction('dynamic-dom-env-ready', () => env.shadowEnv.ready());
  await testAsyncAction('dynamic-dom-import-module', () => env.importScript(MODULE_URL));

  const shadowEnv = env.shadowEnv;
  const observerVC = byId('observer').viewComponent;

  const snapshots = [];
  on(observerVC, 'snapshot', (data) => snapshots.push(data));

  window.__snapshots = snapshots;

  let round = 0;

  /**
   * Syncs, then asks the worker what it holds. The answer is both the assertion material and
   * the barrier: everything the worker sent earlier has arrived by the time it lands.
   */
  const snapshot = async () => {
    // Flush pending DOM mutations in their own cycle first. A view event travelling in the same
    // change trail is processed before that trail's removals (phase 3) and property updates, so
    // asking in one go would report the state from *before* the mutation under test.
    await shadowEnv.syncWait();

    const current = ++round;
    observerVC.dispatchShadowObjectsEvent('requestSnapshot', {round: current});
    await shadowEnv.syncWait();
    await waitUntil(`snapshot round ${current}`, () => snapshots.some((s) => s.round === current));
    return snapshots.find((s) => s.round === current);
  };

  const find = (snap, label) => snap.entities.find((e) => e.label === label);

  await testAsyncAction('dynamic-dom-initial-snapshot', snapshot);

  // --- DOM-1: create an element and append it to a live entity ---------------------

  const dyn1 = appendEnt(byId('host-a'), 'dyn-1');

  let snap;
  await testAsyncAction('dynamic-dom-append-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-appended-entity-exists', () => {
    const entry = find(snap, 'dyn-1');
    return entry != null && entry.alive === true;
  });

  testBooleanAction('dynamic-dom-appended-entity-has-parent', () => {
    return find(snap, 'dyn-1')?.parentUuid === byId('host-a').uuid;
  });

  testBooleanAction('dynamic-dom-appended-entity-uuid-matches-view', () => {
    return find(snap, 'dyn-1')?.uuid === dyn1.uuid;
  });

  // --- DOM-1b: appended below a plain element -> stays a root ----------------------

  appendEnt(byId('plain-stage'), 'plain-root');

  await testAsyncAction('dynamic-dom-plain-append-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-entity-below-plain-element-is-root', () => {
    const entry = find(snap, 'plain-root');
    return entry?.alive === true && entry?.parentUuid == null;
  });

  // --- DOM-2: a whole subtree in one assignment ------------------------------------

  const subtreeHost = appendEnt(byId('host-b'), 'subtree-root');
  subtreeHost.insertAdjacentHTML(
    'beforeend',
    `<shae-ent token="tracked">
       <shae-prop name="label" value="subtree-child"></shae-prop>
       <shae-ent token="tracked">
         <shae-prop name="label" value="subtree-grandchild"></shae-prop>
       </shae-ent>
     </shae-ent>`,
  );

  await testAsyncAction('dynamic-dom-subtree-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-subtree-fully-created', () => {
    return ['subtree-root', 'subtree-child', 'subtree-grandchild'].every((label) => find(snap, label)?.alive === true);
  });

  testBooleanAction('dynamic-dom-subtree-hierarchy-is-correct', () => {
    const root = find(snap, 'subtree-root');
    const child = find(snap, 'subtree-child');
    const grandchild = find(snap, 'subtree-grandchild');
    return root?.parentUuid === byId('host-b').uuid && child?.parentUuid === root?.uuid && grandchild?.parentUuid === child?.uuid;
  });

  testBooleanAction('dynamic-dom-parents-created-before-children', () => {
    const root = find(snap, 'subtree-root');
    const child = find(snap, 'subtree-child');
    const grandchild = find(snap, 'subtree-grandchild');
    return root.createdAt < child.createdAt && child.createdAt < grandchild.createdAt;
  });

  // --- DOM-3: move a live entity to a different parent -----------------------------

  const uuidBeforeMove = dyn1.uuid;
  byId('host-b').append(dyn1);

  await testAsyncAction('dynamic-dom-move-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-moved-entity-changed-parent', () => {
    return find(snap, 'dyn-1')?.parentUuid === byId('host-b').uuid;
  });

  testBooleanAction('dynamic-dom-moved-entity-kept-identity', () => {
    const entry = find(snap, 'dyn-1');
    return entry?.alive === true && entry?.uuid === uuidBeforeMove && dyn1.uuid === uuidBeforeMove;
  });

  testBooleanAction('dynamic-dom-move-did-not-recreate', () => {
    const created = snap.log.filter((e) => e.event === 'created' && e.label === 'dyn-1');
    const destroyed = snap.log.filter((e) => e.event === 'destroyed' && e.label === 'dyn-1');
    return created.length === 1 && destroyed.length === 0;
  });

  // --- DOM-6: add and remove a property element at runtime -------------------------

  dyn1.insertAdjacentHTML('beforeend', '<shae-prop name="extra" value="added-at-runtime"></shae-prop>');

  await testAsyncAction('dynamic-dom-added-prop-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-added-prop-arrived', () => {
    return find(snap, 'dyn-1')?.extra === 'added-at-runtime';
  });

  // changing the value of a property element that is already in place
  dyn1.querySelector('shae-prop[name="extra"]').setAttribute('value', 'changed-at-runtime');

  await testAsyncAction('dynamic-dom-changed-prop-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-changed-prop-arrived', () => {
    return find(snap, 'dyn-1')?.extra === 'changed-at-runtime';
  });

  // removing the property element again
  dyn1.querySelector('shae-prop[name="extra"]').remove();

  await testAsyncAction('dynamic-dom-removed-prop-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-removed-prop-is-gone', () => {
    return find(snap, 'dyn-1')?.extra == null;
  });

  // --- DOM-7: move a property element to another entity ----------------------------
  //
  // The move happens in a single tick: `append` disconnects the element and reconnects it under
  // the new host before the microtask checkpoint that would call it gone. Both entities have to
  // agree about the result — the one it left as much as the one it reached.

  const propTarget = appendEnt(byId('host-b'), 'dyn-2');
  dyn1.insertAdjacentHTML('beforeend', '<shae-prop name="extra" value="moved-here"></shae-prop>');

  await testAsyncAction('dynamic-dom-moved-prop-syncs', async () => {
    // a move has to start somewhere: the property is on dyn-1 first, and asserting that it left
    // is only meaningful once it has been there
    snap = await snapshot();
    if (find(snap, 'dyn-1')?.extra !== 'moved-here') {
      throw new Error(`the property never reached dyn-1, it reads ${JSON.stringify(find(snap, 'dyn-1')?.extra)}`);
    }

    propTarget.append(dyn1.querySelector('shae-prop[name="extra"]'));

    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-moved-prop-left-the-old-entity', () => {
    return find(snap, 'dyn-1')?.extra == null;
  });

  testBooleanAction('dynamic-dom-moved-prop-arrived-at-the-new-entity', () => {
    return find(snap, 'dyn-2')?.extra === 'moved-here';
  });

  // --- DOM-4: remove an entity ------------------------------------------------------

  const removedUuid = dyn1.uuid;
  dyn1.remove();

  await testAsyncAction('dynamic-dom-remove-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-removed-entity-is-gone', () => {
    return snap.entities.find((e) => e.uuid === removedUuid)?.alive === false;
  });

  testBooleanAction('dynamic-dom-removed-entity-ran-on-destroy', () => {
    return snap.log.some((e) => e.event === 'destroyed' && e.uuid === removedUuid);
  });

  // --- DOM-4b: removing a subtree destroys every entity in it ----------------------

  const subtreeUuids = ['subtree-root', 'subtree-child', 'subtree-grandchild']
    .map((label) => find(snap, label)?.uuid)
    .filter(Boolean);
  subtreeHost.remove();

  await testAsyncAction('dynamic-dom-subtree-remove-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-removed-subtree-is-fully-gone', () => {
    return subtreeUuids.every((uuid) => snap.entities.find((e) => e.uuid === uuid)?.alive === false);
  });

  // --- DOM-8: remove and re-append within the same microtask -----------------------
  //
  // ShaeWorkerElement documents that a teardown deferred by one microtask cannot be stopped by
  // a reconnect. <shae-ent> makes no such promise, so this pins down what actually happens.

  const flicker = appendEnt(byId('host-a'), 'flicker');

  await testAsyncAction('dynamic-dom-flicker-created', async () => {
    snap = await snapshot();
  });

  const flickerUuidBefore = flicker.uuid;

  flicker.remove();
  byId('host-a').append(flicker);

  await testAsyncAction('dynamic-dom-flicker-syncs', async () => {
    snap = await snapshot();
  });

  testBooleanAction('dynamic-dom-flicker-survives-as-live-entity', () => {
    const entry = snap.entities.find((e) => e.uuid === flicker.uuid);
    return entry?.alive === true && entry?.parentUuid === byId('host-a').uuid;
  });

  testBooleanAction('dynamic-dom-flicker-keeps-its-uuid', () => {
    return flicker.uuid === flickerUuidBefore;
  });

  testBooleanAction('dynamic-dom-flicker-kept-its-property', () => {
    // the `<shae-prop>` inside goes through the same disconnect and reconnect. Its property has to
    // read the same afterwards as before — a flicker is not a declaration being taken back
    return snap.entities.find((e) => e.uuid === flicker.uuid)?.label === 'flicker';
  });
}