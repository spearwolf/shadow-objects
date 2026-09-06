import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {exposeShadowEnvsToModelContext} from './exposeShadowEnvsToModelContext.js';
import type {
  ModelContextLike,
  ModelContextRegisterOptions,
  ModelContextToolLike,
  ModelContextToolResult,
} from './ModelContextLike.js';

interface FakeModelContext extends ModelContextLike {
  tools: Map<string, ModelContextToolLike>;
  calls: ModelContextRegisterOptions[];
}

/** Registers by name, refuses a duplicate the way Chromium does, and takes a tool back when its signal aborts. */
const fakeModelContext = (failAt?: string): FakeModelContext => {
  const tools = new Map<string, ModelContextToolLike>();
  const calls: ModelContextRegisterOptions[] = [];
  return {
    tools,
    calls,
    async registerTool(tool, options) {
      calls.push(options ?? {});
      if (tool.name === failAt) throw new DOMException('not allowed here', 'NotAllowedError');
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
};

const FiveNames = ['shae-list-envs', 'shae-get-entity-tree', 'shae-get-entity', 'shae-find-entities', 'shae-get-registry'];

/** A local environment with one root that carries the given properties. */
const makeEnv = async (ns: string, props: Record<string, unknown> = {}) => {
  const env = new ShadowEnv();
  const ctx = ComponentContext.get(ns);
  env.view = ctx;
  env.envProxy = new LocalShadowObjectEnv();
  const root = new ViewComponent('thing', {context: ctx});
  for (const [name, value] of Object.entries(props)) root.setProperty(name, value);
  await env.syncWait();
  return {
    env,
    root,
    dispose() {
      env.destroy();
      ctx.dispose();
    },
  };
};

const execute = async (mc: FakeModelContext, name: string, input: object = {}): Promise<any> =>
  ((await mc.tools.get(name)!.execute(input)) as ModelContextToolResult).structuredContent;

const listed = async (mc: FakeModelContext, prefix = 'shae-'): Promise<string[]> =>
  (await execute(mc, `${prefix}list-envs`)).envs.map((e: any) => e.namespace);

const propsOf = async (mc: FakeModelContext, namespace: string): Promise<Record<string, unknown>> => {
  const root = (await execute(mc, 'shae-get-entity-tree', {namespace})).envs[0].kernel.roots[0];
  return Object.fromEntries(root.props.map((p: any) => [p.name, p.value]));
};

describe('exposeShadowEnvsToModelContext', () => {
  afterEach(() => {
    delete (document as {modelContext?: unknown}).modelContext;
    delete (navigator as {modelContext?: unknown}).modelContext;
  });

  it('registers the five tools, in order, with the prefix, and hands back their names', async () => {
    const mc = fakeModelContext();

    const handle = await exposeShadowEnvsToModelContext({modelContext: mc});

    expect(handle.available).toBe(true);
    expect(handle.tools).toEqual(FiveNames);
    expect(Array.from(mc.tools.keys())).toEqual(FiveNames);
    for (const tool of mc.tools.values()) {
      expect(tool.annotations).toEqual({readOnlyHint: true, untrustedContentHint: true});
    }
    expect(mc.calls[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(mc.calls[0]).not.toHaveProperty('exposedTo');

    handle.dispose();
  });

  it('resolves with available: false where there is no model context', async () => {
    const handle = await exposeShadowEnvsToModelContext();

    expect(handle).toMatchObject({available: false, tools: []});
    expect(() => handle.dispose()).not.toThrow();
  });

  it('finds document.modelContext first, and navigator.modelContext as the fallback', async () => {
    const onNavigator = fakeModelContext();
    Object.defineProperty(navigator, 'modelContext', {value: onNavigator, configurable: true, writable: true});
    const viaNavigator = await exposeShadowEnvsToModelContext({toolPrefix: 'nav-'});
    expect(Array.from(onNavigator.tools.keys())).toEqual(FiveNames.map((n) => n.replace('shae-', 'nav-')));
    viaNavigator.dispose();

    const onDocument = fakeModelContext();
    (document as {modelContext?: unknown}).modelContext = onDocument;
    const viaDocument = await exposeShadowEnvsToModelContext();
    expect(Array.from(onDocument.tools.keys())).toEqual(FiveNames);
    expect(onNavigator.tools.size, 'the document wins').toBe(0);
    viaDocument.dispose();
  });

  it('takes back what it registered when a registration fails, rejects with that reason, and tries again on the next call', async () => {
    const mc = fakeModelContext('shae-get-entity');

    await expect(exposeShadowEnvsToModelContext({modelContext: mc})).rejects.toMatchObject({name: 'NotAllowedError'});
    expect(mc.tools.size).toBe(0);

    const working = fakeModelContext();
    const handle = await exposeShadowEnvsToModelContext({modelContext: working});
    expect(handle.tools).toEqual(FiveNames);
    handle.dispose();
  });

  it('passes exposedTo, the prefix, the limits and the redaction through', async () => {
    const mc = fakeModelContext();
    const scene = await makeEnv('mc-expose', {token: 'abc', name: 'x'});
    new ViewComponent('thing', {parent: scene.root, context: ComponentContext.get('mc-expose')});
    await scene.env.syncWait();

    try {
      const handle = await exposeShadowEnvsToModelContext({
        modelContext: mc,
        toolPrefix: 'app-',
        exposedTo: ['https://agent.example'],
        limits: {maxDepth: 0},
        redactProps: ['token'],
      });

      expect(handle.tools[0]).toBe('app-list-envs');
      expect(mc.calls[0]?.exposedTo).toEqual(['https://agent.example']);

      const root = (await execute(mc, 'app-get-entity-tree', {namespace: 'mc-expose'})).envs[0].kernel.roots[0];
      expect(root.children, 'the limit applied').toBeUndefined();
      expect(root.childCount).toBe(1);
      expect(Object.fromEntries(root.props.map((p: any) => [p.name, p.value]))).toEqual({token: {$type: 'redacted'}, name: 'x'});

      handle.dispose();
    } finally {
      scene.dispose();
    }
  });

  it('dispose() takes the tools back when it is the only share, and can be called twice', async () => {
    const mc = fakeModelContext();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc});

    handle.dispose();
    expect(mc.tools.size).toBe(0);
    expect(() => handle.dispose()).not.toThrow();
  });

  it('follows the caller signal: aborting it takes the share back, an aborted one registers nothing', async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc, signal: controller.signal});
    expect(mc.tools.size).toBe(5);

    controller.abort();
    expect(mc.tools.size).toBe(0);
    expect(handle.tools, 'the handle keeps saying what was registered').toEqual(FiveNames);

    const already = new AbortController();
    already.abort();
    const nothing = await exposeShadowEnvsToModelContext({modelContext: mc, signal: already.signal});
    expect(nothing).toMatchObject({available: true, tools: []});
    expect(mc.tools.size).toBe(0);
  });

  it('stops registering when the only member leaves midway, and reports no tools', async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    const registerTool = mc.registerTool.bind(mc);
    mc.registerTool = async (tool, options) => {
      await registerTool(tool, options);
      if (tool.name === 'shae-get-entity-tree') controller.abort();
    };

    const handle = await exposeShadowEnvsToModelContext({modelContext: mc, signal: controller.signal});

    expect(handle).toMatchObject({available: true, tools: []});
    expect(mc.tools.size).toBe(0);
  });

  describe('shares one registration per model context and prefix', () => {
    it('a second call under the same prefix joins: one set of tools, and it leaves with the last share', async () => {
      const mc = fakeModelContext();
      const first = await exposeShadowEnvsToModelContext({modelContext: mc});
      const second = await exposeShadowEnvsToModelContext({modelContext: mc});

      expect(second.tools).toEqual(FiveNames);
      expect(mc.tools.size, 'one set').toBe(5);
      expect(mc.calls.length, 'registered once').toBe(5);

      first.dispose();
      expect(mc.tools.size, 'one share left, the tools stay').toBe(5);
      second.dispose();
      expect(mc.tools.size, 'the last share out takes them back').toBe(0);
    });

    it('another prefix or another model context is another registration', async () => {
      const mc = fakeModelContext();
      const other = fakeModelContext();
      const a = await exposeShadowEnvsToModelContext({modelContext: mc});
      const b = await exposeShadowEnvsToModelContext({modelContext: mc, toolPrefix: 'two-'});
      const c = await exposeShadowEnvsToModelContext({modelContext: other});

      expect(mc.tools.size).toBe(10);
      expect(other.tools.size).toBe(5);

      a.dispose();
      expect(mc.tools.size).toBe(5);
      b.dispose();
      c.dispose();
      expect(mc.tools.size + other.tools.size).toBe(0);
    });

    it('a closed registration opens fresh on the next call', async () => {
      const mc = fakeModelContext();
      const first = await exposeShadowEnvsToModelContext({modelContext: mc});
      first.dispose();
      const second = await exposeShadowEnvsToModelContext({modelContext: mc});
      expect(mc.tools.size).toBe(5);
      expect(mc.calls.length).toBe(10);
      second.dispose();
    });

    it('a member that joins while the registration is on its way shares its outcome', async () => {
      const mc = fakeModelContext();
      const first = exposeShadowEnvsToModelContext({modelContext: mc});
      const second = exposeShadowEnvsToModelContext({modelContext: mc});
      const [a, b] = await Promise.all([first, second]);
      expect(a.tools).toEqual(FiveNames);
      expect(b.tools).toEqual(FiveNames);
      expect(mc.calls.length).toBe(5);
      a.dispose();
      b.dispose();
    });
  });

  describe('namespaces', () => {
    it('limits what the tools see, as a list and as a predicate', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-ns-a');
      const b = await makeEnv('mc-ns-b');

      try {
        const asList = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: ['mc-ns-a']});
        expect(await listed(mc)).toEqual(['mc-ns-a']);
        asList.dispose();

        const asPredicate = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: (ns) => ns === 'mc-ns-b'});
        expect(await listed(mc)).toEqual(['mc-ns-b']);
        asPredicate.dispose();
      } finally {
        a.dispose();
        b.dispose();
      }
    });

    it('is the union over the shares, and a call without the option exposes everything whichever came first', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-union-a');
      const b = await makeEnv('mc-union-b');
      const c = await makeEnv('mc-union-c');

      try {
        const onlyA = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: ['mc-union-a']});
        expect(await listed(mc)).toEqual(['mc-union-a']);

        const onlyB = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: ['mc-union-b']});
        expect(await listed(mc), 'the union of two shares').toEqual(['mc-union-a', 'mc-union-b']);

        const all = await exposeShadowEnvsToModelContext({modelContext: mc});
        expect(await listed(mc), 'a share without the option covers every environment').toEqual([
          'mc-union-a',
          'mc-union-b',
          'mc-union-c',
        ]);

        all.dispose();
        expect(await listed(mc), 'the others keep theirs').toEqual(['mc-union-a', 'mc-union-b']);
        onlyA.dispose();
        expect(await listed(mc)).toEqual(['mc-union-b']);
        onlyB.dispose();
        expect(mc.tools.size).toBe(0);
      } finally {
        a.dispose();
        b.dispose();
        c.dispose();
      }
    });
  });

  describe('redaction', () => {
    it('cumulates over the shares -- lists and predicates alike -- and a rule leaves with its share', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-redact-a', {token: 't', email: 'e', draft: 'd', open: 1});
      const b = await makeEnv('mc-redact-b', {token: 't', email: 'e', draft: 'd', open: 1});
      const R = {$type: 'redacted'};

      try {
        const byList = await exposeShadowEnvsToModelContext({modelContext: mc, redactProps: ['token']});
        const byOtherList = await exposeShadowEnvsToModelContext({modelContext: mc, redactProps: ['email', 'token']});
        const byPredicate = await exposeShadowEnvsToModelContext({
          modelContext: mc,
          redactProps: (name, uuid) => name === 'draft' && uuid === a.root.uuid,
        });

        expect(await propsOf(mc, 'mc-redact-a'), 'every rule applies, in every environment').toEqual({
          token: R,
          email: R,
          draft: R,
          open: 1,
        });
        expect(await propsOf(mc, 'mc-redact-b'), 'the predicate asked for one uuid only').toEqual({
          token: R,
          email: R,
          draft: 'd',
          open: 1,
        });

        byOtherList.dispose();
        expect(await propsOf(mc, 'mc-redact-a'), 'email left with its share; token is still named by another').toEqual({
          token: R,
          email: 'e',
          draft: R,
          open: 1,
        });

        byPredicate.dispose();
        expect(await propsOf(mc, 'mc-redact-a')).toEqual({token: R, email: 'e', draft: 'd', open: 1});

        byList.dispose();
        expect(mc.tools.size).toBe(0);
      } finally {
        a.dispose();
        b.dispose();
      }
    });

    it('a share without a rule redacts nothing and takes nothing away from the others', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-redact-none', {token: 't'});
      try {
        const plain = await exposeShadowEnvsToModelContext({modelContext: mc});
        expect(await propsOf(mc, 'mc-redact-none')).toEqual({token: 't'});
        const hiding = await exposeShadowEnvsToModelContext({modelContext: mc, redactProps: ['token']});
        expect(await propsOf(mc, 'mc-redact-none')).toEqual({token: {$type: 'redacted'}});
        plain.dispose();
        expect(await propsOf(mc, 'mc-redact-none'), 'the plain share leaving changes nothing').toEqual({
          token: {$type: 'redacted'},
        });
        hiding.dispose();
      } finally {
        a.dispose();
      }
    });
  });

  it('the opener sets limits and exposedTo; a later share with other values is reported and joins under them', async () => {
    const mc = fakeModelContext();
    const scene = await makeEnv('mc-settings');
    new ViewComponent('thing', {parent: scene.root, context: ComponentContext.get('mc-settings')});
    await scene.env.syncWait();

    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      const opener = await exposeShadowEnvsToModelContext({
        modelContext: mc,
        limits: {maxDepth: 0},
        exposedTo: ['https://a.example'],
      });
      const later = await exposeShadowEnvsToModelContext({
        modelContext: mc,
        limits: {maxDepth: 3},
        exposedTo: ['https://b.example'],
      });

      expect(mc.calls[0]?.exposedTo).toEqual(['https://a.example']);
      const root = (await execute(mc, 'shae-get-entity-tree', {namespace: 'mc-settings'})).envs[0].kernel.roots[0];
      expect(root.children, "the opener's limits apply").toBeUndefined();
      expect(
        warnings.some((w) => w.some((a) => typeof a === 'string' && a.includes('limits'))),
        'reported',
      ).toBe(true);

      later.dispose();
      opener.dispose();
    } finally {
      console.warn = originalWarn;
      scene.dispose();
    }
  });
});
