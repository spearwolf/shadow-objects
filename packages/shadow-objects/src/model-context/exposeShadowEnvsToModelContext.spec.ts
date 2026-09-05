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

  it('takes back what it registered when a registration fails, and rejects with that reason', async () => {
    const mc = fakeModelContext('shae-get-entity');

    await expect(exposeShadowEnvsToModelContext({modelContext: mc})).rejects.toMatchObject({name: 'NotAllowedError'});

    expect(mc.tools.size).toBe(0);
  });

  it('passes exposedTo, the prefix, the limits and the redaction through', async () => {
    const mc = fakeModelContext();
    const env = new ShadowEnv();
    const ctx = ComponentContext.get('mc-expose');
    env.view = ctx;
    env.envProxy = new LocalShadowObjectEnv();
    const vc = new ViewComponent('thing', {context: ctx});
    vc.setProperty('token', 'abc');
    vc.setProperty('name', 'x');
    new ViewComponent('thing', {parent: vc, context: ctx});
    await env.syncWait();

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

      const tree = (await mc.tools.get('app-get-entity-tree')!.execute({namespace: 'mc-expose'})) as ModelContextToolResult;
      const root = (tree.structuredContent as any).envs[0].kernel.roots[0];
      expect(root.children, 'the limit applied').toBeUndefined();
      expect(root.childCount).toBe(1);
      expect(Object.fromEntries(root.props.map((p: any) => [p.name, p.value]))).toEqual({token: {$type: 'redacted'}, name: 'x'});

      handle.dispose();
    } finally {
      env.destroy();
      ctx.dispose();
    }
  });

  it('dispose() takes every tool back and can be called twice', async () => {
    const mc = fakeModelContext();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc});

    handle.dispose();
    expect(mc.tools.size).toBe(0);
    expect(() => handle.dispose()).not.toThrow();
  });

  it('follows the caller signal: aborting it takes the tools back, an aborted one registers nothing', async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc, signal: controller.signal});
    expect(mc.tools.size).toBe(5);

    controller.abort();
    expect(mc.tools.size).toBe(0);
    expect(handle.tools, 'the handle keeps saying what it registered').toEqual(FiveNames);

    const already = new AbortController();
    already.abort();
    const nothing = await exposeShadowEnvsToModelContext({modelContext: mc, signal: already.signal});
    expect(nothing).toMatchObject({available: true, tools: []});
    expect(mc.tools.size).toBe(0);
  });

  it('stops registering when the caller signal aborts midway, and reports no tools', async () => {
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

  it('rejects a second exposure under the same prefix on the duplicate name, and leaves the first intact', async () => {
    const mc = fakeModelContext();
    const first = await exposeShadowEnvsToModelContext({modelContext: mc});

    await expect(exposeShadowEnvsToModelContext({modelContext: mc})).rejects.toMatchObject({name: 'InvalidStateError'});
    expect(Array.from(mc.tools.keys())).toEqual(FiveNames);

    const second = await exposeShadowEnvsToModelContext({modelContext: mc, toolPrefix: 'two-'});
    expect(mc.tools.size).toBe(10);

    first.dispose();
    second.dispose();
    expect(mc.tools.size).toBe(0);
  });
});
