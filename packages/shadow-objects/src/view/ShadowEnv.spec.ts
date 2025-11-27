import {on, once} from '@spearwolf/eventize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Registry} from '../in-the-dark/Registry.js';
import {ShadowObject} from '../in-the-dark/ShadowObject.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {ComponentContext} from './ComponentContext.js';
import {LocalShadowObjectEnv} from './LocalShadowObjectEnv.js';
import {ShadowEnv} from './ShadowEnv.js';
import {ViewComponent} from './ViewComponent.js';

describe('ShadowEnv', () => {
  afterEach(() => {
    ComponentContext.get().clear();
    Registry.get().clear();
  });

  it('should be defined', () => {
    expect(ShadowEnv).toBeDefined();
  });

  it('should create', () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();

    expect(env.view).toBeDefined();
    expect(env.isReady).toBeFalsy();

    env.destroy();
  });

  it('should be ready', async () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();
    env.envProxy = new LocalShadowObjectEnv();

    expect(env.view).toBeDefined();
    expect(env.envProxy).toBeDefined();

    await env.ready();

    expect(env.isReady).toBeTruthy();

    env.destroy();
  });

  it('should create and destroy shadow-objects', async () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();
    const localObjEnv = (env.envProxy = new LocalShadowObjectEnv());

    const onCreateSpy = vi.fn();
    const onDestroySpy = vi.fn();

    @ShadowObject({token: 'test'})
    class Foo {
      onCreate() {
        onCreateSpy();
      }

      onDestroy() {
        onDestroySpy();
      }
    }

    expect(Foo).toBeDefined();

    const vc = new ViewComponent('test', {context: env.view});

    await env.syncWait();

    expect(onCreateSpy).toHaveBeenCalledTimes(1);
    expect(onDestroySpy).not.toHaveBeenCalled();

    expect(localObjEnv.kernel.hasEntity(vc.uuid)).toBeTruthy();
    expect(localObjEnv.kernel.findShadowObjects(vc.uuid)).toHaveLength(1);

    const onDestroyEntitySpy = vi.fn();

    once(localObjEnv.kernel.getEntity(vc.uuid), 'onDestroy', onDestroyEntitySpy);

    env.envProxy.destroy();

    expect(onDestroySpy).toHaveBeenCalledTimes(1);
    expect(onDestroyEntitySpy).toHaveBeenCalledTimes(1);

    expect(localObjEnv.kernel.hasEntity(vc.uuid)).toBeFalsy();
    expect(localObjEnv.kernel.findShadowObjects(vc.uuid)).toHaveLength(0);

    env.destroy();
  });

  it('should dispatch MessageToView with traverseChildren=true through the entire stack', async () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();
    env.envProxy = new LocalShadowObjectEnv();

    // Create a hierarchy of view components
    const parentVC = new ViewComponent('parent', {context: env.view});
    const childVC1 = new ViewComponent('child1', {context: env.view, parent: parentVC});
    const childVC2 = new ViewComponent('child2', {context: env.view, parent: parentVC});
    const grandChildVC = new ViewComponent('grandChild', {context: env.view, parent: childVC1});

    // Set up spies on ViewComponents to track event dispatch
    const parentSpy = vi.fn();
    const child1Spy = vi.fn();
    const child2Spy = vi.fn();
    const grandChildSpy = vi.fn();

    on(parentVC, 'myEvent', parentSpy);
    on(childVC1, 'myEvent', child1Spy);
    on(childVC2, 'myEvent', child2Spy);
    on(grandChildVC, 'myEvent', grandChildSpy);

    // Define a shadow object that will dispatch the message with traverseChildren
    let entityRef: {
      dispatchMessageToView: (type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean) => void;
    } | null = null;

    @ShadowObject({token: 'parent'})
    class ParentShadowObject {
      constructor({entity}: ShadowObjectCreationAPI) {
        entityRef = entity;
      }
    }

    expect(ParentShadowObject).toBeDefined();

    await env.syncWait();

    // Verify shadow object was created and we have the entity reference
    expect(entityRef).not.toBeNull();

    // Dispatch a message with traverseChildren=true from the shadow object
    entityRef!.dispatchMessageToView('myEvent', {testData: 'hello'}, undefined, true);

    // Wait for the microtask queue to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify the event was dispatched to parent and all descendants
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(parentSpy).toHaveBeenCalledWith({testData: 'hello'});

    expect(child1Spy).toHaveBeenCalledTimes(1);
    expect(child1Spy).toHaveBeenCalledWith({testData: 'hello'});

    expect(child2Spy).toHaveBeenCalledTimes(1);
    expect(child2Spy).toHaveBeenCalledWith({testData: 'hello'});

    expect(grandChildSpy).toHaveBeenCalledTimes(1);
    expect(grandChildSpy).toHaveBeenCalledWith({testData: 'hello'});

    env.destroy();
  });

  it('should dispatch MessageToView with traverseChildren=false only to the target component', async () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();
    env.envProxy = new LocalShadowObjectEnv();

    // Create a hierarchy of view components
    const parentVC = new ViewComponent('parent2', {context: env.view});
    const childVC = new ViewComponent('child', {context: env.view, parent: parentVC});

    // Set up spies on ViewComponents to track event dispatch
    const parentSpy = vi.fn();
    const childSpy = vi.fn();

    on(parentVC, 'myEvent', parentSpy);
    on(childVC, 'myEvent', childSpy);

    // Define a shadow object that will dispatch the message without traverseChildren
    let entityRef: {
      dispatchMessageToView: (type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean) => void;
    } | null = null;

    @ShadowObject({token: 'parent2'})
    class Parent2ShadowObject {
      constructor({entity}: ShadowObjectCreationAPI) {
        entityRef = entity;
      }
    }

    expect(Parent2ShadowObject).toBeDefined();

    await env.syncWait();

    expect(entityRef).not.toBeNull();

    // Dispatch a message with traverseChildren=false
    entityRef!.dispatchMessageToView('myEvent', {testData: 'world'}, undefined, false);

    // Wait for the microtask queue to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify the event was dispatched only to parent, not to child
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(parentSpy).toHaveBeenCalledWith({testData: 'world'});
    expect(childSpy).not.toHaveBeenCalled();

    env.destroy();
  });
});
