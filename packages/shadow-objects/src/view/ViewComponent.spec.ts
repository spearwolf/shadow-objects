import {on} from '@spearwolf/eventize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ComponentChangeType, VoidToken} from '../constants.js';
import {ComponentContext} from './ComponentContext.js';
import {ViewComponent} from './ViewComponent.js';

describe('ViewComponent', () => {
  const ctx = ComponentContext.get();

  afterEach(() => {
    ctx.clear();
  });

  it('should be defined', () => {
    expect(ViewComponent).toBeDefined();
  });

  it('should create', () => {
    const c = new ViewComponent('test');
    expect(c.uuid).toBeDefined();
    expect(c.token).toBe('test');
    expect(c.parent).toBeUndefined();
    expect(ctx.hasComponent(c)).toBeTruthy();
    expect(ctx.isRootComponent(c)).toBeTruthy();
  });

  it('should use uuid from params', () => {
    const c = new ViewComponent('test', {uuid: 'fooBar123'});
    expect(c.uuid).toBe('fooBar123');
  });

  it('should use order from params', () => {
    const c = new ViewComponent('test', {order: 66});
    expect(c.order).toBe(66);
  });

  it('should use parent from params', () => {
    const parent = new ViewComponent('parent');
    const child = new ViewComponent('test', {parent});
    expect(child.parent).toBe(parent);
  });

  it('should use parent param as alternative to options', () => {
    const parent = new ViewComponent('parent');
    const child = new ViewComponent('test', parent);
    expect(child.parent).toBe(parent);
  });

  it('should use context from params', () => {
    const context = ComponentContext.get('myCtx');
    const child = new ViewComponent('test', {context});
    expect(child.context).toBe(context);
    context.clear();
  });

  describe('autoDestructionOnParentRemoval', () => {
    it('defaults to false', () => {
      const c = new ViewComponent('test');
      expect(c.autoDestructionOnParentRemoval).toBe(false);
    });

    it('is exposed via constructor option', () => {
      const c = new ViewComponent('test', {autoDestructionOnParentRemoval: true});
      expect(c.autoDestructionOnParentRemoval).toBe(true);
    });

    it('flows into the change-trail entry produced for the component', () => {
      const ctxLocal = ComponentContext.get('autoDestructTrailCtx');
      const c = new ViewComponent('test', {context: ctxLocal, autoDestructionOnParentRemoval: true});

      const trail = ctxLocal.buildChangeTrails();

      const createEntry = trail.find((e) => e.type === ComponentChangeType.CreateEntities && e.uuid === c.uuid) as
        | {autoDestructionOnParentRemoval?: boolean}
        | undefined;

      expect(createEntry).toBeDefined();
      expect(createEntry!.autoDestructionOnParentRemoval).toBe(true);

      ctxLocal.clear();
    });

    it('omits the flag from the trail entry when false', () => {
      const ctxLocal = ComponentContext.get('autoDestructFalseCtx');
      const c = new ViewComponent('test', {context: ctxLocal});

      const trail = ctxLocal.buildChangeTrails();

      const createEntry = trail.find((e) => e.type === ComponentChangeType.CreateEntities && e.uuid === c.uuid);
      expect(createEntry).toBeDefined();
      expect(createEntry).not.toHaveProperty('autoDestructionOnParentRemoval');

      ctxLocal.clear();
    });
  });

  it('should destroy after changeTrail', () => {
    const c = new ViewComponent('test');
    expect(ctx.hasComponent(c)).toBeTruthy();
    ctx.buildChangeTrails();
    c.destroy();
    ctx.buildChangeTrails();
    expect(ctx.hasComponent(c)).toBeFalsy();
  });

  it('should create and destroy in same changeTrail', () => {
    const c = new ViewComponent('ttt123');
    expect(ctx.hasComponent(c)).toBeTruthy();
    c.destroy();
    expect(ctx.buildChangeTrails()).toHaveLength(0);
    expect(ctx.hasComponent(c)).toBeFalsy();
  });

  it('should add as child (constructor)', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test', parent);

    expect(ctx.hasComponent(parent)).toBeTruthy();
    expect(ctx.hasComponent(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootComponent(child)).toBeFalsy();
  });

  it('should add as child (addChild)', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test');

    expect(ctx.hasComponent(parent)).toBeTruthy();
    expect(ctx.hasComponent(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeFalsy();
    expect(ctx.isRootComponent(child)).toBeTruthy();

    parent.addChild(child);

    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootComponent(child)).toBeFalsy();
  });

  it('should remove from parent', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test', parent);

    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootComponent(parent)).toBeTruthy();

    child.removeFromParent();

    expect(child.parent).toBeUndefined();
    expect(ctx.isChildOf(child, parent)).toBeFalsy();
    expect(ctx.isRootComponent(child)).toBeTruthy();
  });

  it('should set parent', () => {
    const a = new ViewComponent('test');
    const b = new ViewComponent('test', a);
    const c = new ViewComponent('test');

    expect(ctx.isChildOf(b, a)).toBeTruthy();
    expect(ctx.isChildOf(b, c)).toBeFalsy();

    b.parent = c;

    expect(b.parent).toBe(c);
    expect(ctx.isChildOf(b, a)).toBeFalsy();
    expect(ctx.isChildOf(b, c)).toBeTruthy();
  });

  it('should disconnect from context', () => {
    const otherCtx = ComponentContext.get('otherCtx');

    const a = new ViewComponent('a');
    const b = new ViewComponent('b', {context: otherCtx});
    const c = new ViewComponent('c', a);

    expect(ctx.isChildOf(c, a)).toBeTruthy();
    expect(otherCtx.isChildOf(c, b)).toBeFalsy();

    c.context = otherCtx;

    expect(c.parent).toBeUndefined();

    c.parent = b;

    expect(ctx.isChildOf(c, a)).toBeFalsy();
    expect(otherCtx.isChildOf(c, b)).toBeTruthy();

    otherCtx.clear();
  });

  it('keeps its listeners when it moves to another context', () => {
    // a move hands the component on, it does not end it: what a consumer subscribed to keeps
    // answering at the new place
    const otherCtx = ComponentContext.get('ViewComponent.spec-move');

    const c = new ViewComponent('test');
    const spy = vi.fn();
    on(c, 'testEvent', spy);

    c.context = otherCtx;

    c.dispatchEvent('testEvent', 1, false);

    expect(spy).toHaveBeenCalledTimes(1);

    otherCtx.dispose();
  });

  it('keeps its listeners when it leaves its context without joining another', () => {
    // the path a <shae-ent> takes when it leaves the document: the component is handed back and
    // taken in again on re-append, so everything a consumer put on it has to survive the round
    const c = new ViewComponent('test');
    const spy = vi.fn();
    on(c, 'testEvent', spy);

    c.context = undefined;

    expect(c.isDestroyed).toBe(true);

    c.dispatchEvent('testEvent', 1, false);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should dispatch event without traverseChildren', () => {
    const parent = new ViewComponent('parent');
    const child = new ViewComponent('child', parent);
    const grandChild = new ViewComponent('grandChild', child);

    const parentSpy = vi.fn();
    const childSpy = vi.fn();
    const grandChildSpy = vi.fn();

    on(parent, 'testEvent', parentSpy);
    on(child, 'testEvent', childSpy);
    on(grandChild, 'testEvent', grandChildSpy);

    parent.dispatchEvent('testEvent', {foo: 'bar'}, false);

    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(parentSpy).toHaveBeenCalledWith({foo: 'bar'});
    expect(childSpy).not.toHaveBeenCalled();
    expect(grandChildSpy).not.toHaveBeenCalled();
  });

  it('should dispatch event with traverseChildren=true to all descendants', () => {
    const parent = new ViewComponent('parent');
    const child1 = new ViewComponent('child1', parent);
    const child2 = new ViewComponent('child2', parent);
    const grandChild1 = new ViewComponent('grandChild1', child1);
    const grandChild2 = new ViewComponent('grandChild2', child1);

    const parentSpy = vi.fn();
    const child1Spy = vi.fn();
    const child2Spy = vi.fn();
    const grandChild1Spy = vi.fn();
    const grandChild2Spy = vi.fn();

    on(parent, 'testEvent', parentSpy);
    on(child1, 'testEvent', child1Spy);
    on(child2, 'testEvent', child2Spy);
    on(grandChild1, 'testEvent', grandChild1Spy);
    on(grandChild2, 'testEvent', grandChild2Spy);

    parent.dispatchEvent('testEvent', {data: 123}, true);

    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(parentSpy).toHaveBeenCalledWith({data: 123});

    expect(child1Spy).toHaveBeenCalledTimes(1);
    expect(child1Spy).toHaveBeenCalledWith({data: 123});

    expect(child2Spy).toHaveBeenCalledTimes(1);
    expect(child2Spy).toHaveBeenCalledWith({data: 123});

    expect(grandChild1Spy).toHaveBeenCalledTimes(1);
    expect(grandChild1Spy).toHaveBeenCalledWith({data: 123});

    expect(grandChild2Spy).toHaveBeenCalledTimes(1);
    expect(grandChild2Spy).toHaveBeenCalledWith({data: 123});
  });

  describe('cycle protection', () => {
    it('rejects a component as its own child', () => {
      const a = new ViewComponent('a');

      expect(() => a.addChild(a)).toThrow(/cycle/);
      expect(a.parent).toBeUndefined();
      expect(ctx.isRootComponent(a)).toBe(true);
    });

    it('rejects a component as its own parent', () => {
      const a = new ViewComponent('a');

      expect(() => {
        a.parent = a;
      }).toThrow(/cycle/);
    });

    it('rejects the direct parent as a child', () => {
      const a = new ViewComponent('a');
      const b = new ViewComponent('b', a);

      expect(() => b.addChild(a)).toThrow(/cycle/);
    });

    it('rejects a distant ancestor as a child', () => {
      const a = new ViewComponent('a');
      const b = new ViewComponent('b', a);
      const c = new ViewComponent('c', b);

      expect(() => c.addChild(a)).toThrow(/cycle/);
    });

    it('leaves the tree untouched when a cycle is rejected', () => {
      const a = new ViewComponent('a');
      const b = new ViewComponent('b', a);
      const c = new ViewComponent('c', b);

      expect(() => c.addChild(a)).toThrow();

      expect(a.parent).toBeUndefined();
      expect(b.parent).toBe(a);
      expect(c.parent).toBe(b);
      expect(ctx.isRootComponent(a)).toBe(true);
      expect(ctx.getChildren(a).map((x) => x.token)).toEqual(['b']);
      expect(ctx.getChildren(b).map((x) => x.token)).toEqual(['c']);
      expect(ctx.getChildren(c)).toEqual([]);
    });

    it('still allows moving a subtree to an unrelated parent', () => {
      const a = new ViewComponent('a');
      const b = new ViewComponent('b', a);
      const other = new ViewComponent('other');

      expect(() => other.addChild(b)).not.toThrow();

      expect(b.parent).toBe(other);
      expect(ctx.getChildren(a)).toEqual([]);
    });

    it('still allows re-adding a child to its current parent', () => {
      const a = new ViewComponent('a');
      const b = new ViewComponent('b', a);

      expect(() => a.addChild(b)).not.toThrow();
      expect(ctx.getChildren(a).map((x) => x.token)).toEqual(['b']);
    });

    it('still allows moving a child up to its grandparent', () => {
      const a = new ViewComponent('a');
      const b = new ViewComponent('b', a);
      const c = new ViewComponent('c', b);

      expect(() => a.addChild(c)).not.toThrow();
      expect(c.parent).toBe(a);
    });
  });

  describe('setProperty return value', () => {
    it('reports true when the value differs from the last change trail', () => {
      const c = new ViewComponent('test');
      expect(c.setProperty('foo', 'bar')).toBe(true);
    });

    it('reports false when the value is unchanged since the last change trail', () => {
      const c = new ViewComponent('test');
      c.setProperty('foo', 'bar');
      ctx.buildChangeTrails();

      expect(c.setProperty('foo', 'bar')).toBe(false);
    });

    it('honours a custom isEqual comparator', () => {
      const c = new ViewComponent('test');
      c.setProperty('pos', {x: 1}, (a, b) => a?.x === b?.x);
      ctx.buildChangeTrails();

      expect(c.setProperty('pos', {x: 1}, (a, b) => a?.x === b?.x)).toBe(false);
      expect(c.setProperty('pos', {x: 2}, (a, b) => a?.x === b?.x)).toBe(true);
    });
  });

  describe('the token', () => {
    it('falls back to the void token when the constructor is given no token', () => {
      const c = new ViewComponent(undefined as unknown as string);
      expect(c.token).toBe(VoidToken);
    });

    it('falls back to the void token when the setter is given no token', () => {
      const c = new ViewComponent('test');
      c.token = undefined;
      expect(c.token).toBe(VoidToken);
    });
  });

  describe('the destroyed state', () => {
    const makeDestroyed = () => {
      const c = new ViewComponent('test');
      ctx.buildChangeTrails();
      c.destroy();
      return c;
    };

    it('reports isDestroyed after destroy()', () => {
      const c = new ViewComponent('test');
      expect(c.isDestroyed).toBe(false);
      c.destroy();
      expect(c.isDestroyed).toBe(true);
    });

    it('reports isDestroyed as false again after being attached to a context', () => {
      const c = makeDestroyed();
      c.context = ctx;
      expect(c.isDestroyed).toBe(false);
    });

    it('ignores a token change', () => {
      const c = makeDestroyed();
      expect(() => {
        c.token = 'other';
      }).not.toThrow();
      expect(c.token).toBe('other');
    });

    it('ignores an order change', () => {
      const c = makeDestroyed();
      expect(() => {
        c.order = 5;
      }).not.toThrow();
      expect(c.order).toBe(5);
    });

    it('ignores setProperty and reports that nothing was written', () => {
      const c = makeDestroyed();
      expect(c.setProperty('foo', 'bar')).toBe(false);
    });

    it('ignores removeProperty', () => {
      const c = makeDestroyed();
      expect(() => c.removeProperty('foo')).not.toThrow();
    });

    it('ignores dispatchShadowObjectsEvent', () => {
      const c = makeDestroyed();
      expect(() => c.dispatchShadowObjectsEvent('foo', 123)).not.toThrow();
    });

    it('ignores removeFromParent', () => {
      const c = makeDestroyed();
      expect(() => c.removeFromParent()).not.toThrow();
    });

    it('ignores a second destroy()', () => {
      const c = makeDestroyed();
      expect(() => c.destroy()).not.toThrow();
      expect(c.isDestroyed).toBe(true);
    });

    // the teardown takes off what lies on the component in that moment, it does not seal it
    it('notifies a listener registered after the teardown, without traversing children', () => {
      const c = makeDestroyed();
      const spy = vi.fn();
      on(c, 'testEvent', spy);

      expect(() => c.dispatchEvent('testEvent', 42, true)).not.toThrow();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(42);
    });

    it('takes the listeners a consumer left on it off', () => {
      const c = new ViewComponent('test');
      const spy = vi.fn();
      const unsubscribe = on(c, 'testEvent', spy);

      ctx.buildChangeTrails();
      c.destroy();

      c.dispatchEvent('testEvent', 42, false);

      expect(spy).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('announces the teardown before it goes silent', () => {
      const c = new ViewComponent('test');
      const seen: boolean[] = [];
      on(c, ViewComponent.Destroyed, () => seen.push(c.isDestroyed));

      ctx.buildChangeTrails();
      c.destroy();

      expect(seen).toEqual([true]);

      c.dispatchEvent(ViewComponent.Destroyed, undefined, false);

      expect(seen).toEqual([true]);
    });

    it('announces it again on a second destroy()', () => {
      const c = makeDestroyed();
      const spy = vi.fn();
      on(c, ViewComponent.Destroyed, spy);

      c.destroy();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('says nothing when the component only leaves its context', () => {
      const c = new ViewComponent('test');
      const spy = vi.fn();
      on(c, ViewComponent.Destroyed, spy);
      ctx.buildChangeTrails();

      c.context = null;

      expect(spy).not.toHaveBeenCalled();

      c.destroy();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('announces the teardown a context sweep runs', () => {
      const c = new ViewComponent('test');
      const spy = vi.fn();
      on(c, ViewComponent.Destroyed, spy);
      ctx.buildChangeTrails();

      ctx.clear();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('takes the listeners off a component that only left its context', () => {
      const c = new ViewComponent('test');
      const spy = vi.fn();
      on(c, 'testEvent', spy);
      ctx.buildChangeTrails();

      c.context = null;
      c.destroy();

      c.dispatchEvent('testEvent', 1, false);

      expect(spy).not.toHaveBeenCalled();
    });

    it('drops a dispatchEvent installed on the instance', () => {
      const c = new ViewComponent('test');

      // the shape an integration installs it in
      Object.defineProperty(c, 'dispatchEvent', {value: vi.fn(), writable: true, configurable: true});
      expect(Object.hasOwn(c, 'dispatchEvent')).toBe(true);

      c.destroy();

      expect(Object.hasOwn(c, 'dispatchEvent')).toBe(false);
      expect(c.dispatchEvent).toBe(ViewComponent.prototype.dispatchEvent);
    });

    it('rejects addChild with an explicit error instead of silently dropping the child', () => {
      const destroyed = makeDestroyed();
      const child = new ViewComponent('child');

      expect(() => destroyed.addChild(child)).toThrow(/destroyed/);
      expect(child.parent).toBeUndefined();
      expect(ctx.isRootComponent(child)).toBe(true);
    });

    it('rejects being re-parented with an explicit error', () => {
      const destroyed = makeDestroyed();
      const parent = new ViewComponent('parent');

      expect(() => {
        destroyed.parent = parent;
      }).toThrow(/destroyed/);
    });

    it('rejects being used as a parent via the constructor', () => {
      const destroyed = makeDestroyed();

      expect(() => new ViewComponent('child', {parent: destroyed})).toThrow(/destroyed/);
    });

    it('is destroyed by a clear() of its context and can re-join it', () => {
      const ownCtx = ComponentContext.get('ViewComponent.spec-cleared');
      const c = new ViewComponent('test', {context: ownCtx});
      ownCtx.buildChangeTrails();

      ownCtx.clear();

      expect(c.isDestroyed).toBe(true);
      expect(c.context).toBeUndefined();

      c.context = ownCtx;

      expect(c.isDestroyed).toBe(false);
      expect(ownCtx.hasComponent(c)).toBe(true);
      expect(c.setProperty('a', 1)).toBe(true);

      ownCtx.dispose();
    });

    it('takes off on a second destroy() what has been put on the component since the first', () => {
      const c = makeDestroyed();
      const spy = vi.fn();
      on(c, 'testEvent', spy);
      Object.defineProperty(c, 'dispatchEvent', {value: vi.fn(), writable: true, configurable: true});

      c.destroy();

      expect(Object.hasOwn(c, 'dispatchEvent')).toBe(false);

      c.dispatchEvent('testEvent', 1, false);

      expect(spy).not.toHaveBeenCalled();
    });

    it('takes the listeners off when its context is cleared', () => {
      const ownCtx = ComponentContext.get('ViewComponent.spec-cleared-listeners');
      const c = new ViewComponent('test', {context: ownCtx});
      const spy = vi.fn();
      on(c, 'testEvent', spy);
      ownCtx.buildChangeTrails();

      ownCtx.clear();

      c.dispatchEvent('testEvent', 1, false);

      expect(spy).not.toHaveBeenCalled();

      ownCtx.dispose();
    });

    it('leaves the listeners on a component that has moved on to another ComponentContext', () => {
      const first = ComponentContext.get('ViewComponent.spec-moved-on-1');
      const second = ComponentContext.get('ViewComponent.spec-moved-on-2');
      const holder = new ViewComponent('holder', {context: first, uuid: 'twin'});
      const spy = vi.fn();
      on(holder, 'testEvent', spy);
      first.buildChangeTrails();

      // the entry stays behind in `first` until its next change trail, the component does not
      holder.context = second;

      first.clear();

      holder.dispatchEvent('testEvent', 1, false);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(holder.isDestroyed).toBe(false);
      expect(second.hasComponent(holder)).toBe(true);

      first.dispose();
      second.dispose();
    });
  });

  describe('joining a disposed context', () => {
    it('throws and keeps the component in its current context', () => {
      const disposed = ComponentContext.get('ViewComponent.spec-disposed');
      disposed.dispose();

      const c = new ViewComponent('test');

      expect(() => {
        c.context = disposed;
      }).toThrow(/disposed/);

      expect(c.isDestroyed, 'the component must survive a rejected join').toBe(false);
      expect(c.context).toBe(ctx);
      expect(ctx.hasComponent(c)).toBe(true);
      expect(c.setProperty('foo', 'bar'), 'the component must still write to its old context').toBe(true);
    });

    it('leaves no component behind that reports itself as alive', () => {
      const disposed = ComponentContext.get('ViewComponent.spec-disposed-2');
      const c = new ViewComponent('test', {context: disposed});
      disposed.dispose();

      // the component was destroyed by dispose(), so re-joining is the only way back in
      expect(() => {
        c.context = disposed;
      }).toThrow(/disposed/);

      expect(c.isDestroyed).toBe(true);
    });
  });

  it('should dispatch event from child with traverseChildren=true without affecting parent', () => {
    const parent = new ViewComponent('parent');
    const child = new ViewComponent('child', parent);
    const grandChild = new ViewComponent('grandChild', child);

    const parentSpy = vi.fn();
    const childSpy = vi.fn();
    const grandChildSpy = vi.fn();

    on(parent, 'testEvent', parentSpy);
    on(child, 'testEvent', childSpy);
    on(grandChild, 'testEvent', grandChildSpy);

    child.dispatchEvent('testEvent', 'hello', true);

    expect(parentSpy).not.toHaveBeenCalled();
    expect(childSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledWith('hello');
    expect(grandChildSpy).toHaveBeenCalledTimes(1);
    expect(grandChildSpy).toHaveBeenCalledWith('hello');
  });
});