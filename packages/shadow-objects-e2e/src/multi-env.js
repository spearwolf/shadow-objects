import {on} from '@spearwolf/eventize';
import {ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const MODULE_URL = '/mod-multi-env.js';

const ENV_NAMES = ['alpha', 'beta', 'gamma'];

const ENT_IDS = ['probe-alpha', 'probe-beta', 'probe-gamma', 'nest-outer', 'nest-inner', 'same-ns-outer', 'same-ns-inner'];

const byId = (id) => document.getElementById(id);

const propOf = (entId, name) => byId(entId).querySelector(`shae-prop[name="${name}"]`);

/** Runs a full sync cycle on every environment. */
const syncAll = () => Promise.all(ENV_NAMES.map((ns) => ShadowEnv.get(ns).syncWait()));

runTestSuite(main);

async function main() {
  await customElements.whenDefined('shae-worker');
  await customElements.whenDefined('shae-ent');
  await customElements.whenDefined('shae-prop');

  const workers = Object.fromEntries(ENV_NAMES.map((ns) => [ns, byId(`env${ns[0].toUpperCase()}${ns.slice(1)}`)]));

  // --- MULTI-1: three environments come up side by side ----------------------------

  for (const worker of Object.values(workers)) {
    worker.start();
  }

  await testAsyncAction('multi-envs-ready', () => Promise.all(Object.values(workers).map((w) => w.shadowEnv.ready())));

  testBooleanAction('multi-envs-are-distinct', () => {
    const envs = ENV_NAMES.map((ns) => ShadowEnv.get(ns));
    return (
      envs.every((env) => env != null) &&
      new Set(envs).size === ENV_NAMES.length &&
      envs.every((env, i) => env === workers[ENV_NAMES[i]].shadowEnv)
    );
  });

  testBooleanAction('multi-envs-have-separate-contexts', () => {
    const contexts = ENV_NAMES.map((ns) => ShadowEnv.get(ns).view);
    return (
      contexts.every((ctx) => ctx != null) &&
      new Set(contexts).size === ENV_NAMES.length &&
      contexts.every((ctx, i) => ctx.ns === ENV_NAMES[i])
    );
  });

  // alpha and beta are remote (no kernel on the view side), gamma runs in-process
  testBooleanAction('multi-envs-mix-remote-and-local', () => {
    return (
      workers.alpha.shadowEnv.envProxy.kernel == null &&
      workers.beta.shadowEnv.envProxy.kernel == null &&
      workers.gamma.shadowEnv.envProxy.kernel != null
    );
  });

  await testAsyncAction('multi-envs-import-module', () =>
    Promise.all(Object.values(workers).map((w) => w.importScript(MODULE_URL))),
  );

  // --- collect everything the shadow objects send back -----------------------------

  const records = {};

  for (const id of ENT_IDS) {
    const el = byId(id);
    const record = {el, created: [], values: [], reports: [], pongs: []};
    records[id] = record;

    on(el.viewComponent, 'probeCreated', (data) => record.created.push(data));
    on(el.viewComponent, 'probeValueChanged', (data) => record.values.push(data));
    on(el.viewComponent, 'probeReport', (data) => record.reports.push(data));
    on(el.viewComponent, 'pong', (data) => record.pongs.push(data));
  }

  /**
   * Waits until every entity has answered a fresh ping.
   *
   * Asserting that a message did *not* arrive is only meaningful once everything that was
   * already in flight has landed. A sync cycle alone does not give that: it confirms the change
   * trail went out, not that the answers came back. A round-trip does, because messages from one
   * shadow object arrive in the order it sent them.
   */
  let pingRound = 0;

  const drainAllEntities = async () => {
    const round = ++pingRound;
    for (const id of ENT_IDS) {
      byId(id).viewComponent.dispatchShadowObjectsEvent('ping', {round});
    }
    await syncAll();
    await waitUntil(`every entity to answer ping round ${round}`, () =>
      ENT_IDS.every((id) => records[id].pongs.some((p) => p.round === round)),
    );
  };

  await testAsyncAction('multi-envs-first-sync', syncAll);

  await testAsyncAction('multi-envs-entities-created', () =>
    waitUntil('every entity to report its creation', () => ENT_IDS.every((id) => records[id].created.length === 1)),
  );

  // --- MULTI-6: same token in every namespace, still independent --------------------

  testBooleanAction('multi-env-same-token-stays-independent', () => {
    // every entity was created exactly once and knows its own envName
    const expected = {
      'probe-alpha': 'alpha',
      'probe-beta': 'beta',
      'probe-gamma': 'gamma',
      'nest-outer': 'nest-outer',
      'nest-inner': 'nest-inner',
      'same-ns-outer': 'same-ns-outer',
      'same-ns-inner': 'same-ns-inner',
    };
    return ENT_IDS.every((id) => records[id].created[0]?.envName === expected[id]);
  });

  testBooleanAction('multi-env-initial-values-arrived', () => {
    return (
      records['probe-alpha'].created[0]?.value === 11 &&
      records['probe-beta'].created[0]?.value === 22 &&
      records['probe-gamma'].created[0]?.value === 33
    );
  });

  // --- MULTI-7: cross-namespace nesting must not create a parent link ---------------

  testBooleanAction('multi-env-cross-ns-child-becomes-root', () => {
    const inner = records['nest-inner'].created[0];
    return inner?.hasParent === false && inner?.parentUuid == null;
  });

  testBooleanAction('multi-env-cross-ns-child-has-no-view-parent', () => {
    return byId('nest-inner').viewComponent.parent == null;
  });

  // the control case: same namespace, so the link must exist
  testBooleanAction('multi-env-same-ns-child-is-linked', () => {
    const inner = records['same-ns-inner'].created[0];
    return inner?.hasParent === true && inner?.parentUuid === byId('same-ns-outer').uuid;
  });

  // --- MULTI-2 / MULTI-3: a change in alpha reaches alpha, and only alpha -----------

  const valuesBefore = Object.fromEntries(ENT_IDS.map((id) => [id, records[id].values.length]));

  propOf('probe-alpha', 'value').value = 111;

  await testAsyncAction('multi-env-alpha-change-syncs', syncAll);

  await testAsyncAction('multi-env-alpha-received-change', () =>
    waitUntil('alpha to observe value 111', () =>
      records['probe-alpha'].values.some((v) => v.value === 111 && v.envName === 'alpha'),
    ),
  );

  await testAsyncAction('multi-env-isolation-barrier', drainAllEntities);

  testBooleanAction('multi-env-other-namespaces-unaffected', () => {
    return ENT_IDS.filter((id) => id !== 'probe-alpha').every((id) => records[id].values.length === valuesBefore[id]);
  });

  testBooleanAction('multi-env-no-foreign-envName-leaked', () => {
    const expected = {
      'probe-alpha': 'alpha',
      'probe-beta': 'beta',
      'probe-gamma': 'gamma',
      'nest-outer': 'nest-outer',
      'nest-inner': 'nest-inner',
      'same-ns-outer': 'same-ns-outer',
      'same-ns-inner': 'same-ns-inner',
    };
    return ENT_IDS.every((id) =>
      [...records[id].created, ...records[id].values, ...records[id].reports, ...records[id].pongs].every(
        (event) => event.envName === expected[id],
      ),
    );
  });

  // --- MULTI-4: simultaneous changes in all three namespaces -----------------------

  propOf('probe-alpha', 'value').value = 1111;
  propOf('probe-beta', 'value').value = 2222;
  propOf('probe-gamma', 'value').value = 3333;

  await testAsyncAction('multi-env-simultaneous-change-syncs', syncAll);

  await testAsyncAction('multi-env-simultaneous-changes-arrived', () =>
    waitUntil(
      'each namespace to observe its own new value',
      () =>
        records['probe-alpha'].values.some((v) => v.value === 1111) &&
        records['probe-beta'].values.some((v) => v.value === 2222) &&
        records['probe-gamma'].values.some((v) => v.value === 3333),
    ),
  );

  await testAsyncAction('multi-env-simultaneous-barrier', drainAllEntities);

  testBooleanAction('multi-env-simultaneous-changes-did-not-cross', () => {
    const seen = (id) => records[id].values.map((v) => v.value);
    return (
      !seen('probe-alpha').includes(2222) &&
      !seen('probe-alpha').includes(3333) &&
      !seen('probe-beta').includes(1111) &&
      !seen('probe-beta').includes(3333) &&
      !seen('probe-gamma').includes(1111) &&
      !seen('probe-gamma').includes(2222)
    );
  });

  // --- MULTI-5: a request sent into beta is answered by beta only ------------------

  byId('probe-beta').viewComponent.dispatchShadowObjectsEvent('requestReport', {ping: 'beta-only'});

  await testAsyncAction('multi-env-request-syncs', syncAll);

  await testAsyncAction('multi-env-request-answered', () =>
    waitUntil('beta to answer the report request', () => records['probe-beta'].reports.length === 1),
  );

  testBooleanAction('multi-env-request-answer-is-correct', () => {
    const report = records['probe-beta'].reports[0];
    return report?.envName === 'beta' && report?.value === 2222 && report?.echo?.ping === 'beta-only';
  });

  await testAsyncAction('multi-env-request-barrier', drainAllEntities);

  testBooleanAction('multi-env-request-reached-no-other-namespace', () => {
    return ENT_IDS.filter((id) => id !== 'probe-beta').every((id) => records[id].reports.length === 0);
  });
}