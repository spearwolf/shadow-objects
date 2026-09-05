import {describe, expect, it} from 'vitest';
import {onCreate} from '../in-the-dark/events.js';
import {Kernel} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import {ShadowObject} from '../in-the-dark/ShadowObject.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {createKernelSnapshot} from './createKernelSnapshot.js';
import type {EntityNodeSnapshot} from './types.js';

const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));
const settle = async () => {
  await nextMicrotask();
  await nextMicrotask();
  await nextMicrotask();
};

/**
 * root (provider)                   provides 'theme' = 'dark', global 'clock' = 42
 * └─ child (consumer, speed=3)      uses 'theme', useParentContext 'theme', useProperty 'speed'
 *    └─ grandchild (consumer)
 * lonely (lonely)                   uses 'clock' (global) and 'missing' (nobody)
 */
const makeScene = async () => {
  const registry = new Registry();
  const kernel = new Kernel(registry);

  @ShadowObject({registry, token: 'provider'})
  class Provider {
    constructor({provideContext, provideGlobalContext}: ShadowObjectCreationAPI) {
      provideContext('theme', 'dark');
      provideGlobalContext('clock', 42);
    }
    [onCreate]() {}
  }

  @ShadowObject({registry, token: 'consumer'})
  class Consumer {
    constructor({useContext, useParentContext, useProperty}: ShadowObjectCreationAPI) {
      useContext('theme');
      useParentContext('theme');
      useProperty('speed');
    }
  }

  @ShadowObject({registry, token: 'lonely'})
  class Lonely {
    constructor({useContext}: ShadowObjectCreationAPI) {
      useContext('clock');
      useContext('missing');
    }
  }

  expect(Provider && Consumer && Lonely).toBeTruthy();

  const uuids = {root: generateUUID(), child: generateUUID(), grandchild: generateUUID(), lonely: generateUUID()};

  kernel.createEntity(uuids.root, 'provider');
  kernel.createEntity(uuids.child, 'consumer', uuids.root, 0, [['speed', 3], ['flag', false], ['bare']]);
  kernel.createEntity(uuids.grandchild, 'consumer', uuids.child, 5, undefined, true);
  kernel.createEntity(uuids.lonely, 'lonely');

  await settle();

  return {kernel, uuids};
};

const shape = (node: EntityNodeSnapshot): unknown => ({
  uuid: node.uuid,
  token: node.token,
  children: node.children?.map(shape) ?? [],
  ...(node.omittedChildren ? {omittedChildren: node.omittedChildren} : {}),
});

const graphShape = (node: ReturnType<Kernel['getEntityGraph']>[number]): unknown => ({
  uuid: node.entity.uuid,
  token: node.token,
  children: node.children.map(graphShape),
  ...(node.omittedChildren ? {omittedChildren: node.omittedChildren} : {}),
});

describe('createKernelSnapshot', () => {
  it('walks the same tree as getEntityGraph()', async () => {
    const {kernel, uuids} = await makeScene();
    // a back-edge, so the omission path is exercised
    kernel.getEntity(uuids.grandchild).addChild(kernel.getEntity(uuids.child));

    const snapshot = createKernelSnapshot(kernel, {maxDepth: 64, maxNodes: 1000});
    const graph = kernel.getEntityGraph();

    expect(snapshot.roots.map(shape)).toEqual(graph.map(graphShape));
    expect(snapshot.truncation).toBeUndefined();

    kernel.destroy();
  });

  it('drops a root already reached through another root, as getEntityGraph() does', async () => {
    const {kernel, uuids} = await makeScene();
    // lonely stays in the kernel's root set, but this back-edge also puts it under root's
    // children -- root is walked first, so lonely is reached there and drops off the top level
    kernel.getEntity(uuids.root).addChild(kernel.getEntity(uuids.lonely));

    const snapshot = createKernelSnapshot(kernel, {maxDepth: 64, maxNodes: 1000});
    const graph = kernel.getEntityGraph();

    expect(snapshot.roots.map(shape)).toEqual(graph.map(graphShape));

    const [root] = snapshot.roots;
    const lonelyNodes = root!.children!.filter((n) => n.uuid === uuids.lonely);
    expect(lonelyNodes).toHaveLength(1);
    expect(snapshot.roots.map((n) => n.uuid)).not.toContain(uuids.lonely);

    kernel.destroy();
  });

  it('reports the node fields, the props and their routing flag', async () => {
    const {kernel, uuids} = await makeScene();
    const [root] = createKernelSnapshot(kernel).roots;
    const child = root!.children![0]!;

    expect(root).toMatchObject({
      uuid: uuids.root,
      token: 'provider',
      order: 0,
      autoDestructionOnParentRemoval: false,
      childCount: 1,
    });
    expect(root!.parentUuid).toBeUndefined();
    expect(child).toMatchObject({parentUuid: uuids.root, order: 0, childCount: 1});
    expect(child.children![0]).toMatchObject({order: 5, autoDestructionOnParentRemoval: true, childCount: 0, children: []});
    expect(child.props).toEqual([
      {name: 'speed', value: 3, routes: true},
      {name: 'flag', value: false, routes: false},
      {name: 'bare', value: {$type: 'undefined'}, routes: false},
    ]);

    kernel.destroy();
  });

  it('describes the shadow objects of a node', async () => {
    const {kernel} = await makeScene();
    const [root] = createKernelSnapshot(kernel).roots;

    expect(root!.shadowObjects).toEqual([
      {
        displayName: 'Provider',
        definedUnder: ['provider'],
        usesProperties: [],
        usesContexts: [],
        usesParentContexts: [],
        providesContexts: ['theme'],
        providesGlobalContexts: ['clock'],
        hooks: ['onCreate'],
      },
    ]);
    expect(root!.children![0]!.shadowObjects![0]).toMatchObject({
      displayName: 'Consumer',
      usesProperties: ['speed'],
      usesContexts: ['theme'],
      usesParentContexts: ['theme'],
      hooks: [],
    });

    kernel.destroy();
  });

  it('describes the entity contexts with their source', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel);
    const [root, lonely] = snapshot.roots;
    const child = root!.children![0]!;
    const grandchild = child.children![0]!;

    expect(root!.contexts).toEqual([
      {name: 'theme', provided: 'dark', effective: 'dark', providedBy: ['Provider'], source: {kind: 'self'}},
    ]);
    expect(child.contexts).toEqual([
      {name: 'theme', inherited: 'dark', effective: 'dark', providedBy: [], source: {kind: 'ancestor', uuid: uuids.root}},
    ]);
    expect(grandchild.contexts![0]).toMatchObject({source: {kind: 'ancestor', uuid: uuids.root}});

    const byName = new Map(lonely!.contexts!.map((c) => [String(c.name), c]));
    expect(byName.get('clock')).toEqual({name: 'clock', inherited: 42, effective: 42, providedBy: [], source: {kind: 'global'}});
    expect(byName.get('missing')).toEqual({
      name: 'missing',
      effective: {$type: 'undefined'},
      providedBy: [],
      source: {kind: 'none'},
    });

    kernel.destroy();
  });

  it('lists the global contexts with their providers in chain order', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel);

    expect(snapshot.globalContexts).toEqual([
      {name: 'clock', value: 42, providers: [{uuid: uuids.root, providedBy: ['Provider'], value: 42}]},
    ]);

    kernel.destroy();
  });

  it('renders a symbol context name as its description', async () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);
    const uuid = generateUUID();
    kernel.createEntity(uuid, 'node');
    kernel.getEntity(uuid).provideContext(Symbol('sym')).set(1);
    await settle();

    expect(createKernelSnapshot(kernel).roots[0]!.contexts![0]!.name).toEqual({symbol: 'sym'});

    kernel.destroy();
  });

  it('describes the registry', async () => {
    const {kernel} = await makeScene();
    const {registry} = createKernelSnapshot(kernel);

    expect(registry).toEqual({
      tokens: {provider: ['Provider'], consumer: ['Consumer'], lonely: ['Lonely']},
      routes: {},
      propRoutes: {},
      isDefault: false,
    });
    expect(createKernelSnapshot(new Kernel()).registry?.isDefault).toBe(true);

    kernel.destroy();
  });

  it('counts, and stamps the realm', async () => {
    const {kernel} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {maxDepth: 0});

    expect(snapshot.counts).toEqual({entities: 4, roots: 2, shadowObjects: 4});
    expect(snapshot.thread).toBe('main');
    expect(typeof snapshot.takenAt).toBe('number');

    kernel.destroy();
  });

  it('cuts at maxDepth and says where', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {maxDepth: 1});
    const child = snapshot.roots[0]!.children![0]!;

    expect(child.children).toBeUndefined();
    expect(child.childCount).toBe(1);
    expect(snapshot.truncation).toEqual([
      {reason: 'max-depth', uuid: uuids.child, message: expect.stringContaining(uuids.child)},
    ]);

    kernel.destroy();
  });

  it('cuts at maxNodes and says where', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {maxNodes: 2});

    expect(snapshot.roots).toHaveLength(1);
    expect(snapshot.roots[0]!.children).toHaveLength(1);
    expect(snapshot.roots[0]!.children![0]!.children).toEqual([]);
    expect(snapshot.truncation).toEqual([{reason: 'max-nodes', uuid: uuids.child, message: expect.stringContaining('maxNodes')}]);

    kernel.destroy();
  });

  it('descends from the given roots and names the ones it cannot find', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {rootUuids: [uuids.child, 'nope']});

    expect(snapshot.roots.map((n) => n.uuid)).toEqual([uuids.child]);
    expect(snapshot.roots[0]!.parentUuid).toBe(uuids.root);
    expect(snapshot.truncation).toEqual([{reason: 'unknown-root', uuid: 'nope', message: expect.stringContaining('nope')}]);

    kernel.destroy();
  });

  it('includes only what was asked for', async () => {
    const {kernel} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {include: ['props']});
    const [root] = snapshot.roots;

    expect(root!.props).toBeDefined();
    expect(root!.shadowObjects).toBeUndefined();
    expect(root!.contexts).toBeUndefined();
    expect(snapshot.registry).toBeUndefined();

    kernel.destroy();
  });

  it('reads a non-finite maxDepth as the cap', async () => {
    const {kernel} = await makeScene();
    expect(createKernelSnapshot(kernel, {maxDepth: Infinity}).roots[0]!.children![0]!.children).toHaveLength(1);
    kernel.destroy();
  });

  it('survives a JSON round trip unchanged', async () => {
    const {kernel} = await makeScene();
    const snapshot = createKernelSnapshot(kernel);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    kernel.destroy();
  });
});
