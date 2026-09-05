import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {createViewSnapshot} from './createViewSnapshot.js';

describe('createViewSnapshot', () => {
  afterEach(() => {
    ComponentContext.get().clear();
    document.body.innerHTML = '';
  });

  const makeScene = () => {
    const ctx = ComponentContext.get();
    const a = new ViewComponent('a', {context: ctx, order: 2});
    const b = new ViewComponent('b', {parent: a, context: ctx, autoDestructionOnParentRemoval: true});
    const c = new ViewComponent('c', {context: ctx, order: 1});
    a.setProperty('x', 1);
    a.setProperty('flag', false);
    a.setPropertyWithoutValue('bare');
    return {ctx, a, b, c};
  };

  it('walks the components from the roots and reads props from the memory', () => {
    const {ctx, a, b, c} = makeScene();

    const before = createViewSnapshot(ctx);
    expect(
      before.roots.map((n) => n.uuid),
      'root order follows the ordered root list',
    ).toEqual([c.uuid, a.uuid]);
    expect(before.roots[1]!.props, 'nothing committed yet').toBeUndefined();

    ctx.buildChangeTrails();
    const snapshot = createViewSnapshot(ctx);

    expect(snapshot.counts).toEqual({components: 3, roots: 2});
    expect(snapshot.roots[1]).toMatchObject({uuid: a.uuid, token: 'a', order: 2, childCount: 1});
    expect(snapshot.roots[1]!.props).toEqual([
      {name: 'x', value: 1, routes: true},
      {name: 'flag', value: false, routes: false},
      {name: 'bare', value: {$type: 'undefined'}, routes: false},
    ]);
    expect(snapshot.roots[1]!.children![0]).toMatchObject({
      uuid: b.uuid,
      token: 'b',
      parentUuid: a.uuid,
      childCount: 0,
      children: [],
    });
    expect(snapshot.roots[1]!.children![0]!.element).toBeUndefined();
    expect(snapshot.truncation).toBeUndefined();
  });

  it('cuts at maxDepth and maxNodes', () => {
    const {ctx, a, c} = makeScene();

    const shallow = createViewSnapshot(ctx, {maxDepth: 0});
    expect(shallow.roots[1]!.children).toBeUndefined();
    expect(shallow.truncation).toEqual([{reason: 'max-depth', uuid: a.uuid, message: expect.any(String)}]);

    const small = createViewSnapshot(ctx, {maxNodes: 1});
    expect(small.roots.map((n) => n.uuid)).toEqual([c.uuid]);
    expect(small.truncation).toEqual([{reason: 'max-nodes', message: expect.any(String)}]);
  });

  it('descends from the given roots', () => {
    const {ctx, a, b} = makeScene();
    const snapshot = createViewSnapshot(ctx, {rootUuids: [b.uuid, 'nope']});
    expect(snapshot.roots.map((n) => n.uuid)).toEqual([b.uuid]);
    expect(snapshot.roots[0]!.parentUuid).toBe(a.uuid);
    expect(snapshot.truncation).toEqual([{reason: 'unknown-root', uuid: 'nope', message: expect.any(String)}]);
  });

  it('names the <shae-ent> element behind a component by a selector path', () => {
    const {ctx, a, b} = makeScene();
    document.body.innerHTML = '<div id="app"><shae-ent></shae-ent><section><shae-ent></shae-ent></section></div>';
    const [first, second] = Array.from(document.querySelectorAll('shae-ent')) as (Element & {uuid?: string})[];
    first!.uuid = a.uuid;
    second!.uuid = b.uuid;

    const snapshot = createViewSnapshot(ctx);
    expect(snapshot.roots[1]!.element).toBe('#app > shae-ent:nth-of-type(1)');
    expect(snapshot.roots[1]!.children![0]!.element).toBe('#app > section:nth-of-type(1) > shae-ent:nth-of-type(1)');
  });

  it('survives a JSON round trip unchanged', () => {
    const {ctx} = makeScene();
    ctx.buildChangeTrails();
    const snapshot = createViewSnapshot(ctx);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
