import {emit, on} from '@spearwolf/eventize';
import {LocalShadowObjectEnv} from '@spearwolf/shadow-objects';
import {Registry} from '@spearwolf/shadow-objects/shadow-objects.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  CanvasSizeContext,
  ImageBitmapRenderingContext,
  OnFrame,
  ThreeMultiViewRendererContext,
  ThreeRenderViewContext,
} from '../shared/constants.js';
import {ThreeRenderView} from './ThreeRenderView.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * `not.toThrow()` only guards a synchronous call. The first real run of the effect that reads
 * `CanvasSizeContext` happens once the entity's context wiring settles — a queued microtask, not
 * the synchronous call that triggered it — so a throw from it never reaches a synchronous
 * try/catch and would otherwise surface only as a file-level "Unhandled Errors" note with no
 * failing assertion attached. This captures it directly, for the duration of one probe.
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
 * A host that stands in for `ThreeMultiViewRenderer`, `CanvasBitmapRenderer` and
 * `ShaeOffscreenCanvas` at once: it provides the three contexts `ThreeRenderView` reads, all as
 * plain signals under the test's own control — no `three`, no canvas, no WebGL involved.
 */
class Host {
  static displayName = 'Host';

  constructor({provideContext}) {
    this.multiViewRenderer$ = provideContext(ThreeMultiViewRendererContext);
    this.imageBitmapRenderer$ = provideContext(ImageBitmapRenderingContext);
    this.canvasSize$ = provideContext(CanvasSizeContext);
  }
}

/** A `ThreeMultiViewRenderer` double: hands out views with sequential ids and records every call. */
const makeMockRenderer = () => {
  let nextViewId = 1;
  const calls = [];

  return {
    calls,
    createView: vi.fn((width, height) => {
      const view = {viewId: nextViewId++, width, height};
      calls.push('createView');
      return view;
    }),
    destroyView: vi.fn((_view) => {
      calls.push('destroyView');
    }),
    renderView: vi.fn(() => Promise.resolve(undefined)),
  };
};

const makeMockImageBitmapRenderer = () => ({
  transferFromImageBitmap: vi.fn(),
});

const makeEnv = () => {
  const env = new LocalShadowObjectEnv(new Registry());
  env.kernel.logger.enable = false;
  env.registry.define('Host', Host);
  env.registry.define('ThreeRenderView', ThreeRenderView);
  env.registry.define('Nothing', class Nothing {});
  return env;
};

describe('ThreeRenderView', () => {
  let env;

  afterEach(() => {
    env?.destroy();
    env = undefined;
  });

  const setup = () => {
    env = makeEnv();
    const hostUuid = crypto.randomUUID();
    const childUuid = crypto.randomUUID();
    env.kernel.createEntity(hostUuid, 'Host');
    env.kernel.createEntity(childUuid, 'ThreeRenderView', hostUuid);

    const [host] = env.kernel.findShadowObjects(hostUuid);
    const child = env.kernel.getEntity(childUuid);

    return {host, child};
  };

  it('takes a view at the first known size and publishes it under ThreeRenderViewContext', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    expect(renderer.createView).toHaveBeenCalledTimes(1);
    expect(renderer.createView).toHaveBeenCalledWith(320, 240);
    expect(child.useContext(ThreeRenderViewContext)()).toBe(renderer.createView.mock.results[0].value);
  });

  it('takes no view without a size', async () => {
    const {host} = setup();
    const renderer = makeMockRenderer();

    const errors = await captureUncaught(() => host.multiViewRenderer$.set(renderer));
    expect(errors).toEqual([]);

    expect(renderer.createView).not.toHaveBeenCalled();
  });

  it('changes the held view on a new size instead of taking a second one', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    host.canvasSize$.set([800, 600, 1]);
    await settle();

    expect(renderer.createView).toHaveBeenCalledTimes(1);
    const view = child.useContext(ThreeRenderViewContext)();
    expect(view).toMatchObject({width: 800, height: 600});
  });

  it('gives the view back and clears its context once the renderer context disappears', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();
    const view = child.useContext(ThreeRenderViewContext)();

    host.multiViewRenderer$.set(undefined);
    await settle();

    expect(child.useContext(ThreeRenderViewContext)()).toBeUndefined();
    expect(renderer.destroyView).toHaveBeenCalledWith(view);
  });

  it('takes a new view once the renderer context comes back', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    host.multiViewRenderer$.set(undefined);
    await settle();
    expect(child.useContext(ThreeRenderViewContext)()).toBeUndefined();

    host.multiViewRenderer$.set(renderer);
    await settle();

    expect(renderer.createView).toHaveBeenCalledTimes(2);
    expect(child.useContext(ThreeRenderViewContext)()).toBeDefined();
  });

  it('gives back every view it took on teardown', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    // This is the balance that holds no matter how many views passed through: every view taken is
    // given back, and the last thing the mock renderer records is a `destroyView`. The case below
    // counts them.
    env.kernel.destroyEntity(child.uuid);
    await settle();

    const createViewCount = renderer.createView.mock.calls.length;
    const destroyViewCount = renderer.destroyView.mock.calls.length;

    expect(destroyViewCount).toBe(createViewCount);
    expect(renderer.calls.at(-1)).toBe('destroyView');
  });

  it('gives its view back on teardown without taking another', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    const view = child.useContext(ThreeRenderViewContext)();

    expect(renderer.createView).toHaveBeenCalledTimes(1);
    expect(renderer.destroyView).not.toHaveBeenCalled();

    env.kernel.destroyEntity(child.uuid);
    await settle();

    expect(renderer.createView).toHaveBeenCalledTimes(1);
    expect(renderer.destroyView).toHaveBeenCalledTimes(1);
    expect(renderer.destroyView).toHaveBeenCalledWith(view);
  });

  it('gives its view back when its entity changes token', async () => {
    const {host, child} = setup();
    const renderer = makeMockRenderer();

    host.multiViewRenderer$.set(renderer);
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    expect(renderer.createView).toHaveBeenCalledTimes(1);
    expect(renderer.destroyView).not.toHaveBeenCalled();

    env.kernel.changeToken(child.uuid, 'Nothing');
    await settle();

    expect(renderer.createView).toHaveBeenCalledTimes(1);
    expect(renderer.destroyView).toHaveBeenCalledTimes(1);
    expect(child.useContext(ThreeRenderViewContext)()).toBeUndefined();
  });

  describe('rendering a frame', () => {
    const setupRendering = async () => {
      const {host, child} = setup();
      const renderer = makeMockRenderer();
      const imageBitmapRenderer = makeMockImageBitmapRenderer();

      host.multiViewRenderer$.set(renderer);
      host.imageBitmapRenderer$.set(imageBitmapRenderer);
      host.canvasSize$.set([320, 240, 1]);
      await settle();

      const view = child.useContext(ThreeRenderViewContext)();

      return {child, renderer, imageBitmapRenderer, view};
    };

    it('renders the view, transfers the image and closes it', async () => {
      const {child, renderer, imageBitmapRenderer, view} = await setupRendering();

      const image = {close: vi.fn()};
      renderer.renderView.mockResolvedValueOnce(image);

      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).toHaveBeenCalledWith(view);
      expect(imageBitmapRenderer.transferFromImageBitmap).toHaveBeenCalledWith(image);
      expect(image.close).toHaveBeenCalledTimes(1);
    });

    it('does nothing without a view', async () => {
      const {host, child} = setup();
      const renderer = makeMockRenderer();
      const imageBitmapRenderer = makeMockImageBitmapRenderer();

      host.multiViewRenderer$.set(renderer);
      host.imageBitmapRenderer$.set(imageBitmapRenderer);
      // canvasSize is never set, so no view is ever taken
      await settle();

      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).not.toHaveBeenCalled();
    });

    it('does nothing without a bitmap renderer', async () => {
      const {host, child} = setup();
      const renderer = makeMockRenderer();

      host.multiViewRenderer$.set(renderer);
      host.canvasSize$.set([320, 240, 1]);
      await settle();

      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).not.toHaveBeenCalled();
    });

    it('does nothing when the render call answers with nothing', async () => {
      const {child, renderer, imageBitmapRenderer} = await setupRendering();

      renderer.renderView.mockResolvedValueOnce(undefined);

      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).toHaveBeenCalledTimes(1);
      expect(imageBitmapRenderer.transferFromImageBitmap).not.toHaveBeenCalled();
    });

    it('runs behind every listener attached later on the same entity (Priority.Low)', async () => {
      const {child, renderer} = await setupRendering();
      const order = [];

      renderer.renderView.mockImplementation(() => {
        order.push('threeRenderView');
        return Promise.resolve(undefined);
      });

      on(child, OnFrame, () => order.push('laterListener'));

      emit(child, OnFrame, {});
      await settle();

      expect(order).toEqual(['laterListener', 'threeRenderView']);
    });

    // Measured, not endorsed: nothing in `ThreeRenderView` keeps a render in flight from starting a
    // second one for the same view. Two frames arriving before the first `renderView()` resolves both
    // reach the mock renderer with the same view — a lock per view would make the second one skip.
    it('enters the frame callback twice for the same view when renderView never resolves', async () => {
      const {child, renderer, view} = await setupRendering();

      renderer.renderView.mockReturnValue(new Promise(() => {}));

      emit(child, OnFrame, {});
      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).toHaveBeenCalledTimes(2);
      expect(renderer.renderView).toHaveBeenNthCalledWith(1, view);
      expect(renderer.renderView).toHaveBeenNthCalledWith(2, view);
    });
  });
});
