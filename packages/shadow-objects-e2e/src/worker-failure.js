import {on} from '@spearwolf/eventize';
import {RemoteWorkerEnv, ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {watchCustomEvent} from './test-helpers/testCustomEvent.js';

const ProxyFailed = ShadowEnv.ProxyFailed.toLowerCase();
const ContextLost = ShadowEnv.ContextLost.toLowerCase();

/**
 * Every wait for the failure is capped well below the timeouts the calls involved would
 * otherwise run into (5s for a change trail, 60s for a configure). A page that only passes
 * because it waited long enough would prove the opposite of what is under test here.
 */
const FailureTimeout = 3000;

runTestSuite(main);

async function main() {
  const workerEl = document.getElementById('worker0');
  const shadowEnv = workerEl.shadowEnv;

  window.shadowEnv = shadowEnv;

  // armed before anything is awaited: both events are dispatched exactly once
  const proxyFailedEvent = watchCustomEvent(workerEl, ProxyFailed);
  const contextLostEvent = watchCustomEvent(workerEl, ContextLost);

  const failureReason = new Promise((resolve) => {
    on(shadowEnv, ShadowEnv.ProxyFailed, resolve);
  });

  await testAsyncAction('worker-failure-env-ready', () => shadowEnv.ready());

  // awaited, not declared via `src`: the shadow object has to be registered before the
  // entity arrives, otherwise the worker meets a token it has no definition for
  await testAsyncAction('worker-failure-import-module', () => workerEl.importScript('/mod-crash.js'));

  // the markup path, not document.createElement — see KNOWN-DEFECTS.md
  const host = document.createElement('div');
  document.body.append(host);
  host.innerHTML = '<shae-ent token="crasher"></shae-ent>';

  await testAsyncAction('worker-failure-entity-reached-the-worker', () => shadowEnv.syncWait());

  await proxyFailedEvent('worker-failure-proxyfailed-dom-event', undefined, FailureTimeout);
  await contextLostEvent('worker-failure-contextlost-dom-event', undefined, FailureTimeout);

  await testAsyncAction(
    'worker-failure-reason-is-a-worker-failed-error',
    async () => {
      const reason = await failureReason;
      if (reason?.name !== 'WorkerFailedError') {
        throw new Error(`expected a WorkerFailedError, got: ${reason?.name ?? reason}`);
      }
    },
    FailureTimeout,
  );

  testBooleanAction('worker-failure-env-is-not-ready', !shadowEnv.isReady);
  testBooleanAction('worker-failure-proxy-is-destroyed', shadowEnv.envProxy.isDestroyed);

  await testAsyncAction(
    'worker-failure-later-call-rejects-right-away',
    async () => {
      const failedProxy = shadowEnv.envProxy;
      const reason = await failedProxy.applyChangeTrail([], true).then(
        () => {
          throw new Error('expected applyChangeTrail to reject, but it resolved');
        },
        (error) => error,
      );
      if (reason?.name !== 'WorkerFailedError') {
        throw new Error(`expected a WorkerFailedError, got: ${reason?.name ?? reason}`);
      }
    },
    FailureTimeout,
  );

  // the documented way back: a new proxy rebuilds the view from the component memory.
  // The crashing entity goes first — otherwise the fresh worker meets the same shadow
  // object and dies the same death.
  host.innerHTML = '';

  await testAsyncAction(
    'worker-failure-recovers-with-a-new-proxy',
    async () => {
      shadowEnv.envProxy = new RemoteWorkerEnv();
      await shadowEnv.ready();
      await shadowEnv.envProxy.importScript('/mod-hello.js');
    },
    10000,
  );

  testBooleanAction('worker-failure-env-is-ready-again', shadowEnv.isReady);
}