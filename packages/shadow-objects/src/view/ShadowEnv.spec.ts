import {on, once} from '@spearwolf/eventize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {type OnCreate, type OnDestroy, onCreate, onDestroy} from '../in-the-dark/events.js';
import {Registry} from '../in-the-dark/Registry.js';
import {ShadowObject} from '../in-the-dark/ShadowObject.js';
import type {ChangeTrailType, ShadowObjectCreationAPI} from '../types.js';
import {ComponentContext} from './ComponentContext.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';
import {LocalShadowObjectEnv} from './LocalShadowObjectEnv.js';
import {ShadowEnv, ShadowEnvDestroyedError} from './ShadowEnv.js';
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
    class Foo implements OnCreate, OnDestroy {
      [onCreate]() {
        onCreateSpy();
      }

      [onDestroy]() {
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

    once(localObjEnv.kernel.getEntity(vc.uuid), onDestroy, onDestroyEntitySpy);

    env.envProxy.destroy();

    expect(onDestroySpy).toHaveBeenCalledTimes(1);
    expect(onDestroyEntitySpy).toHaveBeenCalledTimes(1);

    expect(localObjEnv.kernel.hasEntity(vc.uuid)).toBeFalsy();
    expect(localObjEnv.kernel.findShadowObjects(vc.uuid)).toHaveLength(0);

    env.destroy();
  });

  describe('syncWait', () => {
    const withTimeout = <T>(promise: Promise<T>, ms = 250) =>
      Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('syncWait timed out')), ms))]);

    const makeEnv = () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = new LocalShadowObjectEnv();
      return env;
    };

    it('resolves with an empty change trail when nothing has changed', async () => {
      const env = makeEnv();
      await env.ready();

      await expect(withTimeout(env.syncWait())).resolves.toEqual([]);

      env.destroy();
    });

    it('resolves again on a second sync without changes', async () => {
      const env = makeEnv();
      await env.ready();

      new ViewComponent('test', {context: env.view});
      await withTimeout(env.syncWait());

      await expect(withTimeout(env.syncWait())).resolves.toEqual([]);
      await expect(withTimeout(env.syncWait())).resolves.toEqual([]);

      env.destroy();
    });

    it('emits AfterSync on every sync cycle, including empty ones', async () => {
      const env = makeEnv();
      await env.ready();

      const afterSyncSpy = vi.fn();
      on(env, ShadowEnv.AfterSync, afterSyncSpy);

      await withTimeout(env.syncWait());

      expect(afterSyncSpy).toHaveBeenCalledTimes(1);
      expect(afterSyncSpy).toHaveBeenCalledWith([]);

      env.destroy();
    });

    it('does not carry waitForConfirmation over from an empty sync into the next one', async () => {
      const env = makeEnv();
      await env.ready();

      const applySpy = vi.spyOn(env.envProxy!, 'applyChangeTrail');

      // an empty syncWait must consume the confirmation flag
      await withTimeout(env.syncWait());
      expect(applySpy).not.toHaveBeenCalled();

      // a plain sync() afterwards must not ask for confirmation
      new ViewComponent('test', {context: env.view});
      env.sync();
      await withTimeout(new Promise<void>((resolve) => once(env, ShadowEnv.AfterSync, () => resolve())));

      expect(applySpy).toHaveBeenCalledTimes(1);
      expect(applySpy.mock.calls[0][1]).toBe(false);

      env.destroy();
    });

    it('still resolves with the change trail when there are changes', async () => {
      const env = makeEnv();
      await env.ready();

      const vc = new ViewComponent('test', {context: env.view});

      const trail = await withTimeout(env.syncWait());

      expect(trail).toHaveLength(1);
      expect((trail as ChangeTrailType)[0].uuid).toBe(vc.uuid);

      env.destroy();
    });
  });

  describe('destroy', () => {
    const withTimeout = <T>(promise: Promise<T>, ms = 250) =>
      Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

    /**
     * Asserts that the promise rejects because the environment was destroyed.
     * A plain `rejects.toThrow(SomeClass)` would also swallow the timeout rejection,
     * which is exactly the hanging-promise bug this guards against.
     */
    const expectDestroyedRejection = async (promise: Promise<unknown>) => {
      const reason = await withTimeout(promise).then(
        () => {
          throw new Error('expected the promise to reject, but it resolved');
        },
        (error) => error,
      );

      expect((reason as Error).name).toBe('ShadowEnvDestroyedError');
      expect(reason).toBeInstanceOf(ShadowEnvDestroyedError);
    };

    const makeEnv = () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = new LocalShadowObjectEnv();
      return env;
    };

    it('rejects a syncWait() that is still pending', async () => {
      const env = makeEnv();
      const pending = env.syncWait();

      env.destroy();

      await expectDestroyedRejection(pending);
    });

    it('rejects a syncWait() that was waiting for the environment to become ready', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      const pending = env.syncWait();

      env.destroy();

      await expectDestroyedRejection(pending);
    });

    it('rejects a ready() that is still pending', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      const pending = env.ready();

      env.destroy();

      await expectDestroyedRejection(pending);
    });

    it('rejects every pending caller, not just the first', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      const a = env.ready();
      const b = env.ready();
      const c = env.syncWait();

      env.destroy();

      await expectDestroyedRejection(a);
      await expectDestroyedRejection(b);
      await expectDestroyedRejection(c);
    });

    it('rejects a syncWait() issued after destroy', async () => {
      const env = makeEnv();
      env.destroy();

      await expectDestroyedRejection(env.syncWait());
    });

    it('rejects a ready() issued after destroy', async () => {
      const env = makeEnv();
      env.destroy();

      await expectDestroyedRejection(env.ready());
    });

    it('ignores sync() after destroy', async () => {
      const env = makeEnv();
      await env.ready();
      env.destroy();

      expect(() => env.sync()).not.toThrow();
    });

    it('can be destroyed twice', async () => {
      const env = makeEnv();
      await env.ready();

      env.destroy();

      expect(() => env.destroy()).not.toThrow();
      expect(env.isDestroyed).toBe(true);
    });

    it('destroys the envProxy exactly once', async () => {
      const env = makeEnv();
      await env.ready();

      const proxyDestroySpy = vi.spyOn(env.envProxy!, 'destroy');

      env.destroy();

      expect(proxyDestroySpy).toHaveBeenCalledTimes(1);
    });

    it('does not run a sync that was scheduled before the destroy', async () => {
      const env = makeEnv();
      await env.ready();

      const applySpy = vi.spyOn(env.envProxy!, 'applyChangeTrail');
      new ViewComponent('test', {context: env.view});
      env.sync();

      env.destroy();

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(applySpy).not.toHaveBeenCalled();
    });
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
    let dispatchMessageToView: ShadowObjectCreationAPI['dispatchMessageToView'];

    @ShadowObject({token: 'parent'})
    class ParentShadowObject {
      constructor(api: ShadowObjectCreationAPI) {
        dispatchMessageToView = api.dispatchMessageToView;
      }
    }

    expect(ParentShadowObject).toBeDefined();

    await env.syncWait();

    // Verify shadow object was created and we have the entity reference
    expect(dispatchMessageToView!).toBeDefined();

    // Dispatch a message with traverseChildren=true from the shadow object
    dispatchMessageToView!('myEvent', {testData: 'hello'}, undefined, true);

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
    let dispatchMessageToView: (type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean) => void;

    @ShadowObject({token: 'parent2'})
    class Parent2ShadowObject {
      constructor(api: ShadowObjectCreationAPI) {
        dispatchMessageToView = api.dispatchMessageToView;
      }
    }

    expect(Parent2ShadowObject).toBeDefined();

    await env.syncWait();

    expect(dispatchMessageToView!).toBeDefined();

    // Dispatch a message with traverseChildren=false
    dispatchMessageToView!('myEvent', {testData: 'world'}, undefined, false);

    // Wait for the microtask queue to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify the event was dispatched only to parent, not to child
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(parentSpy).toHaveBeenCalledWith({testData: 'world'});
    expect(childSpy).not.toHaveBeenCalled();

    env.destroy();
  });

  describe('a proxy that fails', () => {
    /**
     * A proxy that starts, does nothing, and can be told to fail. Real failures belong to
     * `RemoteWorkerEnv`; what is under test here is the hop from the proxy to the consumers.
     */
    class FailingProxy implements IShadowObjectEnvProxy {
      onMessageToView?: (event: any) => any;
      onProxyFailed?: (reason: unknown) => any;

      destroyCount = 0;

      async start(): Promise<void> {}

      async importScript(): Promise<void> {}

      async applyChangeTrail(): Promise<void> {}

      destroy(): void {
        this.destroyCount++;
      }

      fail(reason: unknown) {
        this.onProxyFailed?.(reason);
      }
    }

    const makeEnv = async () => {
      const env = new ShadowEnv();
      const proxy = new FailingProxy();
      env.view = ComponentContext.get();
      env.envProxy = proxy;
      await env.ready();
      return {env, proxy};
    };

    it('installs onProxyFailed on the proxy it is given', () => {
      const env = new ShadowEnv();
      const proxy = new FailingProxy();

      expect(proxy.onProxyFailed).toBeUndefined();

      env.envProxy = proxy;

      expect(typeof proxy.onProxyFailed).toBe('function');

      env.destroy();
    });

    it('emits ProxyFailed with the reason and the environment', async () => {
      const {env, proxy} = await makeEnv();
      const failedSpy = vi.fn();
      on(env, ShadowEnv.ProxyFailed, failedSpy);

      const reason = new Error('the worker went away');
      proxy.fail(reason);

      expect(failedSpy).toHaveBeenCalledTimes(1);
      expect(failedSpy).toHaveBeenCalledWith(reason, env);

      env.destroy();
    });

    it('stops being ready and loses the context', async () => {
      const {env, proxy} = await makeEnv();
      const contextLostSpy = vi.fn();
      on(env, ShadowEnv.ContextLost, contextLostSpy);

      expect(env.isReady).toBe(true);

      proxy.fail(new Error('the worker went away'));

      expect(env.isReady).toBe(false);
      expect(contextLostSpy).toHaveBeenCalledTimes(1);

      env.destroy();
    });

    it('drops the context even when a ProxyFailed listener throws', async () => {
      const {env, proxy} = await makeEnv();
      const contextLostSpy = vi.fn();
      on(env, ShadowEnv.ContextLost, contextLostSpy);
      on(env, ShadowEnv.ProxyFailed, () => {
        throw new Error('a consumer that cannot cope');
      });

      expect(() => proxy.fail(new Error('the worker went away'))).toThrow('a consumer that cannot cope');

      expect(env.isReady).toBe(false);
      expect(contextLostSpy).toHaveBeenCalledTimes(1);

      env.destroy();
    });

    it('ignores a failure reported after destroy()', async () => {
      const {env, proxy} = await makeEnv();
      const failedSpy = vi.fn();
      on(env, ShadowEnv.ProxyFailed, failedSpy);

      env.destroy();

      // the environment is frozen and its signals are gone by now — the late report
      // must not reach any of them
      expect(() => proxy.fail(new Error('too late'))).not.toThrow();
      expect(failedSpy).not.toHaveBeenCalled();
    });

    it('recovers with a new proxy', async () => {
      const {env, proxy} = await makeEnv();

      proxy.fail(new Error('the worker went away'));
      expect(env.isReady).toBe(false);

      env.envProxy = new FailingProxy();
      await env.ready();

      expect(env.isReady).toBe(true);
      expect(proxy.destroyCount).toBe(1);

      env.destroy();
    });
  });
});