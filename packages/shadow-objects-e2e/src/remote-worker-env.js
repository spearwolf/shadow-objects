import {ComponentContext, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import './style.css';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

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

  await testAsyncAction('shadow-env-importScript', async () => {
    await shadowEnv.envProxy.importScript('/mod-hello.js');
  });

  testBooleanAction('shadow-env-isReady', shadowEnv.isReady);

  const foo = new ViewComponent('foo');
  foo.setProperty('xyz', 123);

  foo.on('helloFromFoo', (...args) => {
    console.log('HELLO', ...args);
  });

  const bar = new ViewComponent('bar', {parent: foo});
  bar.setProperty('plah', 666);

  await testAsyncAction('shadow-env-1st-sync', async () => {
    await shadowEnv.sync();
  });

  await testAsyncAction('shadow-env-hello', async () => {
    await foo.onceAsync('helloFromFoo');
  });
}
