import {GlobalNS, ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {watchCustomEvent} from './test-helpers/testCustomEvent.js';

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

runTestSuite(main);

async function main() {
  const worker0 = document.getElementById('worker0');
  const worker1 = document.getElementById('worker1');

  // Subscribe before the first await: <shae-worker> dispatches "contextcreated" exactly once
  // and does not replay it, so a listener attached after the environment came up misses it.
  // worker0 autostarts, worker1 waits for the explicit start() below. The timeout only starts
  // where the event is awaited — see watchCustomEvent().
  const worker0ContextCreated = watchCustomEvent(worker0, ContextCreated);
  const worker1ContextCreated = watchCustomEvent(worker1, ContextCreated);

  await testAsyncAction('shae-worker-whenDefined', () => customElements.whenDefined('shae-worker'));

  // --- worker0 | remote | autostart -------------------------------------------------

  window.worker0 = worker0;
  console.log('shae-worker #worker0', worker0);

  const shadowEnv0 = worker0.shadowEnv;
  window.shadowEnv0 = shadowEnv0;
  console.log('shadowEnv0', shadowEnv0);

  testBooleanAction('worker0-ns', worker0.ns === GlobalNS);

  await testAsyncAction('worker0-is-remote-env', shadowEnv0.envProxy.workerLoaded);
  await worker0ContextCreated('worker0-env-contextCreated');
  await testAsyncAction('worker0-env-ready', shadowEnv0.ready);

  // --- worker1 | local | no-autostart ----------------------------------------------

  window.worker1 = worker1;
  console.log('shae-worker #worker1', worker1);

  const shadowEnv1 = worker1.shadowEnv;
  window.shadowEnv1 = shadowEnv1;
  console.log('shadowEnv1', shadowEnv1);

  worker1.start();

  testBooleanAction('worker1-ns', worker1.ns === 'local');
  testBooleanAction('worker1-is-local-env', shadowEnv1.envProxy.kernel != null);

  await worker1ContextCreated('worker1-env-contextCreated');
  await testAsyncAction('worker1-env-ready', shadowEnv1.ready);
}