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

  /**
   * Caps a wait that is meant to end quickly. The timeout is an abort condition and never an
   * assertion: a promise that has to settle is asserted on directly, so a case that only ends
   * because the clock ran out fails instead of passing quietly.
   */
  const withTimeout = <T>(promise: Promise<T>, ms = 250) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

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

  describe('a change trail the environment cannot apply', () => {
    /**
     * A proxy that hands every change trail back as a rejection while it is armed. The real
     * rejections come from a worker that timed out and from a kernel that threw; what is under
     * test here is the exit the environment takes once one of them arrives.
     */
    class RejectingProxy implements IShadowObjectEnvProxy {
      onMessageToView?: (event: any) => any;
      onProxyFailed?: (reason: unknown) => any;

      rejectWith: unknown;
      applyCalls = 0;

      async start(): Promise<void> {}

      async importScript(): Promise<void> {}

      async applyChangeTrail(): Promise<void> {
        this.applyCalls++;
        if (this.rejectWith !== undefined) throw this.rejectWith;
      }

      destroy(): void {}
    }

    const makeEnv = async (rejectWith?: unknown) => {
      const env = new ShadowEnv();
      const proxy = new RejectingProxy();
      proxy.rejectWith = rejectWith;
      env.view = ComponentContext.get();
      env.envProxy = proxy;
      await env.ready();
      return {env, proxy};
    };

    it('rejects syncWait() with the reason the proxy gave', async () => {
      const reason = new Error('the environment refused the trail');
      const {env, proxy} = await makeEnv(reason);

      new ViewComponent('test', {context: env.view});

      await expect(withTimeout(env.syncWait())).rejects.toBe(reason);
      expect(proxy.applyCalls).toBe(1);

      env.destroy();
    });

    it('does not emit AfterSync for a cycle that failed', async () => {
      const reason = new Error('the environment refused the trail');
      const {env} = await makeEnv(reason);

      const afterSyncSpy = vi.fn();
      on(env, ShadowEnv.AfterSync, afterSyncSpy);

      new ViewComponent('test', {context: env.view});

      await expect(withTimeout(env.syncWait())).rejects.toBe(reason);

      expect(afterSyncSpy).not.toHaveBeenCalled();

      env.destroy();
    });

    it('emits SyncFailed once, with the reason, the lost change trail and the environment', async () => {
      const reason = new Error('the environment refused the trail');
      const {env} = await makeEnv(reason);

      const syncFailedSpy = vi.fn();
      on(env, ShadowEnv.SyncFailed, syncFailedSpy);

      const vc = new ViewComponent('test', {context: env.view});

      await expect(withTimeout(env.syncWait())).rejects.toBe(reason);

      expect(syncFailedSpy).toHaveBeenCalledTimes(1);

      const [gotReason, changeTrail, gotEnv] = syncFailedSpy.mock.calls[0];

      expect(gotReason).toBe(reason);
      expect(changeTrail).toHaveLength(1);
      expect((changeTrail as ChangeTrailType)[0].uuid).toBe(vc.uuid);
      expect(gotEnv).toBe(env);

      env.destroy();
    });

    it('emits SyncFailed for a sync() nobody is waiting on', async () => {
      const reason = new Error('the environment refused the trail');
      const {env} = await makeEnv(reason);

      const syncFailed = withTimeout(
        new Promise<unknown[]>((resolve) => {
          once(env, ShadowEnv.SyncFailed, (...args: unknown[]) => resolve(args));
        }),
      );

      new ViewComponent('test', {context: env.view});
      env.sync();

      const [gotReason, changeTrail] = (await syncFailed) as unknown[];

      expect(gotReason).toBe(reason);
      expect(changeTrail).toHaveLength(1);

      env.destroy();
    });

    it('stays usable after a failed cycle', async () => {
      const {env, proxy} = await makeEnv(new Error('the environment refused the trail'));

      new ViewComponent('a', {context: env.view});
      await expect(withTimeout(env.syncWait())).rejects.toBeInstanceOf(Error);

      proxy.rejectWith = undefined;

      new ViewComponent('b', {context: env.view});
      await expect(withTimeout(env.syncWait())).resolves.toHaveLength(1);

      env.destroy();
    });

    it('leaves the successful cycle alone: AfterSync fires, SyncFailed does not', async () => {
      const {env, proxy} = await makeEnv();

      const afterSyncSpy = vi.fn();
      const syncFailedSpy = vi.fn();
      on(env, ShadowEnv.AfterSync, afterSyncSpy);
      on(env, ShadowEnv.SyncFailed, syncFailedSpy);

      // an empty change trail never reaches the proxy, and a cycle without a call cannot fail
      await expect(withTimeout(env.syncWait())).resolves.toEqual([]);
      expect(proxy.applyCalls).toBe(0);

      new ViewComponent('test', {context: env.view});
      await expect(withTimeout(env.syncWait())).resolves.toHaveLength(1);
      expect(proxy.applyCalls).toBe(1);

      expect(afterSyncSpy).toHaveBeenCalledTimes(2);
      expect(syncFailedSpy).not.toHaveBeenCalled();

      env.destroy();
    });

    it('rejects a pending syncWait() with a ShadowEnvDestroyedError, not with a sync reason', async () => {
      const {env} = await makeEnv(new Error('the environment refused the trail'));

      new ViewComponent('test', {context: env.view});
      const pending = env.syncWait();

      env.destroy();

      const error = await withTimeout(pending).then(
        () => {
          throw new Error('expected the promise to reject, but it resolved');
        },
        (reason) => reason,
      );

      expect(error).toBeInstanceOf(ShadowEnvDestroyedError);
    });

    it('rejects every caller waiting on the same failed cycle', async () => {
      const reason = new Error('the environment refused the trail');
      const {env} = await makeEnv(reason);

      new ViewComponent('test', {context: env.view});

      const first = env.syncWait();
      const second = env.syncWait();

      // one cycle, one promise: the second caller joins the wait rather than opening a new one
      expect(second).toBe(first);

      await expect(withTimeout(first)).rejects.toBe(reason);
      await expect(withTimeout(second)).rejects.toBe(reason);

      env.destroy();
    });

    it('settles syncWait() even when a SyncFailed listener throws', async () => {
      const reason = new Error('the environment refused the trail');
      const {env} = await makeEnv(reason);

      // registered before the syncWait() call, which is the order an application produces:
      // the listeners go up during setup, the wait happens later
      on(env, ShadowEnv.SyncFailed, () => {
        throw new Error('a consumer that cannot cope');
      });

      new ViewComponent('test', {context: env.view});

      await expect(withTimeout(env.syncWait())).rejects.toBe(reason);

      env.destroy();
    });

    it('settles syncWait() even when an AfterSync listener throws', async () => {
      const {env} = await makeEnv();

      on(env, ShadowEnv.AfterSync, () => {
        throw new Error('a consumer that cannot cope');
      });

      new ViewComponent('test', {context: env.view});

      await expect(withTimeout(env.syncWait())).resolves.toHaveLength(1);

      env.destroy();
    });
  });

  describe('destroy', () => {
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

    it('re-creates the entities in the new environment from the component memory', async () => {
      const {env, proxy} = await makeEnv();

      @ShadowObject({token: 'recovery-child'})
      class Survivor {}

      expect(Survivor).toBeDefined();

      const parent = new ViewComponent('recovery-parent', {context: env.view});
      const child = new ViewComponent('recovery-child', {context: env.view, parent, order: 7});
      child.setProperty('foo', 'bar');

      // the memory is written by this cycle, not by the proxy: what comes back later
      // comes from the view side
      await env.syncWait();

      proxy.fail(new Error('the worker went away'));
      expect(env.isReady).toBe(false);

      const localEnv = new LocalShadowObjectEnv();
      env.envProxy = localEnv;
      await env.ready();

      // no component is touched between the failure and this sync: nothing is replayed
      await env.syncWait();

      expect(localEnv.kernel.hasEntity(parent.uuid)).toBe(true);
      expect(localEnv.kernel.hasEntity(child.uuid)).toBe(true);

      const childEntity = localEnv.kernel.getEntity(child.uuid);
      expect(childEntity.parentUuid).toBe(parent.uuid);
      expect(childEntity.order).toBe(7);
      expect(Object.fromEntries(childEntity.propEntries())).toEqual({foo: 'bar'});

      expect(localEnv.kernel.findShadowObjects(child.uuid)).toHaveLength(1);
      expect(localEnv.kernel.findShadowObjects(child.uuid)[0]).toBeInstanceOf(Survivor);

      env.destroy();
    });
  });

  describe('a proxy that is replaced while it is starting', () => {
    /**
     * A proxy whose `start()` is held open until the case settles it. The race this pins is a race
     * of microtasks -- which of two starts writes `proxyReady` last -- so the order is made by the
     * case, not waited for.
     */
    class DeferredProxy implements IShadowObjectEnvProxy {
      onMessageToView?: (event: any) => any;
      onProxyFailed?: (reason: unknown) => any;

      startCount = 0;
      destroyCount = 0;

      readonly #started: Promise<void>;
      #resolve!: () => void;
      #reject!: (reason: unknown) => void;

      constructor() {
        this.#started = new Promise<void>((resolve, reject) => {
          this.#resolve = resolve;
          this.#reject = reject;
        });
        // a case may reject a start the environment has already let go of, and by then nobody is listening
        this.#started.catch(() => {});
      }

      start(): Promise<void> {
        this.startCount++;
        return this.#started;
      }

      async importScript(): Promise<void> {}

      async applyChangeTrail(): Promise<void> {}

      destroy(): void {
        this.destroyCount++;
      }

      resolveStart(): void {
        this.#resolve();
      }

      failStart(reason: unknown): void {
        this.#reject(reason);
      }

      fail(reason: unknown): void {
        this.onProxyFailed?.(reason);
      }
    }

    /** Lets every microtask behind a settled start run before the case looks at the environment. */
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    const makeEnv = () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      return env;
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('ignores the resolved start of a proxy that has been replaced', async () => {
      const env = makeEnv();
      const first = new DeferredProxy();
      const second = new DeferredProxy();
      const contextCreated = vi.fn();
      on(env, ShadowEnv.ContextCreated, contextCreated);

      env.envProxy = first;
      env.envProxy = second;

      first.resolveStart();
      await flush();

      expect(env.proxyReady, 'the start of the replaced proxy must not report the current one ready').toBe(false);
      expect(env.isReady).toBe(false);
      expect(contextCreated).not.toHaveBeenCalled();
      expect(second.startCount).toBe(1);

      env.destroy();
    });

    it('ignores the rejected start of a proxy that has been replaced', async () => {
      const env = makeEnv();
      const first = new DeferredProxy();
      const second = new DeferredProxy();
      const contextLost = vi.fn();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      on(env, ShadowEnv.ContextLost, contextLost);

      env.envProxy = first;
      env.envProxy = second;

      second.resolveStart();
      await flush();

      expect(env.isReady).toBe(true);

      first.failStart(new Error('the worker never came up'));
      await flush();

      expect(env.proxyReady, 'the failed start of the replaced proxy must not undo the current one').toBe(true);
      expect(env.isReady).toBe(true);
      expect(contextLost).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();

      env.destroy();
    });

    // no proxy that ships with this package reports a failure after its teardown: `RemoteWorkerEnv`
    // takes its worker listeners off on every exit and `LocalShadowObjectEnv` cannot fail at all.
    // A hand-written `IShadowObjectEnvProxy` can, and this is what it must not be able to do.
    it('ignores a failure a replaced proxy reports after the swap', async () => {
      const env = makeEnv();
      const first = new DeferredProxy();
      const second = new DeferredProxy();
      const contextLost = vi.fn();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      on(env, ShadowEnv.ContextLost, contextLost);

      env.envProxy = first;
      env.envProxy = second;

      second.resolveStart();
      await flush();

      first.fail(new Error('too late'));

      expect(env.proxyReady).toBe(true);
      expect(contextLost).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();

      env.destroy();
    });

    it('ignores the resolved start of a proxy that has been cleared', async () => {
      const env = makeEnv();
      const first = new DeferredProxy();
      const contextCreated = vi.fn();
      on(env, ShadowEnv.ContextCreated, contextCreated);

      env.envProxy = first;
      env.envProxy = undefined;

      first.resolveStart();
      await flush();

      expect(contextCreated).not.toHaveBeenCalled();
      expect(env.proxyReady).toBe(false);
      expect(first.destroyCount).toBe(1);

      env.destroy();
    });

    it('ignores the rejected start of a proxy the destroy has released', async () => {
      const env = makeEnv();
      const first = new DeferredProxy();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      env.envProxy = first;
      env.destroy();

      first.failStart(new Error('never mind'));
      await flush();

      expect(consoleError).not.toHaveBeenCalled();
    });

    it('ignores the resolved start of a proxy that failed before it came up', async () => {
      const env = makeEnv();
      const proxy = new DeferredProxy();
      const contextCreated = vi.fn();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      on(env, ShadowEnv.ContextCreated, contextCreated);

      env.envProxy = proxy;

      // the failure ends this proxy's turn: what its start has to say afterwards is stale
      proxy.fail(new Error('gone before it came up'));

      proxy.resolveStart();
      await flush();

      expect(env.proxyReady).toBe(false);
      expect(env.isReady).toBe(false);
      expect(contextCreated).not.toHaveBeenCalled();

      env.destroy();
    });

    it('reports the current proxy ready when its start resolves', async () => {
      const env = makeEnv();
      const proxy = new DeferredProxy();
      const contextCreated = vi.fn();
      on(env, ShadowEnv.ContextCreated, contextCreated);

      env.envProxy = proxy;

      proxy.resolveStart();
      await flush();

      expect(env.proxyReady).toBe(true);
      expect(env.isReady).toBe(true);
      expect(contextCreated).toHaveBeenCalledTimes(1);
      expect(proxy.startCount).toBe(1);

      env.destroy();
    });
  });

  describe('the namespace registration', () => {
    const NS_A = 'shadow-env-ns-a';
    const NS_B = 'shadow-env-ns-b';

    afterEach(() => {
      // a named context outlives the outer afterEach, which only reaches the global namespace
      ComponentContext.get(NS_A).dispose();
      ComponentContext.get(NS_B).dispose();
      globalThis.__shadowEnvs?.delete(NS_A);
      globalThis.__shadowEnvs?.delete(NS_B);
      vi.restoreAllMocks();
    });

    it('leaves a namespace registration alone that another environment has taken over', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const ctx = ComponentContext.get(NS_A);
      const first = new ShadowEnv();
      const second = new ShadowEnv();

      first.view = ctx;
      second.view = ctx;

      expect(ShadowEnv.get(NS_A)).toBe(second);

      first.view = undefined;

      expect(ShadowEnv.get(NS_A), 'the environment that let go was not the registered one').toBe(second);

      first.destroy();
      second.destroy();
    });

    it('releases its own namespace registration when its context goes', () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get(NS_A);

      expect(ShadowEnv.get(NS_A)).toBe(env);

      env.view = undefined;

      expect(ShadowEnv.get(NS_A)).toBeUndefined();

      env.destroy();
    });

    it('releases its namespace registration on destroy', () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get(NS_A);

      expect(ShadowEnv.get(NS_A)).toBe(env);

      env.destroy();

      expect(ShadowEnv.get(NS_A)).toBeUndefined();
    });

    it('takes its registration along when it moves to another namespace', () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get(NS_A);
      env.view = ComponentContext.get(NS_B);

      expect(ShadowEnv.get(NS_A)).toBeUndefined();
      expect(ShadowEnv.get(NS_B)).toBe(env);

      env.destroy();
    });
  });

  describe('a proxy the environment has let go', () => {
    /** A proxy that says something towards the view on demand -- during its teardown and after it. */
    class SpeakingProxy implements IShadowObjectEnvProxy {
      onMessageToView?: (event: any) => any;
      onProxyFailed?: (reason: unknown) => any;

      async start(): Promise<void> {}

      async importScript(): Promise<void> {}

      async applyChangeTrail(): Promise<void> {}

      destroy(): void {}

      say(type: string): void {
        this.onMessageToView?.({uuid: 'speaker', type, data: undefined, traverseChildren: false});
      }
    }

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('delivers what an onDestroy sends towards the view while the proxy is torn down', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = new LocalShadowObjectEnv();
      await env.ready();

      @ShadowObject({token: 'farewell'})
      class Farewell implements OnDestroy {
        readonly #dispatchMessageToView: ShadowObjectCreationAPI['dispatchMessageToView'];

        constructor(api: ShadowObjectCreationAPI) {
          this.#dispatchMessageToView = api.dispatchMessageToView;
        }

        [onDestroy]() {
          this.#dispatchMessageToView('farewell', {said: 'goodbye'});
        }
      }

      expect(Farewell).toBeDefined();

      const component = new ViewComponent('farewell', {context: env.view});
      const farewellSpy = vi.fn();
      on(component, 'farewell', farewellSpy);

      await env.syncWait();

      // the teardown of the released environment runs the onDestroy callbacks, and a local
      // environment delivers what they send towards the view
      env.envProxy = new LocalShadowObjectEnv();
      await flush();

      expect(farewellSpy).toHaveBeenCalledTimes(1);
      expect(farewellSpy).toHaveBeenCalledWith({said: 'goodbye'});

      env.destroy();
    });

    it('hears nothing a released proxy says after its teardown', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      const dispatchMessage = vi.spyOn(env.view, 'dispatchMessage');

      const first = new SpeakingProxy();
      env.envProxy = first;
      await env.ready();

      env.envProxy = new SpeakingProxy();
      await flush();

      first.say('too late');

      expect(dispatchMessage).not.toHaveBeenCalled();

      env.destroy();
    });
  });
});