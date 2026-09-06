import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

/**
 * Registers by name, refuses a duplicate the way Chromium does, and takes a tool back when its
 * signal aborts -- the platform's contract, minus the platform, installed on `document` before
 * the element definitions arrive so that the attribute finds it on upgrade.
 */
const makeFakeModelContext = () => {
  const tools = new Map();
  return {
    tools,
    registrations: 0,
    async registerTool(tool, options) {
      this.registrations += 1;
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
};

const fake = makeFakeModelContext();
// an own property shadows a native accessor, where Chromium ships one behind its flag
Object.defineProperty(document, 'modelContext', {value: fake, configurable: true, writable: true});

// the definitions come after the fake on purpose: static imports would be hoisted above the line above
await import('@spearwolf/shadow-objects/shae-ent.js');
await import('@spearwolf/shadow-objects/shae-prop.js');
await import('@spearwolf/shadow-objects/shae-worker.js');

runTestSuite(main);

/**
 * `<shae-worker expose-to-model-context>` over a real worker environment next to a local one
 * without the attribute, through a fake model context in all three engines: the attribute
 * exposes one environment, a second element joins the same registration, `redact-props`
 * cumulates across elements, and the last element out takes the tools back.
 */
async function main() {
  const exposed = document.getElementById('exposed');
  const silent = document.getElementById('silent');
  window.envs = {exposed, silent, fake};

  await testAsyncAction('mce-envs-ready', () => Promise.all([exposed.shadowEnv.ready(), silent.shadowEnv.ready()]));
  await testAsyncAction('mce-first-sync', () => Promise.all([exposed.shadowEnv.syncWait(), silent.shadowEnv.syncWait()]));

  let handle;
  await testAsyncAction('mce-exposure-resolves', async () => {
    handle = await exposed.modelContextExposure;
  });

  const run = async (name, input = {}) => fake.tools.get(`shae-${name}`).execute(input);
  const data = (result) => result.structuredContent;
  const namespaces = async () => data(await run('list-envs')).envs.map((e) => e.namespace);
  const nodeProps = (node) => Object.fromEntries(node.props.map((p) => [p.name, JSON.stringify(p.value)]));
  const treeOf = async (namespace) => data(await run('get-entity-tree', {namespace})).envs[0].kernel.roots[0];
  const REDACTED = '{"$type":"redacted"}';

  testBooleanAction(
    'mce-attribute-registers-five-tools',
    () => handle.available === true && handle.tools.length === 5 && fake.tools.size === 5 && fake.registrations === 5,
  );

  testBooleanAction('mce-element-without-attribute-has-no-exposure', () => silent.modelContextExposure === undefined);

  await testAsyncAction('mce-list-envs-names-only-the-exposed-environment', async () => {
    const names = await namespaces();
    if (names.join() !== 'mce-worker') throw new Error(`listed: ${JSON.stringify(names)}`);
    const env = data(await run('list-envs')).envs[0];
    if (env.kind !== 'worker' || env.kernel?.thread !== 'worker') throw new Error(JSON.stringify(env));
  });

  await testAsyncAction('mce-hidden-namespace-is-refused-like-an-unknown-one', async () => {
    const result = await run('get-entity-tree', {namespace: 'mce-local'});
    if (result.isError !== true) throw new Error(JSON.stringify(result));
    if (result.content[0].text !== 'no Shadow Environment holds the namespace "mce-local"')
      throw new Error(result.content[0].text);
  });

  await testAsyncAction('mce-redact-props-hides-the-value-across-the-wire', async () => {
    const root = await treeOf('mce-worker');
    const props = nodeProps(root);
    if (props.xyz !== REDACTED) throw new Error(`xyz: ${props.xyz}`);
    const child = nodeProps(root.children[0]);
    if (child.plah !== '666') throw new Error(`plah: ${child.plah}`);
  });

  await testAsyncAction('mce-second-element-joins-the-same-registration', async () => {
    silent.setAttribute('redact-props', 'plah');
    silent.setAttribute('expose-to-model-context', '');
    await silent.modelContextExposure;
    if (fake.registrations !== 5) throw new Error(`registered ${fake.registrations} times`);
    if (fake.tools.size !== 5) throw new Error(`tools: ${fake.tools.size}`);
    const names = await namespaces();
    if (names.join() !== 'mce-worker,mce-local') throw new Error(`listed: ${JSON.stringify(names)}`);
  });

  await testAsyncAction('mce-redaction-cumulates-across-elements', async () => {
    const child = nodeProps((await treeOf('mce-worker')).children[0]);
    if (child.plah !== REDACTED) throw new Error(`plah: ${child.plah}`);
  });

  await testAsyncAction('mce-removing-the-attribute-leaves-and-its-rule-goes-with-it', async () => {
    silent.removeAttribute('expose-to-model-context');
    if (silent.modelContextExposure !== undefined) throw new Error('still exposed');
    const names = await namespaces();
    if (names.join() !== 'mce-worker') throw new Error(`listed: ${JSON.stringify(names)}`);
    if (fake.tools.size !== 5) throw new Error('the first element must keep the tools');
    const child = nodeProps((await treeOf('mce-worker')).children[0]);
    if (child.plah !== '666') throw new Error(`plah still hidden: ${child.plah}`);
  });

  await testAsyncAction('mce-removing-the-last-element-takes-the-tools-back', async () => {
    exposed.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!exposed.isDestroyed) throw new Error('the element was not torn down');
    if (fake.tools.size !== 0) throw new Error(`still registered: ${[...fake.tools.keys()].join(', ')}`);
  });
}
