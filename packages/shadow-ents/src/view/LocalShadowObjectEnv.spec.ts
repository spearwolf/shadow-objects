import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from './ComponentContext.js';
import {LocalShadowObjectEnv} from './LocalShadowObjectEnv.js';
import {ShadowEnv} from './ShadowEnv.js';
import {ViewComponent} from './ViewComponent.js';

describe('LocalShadowObjectEnv', () => {
  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('should be defined', () => {
    expect(LocalShadowObjectEnv).toBeDefined();
  });

  it('should create', async () => {
    const env = new ShadowEnv();
    env.view = ComponentContext.get();
    env.envProxy = new LocalShadowObjectEnv();

    expect(env.view).toBeDefined();
    expect(env.envProxy).toBeDefined();

    await env.ready();

    expect(env.isReady).toBeTruthy();
  });

  it('should sync', async () => {
    const env = new ShadowEnv();
    const localEnv = new LocalShadowObjectEnv();

    env.view = ComponentContext.get();
    env.envProxy = localEnv;

    const vc = new ViewComponent('foo');
    vc.setProperty('bar', 42);

    expect(env.view.hasComponent(vc)).toBeTruthy();

    await env.syncWait();

    const entity = localEnv.kernel.getEntity(vc.uuid);

    expect(entity).toBeDefined();
    expect(entity.getProperty('bar')).toBe(42);
  });
});
