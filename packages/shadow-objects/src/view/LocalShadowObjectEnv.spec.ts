import {afterEach, describe, expect, it} from 'vitest';
import {Registry} from '../in-the-dark/Registry.js';
import {shadowObjects} from '../in-the-dark/ShadowObject.js';
import {ComponentContext} from './ComponentContext.js';
import {LocalShadowObjectEnv} from './LocalShadowObjectEnv.js';
import {ShadowEnv} from './ShadowEnv.js';
import {ViewComponent} from './ViewComponent.js';

describe('LocalShadowObjectEnv', () => {
  afterEach(() => {
    ComponentContext.get().clear();
    Registry.get().clear();
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

    env.destroy();
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

    env.destroy();
  });

  describe('destroy', () => {
    it('leaves the default registry to the other environments', () => {
      const Foo = class {};
      shadowObjects.define('env-a-token', Foo);

      const envA = new LocalShadowObjectEnv();
      const envB = new LocalShadowObjectEnv();

      envA.destroy();

      expect(Registry.get().hasToken('env-a-token')).toBe(true);
      expect(envB.registry.hasToken('env-a-token')).toBe(true);
      expect(envB.registry.findConstructors('env-a-token')).toContain(Foo);

      envB.destroy();

      expect(Registry.get().hasToken('env-a-token')).toBe(true);
    });

    it('leaves the routes of the default registry alone', () => {
      Registry.get().appendRoute('env-route-parent', ['env-route-child']);

      new LocalShadowObjectEnv().destroy();

      expect(Registry.get().hasRoute('env-route-parent')).toBe(true);
    });

    it('does not clear the default registry when it is passed explicitly', () => {
      shadowObjects.define('env-explicit-default', class {});

      new LocalShadowObjectEnv(Registry.get()).destroy();

      expect(Registry.get().hasToken('env-explicit-default')).toBe(true);
    });

    it('clears a registry that belongs to the environment alone', () => {
      const registry = new Registry();
      const Bar = class {};
      shadowObjects.define('env-own-token', Bar, registry);

      const env = new LocalShadowObjectEnv(registry);

      expect(registry.hasToken('env-own-token')).toBe(true);

      env.destroy();

      expect(registry.hasToken('env-own-token')).toBe(false);
    });
  });
});