import {ComponentContext, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

/**
 * The tools on the real `document.modelContext`. Chromium's implementation, behind
 * `--enable-features=WebMCP`: `getTools()` lists registered tools, `executeTool()` takes one of
 * those objects and the input as a JSON string and answers with the envelope as a JSON string in
 * turn, and a tool taken back by its signal is gone from the list. Nothing here is asserted about
 * how the platform renders a result to an agent -- only that the round trip through the platform
 * reaches the tools and comes back with the envelope. A `<shae-worker expose-to-model-context>`
 * stands next to the function call on this page: both are shares of one registration, and the
 * platform sees one set of tools.
 */
async function main() {
  const env = new ShadowEnv();
  env.view = ComponentContext.get('mc-platform');
  env.envProxy = new RemoteWorkerEnv();
  await env.ready();
  await env.envProxy.importScript('/mod-hello.js');
  const foo = new ViewComponent('foo', {context: env.view});
  foo.setProperty('xyz', 123);
  const bar = new ViewComponent('bar', {parent: foo, context: env.view});
  await env.syncWait();

  const element = document.getElementById('element');
  await element.shadowEnv.ready();
  await element.shadowEnv.syncWait();
  await testAsyncAction('mcp-element-share-resolves', async () => {
    const share = await element.modelContextExposure;
    if (share.available !== true || share.tools.length !== 5) throw new Error(JSON.stringify(share));
  });

  let handle;
  await testAsyncAction('mcp-expose-resolves', async () => {
    handle = await exposeShadowEnvsToModelContext();
  });

  testBooleanAction('mcp-model-context-is-available', () => handle.available === true && handle.tools.length === 5);

  const mc = document.modelContext;
  const registered = async (name) => (await mc.getTools()).find((t) => t.name === name);
  // `executeTool()` answers the way it is asked: the input crosses as a JSON string
  // (`JSON.stringify(input)` above), and on this Chromium build the result crosses back the same
  // way, as a JSON string, not the parsed envelope -- measured directly against Chromium 151, the
  // same build the module-level comment names.
  const execute = async (name, input) => JSON.parse(await mc.executeTool(await registered(name), JSON.stringify(input)));

  await testAsyncAction('mcp-tools-are-listed-by-the-platform', async () => {
    const names = (await mc.getTools()).map((t) => t.name);
    for (const name of handle.tools) {
      if (!names.includes(name)) throw new Error(`${name} missing from ${JSON.stringify(names)}`);
      const tool = await registered(name);
      if (tool.annotations?.readOnlyHint !== true || tool.annotations?.untrustedContentHint !== true) {
        throw new Error(`${name}: annotations ${JSON.stringify(tool.annotations)}`);
      }
    }
    const shae = (await mc.getTools()).filter((t) => t.name.startsWith('shae-'));
    if (shae.length !== 5) throw new Error(`${shae.length} shae- tools on the platform, one registration expected`);
  });

  await testAsyncAction('mcp-list-envs-executes-through-the-platform', async () => {
    const result = await execute('shae-list-envs', {});
    const env0 = result?.structuredContent?.envs?.find((e) => e.namespace === 'mc-platform');
    if (env0?.kind !== 'worker' || env0.kernel?.counts?.entities !== 2) throw new Error(JSON.stringify(result));
    if (!result.structuredContent.envs.some((e) => e.namespace === 'mcp-element')) {
      throw new Error('the element environment is missing');
    }
  });

  await testAsyncAction('mcp-get-entity-tree-executes-through-the-platform', async () => {
    const result = await execute('shae-get-entity-tree', {namespace: 'mc-platform', maxDepth: 1});
    const root = result?.structuredContent?.envs?.[0]?.kernel?.roots?.[0];
    if (root?.uuid !== foo.uuid || root.children?.[0]?.uuid !== bar.uuid) throw new Error(JSON.stringify(result));
    if (result.structuredContent.envs[0].kernel.thread !== 'worker') throw new Error('not taken in the worker');
  });

  await testAsyncAction('mcp-find-entities-executes-through-the-platform', async () => {
    const result = await execute('shae-find-entities', {token: 'bar'});
    const entry = result?.structuredContent?.results?.find((r) => r.namespace === 'mc-platform');
    if (entry?.total !== 1 || entry.matches[0]?.path.join('>') !== 'foo>bar') throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mcp-a-refusal-comes-back-as-an-error-result', async () => {
    const result = await execute('shae-get-entity-tree', {namespace: 'nope'});
    if (result?.isError !== true || !result.content?.[0]?.text.includes('"nope"')) throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mcp-dispose-leaves-the-element-share-standing', async () => {
    handle.dispose();
    const names = (await mc.getTools()).map((t) => t.name).filter((n) => n.startsWith('shae-'));
    if (names.length !== 5) throw new Error(`after dispose: ${names.join(', ')}`);
    const result = await execute('shae-list-envs', {});
    const listed = result?.structuredContent?.envs?.map((e) => e.namespace) ?? [];
    if (listed.join() !== 'mcp-element') throw new Error(`listed: ${JSON.stringify(listed)}`);
    const tree = await execute('shae-get-entity-tree', {namespace: 'mcp-element'});
    const xyz = tree?.structuredContent?.envs?.[0]?.kernel?.roots?.[0]?.props?.find((p) => p.name === 'xyz');
    if (JSON.stringify(xyz?.value) !== '{"$type":"redacted"}') throw new Error(`xyz: ${JSON.stringify(xyz)}`);
  });

  await testAsyncAction('mcp-removing-the-element-takes-the-tools-off-the-platform', async () => {
    element.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const left = (await mc.getTools()).map((t) => t.name).filter((n) => n.startsWith('shae-'));
    if (left.length > 0) throw new Error(`still registered: ${left.join(', ')}`);
  });
}
