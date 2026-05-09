import {on, onceAsync} from '@spearwolf/eventize';
import {ComponentContext, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import './style.css';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

main();

async function main() {
  const shadowEnv = new ShadowEnv();
  shadowEnv.view = ComponentContext.get();
  shadowEnv.envProxy = new RemoteWorkerEnv();

  await testAsyncAction('auto-destruct-env-ready', async () => {
    await shadowEnv.ready();
  });

  await testAsyncAction('auto-destruct-import-module', async () => {
    await shadowEnv.envProxy.importScript('/mod-auto-destruct.js');
  });

  const parentVC = new ViewComponent('parent');

  let result;
  on(parentVC, 'autoDestructResult', (payload) => {
    result = payload;
  });

  await testAsyncAction('auto-destruct-result-arrived', async () => {
    await shadowEnv.sync();
    await onceAsync(parentVC, 'autoDestructResult');
  });

  testBooleanAction('auto-destruct-children-were-created', () => {
    return (
      result?.beforeDestroy?.flaggedCreated === true &&
      result?.beforeDestroy?.unflaggedCreated === true &&
      result?.beforeDestroy?.flaggedAlive === true &&
      result?.beforeDestroy?.unflaggedAlive === true
    );
  });

  testBooleanAction('auto-destruct-flagged-child-cascaded', () => {
    return result?.afterDestroy?.flaggedDestroyed === true && result?.afterDestroy?.flaggedAlive === false;
  });

  testBooleanAction('auto-destruct-unflagged-child-promoted-to-root', () => {
    return (
      result?.afterDestroy?.unflaggedDestroyed === false &&
      result?.afterDestroy?.unflaggedAlive === true &&
      result?.afterDestroy?.unflaggedHasParent === false
    );
  });
}