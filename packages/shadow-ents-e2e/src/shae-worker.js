import {GlobalNS} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shae-worker.js';
import './style.css';
import {testAsyncAction} from './testAsyncAction.js';
import {testBooleanAction} from './testBooleanAction.js';

main();

async function main() {
  const worker = document.getElementById('worker');

  window.worker = worker;
  console.log('shae-worker element', worker);

  await testAsyncAction('shae-worker-whenDefined', () => customElements.whenDefined('shae-worker'));

  const shadowEnv = worker.shadowEnv;
  window.shadowEnv = shadowEnv;
  console.log('shadowEnv', shadowEnv);

  testBooleanAction('shae-worker-ns', () => worker.ns === GlobalNS);

  await testAsyncAction('shadow-env-ready', async () => {
    await shadowEnv.ready();
  });
}
