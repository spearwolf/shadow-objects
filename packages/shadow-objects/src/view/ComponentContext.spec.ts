import {on} from '@spearwolf/eventize';
import {afterEach, describe, expect, it} from 'vitest';
import {ComponentChangeType} from '../constants.js';
import {ComponentContext, ComponentUuidInUseError} from './ComponentContext.js';
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

  describe('addComponent', () => {
    it('throws when a second component claims a uuid its holder still has', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});

      expect(() => new ViewComponent('claimant', {context: ctx, uuid: 'twin'})).toThrow(ComponentUuidInUseError);
      expect(holder.isDestroyed).toBe(false);
    });

    it('leaves the holder untouched when a claim is rejected', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});

      expect(() => new ViewComponent('claimant', {context: ctx, uuid: 'twin'})).toThrow(ComponentUuidInUseError);

      expect(ctx.hasComponent(holder)).toBe(true);
      expect(ctx.isRootComponent(holder)).toBe(true);
      expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['holder']);
      expect(ctx.buildChangeTrails()).toEqual([{type: ComponentChangeType.CreateEntities, uuid: 'twin', token: 'holder'}]);
    });

    it('keeps the children of the holder when a claim is rejected', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      const kid = new ViewComponent('kid', {context: ctx, parent: holder});
      ctx.buildChangeTrails();

      expect(() => new ViewComponent('claimant', {context: ctx, uuid: 'twin'})).toThrow(ComponentUuidInUseError);

      expect(ctx.getChildren(holder).map((c) => c.token)).toEqual(['kid']);
      expect(kid.parent).toBe(holder);
      expect(ctx.isRootComponent(kid)).toBe(false);
    });

    it('leaves no entity behind when a claim is rejected', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      expect(() => new ViewComponent('claimant', {context: ctx, uuid: 'twin'})).toThrow(ComponentUuidInUseError);

      holder.destroy();

      // the entity goes down with the one component that stood behind it. A second live claim on
      // the uuid would leave a create the destroy of the holder can no longer answer
      expect(ctx.buildChangeTrails()).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: 'twin'}]);
      expect(ctx.hasComponents()).toBe(false);
    });

    it('hands the uuid on once its holder has left', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});

      expect(ctx.hasComponent(successor)).toBe(true);
      expect(successor.isDestroyed).toBe(false);
      expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['successor']);
    });

    it('leaves exactly one entity behind when a uuid is handed on', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      successor.destroy();

      // create and destroy are counted against the uuid, and the successor takes the entry over
      // only after the holder has counted its own destroy — so the last trail can still take the
      // entity down
      expect(ctx.buildChangeTrails()).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: 'twin'}]);
      expect(ctx.hasComponents()).toBe(false);
    });

    it('takes a component back in under its own uuid', () => {
      ctx = makeContext();
      const vc = new ViewComponent('vc', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      vc.context = null;

      expect(() => {
        vc.context = ctx;
      }).not.toThrow();

      expect(ctx.hasComponent(vc)).toBe(true);
      expect(vc.isDestroyed).toBe(false);
    });

    it('rejects a move into a ComponentContext that holds the uuid, and leaves the component with none', () => {
      ctx = makeContext();
      const second = makeContext();
      const first = new ViewComponent('first', {context: ctx, uuid: 'twin'});
      const resident = new ViewComponent('resident', {context: second, uuid: 'twin'});

      expect(() => {
        first.context = second;
      }).toThrow(ComponentUuidInUseError);

      // a rejected join costs the component the ComponentContext it was leaving — the same price
      // every other rejected join asks, the disposed one aside
      expect(first.isDestroyed).toBe(true);
      expect(first.context).toBeUndefined();

      expect(second.hasComponent(resident)).toBe(true);
      expect(resident.isDestroyed).toBe(false);
      expect(second.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['resident']);

      second.dispose();
    });

    it('keeps the uuid of a component its own Destroyed listener takes back in', () => {
      ctx = makeContext();
      const vc = new ViewComponent('vc', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      // ViewComponent.Destroyed travels while the component can still act, so a listener there
      // may put it straight back into the ComponentContext
      on(vc, ViewComponent.Destroyed, () => {
        vc.context = ctx;
      });

      ctx.removeSubTree('twin');

      expect(vc.context).toBe(ctx);
      expect(ctx.hasComponent(vc)).toBe(true);
      expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['vc']);
      // and the uuid is held again, so it is not free for a second component
      expect(() => new ViewComponent('second', {context: ctx, uuid: 'twin'})).toThrow(ComponentUuidInUseError);
    });

    it('leaves a component alone that has moved on to another ComponentContext', () => {
      ctx = makeContext();
      const other = makeContext();
      const vc = new ViewComponent('vc', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      vc.context = other;

      // the entry stays behind here until the next change trail, but the component is no longer
      // a member — a sweep that went by the entries would tear it out of the other one
      ctx.clear();

      expect(vc.isDestroyed).toBe(false);
      expect(vc.context).toBe(other);
      expect(other.hasComponent(vc)).toBe(true);
      expect(other.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['vc']);
      expect(vc.setProperty('x', 1)).toBe(true);

      other.dispose();
    });
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

    it('ignores a component this ComponentContext no longer holds an entry for', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});

      // the entry belongs to the successor now, and removeSubTree takes it with it
      ctx.removeSubTree('twin');

      expect(successor.isDestroyed).toBe(true);
      expect(() => ctx.changeOrder(holder)).not.toThrow();
      expect(ctx.hasComponent(holder)).toBe(false);
      expect(ctx.isRootComponent(holder)).toBe(false);
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

    it('announces once for an entry a later component has taken over', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      const announced: string[] = [];
      on(holder, ViewComponent.Destroyed, () => announced.push('holder'));
      on(successor, ViewComponent.Destroyed, () => announced.push('successor'));

      ctx.clear();

      // one entry, one teardown: the sweep reaches the component holding the uuid, and the one
      // that left it behind is not taken down a second time
      expect(announced).toEqual(['successor']);
      expect(successor.isDestroyed).toBe(true);
      expect(successor.context).toBeUndefined();
      expect(ctx.hasComponents()).toBe(false);
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

    it('releases a component whose uuid a later component has taken over without taking that one down', () => {
      ctx = makeContext();
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      ctx.destroyComponent(holder);

      expect(holder.isDestroyed).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(successor.isDestroyed).toBe(false);
      expect(ctx.hasComponent(successor)).toBe(true);
    });

    it('leaves the successor in place when the component that left was a root and the successor is not', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx});
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin', parent});
      ctx.buildChangeTrails();

      ctx.destroyComponent(holder);

      expect(holder.isDestroyed).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(ctx.isRootComponent(successor)).toBe(false);
      expect(ctx.getChildren(parent).map((c) => c.token)).toEqual(['successor']);
    });

    it('leaves the successor in place when the component that left was itself a child', () => {
      ctx = makeContext();
      const oldParent = new ViewComponent('oldParent', {context: ctx});
      const newParent = new ViewComponent('newParent', {context: ctx});
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin', parent: oldParent});
      ctx.buildChangeTrails();

      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin', parent: newParent});
      ctx.buildChangeTrails();

      ctx.destroyComponent(holder);

      expect(holder.isDestroyed).toBe(true);
      expect(ctx.buildChangeTrails()).toEqual([]);
      expect(ctx.isRootComponent(successor)).toBe(false);
      expect(ctx.getChildren(newParent).map((c) => c.token)).toEqual(['successor']);
    });
  });

  describe('removeSubTree', () => {
    it('lets go of every component it takes down, so a later clear() does not reach one again', () => {
      ctx = makeContext();
      const parent = new ViewComponent('parent', {context: ctx, uuid: 'p'});
      const child = new ViewComponent('child', {context: ctx, parent, uuid: 'c'});
      ctx.buildChangeTrails();

      ctx.removeSubTree('p');

      // both are down and hold no ComponentContext; whoever listens from here on listens to a
      // component this one has already let go of
      const announced: string[] = [];
      on(parent, ViewComponent.Destroyed, () => announced.push('parent'));
      on(child, ViewComponent.Destroyed, () => announced.push('child'));

      ctx.clear();

      expect(announced).toEqual([]);
      expect(ctx.hasComponents()).toBe(false);
    });

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

    it('releases the namespace even while an entry outlives the component that left it', () => {
      ctx = makeContext();
      const ns = ctx.ns!;
      const holder = new ViewComponent('holder', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      // the entry survives until the next change trail, so the disposal has to walk past one
      // whose component is already gone
      holder.destroy();

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      ctx.dispose();

      expect(successor.isDestroyed).toBe(true);
      expect(successor.context).toBeUndefined();
      expect(ctx.isDisposed).toBe(true);
      expect(ctx.hasComponents()).toBe(false);
      expect(ComponentContext.get(ns)).not.toBe(ctx);

      ComponentContext.get(ns).dispose();
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

    it('keeps the children reachable when a later component takes the uuid over', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'reused'});
      const kid = new ViewComponent('kid', {context: ctx, parent: a});
      ctx.buildChangeTrails();

      a.destroy();

      // the uuid is free again, so a later component takes it over
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

    it('terminates the breadth-first walk when a children list points back at an ancestor', () => {
      ctx = makeContext();
      const r = new ViewComponent('r', {context: ctx, uuid: 'r'});
      const a = new ViewComponent('a', {context: ctx, parent: r, uuid: 'a'});
      const b = new ViewComponent('b', {context: ctx, parent: a, uuid: 'b'});

      // the primitive below `ViewComponent.addChild()`: it writes a children list without touching
      // the parent link, so `a` stands in two of them afterwards
      ctx.addToChildren(b, a);

      expect(ctx.traverseLevelOrderBFS().map((c) => c.uuid)).toEqual(['r', 'a', 'b']);
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

  describe('building a change trail and committing it', () => {
    it('reaches the same state as a build that commits on its own', () => {
      ctx = makeContext();
      const root = new ViewComponent('root', {context: ctx, uuid: 'root'});
      new ViewComponent('kid', {context: ctx, parent: root, uuid: 'kid'});

      const trail = ctx.buildChangeTrails(false);
      ctx.commitChangeTrail(trail.length);

      expect(ctx.buildChangeTrails(), 'nothing is left pending').toEqual([]);

      // the Component Memory carries the same two components as a self-committing build would
      ctx.reCreateChanges();
      expect(ctx.buildChangeTrails().map((entry) => entry.uuid)).toEqual(['root', 'kid']);
    });

    it('sends an entry nobody applied out again with the next trail', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx, uuid: 'a'});

      const first = ctx.buildChangeTrails(false);
      ctx.commitChangeTrail(0);

      expect(ctx.buildChangeTrails(false)).toEqual(first);
    });

    it('sends the entries behind the line out again and none ahead of it', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'a'});
      const b = new ViewComponent('b', {context: ctx, uuid: 'b'});
      const c = new ViewComponent('c', {context: ctx, uuid: 'c'});
      ctx.buildChangeTrails();

      a.token = 'a2';
      b.token = 'b2';
      c.token = 'c2';
      a.setProperty('p', 1);
      b.setProperty('p', 2);

      const first = ctx.buildChangeTrails(false);
      expect(first).toHaveLength(5);

      ctx.commitChangeTrail(2);

      expect(ctx.buildChangeTrails(false)).toEqual(first.slice(2));
    });

    // A component can hold a creation and an event in one and the same trail. Committing per
    // component instead of per entry would send the creation a second time, and a creation that
    // names a uuid the Shadow Environment already holds replaces the entity behind it.
    it('commits entry by entry, not component by component', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'a'});
      new ViewComponent('b', {context: ctx, uuid: 'b'});
      new ViewComponent('c', {context: ctx, uuid: 'c'});
      new ViewComponent('d', {context: ctx, uuid: 'd'});
      a.dispatchShadowObjectsEvent('ping', 1);

      const first = ctx.buildChangeTrails(false);
      expect(first.map((entry) => entry.type)).toEqual([
        ComponentChangeType.CreateEntities,
        ComponentChangeType.CreateEntities,
        ComponentChangeType.CreateEntities,
        ComponentChangeType.CreateEntities,
        ComponentChangeType.SendEvents,
      ]);

      ctx.commitChangeTrail(1);

      const second = ctx.buildChangeTrails(false);

      expect(second).toEqual(first.slice(1));
      expect(second.some((entry) => entry.type === ComponentChangeType.CreateEntities && entry.uuid === 'a')).toBe(false);
    });

    it('keeps the entry of a component whose destruction nobody applied', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'a'});
      ctx.buildChangeTrails();

      a.destroy();

      const first = ctx.buildChangeTrails(false);
      expect(first).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: 'a'}]);

      ctx.commitChangeTrail(0);

      expect(ctx.hasComponent(a), 'the entry stands until the destruction is applied').toBe(true);
      expect(ctx.buildChangeTrails(false)).toEqual(first);
    });

    // Between the build and the commit lies a round trip, and a uuid its holder has left is free
    // again in the meantime.
    it('leaves the entry alone when another component has taken the uuid over', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'twin'});
      ctx.buildChangeTrails();

      a.destroy();
      const trail = ctx.buildChangeTrails(false);

      const successor = new ViewComponent('successor', {context: ctx, uuid: 'twin'});
      ctx.commitChangeTrail(trail.length);

      expect(ctx.hasComponent(successor)).toBe(true);
      expect(ctx.traverseLevelOrderBFS().map((c) => c.token)).toEqual(['successor']);
      expect(ctx.buildChangeTrails(false)).toEqual([
        {type: ComponentChangeType.CreateEntities, uuid: 'twin', token: 'successor'},
      ]);
    });

    // Two sync cycles can be in flight at once. The older trail then falls back on the optimistic
    // reading -- everything it carried counts as applied -- rather than on a state in which two
    // trails claim the same entries.
    it('commits an open trail in full when a second build comes before its commit', () => {
      ctx = makeContext();
      new ViewComponent('a', {context: ctx, uuid: 'a'});

      const first = ctx.buildChangeTrails(false);
      expect(first.map((entry) => entry.uuid)).toEqual(['a']);

      new ViewComponent('b', {context: ctx, uuid: 'b'});

      const second = ctx.buildChangeTrails(false);
      expect(second.map((entry) => entry.uuid)).toEqual(['b']);
    });

    // A component can be destroyed while the trail it contributed to is still travelling. The
    // destruction was not part of that trail and has to go out with the next one, so the entry
    // has to survive the commit -- dropping it here would leave the entity standing in the
    // Shadow Environment with nothing left to take it down.
    it('still sends the destruction of a component that was destroyed while the trail travelled', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'a'});
      ctx.buildChangeTrails();

      a.setProperty('p', 1);
      const trail = ctx.buildChangeTrails(false);
      expect(trail).toHaveLength(1);

      a.destroy();
      ctx.commitChangeTrail(trail.length);

      expect(ctx.hasComponent(a), 'the entry stands until its destruction has been sent').toBe(true);
      expect(ctx.buildChangeTrails(false)).toEqual([{type: ComponentChangeType.DestroyEntities, uuid: 'a'}]);
    });

    it('takes the pending events over when it recreates the components from the memory', () => {
      ctx = makeContext();
      const a = new ViewComponent('a', {context: ctx, uuid: 'a'});
      ctx.buildChangeTrails();

      a.dispatchShadowObjectsEvent('ping', 1);
      ctx.reCreateChanges();

      expect(ctx.buildChangeTrails()).toEqual([
        {type: ComponentChangeType.CreateEntities, uuid: 'a', token: 'a'},
        {type: ComponentChangeType.SendEvents, uuid: 'a', events: [{type: 'ping', data: 1}]},
      ]);
    });
  });
});