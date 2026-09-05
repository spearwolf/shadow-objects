import {ComponentContext, LocalShadowObjectEnv, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

/**
 * Registers by name, refuses a duplicate the way Chromium does, and takes a tool back when its
 * signal aborts -- the platform's contract, minus the platform. That is what lets this page run
 * in all three engines; `model-context-platform.html` is where the real `document.modelContext`
 * is driven.
 */
const makeFakeModelContext = () => {
  const tools = new Map();
  return {
    tools,
    async registerTool(tool, options) {
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
};

/**
 * The five tools over one worker environment and one local environment, driven through a fake
 * model context. Every answer is asserted on the structured half; the text half is checked once
 * for the JSON it ends with.
 */
async function main() {
  const worker = new ShadowEnv();
  worker.view = ComponentContext.get('mc-worker');
  worker.envProxy = new RemoteWorkerEnv();

  const local = new ShadowEnv();
  local.view = ComponentContext.get('mc-local');
  local.envProxy = new LocalShadowObjectEnv();

  window.envs = {worker, local};

  await testAsyncAction('mc-envs-ready', () => Promise.all([worker.ready(), local.ready()]));
  await testAsyncAction('mc-envs-import-module', () =>
    Promise.all([worker.envProxy.importScript('/mod-hello.js'), local.envProxy.importScript('/mod-hello.js')]),
  );

  const build = (env) => {
    const foo = new ViewComponent('foo', {context: env.view});
    foo.setProperty('xyz', 123);
    const bar = new ViewComponent('bar', {parent: foo, context: env.view});
    bar.setProperty('plah', 666);
    return {foo, bar};
  };
  const tree = {worker: build(worker), local: build(local)};

  await testAsyncAction('mc-first-sync', () => Promise.all([worker.syncWait(), local.syncWait()]));

  const fake = makeFakeModelContext();
  let handle;
  await testAsyncAction('mc-expose-resolves', async () => {
    handle = await exposeShadowEnvsToModelContext({modelContext: fake});
  });
  window.handle = handle;

  const run = async (name, input = {}) => fake.tools.get(`shae-${name}`).execute(input);
  const data = (result) => result.structuredContent;

  testBooleanAction(
    'mc-expose-registers-five-tools',
    () =>
      handle.available === true &&
      handle.tools.join() === 'shae-list-envs,shae-get-entity-tree,shae-get-entity,shae-find-entities,shae-get-registry' &&
      fake.tools.size === 5 &&
      [...fake.tools.values()].every(
        (t) =>
          t.annotations.readOnlyHint === true && t.annotations.untrustedContentHint === true && t.inputSchema.type === 'object',
      ),
  );

  await testAsyncAction('mc-list-envs-names-both-environments', async () => {
    const result = await run('list-envs');
    const byNs = Object.fromEntries(data(result).envs.map((e) => [e.namespace, e]));
    if (byNs['mc-worker']?.kind !== 'worker') throw new Error(`mc-worker: ${JSON.stringify(byNs['mc-worker'])}`);
    if (byNs['mc-local']?.kind !== 'local') throw new Error(`mc-local: ${JSON.stringify(byNs['mc-local'])}`);
    for (const ns of ['mc-worker', 'mc-local']) {
      const env = byNs[ns];
      if (env.kernel?.counts?.entities !== 2) throw new Error(`${ns}: expected 2 entities, got ${JSON.stringify(env.kernel)}`);
      if (env.kernel.roots !== undefined || env.view?.roots !== undefined) throw new Error(`${ns}: list-envs must carry no tree`);
    }
    if (byNs['mc-worker'].kernel.thread !== 'worker') throw new Error('the worker snapshot was not taken in the worker');
    if (!result.content[0].text.includes('mc-worker (worker, ready, 2 entities)'))
      throw new Error(`summary: ${result.content[0].text}`);
  });

  await testAsyncAction('mc-get-entity-tree-crosses-the-wire', async () => {
    const result = await run('get-entity-tree', {namespace: 'mc-worker'});
    const {envs} = data(result);
    const env = envs[0];
    if (envs.length !== 1 || env.namespace !== 'mc-worker')
      throw new Error(`envs: ${JSON.stringify(envs.map((e) => e.namespace))}`);
    if (env.kernel?.thread !== 'worker') throw new Error(`thread: ${env.kernel?.thread}`);
    const root = env.kernel.roots[0];
    if (root?.uuid !== tree.worker.foo.uuid || root.token !== 'foo') throw new Error(`root: ${JSON.stringify(root)}`);
    if (root.children?.[0]?.uuid !== tree.worker.bar.uuid) throw new Error(`child: ${JSON.stringify(root.children)}`);
    if (env.view?.roots?.[0]?.uuid !== tree.worker.foo.uuid) throw new Error(`view: ${JSON.stringify(env.view)}`);
    if (root.shadowObjects?.[0]?.displayName !== 'foo') throw new Error(`shadow objects: ${JSON.stringify(root.shadowObjects)}`);
  });

  await testAsyncAction('mc-get-entity-tree-honours-limits', async () => {
    const result = await run('get-entity-tree', {namespace: 'mc-local', maxDepth: 0, include: ['props']});
    const env = data(result).envs[0];
    const root = env.kernel.roots[0];
    if (root.children !== undefined) throw new Error('maxDepth 0 must not walk the children');
    if (root.childCount !== 1) throw new Error(`childCount: ${root.childCount}`);
    if (root.shadowObjects !== undefined) throw new Error('include without shadowObjects must not carry them');
    if (!env.kernel.truncation?.some((n) => n.reason === 'max-depth' && n.uuid === tree.local.foo.uuid)) {
      throw new Error(`truncation: ${JSON.stringify(env.kernel.truncation)}`);
    }
  });

  await testAsyncAction('mc-get-entity-answers-with-ancestors', async () => {
    const result = await run('get-entity', {uuid: tree.worker.bar.uuid});
    const {matches} = data(result);
    if (matches.length !== 1) throw new Error(`matches: ${JSON.stringify(matches)}`);
    const [m] = matches;
    if (m.namespace !== 'mc-worker') throw new Error(`namespace: ${m.namespace}`);
    if (m.entity.uuid !== tree.worker.bar.uuid || m.entity.token !== 'bar')
      throw new Error(`entity: ${JSON.stringify(m.entity)}`);
    if (JSON.stringify(m.ancestors) !== JSON.stringify([{uuid: tree.worker.foo.uuid, token: 'foo'}])) {
      throw new Error(`ancestors: ${JSON.stringify(m.ancestors)}`);
    }
    if (m.view?.uuid !== tree.worker.bar.uuid) throw new Error(`view: ${JSON.stringify(m.view)}`);
  });

  await testAsyncAction('mc-find-entities-by-token', async () => {
    const result = await run('find-entities', {token: 'bar'});
    const {results} = data(result);
    const byNs = Object.fromEntries(results.map((r) => [r.namespace, r]));
    for (const ns of ['mc-worker', 'mc-local']) {
      const r = byNs[ns];
      if (r?.total !== 1 || r.matches.length !== 1) throw new Error(`${ns}: ${JSON.stringify(r)}`);
      if (r.matches[0].uuid !== tree[ns === 'mc-worker' ? 'worker' : 'local'].bar.uuid) throw new Error(`${ns}: wrong uuid`);
      if (r.matches[0].path.join('>') !== 'foo>bar') throw new Error(`${ns}: path ${JSON.stringify(r.matches[0].path)}`);
    }
  });

  await testAsyncAction('mc-find-entities-needs-a-criterion', async () => {
    const result = await run('find-entities', {namespace: 'mc-worker'});
    if (result.isError !== true) throw new Error(`expected an error result, got ${JSON.stringify(result)}`);
    if (!result.content[0].text.includes('at least one of')) throw new Error(`text: ${result.content[0].text}`);
  });

  await testAsyncAction('mc-get-registry-lists-foo', async () => {
    const result = await run('get-registry', {namespace: 'mc-worker'});
    const [entry] = data(result).registries;
    if (entry?.registry?.tokens?.foo?.[0] !== 'foo') throw new Error(`registry: ${JSON.stringify(entry)}`);
  });

  await testAsyncAction('mc-unknown-namespace-is-an-error', async () => {
    const result = await run('get-entity-tree', {namespace: 'nope'});
    if (result.isError !== true || !result.content[0].text.includes('"nope"')) throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mc-redaction-hides-a-property', async () => {
    const redacting = makeFakeModelContext();
    const redacted = await exposeShadowEnvsToModelContext({modelContext: redacting, toolPrefix: 'hidden-', redactProps: ['xyz']});
    try {
      const result = await redacting.tools.get('hidden-get-entity-tree').execute({namespace: 'mc-worker'});
      const env = data(result).envs[0];
      const byName = (props) => Object.fromEntries((props ?? []).map((p) => [p.name, JSON.stringify(p.value)]));
      const kernelProps = byName(env.kernel.roots[0].props);
      const viewProps = byName(env.view.roots[0].props);
      if (kernelProps.xyz !== '{"$type":"redacted"}' || viewProps.xyz !== '{"$type":"redacted"}') {
        throw new Error(`xyz not redacted: kernel ${kernelProps.xyz}, view ${viewProps.xyz}`);
      }
      const child = byName(env.kernel.roots[0].children[0].props);
      if (child.plah !== '666') throw new Error(`plah touched: ${child.plah}`);
    } finally {
      redacted.dispose();
    }
  });

  await testAsyncAction('mc-result-is-json-safe', async () => {
    const result = await run('get-entity-tree');
    const structured = result.structuredContent;
    if (JSON.stringify(JSON.parse(JSON.stringify(structured))) !== JSON.stringify(structured)) throw new Error('not JSON-safe');
    if (!result.content[0].text.endsWith(JSON.stringify(structured))) throw new Error('the text does not end with the JSON');
  });

  testBooleanAction('mc-dispose-takes-the-tools-back', () => {
    handle.dispose();
    handle.dispose();
    return fake.tools.size === 0;
  });
}
