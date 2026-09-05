import {ComponentContext, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

/**
 * `ShadowEnv.inspect()` over a real worker: the request crosses the boundary as an `Inspect`
 * message, the snapshot comes back as `Inspected`, and both survive structured cloning. The unit
 * spec proves the same against a fake worker; this page is where the wire is real.
 */
async function main() {
  const shadowEnv = new ShadowEnv();
  shadowEnv.view = ComponentContext.get();
  shadowEnv.envProxy = new RemoteWorkerEnv();
  window.shadowEnv = shadowEnv;

  await testAsyncAction('inspect-env-ready', () => shadowEnv.ready());
  await testAsyncAction('inspect-importScript', () => shadowEnv.envProxy.importScript('/mod-hello.js'));

  const foo = new ViewComponent('foo');
  foo.setProperty('xyz', 123);
  const bar = new ViewComponent('bar', {parent: foo});
  bar.setProperty('plah', 666);

  // the picture reflects what the Kernel has applied, so the cycle goes first
  await testAsyncAction('inspect-first-sync', () => shadowEnv.syncWait());

  let snapshot;
  await testAsyncAction('inspect-answers', async () => {
    snapshot = await shadowEnv.inspect();
  });
  window.snapshot = snapshot;
  console.log('snapshot', snapshot);

  const kernelFoo = snapshot?.kernel?.roots?.[0];
  const viewFoo = snapshot?.view?.roots?.[0];

  testBooleanAction('inspect-kind-is-worker', () => snapshot.kind === 'worker' && snapshot.error === undefined);
  testBooleanAction('inspect-kernel-was-built-in-the-worker', () => snapshot.kernel?.thread === 'worker');

  testBooleanAction(
    'inspect-view-and-kernel-agree',
    () =>
      snapshot.kernel?.roots.length === 1 &&
      snapshot.view?.roots.length === 1 &&
      kernelFoo.uuid === foo.uuid &&
      viewFoo.uuid === foo.uuid &&
      kernelFoo.token === 'foo' &&
      kernelFoo.children?.length === 1 &&
      kernelFoo.children[0].uuid === bar.uuid &&
      kernelFoo.children[0].token === 'bar' &&
      viewFoo.children?.[0]?.uuid === bar.uuid,
  );

  testBooleanAction('inspect-props-crossed-the-wire', () => {
    const byName = (node) => Object.fromEntries((node?.props ?? []).map(({name, value, routes}) => [name, [value, routes]]));
    return (
      JSON.stringify(byName(kernelFoo)) === JSON.stringify({xyz: [123, true]}) &&
      JSON.stringify(byName(kernelFoo?.children?.[0])) === JSON.stringify({plah: [666, true]})
    );
  });

  testBooleanAction('inspect-shadow-objects-are-described', () => {
    const so = kernelFoo?.shadowObjects?.[0];
    return so?.displayName === 'foo' && so.definedUnder.join() === 'foo' && so.usesProperties.join() === 'xyz';
  });

  testBooleanAction(
    'inspect-registry-crossed-the-wire',
    () => Array.isArray(snapshot.kernel?.registry?.tokens?.foo) && snapshot.kernel.registry.tokens.foo[0] === 'foo',
  );

  testBooleanAction(
    'inspect-snapshot-is-json-safe',
    () => JSON.stringify(JSON.parse(JSON.stringify(snapshot))) === JSON.stringify(snapshot),
  );

  await testAsyncAction('inspect-honours-the-request', async () => {
    const shallow = await shadowEnv.inspect({maxDepth: 0, include: ['props']});
    const root = shallow.kernel?.roots?.[0];
    if (root?.children !== undefined) throw new Error('maxDepth 0 must not walk the children');
    if (root?.childCount !== 1) throw new Error(`childCount should be 1, got ${root?.childCount}`);
    if (root?.shadowObjects !== undefined) throw new Error('an include without shadowObjects must not carry them');
    if (!shallow.kernel?.truncation?.some((note) => note.reason === 'max-depth' && note.uuid === foo.uuid)) {
      throw new Error(`no max-depth note for ${foo.uuid}: ${JSON.stringify(shallow.kernel?.truncation)}`);
    }
  });

  await testAsyncAction('inspect-aborted-signal-rejects-with-its-reason', async () => {
    const reason = new Error('the caller gave up');
    const controller = new AbortController();
    const pending = shadowEnv.inspect({}, controller.signal);
    controller.abort(reason);
    const outcome = await pending.then(
      () => 'resolved',
      (error) => error,
    );
    if (outcome !== reason) throw new Error(`expected the abort reason, got ${outcome}`);
  });

  // the proxy is taken before the teardown: a destroyed ShadowEnv is frozen
  const proxy = shadowEnv.envProxy;
  shadowEnv.destroy();

  await testAsyncAction('inspect-after-destroy-rejects', async () => {
    const outcome = await proxy.inspect({}).then(
      () => 'resolved',
      (error) => error?.name,
    );
    if (outcome !== 'WorkerDestroyedError') throw new Error(`expected WorkerDestroyedError, got ${outcome}`);
  });
}
