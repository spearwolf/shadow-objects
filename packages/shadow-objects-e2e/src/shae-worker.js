import {on} from '@spearwolf/eventize';
import {GlobalNS, ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {watchCustomEvent} from './test-helpers/testCustomEvent.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const ContextCreated = ShadowEnv.ContextCreated.toLowerCase();
const MODULE_URL = '/mod-structure.js';

class ElementWithShadowDom extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: this.getAttribute('mode') || 'open'});

    const insideId = this.getAttribute('ent-inside');
    const slotContainId = this.getAttribute('ent-slot-container');
    const ns = this.getAttribute('ns');
    // A missing `ns` attribute must not become the literal namespace string "null" in the
    // shadow tree — omit the attribute entirely so the entity falls back to the global namespace.
    const nsAttr = ns == null ? '' : ` ns="${ns}"`;

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1rem;
          border: 1px solid #c41;
        }
      </style>
      <shae-ent id="${insideId}"${nsAttr} token="${insideId}">${insideId}</shae-ent>
      <shae-ent id="${slotContainId}"${nsAttr} token="${slotContainId}">${slotContainId}
        <slot></slot>
      </shae-ent>
    `;
  }
}

customElements.define('element-with-shadow-dom', ElementWithShadowDom);

runTestSuite(main);

async function main() {
  const worker0 = document.getElementById('worker0');
  const worker1 = document.getElementById('worker1');

  // Subscribe before the first await: <shae-worker> dispatches "contextcreated" exactly once
  // and does not replay it, so a listener attached after the environment came up misses it.
  // worker0 autostarts, worker1 waits for the explicit start() below. The timeout only starts
  // where the event is awaited — see watchCustomEvent().
  const worker0ContextCreated = watchCustomEvent(worker0, ContextCreated);
  const worker1ContextCreated = watchCustomEvent(worker1, ContextCreated);

  await testAsyncAction('shae-worker-whenDefined', () => customElements.whenDefined('shae-worker'));

  // --- worker0 | remote | autostart -------------------------------------------------

  window.worker0 = worker0;
  console.log('shae-worker #worker0', worker0);

  const shadowEnv0 = worker0.shadowEnv;
  window.shadowEnv0 = shadowEnv0;
  console.log('shadowEnv0', shadowEnv0);

  testBooleanAction('worker0-ns', worker0.ns === GlobalNS);

  await testAsyncAction('worker0-is-remote-env', shadowEnv0.envProxy.workerLoaded);

  // The four timeout attributes on the element, read once when the worker environment was built.
  // The optional chains are deliberate: this has to report false rather than throw, so that a
  // page which does not carry the values keeps its "no uncaught or logged errors" guard green.
  testBooleanAction('worker0-timeouts-from-attributes', () => {
    const timeouts = shadowEnv0.envProxy?.timeouts;
    return (
      timeouts?.loadTimeout === 61000 &&
      timeouts?.configureTimeout === 62000 &&
      timeouts?.changeTrailTimeout === 6000 &&
      timeouts?.destroyTimeout === 6500
    );
  });

  await worker0ContextCreated('worker0-env-contextCreated');
  await testAsyncAction('worker0-env-ready', shadowEnv0.ready);

  // --- worker1 | local | no-autostart ----------------------------------------------

  window.worker1 = worker1;
  console.log('shae-worker #worker1', worker1);

  const shadowEnv1 = worker1.shadowEnv;
  window.shadowEnv1 = shadowEnv1;
  console.log('shadowEnv1', shadowEnv1);

  worker1.start();

  testBooleanAction('worker1-ns', worker1.ns === 'local');
  testBooleanAction('worker1-is-local-env', shadowEnv1.envProxy.kernel != null);

  await worker1ContextCreated('worker1-env-contextCreated');
  await testAsyncAction('worker1-env-ready', shadowEnv1.ready);

  // --- structure | both envs asked what they actually built -------------------------

  const byId = (id) => document.getElementById(id);

  // The inner host is a light-DOM child of the outer host, so the second query is scoped to
  // the first — not a document-wide search that could match either.
  const outerHost = document.querySelector('element-with-shadow-dom');
  const innerHost = outerHost.querySelector('element-with-shadow-dom');
  const sd = (host, id) => host.shadowRoot.getElementById(id);

  await testAsyncAction('shae-worker-import-structure-module', () =>
    Promise.all([worker0.importScript(MODULE_URL), worker1.importScript(MODULE_URL)]),
  );

  const observer0VC = byId('observer0').viewComponent;
  const observer1VC = byId('observer1').viewComponent;

  const globalSnapshots = [];
  on(observer0VC, 'snapshot', (data) => globalSnapshots.push(data));

  const localSnapshots = [];
  on(observer1VC, 'snapshot', (data) => localSnapshots.push(data));

  let round = 0;

  /**
   * Syncs, asks the worker for its snapshot, syncs again. The first sync flushes changes
   * accumulated so far; the second carries the request itself and the reply back.
   */
  const snapshot = async (shadowEnv, observerVC, snapshots) => {
    await shadowEnv.syncWait();
    const current = ++round;
    observerVC.dispatchShadowObjectsEvent('requestSnapshot', {round: current});
    await shadowEnv.syncWait();
    await waitUntil(`snapshot round ${current}`, () => snapshots.some((s) => s.round === current));
    return snapshots.find((s) => s.round === current);
  };

  let globalSnap;
  await testAsyncAction('shae-worker-global-snapshot', async () => {
    globalSnap = await snapshot(shadowEnv0, observer0VC, globalSnapshots);
  });

  let localSnap;
  await testAsyncAction('shae-worker-local-snapshot', async () => {
    localSnap = await snapshot(shadowEnv1, observer1VC, localSnapshots);
  });

  // Elements are matched to their snapshot entry by uuid, not by token — the question under
  // test is precisely which uuid a given entity's parent has.
  const entry = (snap, el) => snap.entities.find((e) => e.uuid === el.uuid);

  testBooleanAction('shae-worker-global-entities-reached-the-worker', () => {
    return [byId('ent0'), byId('ent0_1'), byId('ent0_2'), byId('foo'), byId('ent0_3_1'), byId('observer0')].every(
      (el) => entry(globalSnap, el) != null,
    );
  });

  const entA = sd(outerHost, 'ent-a');
  const antB = sd(outerHost, 'ant-b');

  testBooleanAction('shae-worker-local-entities-reached-the-worker', () => {
    return [byId('ent1'), byId('ent1_1'), entA, antB, byId('ent1_2_1'), byId('ent1_3_2'), byId('observer1')].every(
      (el) => entry(localSnap, el) != null,
    );
  });

  testBooleanAction('shae-worker-ent0-is-root', () => entry(globalSnap, byId('ent0')).parentUuid == null);

  testBooleanAction(
    'shae-worker-ent0_1-parent-is-ent0',
    () => entry(globalSnap, byId('ent0_1')).parentUuid === entry(globalSnap, byId('ent0')).uuid,
  );

  testBooleanAction(
    'shae-worker-ent0_2-parent-is-ent0',
    () => entry(globalSnap, byId('ent0_2')).parentUuid === entry(globalSnap, byId('ent0')).uuid,
  );

  testBooleanAction(
    'shae-worker-foo-parent-is-ent0',
    () => entry(globalSnap, byId('foo')).parentUuid === entry(globalSnap, byId('ent0')).uuid,
  );

  // ent0_3_1 sits two shadow boundaries and two slot hops deep. The ancestor search skips every
  // ancestor whose namespace differs from the requester's own (ShaeEntElement#onRequestParent
  // checks `requester.ns !== this.ns`) — whether that namespace has a worker is irrelevant. On
  // the way up it skips iso-b (isolated, no worker) but also ant-b and ent1 (both local, and
  // both reached by worker1, per shae-worker-local-entities-reached-the-worker above), because
  // none of them share ent0_3_1's global namespace. ent0 is the first ancestor that does.
  testBooleanAction(
    'shae-worker-ent0_3_1-parent-is-ent0',
    () => entry(globalSnap, byId('ent0_3_1')).parentUuid === entry(globalSnap, byId('ent0')).uuid,
  );

  testBooleanAction('shae-worker-ent1-is-root', () => entry(localSnap, byId('ent1')).parentUuid == null);

  testBooleanAction(
    'shae-worker-ent1_1-parent-is-ent1',
    () => entry(localSnap, byId('ent1_1')).parentUuid === entry(localSnap, byId('ent1')).uuid,
  );

  // ent-a lives in the outer host's shadow root. Its nearest shae ancestor is found by crossing
  // the shadow boundary to the host's own light-DOM parent, which is ent1.
  testBooleanAction(
    'shae-worker-ent-a-parent-is-ent1',
    () => entry(localSnap, entA).parentUuid === entry(localSnap, byId('ent1')).uuid,
  );

  // ant-b crosses the same shadow boundary as ent-a; it additionally hosts the <slot> that
  // ent1_2_1 and ent1_3_2 project into.
  testBooleanAction(
    'shae-worker-ant-b-parent-is-ent1',
    () => entry(localSnap, antB).parentUuid === entry(localSnap, byId('ent1')).uuid,
  );

  // ent1_2_1 is a light-DOM child of the outer host, projected through <slot> into ant-b's
  // shadow tree — it binds to the shadow entity that owns the slot, not to the host's own parent.
  testBooleanAction(
    'shae-worker-ent1_2_1-parent-is-ant-b',
    () => entry(localSnap, byId('ent1_2_1')).parentUuid === entry(localSnap, antB).uuid,
  );

  // ent1_3_2 crosses two slots on the way up: the first lands on iso-b (isolated), which its own
  // local namespace does not match, so the search moves on to the inner host's own light-DOM
  // position — slotted into ant-b, whose namespace does match. ant-b is where it settles.
  testBooleanAction(
    'shae-worker-ent1_3_2-parent-is-ant-b',
    () => entry(localSnap, byId('ent1_3_2')).parentUuid === entry(localSnap, antB).uuid,
  );

  const isoA = sd(innerHost, 'iso-a');
  const isoB = sd(innerHost, 'iso-b');

  testBooleanAction('shae-worker-isolated-ns-entities-are-roots', () => {
    return [isoA, isoB].every((el) => el.entParentNode == null && el.viewComponent.parent == null);
  });

  testBooleanAction('shae-worker-isolated-ns-entities-reach-no-worker', () => {
    return [isoA, isoB].every((el) => el.uuid != null && entry(globalSnap, el) == null && entry(localSnap, el) == null);
  });

  // The worker-side parentUuid for an entity is read off whichever snapshot actually holds it —
  // global and local never both contain the same uuid, and an isolated-namespace entity is in
  // neither, which is exactly the case the isolated-ns checks above cover on their own.
  const workerParentUuid = (el) => (entry(globalSnap, el) ?? entry(localSnap, el))?.parentUuid;

  testBooleanAction('shae-worker-view-and-worker-agree', () => {
    return [
      byId('ent0'),
      byId('ent0_1'),
      byId('ent1'),
      byId('ent0_2'),
      byId('foo'),
      byId('ent1_1'),
      entA,
      antB,
      byId('ent1_2_1'),
      byId('ent1_3_2'),
      byId('ent0_3_1'),
      isoA,
      isoB,
    ].every((el) => el.viewComponent.parent?.uuid === workerParentUuid(el));
  });
}