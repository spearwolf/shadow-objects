import {GlobalNS} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shae-worker.js';
import './style.css';
import {testAsyncAction} from './testAsyncAction.js';
import {testBooleanAction} from './testBooleanAction.js';

main();

async function main() {
  const worker0 = document.getElementById('worker0');
  window.worker0 = worker0;
  console.log('shae-worker #worker0', worker0);

  await testAsyncAction('shae-worker-whenDefined', () => customElements.whenDefined('shae-worker'));

  const shadowEnv0 = worker0.shadowEnv;
  window.shadowEnv0 = shadowEnv0;
  console.log('shadowEnv0', shadowEnv0);

  testBooleanAction('worker0-ns', () => worker0.ns === GlobalNS);
  testAsyncAction('worker0-is-remote-env', () => shadowEnv0.envProxy.workerLoaded);

  await testAsyncAction('worker0-env-ready', async () => {
    await shadowEnv0.ready();
  });

  const worker1 = document.getElementById('worker1');
  const shadowEnv1 = worker1.shadowEnv;
  window.shadowEnv1 = shadowEnv1;
  console.log('shadowEnv1', shadowEnv1);

  testBooleanAction('worker1-ns', () => worker1.ns === 'local');
  testBooleanAction('worker1-is-local-env', () => shadowEnv1.envProxy.kernel != null);

  await testAsyncAction('worker1-env-ready', async () => {
    await shadowEnv1.ready();
  });
}
