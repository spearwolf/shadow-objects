import {afterEach, describe, expect, it, vi} from 'vitest';
import {ChangeTrailRefusedError} from '../ChangeTrailRefusedError.js';
import {ComponentChangeType} from '../constants.js';
import {EntityUuidInUseError} from '../EntityUuidInUseError.js';
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

  describe('applyChangeTrail', () => {
    it('runs the kernel synchronously, without waiting for confirmation', () => {
      const env = new LocalShadowObjectEnv();
      const uuid = 'sync-no-confirmation';

      void env.applyChangeTrail([{type: ComponentChangeType.CreateEntities, uuid, token: 'foo'}], false);

      expect(env.kernel.hasEntity(uuid)).toBe(true);

      env.destroy();
    });

    it('runs the kernel synchronously, even when waiting for confirmation', () => {
      const env = new LocalShadowObjectEnv();
      const uuid = 'sync-with-confirmation';

      void env.applyChangeTrail([{type: ComponentChangeType.CreateEntities, uuid, token: 'foo'}], true);

      expect(env.kernel.hasEntity(uuid)).toBe(true);

      env.destroy();
    });

    it('resolves before an immediately-scheduled promise, without waiting for confirmation', async () => {
      const env = new LocalShadowObjectEnv();
      const order: string[] = [];

      env.applyChangeTrail([], false).then(() => order.push('trail'));
      Promise.resolve().then(() => order.push('control'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(order).toEqual(['trail', 'control']);

      env.destroy();
    });

    it('resolves after an immediately-scheduled promise, when waiting for confirmation', async () => {
      const env = new LocalShadowObjectEnv();
      const order: string[] = [];

      env.applyChangeTrail([], true).then(() => order.push('trail'));
      Promise.resolve().then(() => order.push('control'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(order).toEqual(['control', 'trail']);

      env.destroy();
    });

    it('rejects after an immediately-scheduled promise too, when waiting for confirmation', async () => {
      const env = new LocalShadowObjectEnv();
      const order: string[] = [];
      const error = new Error('kernel run failed');

      const runSpy = vi.spyOn(env.kernel, 'run').mockImplementation(() => {
        throw error;
      });

      const rejection = env.applyChangeTrail([], true).then(
        () => order.push('trail (resolved)'),
        (caught) => {
          order.push('trail (rejected)');
          return caught;
        },
      );
      Promise.resolve().then(() => order.push('control'));

      const caught = await rejection;

      expect(order).toEqual(['control', 'trail (rejected)']);
      expect(caught).toBe(error);

      runSpy.mockRestore();
      env.destroy();
    });

    // The local environment answers the same way whether or not a confirmation was asked for, so
    // the count reaches the view on both routes. Over a worker only the confirmed route carries it.
    it.each([false, true])('rejects with the refusal the kernel threw (waitForConfirmation: %s)', async (waitForConfirmation) => {
      const env = new LocalShadowObjectEnv();
      const uuid = 'refused-locally';

      const refusal = await env
        .applyChangeTrail(
          [
            {type: ComponentChangeType.CreateEntities, uuid, token: 'foo'},
            {type: ComponentChangeType.SetParent, uuid, parentUuid: 'ghost'},
          ],
          waitForConfirmation,
        )
        .then(
          () => {
            throw new Error('expected the promise to reject, but it resolved');
          },
          (reason) => reason,
        );

      expect(refusal).toBeInstanceOf(ChangeTrailRefusedError);
      expect((refusal as ChangeTrailRefusedError).appliedCount).toBe(1);
      expect((refusal as ChangeTrailRefusedError).entryCount).toBe(2);

      env.destroy();
    });

    // What the documented recovery rests on: the components rebuilt from the Component Memory go
    // to an environment that holds none of their uuids. This is the whole claim, measured without
    // a worker in the way -- one and the same rebuilt trail against two kernels.
    describe('a trail re-created from the Component Memory', () => {
      const buildReCreatedTrail = () => {
        const ctx = ComponentContext.get();

        const vc = new ViewComponent('foo');
        vc.setProperty('bar', 42);

        const first = ctx.buildChangeTrails();

        ctx.reCreateChanges();

        return {uuid: vc.uuid, first, reCreated: ctx.buildChangeTrails(false)};
      };

      it('is refused by an environment that still holds the uuids', async () => {
        const env = new LocalShadowObjectEnv();
        const {uuid, first, reCreated} = buildReCreatedTrail();

        await env.applyChangeTrail(first, true);
        expect(env.kernel.hasEntity(uuid)).toBe(true);

        const refusal = await env.applyChangeTrail(reCreated, true).then(
          () => {
            throw new Error('expected the promise to reject, but it resolved');
          },
          (reason) => reason,
        );

        expect(refusal).toBeInstanceOf(ChangeTrailRefusedError);
        expect(
          (refusal as ChangeTrailRefusedError).appliedCount,
          'the creation is the first entry, so nothing goes through',
        ).toBe(0);
        expect((refusal as ChangeTrailRefusedError).cause).toBeInstanceOf(EntityUuidInUseError);
        expect(((refusal as ChangeTrailRefusedError).cause as EntityUuidInUseError).uuid).toBe(uuid);

        env.destroy();
      });

      it('goes through in full against a fresh environment', async () => {
        const first = new LocalShadowObjectEnv();
        const {uuid, first: firstTrail, reCreated} = buildReCreatedTrail();

        await first.applyChangeTrail(firstTrail, true);

        const fresh = new LocalShadowObjectEnv();

        await fresh.applyChangeTrail(reCreated, true);

        expect(fresh.kernel.hasEntity(uuid)).toBe(true);
        expect(fresh.kernel.getEntity(uuid).getProperty('bar'), 'the state the view is in arrives with it').toBe(42);

        first.destroy();
        fresh.destroy();
      });
    });
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

  // The module urls are `data:` urls: `toUrlString()` hands them through unchanged and the loader
  // imports them, same as the module-import cases in `worker/MessageRouter.spec.ts`.
  describe('importScript', () => {
    it('refuses a module without the shadow-objects export', async () => {
      const env = new LocalShadowObjectEnv(new Registry());

      await expect(env.importScript('data:text/javascript,export const nothing = 1')).rejects.toThrow(
        'module has no "shadowObjects" export',
      );

      env.destroy();
    });

    it('imports a module that has the export', async () => {
      const env = new LocalShadowObjectEnv(new Registry());

      await env.importScript('data:text/javascript,export const shadowObjects = {define: {"env-import-token": class {}}}');

      expect(env.registry.hasToken('env-import-token')).toBe(true);

      env.destroy();
    });
  });
});