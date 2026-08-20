import {on} from '@spearwolf/eventize';
import {RemoteWorkerEnv, ShadowEnv} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {watchCustomEvent} from './test-helpers/testCustomEvent.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const ProxyFailed = ShadowEnv.ProxyFailed.toLowerCase();
const ContextLost = ShadowEnv.ContextLost.toLowerCase();

/**
 * Every wait for the failure is capped well below the timeouts the calls involved would
 * otherwise run into (5s for a change trail, 60s for a configure). A page that only passes
 * because it waited long enough would prove the opposite of what is under test here.
 */
const FailureTimeout = 3000;

/**
 * How long the survivor's `helloFromFoo` may take to travel back from the fresh worker. It caps the
 * poll and nothing else: the worker start and the module import belong to the preceding test id and
 * its own budget, and the sync is awaited before the poll begins. Generous where
 * {@link FailureTimeout} is deliberately tight — an abort condition, not an assertion about speed.
 */
const RecoveryTimeout = 5000;

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
  host.innerHTML = '<shae-ent id="survivor" token="foo"></shae-ent><shae-ent id="crasher" token="crasher"></shae-ent>';

  const survivor = document.getElementById('survivor');
  survivor.viewComponent.setProperty('xyz', 23);

  // `mod-hello.js` reaches the second worker only, so every `helloFromFoo` that ever
  // arrives on this page was produced after the recovery
  const hellos = [];
  on(survivor.viewComponent, 'helloFromFoo', (data) => hellos.push(data));

  // This cycle waits for a confirmation, and two messages from the same dying worker race for it:
  // the worker posts the confirmation of the change trail synchronously after `kernel.run()`, while
  // the crashing shadow object defers its throw by a task — so the confirmation arrives first and
  // this cycle resolves. The other outcome of that race is let through rather than asserted away:
  // that the entity reached the worker is proven further down anyway, where the worker dies of the
  // shadow object it built from it, and a page about a dying worker must not hinge on which of its
  // last two messages lands first. Any other reason is a real failure and stays red.
  await testAsyncAction('worker-failure-entity-sync-settles', () =>
    shadowEnv.syncWait().catch((error) => {
      if (error?.name !== 'WorkerFailedError') throw error;
    }),
  );

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

  // the documented way back: a new proxy restores the entities from the component memory.
  // Only the crashing entity goes — otherwise the fresh worker meets the same shadow
  // object and dies the same death. The survivor stays where it is, untouched.
  document.getElementById('crasher').remove();

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

  await testAsyncAction(
    'worker-failure-survivor-is-recreated-in-the-new-worker',
    async () => {
      await shadowEnv.syncWait();
      await waitUntil('the survivor to report in from the new worker', () => hellos.length > 0, RecoveryTimeout);
      if (hellos[0]?.xyz !== 23) {
        throw new Error(`expected the property to survive as xyz=23, got: ${JSON.stringify(hellos[0])}`);
      }
    },
    10000,
  );
}