import {ComponentContext, RemoteWorkerEnv, ShadowEnv} from '@spearwolf/shadow-ents';
import './style.css';
import {testAsyncAction} from './testAsyncAction.js';
import {testBooleanAction} from './testBooleanAction.js';

main();

async function main() {
  const shadowEnv = new ShadowEnv();

  shadowEnv.view = ComponentContext.get();
  shadowEnv.envProxy = new RemoteWorkerEnv();

  window.shadowEnv = shadowEnv;
  console.log('shadowEnv', shadowEnv);

  await testAsyncAction('shadow-env-ready', async () => {
    await shadowEnv.ready();
  });

  await testAsyncAction('shadow-env-import-script', async () => {
    await shadowEnv.envProxy.importScript('/mod-hello.js');
  });

  testBooleanAction('shadow-env-isReady', shadowEnv.isReady);
}
