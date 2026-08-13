import {on} from '@spearwolf/eventize';
import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const MODULE_URL = '/mod-dynamic-dom.js';

const byId = (id) => document.getElementById(id);

runTestSuite(main);

async function main() {
  // --- UPG: the markup really was there before any definition ----------------------

  testBooleanAction('upgrade-markup-existed-before-definition', () => {
    const pre = window.__preUpgradeState;
    return pre != null && pre.anyDefined === false && pre.entIsUpgraded === false;
  });

  await testAsyncAction('upgrade-definitions-arrive', () =>
    Promise.all([
      customElements.whenDefined('shae-worker'),
      customElements.whenDefined('shae-ent'),
      customElements.whenDefined('shae-prop'),
    ]),
  );

  // --- UPG-1: pre-existing markup is upgraded in place ------------------------------

  testBooleanAction('upgrade-pre-existing-elements-are-upgraded', () => {
    return (
      byId('pre-root').isShaeEntElement === true &&
      byId('pre-child').isShaeEntElement === true &&
      byId('pre-observer').isShaeEntElement === true &&
      byId('env').isShaeWorkerElement === true
    );
  });

  testBooleanAction('upgrade-pre-existing-elements-have-view-components', () => {
    return ['pre-root', 'pre-child', 'pre-observer', 'pre-injected-ent'].every((id) => byId(id).viewComponent != null);
  });

  testBooleanAction('upgrade-pre-existing-hierarchy-is-correct', () => {
    return byId('pre-child').viewComponent.parent === byId('pre-root').viewComponent;
  });

  // --- UPG-4: markup injected before the definitions behaves the same ---------------

  testBooleanAction('upgrade-pre-injected-markup-is-upgraded', () => {
    return byId('pre-injected-ent').isShaeEntElement === true;
  });

  // --- UPG-3: shae-prop waits for shae-ent -----------------------------------------
  //
  // shae-prop.js gates its own registration on whenDefined('shae-ent'), because
  // ShaePropElement finds its host by looking for the isShaeEntElement flag — which only
  // exists after <shae-ent> was upgraded. The guarantee is deliberate and otherwise untested.

  testBooleanAction('upgrade-shae-prop-is-defined-after-shae-ent', () => {
    return customElements.get('shae-ent') != null && customElements.get('shae-prop') != null;
  });

  testBooleanAction('upgrade-pre-existing-props-found-their-host', () => {
    const props = Array.from(byId('pre-root').querySelectorAll(':scope > shae-prop'));
    return props.length === 2 && props.every((p) => p.entNode === byId('pre-root'));
  });

  // --- UPG-1/2: the whole thing reaches the worker, properties included -------------

  const env = byId('env');
  env.start();

  await testAsyncAction('upgrade-env-ready', () => env.shadowEnv.ready());
  await testAsyncAction('upgrade-import-module', () => env.importScript(MODULE_URL));

  const observerVC = byId('pre-observer').viewComponent;
  const snapshots = [];
  on(observerVC, 'snapshot', (data) => snapshots.push(data));

  let round = 0;
  const snapshot = async () => {
    await env.shadowEnv.syncWait();
    const current = ++round;
    observerVC.dispatchShadowObjectsEvent('requestSnapshot', {round: current});
    await env.shadowEnv.syncWait();
    await waitUntil(`snapshot round ${current}`, () => snapshots.some((s) => s.round === current));
    return snapshots.find((s) => s.round === current);
  };

  let snap;
  await testAsyncAction('upgrade-first-sync', async () => {
    snap = await snapshot();
  });

  const find = (label) => snap.entities.find((e) => e.label === label);

  testBooleanAction('upgrade-entities-reached-the-worker', () => {
    return ['pre-root', 'pre-child', 'pre-injected'].every((label) => find(label)?.alive === true);
  });

  testBooleanAction('upgrade-hierarchy-reached-the-worker', () => {
    return find('pre-child')?.parentUuid === find('pre-root')?.uuid;
  });

  // UPG-2: properties declared before the upgrade must survive it
  testBooleanAction('upgrade-properties-survived-the-upgrade', () => {
    return find('pre-root')?.extra === 'declared-before-upgrade';
  });

  // --- UPG-5: elements added after the definitions behave identically ---------------

  byId('pre-root').insertAdjacentHTML(
    'beforeend',
    '<shae-ent id="post-child" token="tracked"><shae-prop name="label" value="post-child"></shae-prop></shae-ent>',
  );

  await testAsyncAction('upgrade-post-definition-sync', async () => {
    snap = await snapshot();
  });

  testBooleanAction('upgrade-post-definition-element-matches-pre-existing', () => {
    const post = find('post-child');
    const pre = find('pre-child');
    return post?.alive === true && post?.parentUuid === pre?.parentUuid;
  });
}