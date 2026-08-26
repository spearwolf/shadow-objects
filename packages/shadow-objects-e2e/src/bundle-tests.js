import {on} from '@spearwolf/eventize';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);

runTestSuite(main);

async function main() {
  // --- BUNDLE-3: the single-file build loaded and defined everything ----------------

  testBooleanAction('bundle-flag-is-set', () => globalThis.SHADOW_OBJECTS_BUNDLE_LOADED === true);

  await testAsyncAction('bundle-elements-defined', () =>
    Promise.all([
      customElements.whenDefined('shae-ent'),
      customElements.whenDefined('shae-prop'),
      customElements.whenDefined('shae-worker'),
    ]),
  );

  // --- BUNDLE-1: the declared tree really is a tree ---------------------------------

  const se = Object.fromEntries(['seBase0', 'seBase1', 'seBase2', 'seBase3', 'seBase4'].map((id) => [id, byTestId(id)]));

  testBooleanAction('bundle-entities-have-view-components', () => Object.values(se).every((el) => el.viewComponent != null));

  testBooleanAction('bundle-tree-structure-is-correct', () => {
    return (
      se.seBase0.viewComponent.parent == null &&
      se.seBase1.viewComponent.parent === se.seBase0.viewComponent &&
      se.seBase2.viewComponent.parent === se.seBase0.viewComponent &&
      se.seBase3.viewComponent.parent === se.seBase1.viewComponent
    );
  });

  // seBase4 sits inside seBase1 but declares ns="worker0": different namespace, so it must
  // not become a child — it is a root in its own environment
  testBooleanAction('bundle-cross-namespace-child-is-root', () => {
    return se.seBase4.ns === 'worker0' && se.seBase4.viewComponent.parent == null;
  });

  // --- BUNDLE-2: property elements parse their declared types -----------------------

  const propOf = (host, name) => host.querySelector(`shae-prop[name="${name}"]`);

  testBooleanAction('bundle-string-property-parsed', () => propOf(se.seBase0, 'foo').value === 'bar');

  testBooleanAction('bundle-boolean-property-parsed', () => propOf(se.seBase1, 'plah').value === false);

  testBooleanAction('bundle-number-array-property-parsed', () => {
    const value = propOf(se.seBase1, 'xyz').value;
    return Array.isArray(value) && value.length === 3 && value[0] === 1 && value[1] === 2 && value[2] === 3;
  });

  // --- BUNDLE-4: a real round-trip through the inlined worker -----------------------

  const workerCtx0 = byTestId('workerCtx0');

  await testAsyncAction('bundle-worker-env-ready', () => workerCtx0.shadowEnv.ready());

  await testAsyncAction('bundle-worker-import-module', () => workerCtx0.importScript('/mod-async-events.js'));

  const counted = [];
  on(se.seBase4.viewComponent, 'counted', (data) => counted.push(data));

  se.seBase4.token = 'counter';
  se.seBase4.insertAdjacentHTML('beforeend', '<shae-prop name="n" value="5" type="number"></shae-prop>');

  await testAsyncAction('bundle-worker-round-trip', async () => {
    await workerCtx0.shadowEnv.syncWait();
    await waitUntil('the bundled worker to answer', () => counted.some((c) => c.value === 5));
  });
}
