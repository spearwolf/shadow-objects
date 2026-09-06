import {afterEach, describe, expect, it} from 'vitest';
import '../shae-ent.js';
import '../shae-prop.js';
import '../shae-worker.js';
import {exposeShadowEnvsToModelContext} from '../model-context/exposeShadowEnvsToModelContext.js';
import type {ModelContextLike, ModelContextToolLike, ModelContextToolResult} from '../model-context/ModelContextLike.js';
import {ATTR_EXPOSE_TO_MODEL_CONTEXT, ATTR_REDACT_PROPS, SHAE_WORKER} from './constants.js';
import type {ShaeWorkerElement} from './ShaeWorkerElement.js';

interface FakeModelContext extends ModelContextLike {
  tools: Map<string, ModelContextToolLike>;
  registrations: number;
}

const installFakeModelContext = (): FakeModelContext => {
  const tools = new Map<string, ModelContextToolLike>();
  const fake: FakeModelContext = {
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

let counter = 0;
const nextNs = () => `worker-mc-${counter++}`;

const mounted: ShaeWorkerElement[] = [];

/** A local, non-syncing element that is started by hand: the exposure is what is under test. */
const mount = (attributes: string): ShaeWorkerElement => {
  const host = document.createElement('div');
  host.innerHTML = `<${SHAE_WORKER} local auto-sync="no" no-autostart ${attributes}></${SHAE_WORKER}>`;
  document.body.append(host);
  const el = host.querySelector(SHAE_WORKER) as ShaeWorkerElement;
  mounted.push(el);
  return el;
};

const execute = async (fake: FakeModelContext, name: string, input: object = {}): Promise<any> =>
  ((await fake.tools.get(name)!.execute(input)) as ModelContextToolResult).structuredContent;

const listed = async (fake: FakeModelContext): Promise<string[]> =>
  (await execute(fake, 'shae-list-envs')).envs.map((e: any) => e.namespace);

describe('<shae-worker expose-to-model-context>', () => {
  afterEach(() => {
    for (const el of mounted.splice(0)) {
      el.destroy();
      el.parentElement?.remove();
    }
    delete (document as {modelContext?: unknown}).modelContext;
  });

  it('joins on connect and hands the handle out; redact-props reads as a list', async () => {
    const fake = installFakeModelContext();
    const el = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT} ${ATTR_REDACT_PROPS}="token, email"`);

    const handle = await el.modelContextExposure;
    expect(handle).toMatchObject({available: true});
    expect(handle?.tools).toHaveLength(5);
    expect(fake.tools.size).toBe(5);
    expect(el.redactProps).toEqual(['token', 'email']);
  });

  it('exposes nothing without the attribute, and reads a falsy value as its absence', async () => {
    const fake = installFakeModelContext();
    const plain = mount(`ns="${nextNs()}"`);
    const off = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}="false"`);

    expect(plain.modelContextExposure).toBeUndefined();
    expect(off.modelContextExposure).toBeUndefined();
    expect(fake.tools.size).toBe(0);
    expect(plain.redactProps).toEqual([]);
  });

  it('setting the attribute later joins, removing it leaves and takes the tools back', async () => {
    const fake = installFakeModelContext();
    const el = mount(`ns="${nextNs()}"`);
    expect(el.modelContextExposure).toBeUndefined();

    el.setAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT, '');
    await el.modelContextExposure;
    expect(fake.tools.size).toBe(5);

    el.removeAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT);
    expect(el.modelContextExposure).toBeUndefined();
    expect(fake.tools.size, 'the last share out takes the tools back at once').toBe(0);
  });

  it('exposes its own environment only; two elements share one registration; a destroyed one leaves', async () => {
    const fake = installFakeModelContext();
    const nsA = nextNs();
    const nsB = nextNs();
    const nsC = nextNs();
    const a = mount(`ns="${nsA}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    const b = mount(`ns="${nsB}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    const c = mount(`ns="${nsC}"`);
    await Promise.all([a.start(), b.start(), c.start()]);
    await Promise.all([a.modelContextExposure, b.modelContextExposure]);

    expect(fake.registrations, 'registered once').toBe(5);
    expect(await listed(fake)).toEqual([nsA, nsB]);

    a.destroy();
    expect(await listed(fake)).toEqual([nsB]);
    expect(fake.tools.size).toBe(5);

    b.destroy();
    expect(fake.tools.size).toBe(0);
  });

  it('plays together with the function: whichever comes first, the union is what the agent sees', async () => {
    const fake = installFakeModelContext();
    const nsA = nextNs();
    const nsB = nextNs();
    const a = mount(`ns="${nsA}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT} ${ATTR_REDACT_PROPS}="token"`);
    const b = mount(`ns="${nsB}"`);
    await Promise.all([a.start(), b.start()]);
    await a.modelContextExposure;
    expect(await listed(fake), 'the element alone').toEqual([nsA]);

    const all = await exposeShadowEnvsToModelContext({redactProps: ['email']});
    expect(fake.registrations, 'the function joined').toBe(5);
    expect(await listed(fake), 'the function exposes everything').toEqual([nsA, nsB]);

    all.dispose();
    expect(await listed(fake), 'the element keeps its share').toEqual([nsA]);
    expect(fake.tools.size).toBe(5);

    a.removeAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT);
    expect(fake.tools.size).toBe(0);
  });

  it('redact-props cumulates with the other shares and is read live', async () => {
    const fake = installFakeModelContext();
    const ns = nextNs();
    const el = mount(`ns="${ns}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT} ${ATTR_REDACT_PROPS}="token"`);
    await el.start();
    const {ViewComponent} = await import('../view/ViewComponent.js');
    const {ComponentContext} = await import('../view/ComponentContext.js');
    const root = new ViewComponent('thing', {context: ComponentContext.get(ns)});
    root.setProperty('token', 't');
    root.setProperty('email', 'e');
    root.setProperty('open', 1);
    await el.shadowEnv.syncWait();
    await el.modelContextExposure;
    const R = {$type: 'redacted'};
    const props = async () => {
      const node = (await execute(fake, 'shae-get-entity-tree', {namespace: ns})).envs[0].kernel.roots[0];
      return Object.fromEntries(node.props.map((p: any) => [p.name, p.value]));
    };

    expect(await props()).toEqual({token: R, email: 'e', open: 1});

    const other = await exposeShadowEnvsToModelContext({namespaces: [], redactProps: ['email']});
    expect(await props(), 'a share that exposes nothing still adds its rule').toEqual({token: R, email: R, open: 1});

    el.setAttribute(ATTR_REDACT_PROPS, 'open');
    expect(await props(), 'the attribute is read live; token left with the edit').toEqual({token: 't', email: R, open: R});

    other.dispose();
    expect(await props()).toEqual({token: 't', email: 'e', open: R});
  });

  it('an element that leaves before the import came back registers nothing that stays', async () => {
    const fake = installFakeModelContext();
    const el = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    const pending = el.modelContextExposure;
    el.removeAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT);

    expect(await pending).toMatchObject({available: true, tools: []});
    expect(fake.tools.size).toBe(0);
  });

  it('resolves with available: false where the page has no model context', async () => {
    const el = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    expect(await el.modelContextExposure).toMatchObject({available: false, tools: []});
  });
});
