import {on} from '@spearwolf/eventize';
import {afterEach, describe, expect, it, vi} from 'vitest';
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
