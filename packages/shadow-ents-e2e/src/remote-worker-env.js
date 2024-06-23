import {ComponentContext, RemoteWorkerEnv, ShadowEnv} from '@spearwolf/shadow-ents/core.js';
import './style.css';

main();

async function main() {
  const shadowEnv = new ShadowEnv();

  shadowEnv.view = ComponentContext.get();
  shadowEnv.envProxy = new RemoteWorkerEnv();

  window.shadowEnv = shadowEnv;
  console.log('shadowEnv', shadowEnv);

  try {
    await shadowEnv.ready();
    createTestNode('shadow-env-ready', 'ready');
  } catch (error) {
    createTestNode('shadow-env-ready', `${error}`);
  }

  try {
    await shadowEnv.envProxy.importScript('/mod-hello.js');
    createTestNode('import-script', 'success');
  } catch (error) {
    createTestNode('import-script', `${error}`);
  }
}

function createTestNode(id, text) {
  const node = document.createElement('article');
  node.id = id;
  node.classList.add('test-output');
  node.setAttribute('output', text);

  document.getElementById('tests').append(node);

  const dl = document.createElement('dl');

  const dt = document.createElement('dt');
  dt.textContent = id;

  const dd = document.createElement('dd');
  dd.textContent = text;

  node.append(dl);
  dl.append(dt, dd);

  return node;
}
