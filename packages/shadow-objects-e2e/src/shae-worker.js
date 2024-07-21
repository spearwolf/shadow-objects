import {GlobalNS, ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {testCustomEvent} from './test-helpers/testCustomEvent.js';

const ContextCreated = ShadowEnv.ContextCreated.toLowerCase();

class ElementWithShadowDom extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: this.getAttribute('mode') || 'open'});

    const insideId = this.getAttribute('ent-inside');
    const slotContainId = this.getAttribute('ent-slot-container');
    const ns = this.getAttribute('ns');

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1rem;
          border: 1px solid #c41;
        }
      </style>
      <shae-ent id="${insideId}" ns="${ns}" token="${insideId}">${insideId}</shae-ent>
      <shae-ent id="${slotContainId}" ns="${ns}" token="${slotContainId}">${slotContainId}
        <slot></slot>
      </shae-ent>
    `;
  }
}

customElements.define('element-with-shadow-dom', ElementWithShadowDom);

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

  await testCustomEvent('worker0-env-contextCreated', worker0, ContextCreated);
  await testAsyncAction('worker0-env-ready', shadowEnv0.ready);

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
