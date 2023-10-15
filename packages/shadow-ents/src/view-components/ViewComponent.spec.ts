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
    expect(ctx.hasEntity(entity)).toBeTruthy();
    expect(ctx.isRootEntity(entity)).toBeTruthy();
  });

  it('should destroy entity', () => {
    const entity = new ViewComponent('test');
    expect(ctx.hasEntity(entity)).toBeTruthy();
    entity.destroy();
    expect(ctx.hasEntity(entity)).toBeFalsy();
  });

  it('should add entity as child (constructor)', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test', parent);
    const ctx = ComponentContext.get();

    expect(ctx.hasEntity(parent)).toBeTruthy();
    expect(ctx.hasEntity(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootEntity(child)).toBeFalsy();
  });

  it('should add entity as child (addChild)', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test');

    expect(ctx.hasEntity(parent)).toBeTruthy();
    expect(ctx.hasEntity(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeFalsy();
    expect(ctx.isRootEntity(child)).toBeTruthy();

    parent.addChild(child);

    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootEntity(child)).toBeFalsy();
  });

  it('should remove from parent', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test', parent);

    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootEntity(parent)).toBeTruthy();

    child.removeFromParent();

    expect(child.parent).toBeUndefined();
    expect(ctx.isChildOf(child, parent)).toBeFalsy();
    expect(ctx.isRootEntity(child)).toBeTruthy();
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
});
