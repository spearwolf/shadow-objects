import {afterAll, describe, expect, it} from 'vitest';
import {ComponentContext} from './ComponentContext.js';
import {ViewComponent} from './ViewComponent.js';

describe('EntityProxy', () => {
  const cc = ComponentContext.get();

  afterAll(() => {
    cc.clear();
  });

  it('should be defined', () => {
    expect(ViewComponent).toBeDefined();
  });

  it('should create new entity', () => {
    const entity = new ViewComponent('test');
    expect(entity.uuid).toBeDefined();
    expect(entity.token).toBe('test');
    expect(entity.parent).toBeUndefined();
    expect(cc.hasComponent(entity)).toBeTruthy();
    expect(cc.isRootComponent(entity)).toBeTruthy();
  });

  it('should destroy entity', () => {
    const entity = new ViewComponent('test');
    expect(cc.hasComponent(entity)).toBeTruthy();
    entity.disconnectFromContext();
    expect(cc.hasComponent(entity)).toBeFalsy();
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

    expect(cc.hasComponent(parent)).toBeTruthy();
    expect(cc.hasComponent(child)).toBeTruthy();
    expect(cc.isChildOf(child, parent)).toBeFalsy();
    expect(cc.isRootComponent(child)).toBeTruthy();

    parent.addChild(child);

    expect(cc.isChildOf(child, parent)).toBeTruthy();
    expect(cc.isRootComponent(child)).toBeFalsy();
  });

  it('should remove from parent', () => {
    const parent = new ViewComponent('test');
    const child = new ViewComponent('test', parent);

    expect(cc.isChildOf(child, parent)).toBeTruthy();
    expect(cc.isRootComponent(parent)).toBeTruthy();

    child.removeFromParent();

    expect(child.parent).toBeUndefined();
    expect(cc.isChildOf(child, parent)).toBeFalsy();
    expect(cc.isRootComponent(child)).toBeTruthy();
  });

  it('should set parent', () => {
    const a = new ViewComponent('test');
    const b = new ViewComponent('test', a);
    const c = new ViewComponent('test');

    expect(cc.isChildOf(b, a)).toBeTruthy();
    expect(cc.isChildOf(b, c)).toBeFalsy();

    b.parent = c;

    expect(b.parent).toBe(c);
    expect(cc.isChildOf(b, a)).toBeFalsy();
    expect(cc.isChildOf(b, c)).toBeTruthy();
  });
});
