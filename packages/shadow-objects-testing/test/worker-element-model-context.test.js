import {expect} from '@esm-bundle/chai';
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `<shae-worker expose-to-model-context>` built from markup, in real Chromium: the parser
 * upgrades the element with the attribute already there, the environment it exposes is the one
 * its `<shae-ent>` children join, and the `<shae-prop>` values reach the agent -- redacted
 * where `redact-props` says so. A fake `document.modelContext` stands in for the platform; the
 * function that sits under the attribute is proven against Chromium's real one in the e2e
 * package.
 */
const installFakeModelContext = () => {
  const tools = new Map();
  const fake = {
    tools,
    registrations: 0,
    async registerTool(tool, options) {
      fake.registrations += 1;
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
  Object.defineProperty(document, 'modelContext', {value: fake, configurable: true, writable: true});
  return fake;
};

const run = async (fake, name, input = {}) => (await fake.tools.get(`shae-${name}`).execute(input)).structuredContent;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const R = {$type: 'redacted'};

describe('<shae-worker expose-to-model-context> from markup', () => {
  let fake;

  beforeEach(() => {
    fake = installFakeModelContext();
  });

  afterEach(async () => {
    unmountAll();
    // the teardown of a removed element -- and with it its leave -- is one microtask away
    await settle();
    delete document.modelContext;
  });

  const mountPage = async () => {
    const container = mount(`
      <shae-worker id="shown" ns="mc-shown" local auto-sync="off" expose-to-model-context redact-props="secret"></shae-worker>
      <shae-worker id="hidden" ns="mc-hidden" local auto-sync="off"></shae-worker>
      <shae-ent ns="mc-shown" token="root">
        <shae-prop name="title" value="hello"></shae-prop>
        <shae-prop name="secret" value="hunter2"></shae-prop>
      </shae-ent>
      <shae-ent ns="mc-hidden" token="root">
        <shae-prop name="secret" value="hunter3"></shae-prop>
      </shae-ent>
    `);
    const shown = container.querySelector('#shown');
    const hidden = container.querySelector('#hidden');
    await Promise.all([shown.shadowEnv.ready(), hidden.shadowEnv.ready()]);
    await Promise.all([shown.shadowEnv.syncWait(), hidden.shadowEnv.syncWait()]);
    const handle = await shown.modelContextExposure;
    return {container, shown, hidden, handle};
  };

  const propsOf = async (namespace) => {
    const {envs} = await run(fake, 'get-entity-tree', {namespace});
    return Object.fromEntries(envs[0].kernel.roots[0].props.map((p) => [p.name, p.value]));
  };
  const namespaces = async () => (await run(fake, 'list-envs')).envs.map((e) => e.namespace);

  it('registers the five tools for the element that carries the attribute, and only its environment is listed', async () => {
    const {hidden, handle} = await mountPage();

    expect(handle.available).to.be.true;
    expect(handle.tools).to.have.lengthOf(5);
    expect(hidden.modelContextExposure).to.be.undefined;

    const {envs} = await run(fake, 'list-envs');
    expect(envs.map((e) => e.namespace)).to.eql(['mc-shown']);
    expect(envs[0].kernel.counts.entities).to.equal(1);
  });

  it('answers with the <shae-prop> values, the redacted one hidden, and refuses the hidden namespace as unknown', async () => {
    await mountPage();

    expect(await propsOf('mc-shown')).to.eql({title: 'hello', secret: R});

    const refused = await fake.tools.get('shae-get-entity-tree').execute({namespace: 'mc-hidden'});
    expect(refused.isError).to.be.true;
    expect(refused.content[0].text).to.equal('no Shadow Environment holds the namespace "mc-hidden"');
  });

  it('a second element joins the same registration, and its redact-props apply to the first one too', async () => {
    const {shown, hidden} = await mountPage();

    hidden.setAttribute('redact-props', 'title');
    hidden.setAttribute('expose-to-model-context', '');
    await hidden.modelContextExposure;
    expect(fake.registrations, 'registered once').to.equal(5);
    expect(fake.tools.size).to.equal(5);

    expect(await namespaces()).to.eql(['mc-shown', 'mc-hidden']);
    expect(await propsOf('mc-shown'), 'the union of both lists').to.eql({title: R, secret: R});
    expect(await propsOf('mc-hidden')).to.eql({secret: R});

    hidden.removeAttribute('expose-to-model-context');
    expect(await namespaces()).to.eql(['mc-shown']);
    expect(await propsOf('mc-shown'), 'title came back with the share that hid it').to.eql({title: 'hello', secret: R});
    expect(shown.modelContextExposure, 'the first one stays').to.not.be.undefined;
  });

  it('the function joins the element: everything visible while its share lasts, the element alone afterwards', async () => {
    await mountPage();

    const all = await exposeShadowEnvsToModelContext({redactProps: ['title']});
    expect(fake.registrations).to.equal(5);
    expect(await namespaces()).to.eql(['mc-shown', 'mc-hidden']);
    expect(await propsOf('mc-hidden'), "the element's secret rule reaches the environment the function exposed").to.eql({
      secret: R,
    });
    expect(await propsOf('mc-shown')).to.eql({title: R, secret: R});

    all.dispose();
    expect(await namespaces()).to.eql(['mc-shown']);
    expect(await propsOf('mc-shown')).to.eql({title: 'hello', secret: R});
    expect(fake.tools.size).to.equal(5);
  });

  it('removing the last exposing element from the document takes the tools back', async () => {
    const {shown} = await mountPage();
    expect(fake.tools.size).to.equal(5);

    shown.remove();
    await settle();
    expect(shown.isDestroyed).to.be.true;
    expect(fake.tools.size).to.equal(0);
  });
});
