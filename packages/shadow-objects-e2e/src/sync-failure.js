import {on} from '@spearwolf/eventize';
import {ChangeTrailRefusedError, ComponentChangeType, ShadowEnv, WorkerReportedError} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {watchCustomEvent} from './test-helpers/testCustomEvent.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const SyncFailed = ShadowEnv.SyncFailed.toLowerCase();
const ProxyFailed = ShadowEnv.ProxyFailed.toLowerCase();
const ContextLost = ShadowEnv.ContextLost.toLowerCase();

/** What `public/mod-refuse.js` throws. The reason has to carry it all the way to the view. */
const RefusalMessage = 'this shadow object refuses to be created';

/**
 * Every wait for the refusal is capped well below the deadlines the calls involved would otherwise
 * run into (60s for a configure), and deliberately below the 5s a change trail gets before its
 * confirmation window expires: a budget under that deadline is what separates the kernel's refusal
 * from a window that simply ran out. A page that only passes because it waited long enough would
 * prove the wrong mechanism.
 */
const FailureTimeout = 3000;

runTestSuite(main);

async function main() {
  const workerEl = document.getElementById('worker0');
  const shadowEnv = workerEl.shadowEnv;

  // Every counter and watcher is armed before the first `await`: the events they are about are
  // dispatched once and never replayed.

  let afterSyncCount = 0;
  on(shadowEnv, ShadowEnv.AfterSync, () => {
    afterSyncCount += 1;
  });

  // plain listeners, no budget: these two are the negative half of the page, and a case that
  // asserts an event did *not* happen has nothing to wait for
  let proxyFailedCount = 0;
  let contextLostCount = 0;
  workerEl.addEventListener(ProxyFailed, () => {
    proxyFailedCount += 1;
  });
  workerEl.addEventListener(ContextLost, () => {
    contextLostCount += 1;
  });

  const syncFailedEvent = watchCustomEvent(workerEl, SyncFailed);

  // a plain collector alongside the watcher above: `watchCustomEvent` unsubscribes once its wait is
  // over, and the second refusal further down needs the detail of a second event
  const syncFailedDetails = [];
  workerEl.addEventListener(SyncFailed, (event) => syncFailedDetails.push(event.detail));

  await testAsyncAction('sync-failure-env-ready', () => shadowEnv.ready());

  // awaited, not declared via `src`: both shadow objects have to be registered before the entities
  // arrive, otherwise the worker meets a token it has no definition for
  await testAsyncAction('sync-failure-modules-imported', () =>
    Promise.all([workerEl.importScript('/mod-hello.js'), workerEl.importScript('/mod-refuse.js')]),
  );

  const host = document.createElement('div');
  document.body.append(host);
  host.innerHTML = '<shae-ent id="survivor" token="foo"></shae-ent>';

  const survivor = document.getElementById('survivor');
  survivor.viewComponent.setProperty('xyz', 23);

  const hellos = [];
  const echoes = [];
  on(survivor.viewComponent, 'helloFromFoo', (data) => hellos.push(data));
  on(survivor.viewComponent, 'fooEcho', (data) => echoes.push(data));

  // the counter-check of this page: the road carries an entity to the worker and a message back
  // before anything on it breaks
  await testAsyncAction('sync-failure-healthy-cycle-first', async () => {
    await shadowEnv.syncWait();
    await waitUntil('the survivor to report in from the worker', () => hellos.length > 0);
  });

  const afterSyncBeforeRefusal = afterSyncCount;

  host.insertAdjacentHTML('beforeend', '<shae-ent id="refuser" token="refuser"></shae-ent>');

  // `syncWait()` has to stand in the same task as the DOM change: `ShaeElement` schedules a sync of
  // its own in a microtask whenever an element changes, and a trail that leaves on that route
  // carries no serial — the worker would then report the kernel's refusal to nobody waiting, and
  // the cycle would end as a success. Anything in between that gives the event loop a full turn
  // does exactly that, and the page would still be green while proving nothing.
  const refusedCycle = shadowEnv.syncWait().then(
    () => {
      throw new Error('expected syncWait() to reject, but it resolved');
    },
    // handled right here: a rejected promise nobody attached to becomes an unhandled rejection
    (error) => error,
  );

  const refusedUuid = document.getElementById('refuser').uuid;

  let refusedReason;

  await testAsyncAction(
    'sync-failure-syncwait-rejects',
    async () => {
      refusedReason = await refusedCycle;
      if (refusedReason == null) {
        throw new Error(`expected the rejection to carry a reason, got: ${refusedReason}`);
      }
    },
    FailureTimeout,
  );

  let failureDetail;

  await syncFailedEvent(
    'sync-failure-dom-event',
    // the check is also where the detail is kept: `watchCustomEvent` unsubscribes once the wait is
    // over, and the three cases behind this one assert on what the event carried
    (detail) => {
      failureDetail = detail;
      return true;
    },
    FailureTimeout,
  );

  testBooleanAction('sync-failure-reason-names-the-refusal', () => {
    if (failureDetail?.reason !== refusedReason) {
      throw new Error(`the event carried another reason than syncWait(): ${failureDetail?.reason}`);
    }
    if (!(refusedReason instanceof ChangeTrailRefusedError)) {
      throw new Error(`expected a ChangeTrailRefusedError, got: ${JSON.stringify(refusedReason)}`);
    }
    // Across a worker boundary the error object itself does not survive: the worker puts its
    // wording and its name on the wire (`MessageRouter.#onChangeTrail`) and the view builds a
    // `WorkerReportedError` from the two (`RemoteWorkerEnv.applyChangeTrail`). `mod-refuse.js`
    // throws a plain `Error`, so that is the name that arrives.
    if (!(refusedReason.cause instanceof WorkerReportedError)) {
      throw new Error(`expected the cause to be a WorkerReportedError, got: ${JSON.stringify(refusedReason.cause)}`);
    }
    if (refusedReason.cause.name !== 'Error' || !refusedReason.cause.message.includes(RefusalMessage)) {
      throw new Error(`expected the cause to name the refusal, got: ${refusedReason.cause.name}: ${refusedReason.cause.message}`);
    }
    // how far the kernel got before it stopped -- the entry that threw is not among them
    if (typeof refusedReason.appliedCount !== 'number' || refusedReason.appliedCount >= failureDetail.changeTrail.length) {
      throw new Error(`expected a count below the trail length, got: ${refusedReason.appliedCount}`);
    }
    return failureDetail.shadowEnv === shadowEnv;
  });

  testBooleanAction('sync-failure-detail-carries-the-lost-change-trail', () => {
    // this is what the event is for: whoever holds the trail knows what went missing
    const changeTrail = failureDetail?.changeTrail;
    if (!Array.isArray(changeTrail) || changeTrail.length === 0) {
      throw new Error(`expected a non-empty change trail, got: ${JSON.stringify(changeTrail)}`);
    }
    // the entry that wanted to create the refused entity, matched by both halves: the uuid alone
    // would also accept a property change or a destruction that happens to name the same entity
    return changeTrail.some((entry) => entry.type === ComponentChangeType.CreateEntities && entry.uuid === refusedUuid);
  });

  testBooleanAction('sync-failure-aftersync-did-not-fire', () => afterSyncCount === afterSyncBeforeRefusal);

  // the difference between this page and `worker-failure`: the worker is still standing
  testBooleanAction(
    'sync-failure-is-not-a-proxy-failure',
    () => proxyFailedCount === 0 && contextLostCount === 0 && shadowEnv.isReady && !shadowEnv.envProxy.isDestroyed,
  );

  // What the kernel did not apply is still owed to it, so the entry goes out again -- and while the
  // refuser is still in the DOM it meets the same refusal a second time.
  await testAsyncAction(
    'sync-failure-refused-entry-is-sent-again',
    async () => {
      const secondReason = await shadowEnv.syncWait().then(
        () => {
          throw new Error('expected the second syncWait() to reject, but it resolved');
        },
        (error) => error,
      );

      if (!(secondReason instanceof ChangeTrailRefusedError)) {
        throw new Error(`expected the second cycle to be refused as well, got: ${JSON.stringify(secondReason)}`);
      }

      await waitUntil('the second refusal to arrive as a DOM event', () => syncFailedDetails.length > 1);

      const changeTrail = syncFailedDetails[1]?.changeTrail ?? [];
      if (!changeTrail.some((entry) => entry.type === ComponentChangeType.CreateEntities && entry.uuid === refusedUuid)) {
        throw new Error(`the second trail did not carry the refused entity again: ${JSON.stringify(changeTrail)}`);
      }
    },
    FailureTimeout,
  );

  await testAsyncAction('sync-failure-environment-still-syncs', async () => {
    // the refused entity leaves first: its creation is still pending, and a trail carrying it again
    // would run into the same refusal -- as the case above just showed
    document.getElementById('refuser').remove();
    survivor.viewComponent.setProperty('xyz', 42);

    await shadowEnv.syncWait();
    await waitUntil('the survivor to echo the new value back', () => echoes.some((value) => value === 42));
  });
}