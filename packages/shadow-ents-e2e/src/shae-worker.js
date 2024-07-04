import {GlobalNS, ShadowEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shae-ent.js';
import '@spearwolf/shadow-ents/shae-worker.js';
import './style.css';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {testCustomEvent} from './test-helpers/testCustomEvent.js';

const ContextCreated = ShadowEnv.ContextCreated.toLowerCase();

main();

async function main() {
  await testAsyncAction('shae-worker-whenDefined', () => customElements.whenDefined('shae-worker'));

  // --- worker0 | remote | autostart -------------------------------------------------

  const worker0 = document.getElementById('worker0');
  window.worker0 = worker0;
  console.log('shae-worker #worker0', worker0);

  const shadowEnv0 = worker0.shadowEnv;
  window.shadowEnv0 = shadowEnv0;
  console.log('shadowEnv0', shadowEnv0);

  testBooleanAction('worker0-ns', worker0.ns === GlobalNS);
  testAsyncAction('worker0-is-remote-env', shadowEnv0.envProxy.workerLoaded);

  await testAsyncAction('worker0-env-ready', shadowEnv0.ready);
  await testCustomEvent('worker0-env-contextCreated', worker0, ContextCreated);

  // --- worker1 | local | no-autostart ----------------------------------------------

  const worker1 = document.getElementById('worker1');
  window.worker1 = worker1;
  console.log('shae-worker #worker1', worker1);

  const shadowEnv1 = worker1.shadowEnv;
  window.shadowEnv1 = shadowEnv1;
  console.log('shadowEnv1', shadowEnv1);

  testCustomEvent('worker1-env-contextCreated', worker1, ContextCreated);

  worker1.start();

  testBooleanAction('worker1-ns', worker1.ns === 'local');
  testBooleanAction('worker1-is-local-env', shadowEnv1.envProxy.kernel != null);

  await testAsyncAction('worker1-env-ready', shadowEnv1.ready);
}
