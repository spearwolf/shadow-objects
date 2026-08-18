import {afterEach, describe, expect, it} from 'vitest';
import {ComponentChangeType} from '../constants.js';
import {ComponentContext} from './ComponentContext.js';
import {ViewComponent} from './ViewComponent.js';

/**
 * Creates a fresh, uniquely named context per test so that the global
 * namespace singleton map cannot leak state between specs.
 */
let ctxCounter = 0;

function makeContext(): ComponentContext {
  return ComponentContext.get(`ComponentContext.spec-${++ctxCounter}`);
}

describe('ComponentContext', () => {
  let ctx: ComponentContext;

  afterEach(() => {
    ctx?.clear();
  });

  describe('ordered insertion (children)', () => {
    const childTokens = (parent: ViewComponent) => ctx.getChildren(parent).map((c) => c.token);

    it('appends a child with a higher order to the end', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('a', {context: ctx, parent, order: 0});
      new ViewComponent('b', {context: ctx, parent, order: 5});
      new ViewComponent('c', {context: ctx, parent, order: 20});

      expect(childTokens(parent)).toEqual(['a', 'b', 'c']);
    });

    it('prepends a child with the lowest order', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('a', {context: ctx, parent, order: 5});
      new ViewComponent('b', {context: ctx, parent, order: 10});
      new ViewComponent('c', {context: ctx, parent, order: 1});

      expect(childTokens(parent)).toEqual(['c', 'a', 'b']);
    });

    it('inserts a child directly after the first one when its order falls into the first gap', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('a', {context: ctx, parent, order: 0});
      new ViewComponent('b', {context: ctx, parent, order: 5});
      new ViewComponent('c', {context: ctx, parent, order: 10});
      new ViewComponent('gap', {context: ctx, parent, order: 1});

      expect(childTokens(parent)).toEqual(['a', 'gap', 'b', 'c']);
    });

    it('inserts into every gap of a longer children list', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      for (const order of [0, 10, 20, 30, 40]) {
        new ViewComponent(`o${order}`, {context: ctx, parent, order});
      }
      for (const order of [5, 15, 25, 35]) {
        new ViewComponent(`gap${order}`, {context: ctx, parent, order});
      }

      expect(childTokens(parent)).toEqual(['o0', 'gap5', 'o10', 'gap15', 'o20', 'gap25', 'o30', 'gap35', 'o40']);
    });

    it('keeps the insertion order for children with equal order values', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('first', {context: ctx, parent, order: 7});
      new ViewComponent('second', {context: ctx, parent, order: 7});
      new ViewComponent('third', {context: ctx, parent, order: 7});

      expect(childTokens(parent)).toEqual(['first', 'second', 'third']);
    });

    it('places a child between equal-order neighbours according to its own order', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('lo1', {context: ctx, parent, order: 1});
      new ViewComponent('lo2', {context: ctx, parent, order: 1});
      new ViewComponent('hi1', {context: ctx, parent, order: 9});
      new ViewComponent('hi2', {context: ctx, parent, order: 9});
      new ViewComponent('mid', {context: ctx, parent, order: 5});

      expect(childTokens(parent)).toEqual(['lo1', 'lo2', 'mid', 'hi1', 'hi2']);
    });

    it('sorts negative order values before the default order', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('zero', {context: ctx, parent});
      new ViewComponent('pos', {context: ctx, parent, order: 3});
      new ViewComponent('neg', {context: ctx, parent, order: -10});
      new ViewComponent('negMid', {context: ctx, parent, order: -5});

      expect(childTokens(parent)).toEqual(['neg', 'negMid', 'zero', 'pos']);
    });

    it('treats a null order as 0', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('minus', {context: ctx, parent, order: -1});
      new ViewComponent('plus', {context: ctx, parent, order: 1});
      const nulled = new ViewComponent('nulled', {context: ctx, parent});
      nulled.order = null;

      expect(nulled.order).toBe(0);
      expect(childTokens(parent)).toEqual(['minus', 'nulled', 'plus']);
    });
  });

  describe('ordered insertion (root components)', () => {
    const rootTokens = () => ctx.traverseLevelOrderBFS().map((c) => c.token);

    it('inserts a root component into the first gap', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx, order: 0});
      new ViewComponent('b', {context: ctx, order: 5});
      new ViewComponent('c', {context: ctx, order: 10});
      new ViewComponent('gap', {context: ctx, order: 1});

      expect(rootTokens()).toEqual(['a', 'gap', 'b', 'c']);
    });

    it('keeps every root component reachable via the change trail', () => {
      ctx = makeContext();
      const uuids = [0, 5, 10, 1].map((order) => new ViewComponent(`o${order}`, {context: ctx, order}).uuid);

      const trail = ctx.buildChangeTrails();

      expect(trail.map((t) => t.uuid).sort()).toEqual([...uuids].sort());
    });
  });

  describe('changing the order of an existing component', () => {
    it('re-sorts a child that moves into the first gap', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('a', {context: ctx, parent, order: 0});
      new ViewComponent('b', {context: ctx, parent, order: 5});
      new ViewComponent('c', {context: ctx, parent, order: 10});
      const mover = new ViewComponent('mover', {context: ctx, parent, order: 99});

      mover.order = 1;

      expect(ctx.getChildren(parent).map((c) => c.token)).toEqual(['a', 'mover', 'b', 'c']);
    });

    it('re-sorts a root component that moves into the first gap', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx, order: 0});
      new ViewComponent('b', {context: ctx, order: 5});
      new ViewComponent('c', {context: ctx, order: 10});
      const mover = new ViewComponent('mover', {context: ctx, order: 99});

      mover.order = 1;

      expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['a', 'mover', 'b', 'c']);
    });

    it('ignores a component whose entry a namesake has taken away', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'twin'});
      const b = new ViewComponent('b', {context: ctx, uuid: 'twin'});

      // the twins share one entry, and b takes it with it
      b.destroy();
      ctx.removeSubTree('twin');

      expect(() => {
        a.order = 3;
      }).not.toThrow();
      expect(ctx.hasComponent(a)).toBe(false);
      expect(ctx.isRootComponent(a)).toBe(false);
      // a re-inserted uuid without a view instance makes the next clear() panic
      expect(() => ctx.clear()).not.toThrow();
    });

    it('ignores a component of a disposed context', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});

      ctx.dispose();

      expect(() => {
        a.order = 7;
      }).not.toThrow();
      expect(ctx.hasComponents()).toBe(false);
    });
  });

  describe('removeFromParent', () => {
    it('survives a child that was already deleted from the context', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      const child = new ViewComponent('c', {context: ctx, parent});

      // buildChangeTrails() drops a component that never made it into a trail
      ctx.destroyComponent(child);
      ctx.buildChangeTrails();

      expect(() => child.destroy()).not.toThrow();
      expect(ctx.getChildren(parent)).toEqual([]);
      expect(ctx.isRootComponent(child)).toBe(false);
    });
  });

  describe('properties', () => {
    it('treats setProperty(undefined) like a removal, so a following removeProperty is a no-op', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      a.setProperty('foo', 'bar');
      ctx.buildChangeTrails();

      a.setProperty('foo', undefined);
      expect(ctx.buildChangeTrails()).toEqual([
        {type: ComponentChangeType.ChangeProperties, uuid: a.uuid, properties: [['foo', undefined]]},
      ]);

      a.removeProperty('foo');
      expect(ctx.buildChangeTrails()).toEqual([]);
    });

    it('re-emits a property after it was set to undefined', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      a.setProperty('foo', 'bar');
      ctx.buildChangeTrails();

      a.setProperty('foo', undefined);
      ctx.buildChangeTrails();

      expect(a.setProperty('foo', 'bar')).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([
        {type: ComponentChangeType.ChangeProperties, uuid: a.uuid, properties: [['foo', 'bar']]},
      ]);
    });

    it('leaves a change trail it has already handed out untouched', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      a.setProperty('foo', 'bar');
      const first = ctx.buildChangeTrails();

      a.setProperty('foo', 'baz');
      ctx.buildChangeTrails();

      expect(first).toEqual([{type: ComponentChangeType.CreateEntities, uuid: a.uuid, token: 'a', properties: [['foo', 'bar']]}]);
    });
  });

  describe('clear', () => {
    it('detaches every component it held', () => {
      ctx = makeContext();
      const root = new ViewComponent('root', {context: ctx});
      const child = new ViewComponent('child', {context: ctx, parent: root});
      ctx.buildChangeTrails();

      ctx.clear();

      for (const vc of [root, child]) {
        expect(vc.isDestroyed, `${vc.token}.isDestroyed`).toBe(true);
        expect(vc.context, `${vc.token}.context`).toBeUndefined();
        expect(vc.setProperty('x', 1), `${vc.token}.setProperty()`).toBe(false);
        expect(ctx.hasComponent(vc), `hasComponent(${vc.token})`).toBe(false);
      }
    });

    it('detaches a component whose uuid a namesake has taken away', () => {
      ctx = makeContext();
      const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin'});
      const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      ctx.clear();

      for (const vc of [displaced, namesake]) {
        expect(vc.isDestroyed, `${vc.token}.isDestroyed`).toBe(true);
        expect(vc.context, `${vc.token}.context`).toBeUndefined();
      }
    });

    it('stays silent on a second call', () => {
      ctx = makeContext();
      const root = new ViewComponent('root', {context: ctx});
      new ViewComponent('child', {context: ctx, parent: root});
      ctx.buildChangeTrails();

      ctx.clear();

      expect(() => ctx.clear()).not.toThrow();
    });
  });

  describe('destroyComponent', () => {
    it('detaches the component it destroys', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx});
      const child = new ViewComponent('child', {context: ctx, parent});
      ctx.buildChangeTrails();

      ctx.destroyComponent(child);

      expect(child.isDestroyed).toBe(true);
      expect(child.context).toBeUndefined();
      expect(child.setProperty('x', 1)).toBe(false);
      expect(ctx.getChildren(parent)).toEqual([]);
      expect(ctx.buildChangeTrails()).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: child.uuid}]);
    });

    it('destroys an entry only once, so a component that re-joins survives the next trail', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      ctx.buildChangeTrails();

      ctx.destroyComponent(a);
      ctx.destroyComponent(a);

      a.context = ctx;

      // a second destroy on the same entry would put the destroy count ahead of the create
      // count, and the next trail would take the entity down again
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(a.isDestroyed).toBe(false);
      expect(ctx.hasComponent(a)).toBe(true);
    });

    it('takes a component back in that re-joins before the next trail', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      ctx.buildChangeTrails();

      ctx.destroyComponent(a);
      a.context = ctx;

      expect(a.isDestroyed).toBe(false);
      expect(ctx.hasComponent(a)).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
    });

    it('releases a component whose uuid a namesake has taken away without taking the namesake down', () => {
      ctx = makeContext();
      const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin'});
      const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      ctx.destroyComponent(displaced);

      expect(displaced.isDestroyed).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(namesake.isDestroyed).toBe(false);
      expect(ctx.hasComponent(namesake)).toBe(true);
    });

    it('leaves a namesake in place when the component it displaced was a root and the namesake is not', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx});
      const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin'});
      const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin', parent});
      ctx.buildChangeTrails();

      ctx.destroyComponent(displaced);

      expect(displaced.isDestroyed).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(ctx.isRootComponent(namesake)).toBe(false);
      expect(ctx.getChildren(parent).map((c) => c.token)).toEqual(['namesake']);
    });

    it('leaves a namesake in place when the component it displaced was itself a child', () => {
      ctx = makeContext();
      const oldParent = new ViewComponent('oldParent', {context: ctx});
      const newParent = new ViewComponent('newParent', {context: ctx});
      const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin', parent: oldParent});
      const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin', parent: newParent});
      ctx.buildChangeTrails();

      ctx.destroyComponent(displaced);

      expect(displaced.isDestroyed).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(ctx.isRootComponent(namesake)).toBe(false);
      expect(ctx.getChildren(newParent).map((c) => c.token)).toEqual(['namesake']);
    });
  });

  describe('removeSubTree', () => {
    it('detaches every component it takes down', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx});
      const child = new ViewComponent('child', {context: ctx, parent});
      ctx.buildChangeTrails();

      ctx.removeSubTree(parent.uuid);

      for (const vc of [parent, child]) {
        expect(vc.isDestroyed, `${vc.token}.isDestroyed`).toBe(true);
        expect(vc.context, `${vc.token}.context`).toBeUndefined();
      }
      expect(ctx.hasComponents()).toBe(false);
      expect(ctx.buildChangeTrails()).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('reports isDisposed', () => {
      ctx = makeContext();

      expect(ctx.isDisposed).toBe(false);
      ctx.dispose();
      expect(ctx.isDisposed).toBe(true);
    });

    it('releases the namespace, so get() hands out a fresh context', () => {
      const ns = 'ComponentContext.spec-dispose-ns';
      const first = ComponentContext.get(ns);

      first.dispose();

      const second = ComponentContext.get(ns);

      expect(second).not.toBe(first);
      expect(second.isDisposed).toBe(false);

      second.dispose();
    });

    it('does not hand out the disposed context via the constructor either', () => {
      const ns = 'ComponentContext.spec-dispose-ctor-ns';
      const first = new ComponentContext(ns);

      first.dispose();

      const second = new ComponentContext(ns);

      expect(second).not.toBe(first);

      second.dispose();
    });

    it('destroys every view component it holds', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx});
      const child = new ViewComponent('child', {context: ctx, parent});
      const grandChild = new ViewComponent('grandChild', {context: ctx, parent: child});

      ctx.dispose();

      expect(parent.isDestroyed).toBe(true);
      expect(child.isDestroyed).toBe(true);
      expect(grandChild.isDestroyed).toBe(true);
    });

    it('destroys a component whose uuid a namesake has taken away', () => {
      ctx = makeContext();
      const displaced = new ViewComponent('displaced', {context: ctx, uuid: 'twin'});
      const namesake = new ViewComponent('namesake', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      ctx.dispose();

      for (const vc of [displaced, namesake]) {
        expect(vc.isDestroyed, `${vc.token}.isDestroyed`).toBe(true);
        expect(vc.context, `${vc.token}.context`).toBeUndefined();
      }
    });

    it('holds no components afterwards', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      new ViewComponent('b', {context: ctx, parent: a});

      ctx.dispose();

      expect(ctx.hasComponents()).toBe(false);
      expect(ctx.traverseLevelOrderBFS()).toEqual([]);
      expect(ctx.buildChangeTrails()).toEqual([]);
    });

    it('can be disposed twice', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx});

      ctx.dispose();

      expect(() => ctx.dispose()).not.toThrow();
      expect(ctx.isDisposed).toBe(true);
    });

    it('tolerates clear() afterwards', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx});
      ctx.dispose();

      expect(() => ctx.clear()).not.toThrow();
    });

    it('rejects a view component that tries to join it', () => {
      ctx = makeContext();
      ctx.dispose();

      expect(() => new ViewComponent('a', {context: ctx})).toThrow(/disposed/);
    });

    it('rejects a view component that is re-assigned to it', () => {
      ctx = makeContext();
      const other = makeContext();
      const c = new ViewComponent('a', {context: other});

      ctx.dispose();

      expect(() => {
        c.context = ctx;
      }).toThrow(/disposed/);

      other.clear();
    });

    it('does not resurrect a root entry through changeOrder', () => {
      ctx = makeContext();
      const c = new ViewComponent('a', {context: ctx});

      ctx.dispose();
      ctx.changeOrder(c);

      expect(ctx.hasComponents()).toBe(false);
      expect(ctx.traverseLevelOrderBFS()).toEqual([]);
    });

    it('leaves a fresh context for the same namespace untouched', () => {
      const ns = 'ComponentContext.spec-dispose-isolation-ns';
      const first = ComponentContext.get(ns);
      new ViewComponent('old', {context: first});

      first.dispose();

      const second = ComponentContext.get(ns);
      const fresh = new ViewComponent('fresh', {context: second});

      expect(second.hasComponent(fresh)).toBe(true);
      expect(second.buildChangeTrails()).toHaveLength(1);

      second.dispose();
    });
  });

  describe('reCreateChanges', () => {
    it('restores the order of a component that was re-parented without an order change', () => {
      ctx = makeContext();
      const oldParent = new ViewComponent('oldParent', {context: ctx});
      const newParent = new ViewComponent('newParent', {context: ctx});
      const child = new ViewComponent('child', {context: ctx, parent: oldParent, order: 42});
      ctx.buildChangeTrails();

      newParent.addChild(child);
      ctx.buildChangeTrails();

      ctx.reCreateChanges();
      const trail = ctx.buildChangeTrails();

      const recreated = trail.find((t) => t.uuid === child.uuid) as {order?: number; parentUuid?: string};

      expect(recreated).toBeDefined();
      expect(recreated.parentUuid).toBe(newParent.uuid);
      expect(recreated.order).toBe(42);
    });

    it('restores the token, parent and properties of every component', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx});
      const child = new ViewComponent('child', {context: ctx, parent});
      child.setProperty('foo', 'bar');
      ctx.buildChangeTrails();

      ctx.reCreateChanges();
      const trail = ctx.buildChangeTrails();

      expect(trail).toEqual([
        {type: ComponentChangeType.CreateEntities, uuid: parent.uuid, token: 'parent'},
        {
          type: ComponentChangeType.CreateEntities,
          uuid: child.uuid,
          token: 'child',
          parentUuid: parent.uuid,
          properties: [['foo', 'bar']],
        },
      ]);
    });

    it('does nothing when there is no memory to recreate from', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx});

      expect(() => ctx.reCreateChanges()).not.toThrow();
      expect(ctx.buildChangeTrails()).toHaveLength(1);
    });
  });

  describe('tree invariants', () => {
    it('leaves no unreachable component behind, so clear() does not panic', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      new ViewComponent('a', {context: ctx, parent, order: 0});
      new ViewComponent('b', {context: ctx, parent, order: 5});
      new ViewComponent('c', {context: ctx, parent, order: 10});
      new ViewComponent('gap', {context: ctx, parent, order: 1});

      expect(() => ctx.clear()).not.toThrow();
    });

    it('detaches a removed sub tree from the children list of its parent', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      const b = new ViewComponent('b', {context: ctx, parent: a});
      new ViewComponent('c', {context: ctx, parent: b});

      ctx.removeSubTree(b.uuid);

      expect(ctx.getChildren(a)).toEqual([]);
    });

    it('can still add children to a parent that lost a sub tree', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      const b = new ViewComponent('b', {context: ctx, parent: a});
      new ViewComponent('c', {context: ctx, parent: b});

      ctx.removeSubTree(b.uuid);

      const fresh = new ViewComponent('fresh', {context: ctx, parent: a, order: 3});

      expect(ctx.getChildren(a).map((x) => x.token)).toEqual(['fresh']);
      expect(fresh.parent).toBe(a);
    });

    it('keeps the children reachable when a uuid is registered by a new component', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'reused'});
      const kid = new ViewComponent('kid', {context: ctx, parent: a});
      ctx.buildChangeTrails();

      // a second component claims the same uuid without the first one being destroyed
      new ViewComponent('a2', {context: ctx, uuid: 'reused'});

      expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toContain('kid');
      expect(kid.parent).toBeUndefined();
      expect(ctx.isRootComponent(kid)).toBe(true);
      expect(() => ctx.clear()).not.toThrow();
    });

    it('survives removeSubTree on a children list that contains a cycle', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx});
      const b = new ViewComponent('b', {context: ctx, parent: a});

      // bypass the ViewComponent cycle guard to simulate a corrupted children list
      ctx.addToChildren(b, a);

      expect(() => ctx.removeSubTree(a.uuid)).not.toThrow();
      expect(ctx.hasComponent(a)).toBe(false);
      expect(ctx.hasComponent(b)).toBe(false);
    });

    it('every component is either a root or a child of a known parent', () => {
      ctx = makeContext();
      const parent = new ViewComponent('p', {context: ctx});
      const all = [parent];
      for (const order of [0, 5, 10, 1, 7, 2]) {
        all.push(new ViewComponent(`o${order}`, {context: ctx, parent, order}));
      }

      const reachable = new Set(ctx.traverseLevelOrderBFS().map((c) => c.uuid));

      expect(all.filter((c) => !reachable.has(c.uuid))).toEqual([]);
    });
  });
});