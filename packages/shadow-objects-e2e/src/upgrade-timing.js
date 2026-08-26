import {on} from '@spearwolf/eventize';
import {ShaeEntElement} from '@spearwolf/shadow-objects';
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

  // --- UPG-7: an element that becomes an entity after the first sync ---
  //
  // `find(label)` only reaches an entity that carries a label property; of the two islands below
  // that is the late-ent one. Everything else is looked up by uuid.

  const entityOf = (el) => snap.entities.find((e) => e.uuid === el.uuid);
  const wrapInner = () => byId('late-wrap').shadowRoot.getElementById('wrap-inner');

  testBooleanAction('upgrade-late-elements-are-not-defined-yet', () => {
    return (
      customElements.get('late-ent') == null &&
      customElements.get('late-wrapper') == null &&
      byId('late-mid').isShaeEntElement !== true
    );
  });

  // the starting point, not a defect: the closer ancestor does not exist as an entity yet
  testBooleanAction('upgrade-late-child-starts-at-the-outer-entity', () => {
    return byId('late-child').entParentNode === byId('late-gp') && byId('wrap-child').entParentNode === byId('wrap-gp');
  });

  await testAsyncAction('upgrade-late-definitions-arrive', async () => {
    class LateEnt extends ShaeEntElement {}

    class LateWrapper extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        this.attachShadow({mode: 'open'}).innerHTML = '<shae-ent id="wrap-inner" token="tracked"><slot></slot></shae-ent>';
      }
    }

    customElements.define('late-ent', LateEnt);
    customElements.define('late-wrapper', LateWrapper);

    await Promise.all([customElements.whenDefined('late-ent'), customElements.whenDefined('late-wrapper')]);

    // the upgrade itself is synchronous; the wait is for what follows it — the round in which the
    // entities below look for their parent again, and the slot assignment
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  testBooleanAction('upgrade-late-subclass-is-upgraded', () => {
    return byId('late-mid').isShaeEntElement === true && byId('late-mid').viewComponent != null;
  });

  testBooleanAction('upgrade-late-subclass-adopts-the-child', () => {
    return (
      byId('late-child').entParentNode === byId('late-mid') &&
      byId('late-child').viewComponent.parent === byId('late-mid').viewComponent
    );
  });

  testBooleanAction('upgrade-late-prop-found-its-host', () => {
    return byId('late-mid').querySelector(':scope > shae-prop').entNode === byId('late-mid');
  });

  testBooleanAction('upgrade-late-subclass-keeps-its-own-parent', () => {
    return byId('late-mid').viewComponent.parent === byId('late-gp').viewComponent;
  });

  testBooleanAction('upgrade-late-wrapper-adopts-the-slotted-child', () => {
    return (
      byId('wrap-child').entParentNode === wrapInner() && byId('wrap-child').viewComponent.parent === wrapInner().viewComponent
    );
  });

  await testAsyncAction('upgrade-late-definition-sync', async () => {
    snap = await snapshot();
  });

  // `find` looks up the entity carrying the label, so the question is *which* entity carries it —
  // an assertion on the label itself would be tautological
  testBooleanAction('upgrade-late-prop-reached-the-worker', () => {
    return find('late-mid')?.uuid === byId('late-mid').uuid;
  });

  testBooleanAction('upgrade-late-hierarchy-reached-the-worker', () => {
    return (
      entityOf(byId('late-child'))?.parentUuid === byId('late-mid').uuid &&
      entityOf(byId('late-mid'))?.parentUuid === byId('late-gp').uuid &&
      entityOf(byId('wrap-child'))?.parentUuid === wrapInner().uuid
    );
  });
}
