import {ComponentContext, RemoteWorkerEnv, ShadowEnv} from '@spearwolf/shadow-ents/core.js';
import './style.css';
import {testAsyncAction} from './testAsyncAction.js';

main();

async function main() {
  const shadowEnv = new ShadowEnv();

  shadowEnv.view = ComponentContext.get();
  shadowEnv.envProxy = new RemoteWorkerEnv();

  window.shadowEnv = shadowEnv;
  console.log('shadowEnv', shadowEnv);

  testAsyncAction('shadow-env-ready', async () => {
    await shadowEnv.ready();
  });

  testAsyncAction('shadow-env-import-script', async () => {
    await shadowEnv.envProxy.importScript('/mod-hello.js');
  });
}
