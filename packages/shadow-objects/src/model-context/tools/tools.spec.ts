import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {onCreate} from '../../in-the-dark/events.js';
import {Registry} from '../../in-the-dark/Registry.js';
import {ShadowObject} from '../../in-the-dark/ShadowObject.js';
import type {ShadowObjectCreationAPI} from '../../types.js';
import {ComponentContext} from '../../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../../view/ShadowEnv.js';
import {ViewComponent} from '../../view/ViewComponent.js';
import type {ModelContextToolLike, ModelContextToolResult} from '../ModelContextLike.js';
import type {ToolContext} from '../toolSupport.js';
import {createTools} from './index.js';

const NS = 'mc-tools';

/**
 * scene (title='hello', secret='hunter2')   provides 'theme'
 * └─ actor (speed=3)                        uses 'theme', useProperty 'speed'
 *    └─ actor
 */
const makeScene = async () => {
  const registry = new Registry();

  @ShadowObject({registry, token: 'scene'})
  class Scene {
    constructor({provideContext}: ShadowObjectCreationAPI) {
      provideContext('theme', 'dark');
    }
    [onCreate]() {}
  }

  @ShadowObject({registry, token: 'actor'})
  class Actor {
    constructor({useContext, useProperty}: ShadowObjectCreationAPI) {
      useContext('theme');
      useProperty('speed');
    }
  }

  expect(Scene && Actor).toBeTruthy();

  const ctx = ComponentContext.get(NS);
  const env = new ShadowEnv();
  env.view = ctx;
  env.envProxy = new LocalShadowObjectEnv(registry);

  const scene = new ViewComponent('scene', {context: ctx});
  scene.setProperty('title', 'hello');
  scene.setProperty('secret', 'hunter2');
  const actor = new ViewComponent('actor', {parent: scene, context: ctx});
  actor.setProperty('speed', 3);
  const child = new ViewComponent('actor', {parent: actor, context: ctx});

  await env.syncWait();
  return {env, ctx, scene, actor, child};
};

type Scene = Awaited<ReturnType<typeof makeScene>>;

const toolContext = (extra: Partial<ToolContext> = {}): ToolContext => ({
  prefix: 'shae-',
  limits: {},
  redact: undefined,
  ...extra,
});

describe('the model-context tools', () => {
  let scene: Scene;
  let tools: ModelContextToolLike[];

  const tool = (name: string): ModelContextToolLike => {
    const found = tools.find((t) => t.name === `shae-${name}`);
    if (found === undefined) throw new Error(`no tool shae-${name}`);
    return found;
  };
  const run = async (name: string, input: unknown = {}, signal?: AbortSignal): Promise<ModelContextToolResult> =>
    (await tool(name).execute(input, signal === undefined ? undefined : {signal})) as ModelContextToolResult;
  const data = (result: ModelContextToolResult): any => result.structuredContent;

  beforeEach(async () => {
    scene = await makeScene();
    tools = createTools(toolContext());
  });

  afterEach(() => {
    scene.env.destroy();
    ComponentContext.get(NS).dispose();
  });

  it('are five, named with the prefix, read-only and untrusted, each with an object schema', () => {
    expect(tools.map((t) => t.name)).toEqual([
      'shae-list-envs',
      'shae-get-entity-tree',
      'shae-get-entity',
      'shae-find-entities',
      'shae-get-registry',
    ]);
    for (const t of tools) {
      expect(t.annotations).toEqual({readOnlyHint: true, untrustedContentHint: true});
      expect(t.description.length).toBeGreaterThan(40);
      expect((t.inputSchema as {type: string}).type).toBe('object');
    }
    expect(createTools(toolContext({prefix: 'x-'})).map((t) => t.name)[0]).toBe('x-list-envs');
  });

  describe('list-envs', () => {
    it('describes every environment with its counts and no tree', async () => {
      const result = await run('list-envs');
      const env = data(result).envs.find((e: any) => e.namespace === NS);

      expect(result.isError).toBeUndefined();
      expect(env).toMatchObject({
        kind: 'local',
        state: {isReady: true},
        kernel: {thread: 'main', counts: {entities: 3, roots: 1, shadowObjects: 3}},
        view: {counts: {components: 3, roots: 1}},
      });
      expect(env.kernel.roots).toBeUndefined();
      expect(env.view.roots).toBeUndefined();
      expect(result.content[0]?.text).toContain(`${NS} (local, ready, 3 entities)`);
    });

    it('lets an environment that cannot answer cost its own entry', async () => {
      const broken = new ShadowEnv();
      broken.view = ComponentContext.get('mc-broken');
      broken.envProxy = {
        start: () => Promise.resolve(),
        importScript: () => Promise.resolve(),
        applyChangeTrail: () => Promise.resolve(),
        destroy: () => {},
        inspect: () => Promise.reject(new Error('silent')),
      };
      await broken.ready();
      try {
        const envs = data(await run('list-envs')).envs;
        expect(envs.find((e: any) => e.namespace === 'mc-broken')).toMatchObject({
          kind: 'custom',
          error: {name: 'Error', message: 'silent'},
        });
        expect(envs.find((e: any) => e.namespace === NS).kernel).toBeDefined();
      } finally {
        broken.destroy();
        ComponentContext.get('mc-broken').dispose();
      }
    });
  });

  describe('get-entity-tree', () => {
    it('answers one environment by namespace with both halves, and refuses an unknown one', async () => {
      const result = await run('get-entity-tree', {namespace: NS});
      const [env] = data(result).envs;

      expect(data(result).envs).toHaveLength(1);
      expect(env.kernel.roots[0]).toMatchObject({uuid: scene.scene.uuid, token: 'scene', childCount: 1});
      expect(env.kernel.roots[0].children[0].children[0].uuid).toBe(scene.child.uuid);
      expect(env.view.roots[0].uuid).toBe(scene.scene.uuid);
      expect(env.kernel.roots[0].shadowObjects[0].displayName).toBe('Scene');

      const refused = await run('get-entity-tree', {namespace: 'nope'});
      expect(refused.isError).toBe(true);
      expect(refused.content[0]?.text).toBe('no Shadow Environment holds the namespace "nope"');
    });

    it('maps its input onto the request', async () => {
      const result = await run('get-entity-tree', {
        namespace: NS,
        rootUuid: scene.actor.uuid,
        maxDepth: 0,
        include: ['props'],
        valueDepth: 0,
      });
      const [env] = data(result).envs;
      const root = env.kernel.roots[0];

      expect(root.uuid).toBe(scene.actor.uuid);
      expect(root.ancestors).toEqual([{uuid: scene.scene.uuid, token: 'scene'}]);
      expect(root.children).toBeUndefined();
      expect(root.childCount).toBe(1);
      expect(root.shadowObjects).toBeUndefined();
      expect(root.props).toEqual([{name: 'speed', value: 3, routes: true}]);
      expect(env.kernel.truncation[0]).toMatchObject({reason: 'max-depth', uuid: scene.actor.uuid});
      expect(result.content[0]?.text).toContain('1 truncation note');

      const wrong = await run('get-entity-tree', {include: ['nope']});
      expect(wrong.isError).toBe(true);
      expect(wrong.content[0]?.text).toContain('"include" knows only');
    });

    it('takes the exposure limits as defaults and the call as the last word', async () => {
      tools = createTools(toolContext({limits: {maxDepth: 0, include: ['props']}}));

      const byDefault = data(await run('get-entity-tree', {namespace: NS})).envs[0].kernel.roots[0];
      expect(byDefault.children).toBeUndefined();
      expect(byDefault.contexts).toBeUndefined();

      const overridden = data(await run('get-entity-tree', {namespace: NS, maxDepth: 2})).envs[0].kernel.roots[0];
      expect(overridden.children[0].children[0].uuid).toBe(scene.child.uuid);
      expect(overridden.contexts, 'include stays the exposure default').toBeUndefined();
    });

    it('redacts the named properties on both halves', async () => {
      tools = createTools(toolContext({redact: (name) => name === 'secret'}));
      const [env] = data(await run('get-entity-tree', {namespace: NS})).envs;
      const byName = (props: {name: string; value: unknown}[]) => Object.fromEntries(props.map((p) => [p.name, p.value]));

      expect(byName(env.kernel.roots[0].props)).toEqual({title: 'hello', secret: {$type: 'redacted'}});
      expect(byName(env.view.roots[0].props)).toEqual({title: 'hello', secret: {$type: 'redacted'}});
    });

    it('rejects for an aborted signal, and for nothing else', async () => {
      const controller = new AbortController();
      const reason = new Error('stop');
      controller.abort(reason);
      await expect(run('get-entity-tree', {}, controller.signal)).rejects.toBe(reason);
    });
  });

  describe('get-entity', () => {
    it('answers with the entity, its ancestors and the view component', async () => {
      const result = await run('get-entity', {uuid: scene.actor.uuid});
      const [match] = data(result).matches;

      expect(data(result).matches).toHaveLength(1);
      expect(match.namespace).toBe(NS);
      expect(match.entity).toMatchObject({uuid: scene.actor.uuid, token: 'actor', childCount: 1});
      expect(match.entity.ancestors, 'lifted out of the node').toBeUndefined();
      expect(match.entity.children[0].uuid).toBe(scene.child.uuid);
      expect(match.entity.children[0].children, 'one level down').toBeUndefined();
      expect(match.ancestors).toEqual([{uuid: scene.scene.uuid, token: 'scene'}]);
      expect(match.view.uuid).toBe(scene.actor.uuid);
      expect(match.entity.contexts[0]).toMatchObject({
        name: 'theme',
        effective: 'dark',
        source: {kind: 'ancestor', uuid: scene.scene.uuid},
      });
      expect(result.content[0]?.text).toContain(`actor "${scene.actor.uuid}", under scene, 1 children`);
    });

    it('refuses without a uuid, and for a uuid nobody holds', async () => {
      expect((await run('get-entity', {})).content[0]?.text).toBe('"uuid" is required');
      const missing = await run('get-entity', {uuid: 'no-such-uuid'});
      expect(missing.isError).toBe(true);
      expect(missing.content[0]?.text).toBe('no Shadow Environment holds an Entity "no-such-uuid"');
    });
  });

  describe('find-entities', () => {
    it('lists the matches with their paths and the total, per environment', async () => {
      const result = await run('find-entities', {token: 'actor'});
      const entry = data(result).results.find((r: any) => r.namespace === NS);

      expect(entry).toEqual({
        namespace: NS,
        total: 2,
        matches: [
          {uuid: scene.actor.uuid, token: 'actor', path: ['scene', 'actor']},
          {uuid: scene.child.uuid, token: 'actor', path: ['scene', 'actor', 'actor']},
        ],
      });
      expect(result.content[0]?.text).toContain(`${NS}: 2 matches`);
    });

    it('takes every criterion and the limit', async () => {
      const find = async (input: object) => data(await run('find-entities', {namespace: NS, ...input})).results[0];

      // both actor and child instantiate the same Actor shadow object, whose constructor reads
      // useProperty('speed') on either entity regardless of whether the view set a value there
      expect((await find({propName: 'speed'})).matches.map((m: any) => m.uuid)).toEqual([scene.actor.uuid, scene.child.uuid]);
      expect((await find({shadowObject: 'Scene'})).matches.map((m: any) => m.uuid)).toEqual([scene.scene.uuid]);
      expect((await find({contextName: 'theme'})).total).toBe(3);
      expect(await find({token: 'actor', limit: 1})).toMatchObject({total: 2, matches: [{uuid: scene.actor.uuid}]});
      expect((await run('find-entities', {namespace: NS, token: 'actor', limit: 1})).content[0]?.text).toContain(
        '2 matches, 1 carried',
      );
    });

    it('refuses a call without a criterion', async () => {
      const refused = await run('find-entities', {namespace: NS, limit: 5});
      expect(refused.isError).toBe(true);
      expect(refused.content[0]?.text).toBe('at least one of token, propName, shadowObject, contextName is required');
    });
  });

  describe('get-registry', () => {
    it('answers the registry of an environment', async () => {
      const result = await run('get-registry', {namespace: NS});
      const [entry] = data(result).registries;

      expect(entry).toMatchObject({
        namespace: NS,
        kind: 'local',
        registry: {tokens: {scene: ['Scene'], actor: ['Actor']}, isDefault: false},
      });
      expect(result.content[0]?.text).toContain(`${NS}: 2 tokens, 0 routes, 0 property routes`);
    });
  });

  it('answer with JSON-safe data and the same JSON in the text', async () => {
    for (const [name, input] of [
      ['list-envs', {}],
      ['get-entity-tree', {namespace: NS}],
      ['get-entity', {uuid: scene.child.uuid}],
      ['find-entities', {token: 'scene'}],
      ['get-registry', {}],
    ] as const) {
      const result = await run(name, input);
      const structured = result.structuredContent!;
      expect(JSON.parse(JSON.stringify(structured)), name).toEqual(structured);
      expect(result.content[0]?.text.endsWith(JSON.stringify(structured)), name).toBe(true);
    }
  });
});
