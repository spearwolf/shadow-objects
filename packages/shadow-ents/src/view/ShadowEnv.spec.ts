import {afterEach, describe, expect, it, vi} from 'vitest';
import {Registry} from '../entities/Registry.js';
import {ShadowObject} from '../entities/ShadowObject.js';
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
  });

  it('should be ready', async () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();
    env.envProxy = new LocalShadowObjectEnv();

    expect(env.view).toBeDefined();
    expect(env.envProxy).toBeDefined();

    await env.ready();

    expect(env.isReady).toBeTruthy();
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

    localObjEnv.kernel.getEntity(vc.uuid).once('onDestroy', onDestroyEntitySpy);

    env.envProxy.destroy();

    expect(onDestroySpy).toHaveBeenCalledTimes(1);
    expect(onDestroyEntitySpy).toHaveBeenCalledTimes(1);

    expect(localObjEnv.kernel.hasEntity(vc.uuid)).toBeFalsy();
    expect(localObjEnv.kernel.findShadowObjects(vc.uuid)).toHaveLength(0);
  });
});
