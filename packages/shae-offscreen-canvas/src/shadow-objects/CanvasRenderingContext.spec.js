import {LocalShadowObjectEnv} from '@spearwolf/shadow-objects';
import {Registry} from '@spearwolf/shadow-objects/shadow-objects.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  CanvasContext,
  CanvasRenderingContext2D,
  ImageBitmapRenderingContext,
  OffscreenCanvasContext,
} from '../shared/constants.js';
import {Canvas2D} from './Canvas2D.js';
import {CanvasBitmapRenderer} from './CanvasBitmapRenderer.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * `not.toThrow()` only guards the synchronous call it wraps. The effect this drives is re-run
 * through the entity's context propagation, which lands on a queued microtask rather than inside
 * the synchronous `set()` call — so a throw from it never reaches a synchronous try/catch, and
 * would otherwise surface only as a file-level "Unhandled Errors" note with no failing assertion
 * attached. This captures it directly, for the duration of one probe, and hands back what it saw.
 */
const captureUncaught = async (fn) => {
  const errors = [];
  const onUncaught = (error) => errors.push(error);
  const onRejection = (error) => errors.push(error);
  process.on('uncaughtException', onUncaught);
  process.on('unhandledRejection', onRejection);
  try {
    fn();
    await settle();
  } finally {
    process.off('uncaughtException', onUncaught);
    process.off('unhandledRejection', onRejection);
  }
  return errors;
};

/**
 * A host that stands in for `ShaeOffscreenCanvas`: it provides `CanvasContext` and
 * `OffscreenCanvasContext` by hand, so `CanvasRenderingContext` can be driven directly without a
 * canvas that can render or an offscreen-canvas round trip. Every test hands in a distinct canvas
 * object per `set()` call, so the entity-side context signal (default compare) always propagates.
 */
class Host {
  static displayName = 'Host';

  constructor({provideContext}) {
    this.canvas$ = provideContext(CanvasContext);
    this.requestOffscreenCanvas = vi.fn();
    provideContext(OffscreenCanvasContext, this);
  }
}

/** The same host, minus the offscreen-canvas context — for the case where it is simply absent. */
class HostWithoutOffscreenCanvasContext {
  static displayName = 'HostWithoutOffscreenCanvasContext';

  constructor({provideContext}) {
    this.canvas$ = provideContext(CanvasContext);
  }
}

const makeEnv = () => {
  const env = new LocalShadowObjectEnv(new Registry());
  env.kernel.logger.enable = false;
  return env;
};

describe('CanvasRenderingContext', () => {
  let env;

  afterEach(() => {
    env?.destroy();
    env = undefined;
  });

  describe('Canvas2D', () => {
    it('reads the 2d context exactly once and publishes it identically under CanvasRenderingContext2D', async () => {
      env = makeEnv();
      env.registry.define('Host', Host);
      env.registry.define('Canvas2D', Canvas2D);

      const hostUuid = crypto.randomUUID();
      const childUuid = crypto.randomUUID();
      env.kernel.createEntity(hostUuid, 'Host');
      env.kernel.createEntity(childUuid, 'Canvas2D', hostUuid);

      const [host] = env.kernel.findShadowObjects(hostUuid);
      const ctx2d = {mark: '2d-context'};
      const getContext = vi.fn(() => ctx2d);
      host.canvas$.set({getContext});

      await settle();

      expect(getContext).toHaveBeenCalledTimes(1);
      expect(getContext).toHaveBeenCalledWith('2d');
      expect(env.kernel.getEntity(childUuid).useContext(CanvasRenderingContext2D)()).toBe(ctx2d);
    });
  });

  describe('CanvasBitmapRenderer', () => {
    it('reads the bitmaprenderer context exactly once and publishes it identically under ImageBitmapRenderingContext', async () => {
      env = makeEnv();
      env.registry.define('Host', Host);
      env.registry.define('CanvasBitmapRenderer', CanvasBitmapRenderer);

      const hostUuid = crypto.randomUUID();
      const childUuid = crypto.randomUUID();
      env.kernel.createEntity(hostUuid, 'Host');
      env.kernel.createEntity(childUuid, 'CanvasBitmapRenderer', hostUuid);

      const [host] = env.kernel.findShadowObjects(hostUuid);
      const bitmapCtx = {mark: 'bitmaprenderer-context'};
      const getContext = vi.fn(() => bitmapCtx);
      host.canvas$.set({getContext});

      await settle();

      expect(getContext).toHaveBeenCalledTimes(1);
      expect(getContext).toHaveBeenCalledWith('bitmaprenderer');
      expect(env.kernel.getEntity(childUuid).useContext(ImageBitmapRenderingContext)()).toBe(bitmapCtx);
    });
  });

  describe('shared behaviour', () => {
    const setup = async () => {
      env = makeEnv();
      env.registry.define('Host', Host);
      env.registry.define('Canvas2D', Canvas2D);

      const hostUuid = crypto.randomUUID();
      const childUuid = crypto.randomUUID();
      env.kernel.createEntity(hostUuid, 'Host');
      env.kernel.createEntity(childUuid, 'Canvas2D', hostUuid);

      const [host] = env.kernel.findShadowObjects(hostUuid);
      const child = env.kernel.getEntity(childUuid);

      return {host, child};
    };

    it('does not ask again once a context already stands, even when a further canvas arrives', async () => {
      const {host, child} = await setup();

      const firstCtx = {mark: 'first'};
      const firstGetContext = vi.fn(() => firstCtx);
      host.canvas$.set({getContext: firstGetContext});

      await settle();
      expect(firstGetContext).toHaveBeenCalledTimes(1);

      // The guard is `canvasRenderCtx$.value == null`, not canvas identity: a second canvas handed
      // in while a context already stands is not consulted at all, and the established context is
      // left in place.
      const secondGetContext = vi.fn(() => ({mark: 'second'}));
      host.canvas$.set({getContext: secondGetContext});
      await settle();

      expect(secondGetContext).not.toHaveBeenCalled();
      expect(child.useContext(CanvasRenderingContext2D)()).toBe(firstCtx);
    });

    it('asks the host to request an offscreen-canvas when getContext answers null, and leaves the context empty', async () => {
      const {host, child} = await setup();

      const getContext = vi.fn(() => null);
      host.canvas$.set({getContext});

      await settle();

      expect(getContext).toHaveBeenCalledTimes(1);
      expect(host.requestOffscreenCanvas).toHaveBeenCalledTimes(1);
      expect(child.useContext(CanvasRenderingContext2D)()).toBeUndefined();
    });

    it('throws nothing when getContext answers null and the host provides no OffscreenCanvasContext', async () => {
      env = makeEnv();
      env.registry.define('HostWithoutOffscreenCanvasContext', HostWithoutOffscreenCanvasContext);
      env.registry.define('Canvas2D', Canvas2D);

      const hostUuid = crypto.randomUUID();
      const childUuid = crypto.randomUUID();

      const creationErrors = await captureUncaught(() => {
        env.kernel.createEntity(hostUuid, 'HostWithoutOffscreenCanvasContext');
        env.kernel.createEntity(childUuid, 'Canvas2D', hostUuid);
      });
      expect(creationErrors).toEqual([]);

      const [host] = env.kernel.findShadowObjects(hostUuid);
      const getContext = vi.fn(() => null);

      const setErrors = await captureUncaught(() => host.canvas$.set({getContext}));
      expect(setErrors).toEqual([]);

      expect(getContext).toHaveBeenCalledTimes(1);
    });

    it('clears its context once the canvas disappears', async () => {
      const {host, child} = await setup();

      const ctx = {mark: 'ctx'};
      host.canvas$.set({getContext: () => ctx});
      await settle();
      expect(child.useContext(CanvasRenderingContext2D)()).toBe(ctx);

      host.canvas$.set(undefined);
      await settle();

      expect(child.useContext(CanvasRenderingContext2D)()).toBeUndefined();
    });

    it('reads a new context once a new canvas arrives', async () => {
      const {host, child} = await setup();

      host.canvas$.set({getContext: () => ({mark: 'first'})});
      await settle();

      host.canvas$.set(undefined);
      await settle();
      expect(child.useContext(CanvasRenderingContext2D)()).toBeUndefined();

      const secondCtx = {mark: 'second'};
      const getContext = vi.fn(() => secondCtx);
      host.canvas$.set({getContext});
      await settle();

      expect(getContext).toHaveBeenCalledTimes(1);
      expect(child.useContext(CanvasRenderingContext2D)()).toBe(secondCtx);
    });
  });

  it('keeps Canvas2D and CanvasBitmapRenderer apart on one entity', async () => {
    env = makeEnv();
    env.registry.define('Host', Host);
    env.registry.define('Both', Canvas2D);
    env.registry.define('Both', CanvasBitmapRenderer);

    const hostUuid = crypto.randomUUID();
    const childUuid = crypto.randomUUID();
    env.kernel.createEntity(hostUuid, 'Host');
    env.kernel.createEntity(childUuid, 'Both', hostUuid);

    const [host] = env.kernel.findShadowObjects(hostUuid);
    const twoDCtx = {mark: '2d'};
    const bitmapCtx = {mark: 'bitmap'};
    host.canvas$.set({
      getContext: (type) => (type === '2d' ? twoDCtx : bitmapCtx),
    });

    await settle();

    const child = env.kernel.getEntity(childUuid);
    expect(child.useContext(CanvasRenderingContext2D)()).toBe(twoDCtx);
    expect(child.useContext(ImageBitmapRenderingContext)()).toBe(bitmapCtx);
  });
});
