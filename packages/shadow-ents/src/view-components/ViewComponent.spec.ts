import {afterAll, describe, expect, it} from 'vitest';
import {ComponentContext} from './ComponentContext.js';
import {ViewComponent} from './ViewComponent.js';

describe('EntityProxy', () => {
  const ctx = ComponentContext.get();

  afterAll(() => {
    ctx.clear();
  });

  it('should be defined', () => {
    expect(ViewComponent).toBeDefined();
  });

  it('should create new entity', () => {
    const entity = new ViewComponent('test');
    expect(entity.uuid).toBeDefined();
    expect(entity.token).toBe('test');
    expect(entity.parent).toBeUndefined();
    expect(ctx.hasComponent(entity)).toBeTruthy();
    expect(ctx.isRootComponent(entity)).toBeTruthy();
  });

  it('should use uuid from params', () => {
    const entity = new ViewComponent('test', {uuid: 'fooBar123'});
    expect(entity.uuid).toBe('fooBar123');
  });

  it('should use order from params', () => {
    const entity = new ViewComponent('test', {order: 66});
    expect(entity.order).toBe(66);
  });

  it('should use parent from params', () => {
    const parent = new ViewComponent('parent');
    const entity = new ViewComponent('test', {parent});
    expect(entity.parent).toBe(parent);
  });

  it('should use parent param as alternative to options', () => {
    const parent = new ViewComponent('parent');
    const entity = new ViewComponent('test', parent);
    expect(entity.parent).toBe(parent);
  });

  it('should use context from params', () => {
    const context = ComponentContext.get('myCtx');
    const entity = new ViewComponent('test', {context});
    expect(entity.context).toBe(context);
    context.clear();
  });

  it('should destroy entity', () => {
    const entity = new ViewComponent('test');
    expect(ctx.hasComponent(entity)).toBeTruthy();
    entity.destroy();
    expect(ctx.hasComponent(entity)).toBeFalsy();
  });

  it('should add entity as child (constructor)', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test', parent);
    const ctx = ComponentContext.get();

    expect(ctx.hasComponent(parent)).toBeTruthy();
    expect(ctx.hasComponent(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootComponent(child)).toBeFalsy();
  });

  it('should add entity as child (addChild)', () => {
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
});
