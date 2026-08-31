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

/**
 * A provider of `ThreeMultiViewRendererContext` and nothing else. On an entity between the host
 * and the render view it makes the one situation the render view cannot otherwise be put in: the
 * renderer in reach is replaced by another without falling to `undefined` in between, because a
 * nearer provider takes the name over from the one above it.
 */
class RendererProvider {
  static displayName = 'RendererProvider';

  constructor({provideContext}) {
    this.multiViewRenderer$ = provideContext(ThreeMultiViewRendererContext);
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
  env.registry.define('RendererProvider', RendererProvider);
  env.registry.define('Nothing', class Nothing {});
  return env;
};

describe('ThreeRenderView', () => {
  let env;

  afterEach(() => {
    env?.destroy();
    env = undefined;
    // the console spies of the failure cases below belong to their case, not to the file
    vi.restoreAllMocks();
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

  it('takes a view of the renderer that takes over and gives the old one back to its maker', async () => {
    env = makeEnv();
    const hostUuid = crypto.randomUUID();
    const providerUuid = crypto.randomUUID();
    const childUuid = crypto.randomUUID();

    env.kernel.createEntity(hostUuid, 'Host');
    env.kernel.createEntity(providerUuid, 'RendererProvider', hostUuid);
    env.kernel.createEntity(childUuid, 'ThreeRenderView', providerUuid);

    const [host] = env.kernel.findShadowObjects(hostUuid);
    const [provider] = env.kernel.findShadowObjects(providerUuid);
    const child = env.kernel.getEntity(childUuid);

    const outer = makeMockRenderer();
    const nearer = makeMockRenderer();

    host.multiViewRenderer$.set(outer);
    host.imageBitmapRenderer$.set(makeMockImageBitmapRenderer());
    host.canvasSize$.set([320, 240, 1]);
    await settle();

    const firstView = child.useContext(ThreeRenderViewContext)();
    expect(outer.createView, 'the outer provider is the one in reach to begin with').toHaveBeenCalledTimes(1);

    // The nearer provider takes the name over while the outer one still holds it: what the render
    // view reads goes from one renderer to the other in one step, with no `undefined` in between.
    provider.multiViewRenderer$.set(nearer);
    await settle();

    const secondView = child.useContext(ThreeRenderViewContext)();

    expect(nearer.createView, 'the renderer that takes over makes the view').toHaveBeenCalledTimes(1);
    expect(secondView).toBe(nearer.createView.mock.results[0].value);
    expect(outer.destroyView, 'the view goes back to the renderer that made it').toHaveBeenCalledWith(firstView);
    expect(nearer.destroyView, 'and not to the one that took over').not.toHaveBeenCalled();

    emit(child, OnFrame, {});
    await settle();

    expect(nearer.renderView, 'the frames go to the new renderer, with a view it owns').toHaveBeenCalledWith(secondView);
    expect(outer.renderView, 'and the renderer that left gets none').not.toHaveBeenCalled();
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

    // The listener is `async`, and eventize hands it the next frame whether or not the previous one
    // has come back. A render is over once its image has been read off the shared canvas, and a
    // frame that arrives before that passes without rendering.
    it('skips a frame for a view whose previous frame has not come back', async () => {
      const {child, renderer, view} = await setupRendering();

      let letTheFirstFrameFinish;
      renderer.renderView.mockReturnValueOnce(
        new Promise((resolve) => {
          letTheFirstFrameFinish = () => resolve(undefined);
        }),
      );

      emit(child, OnFrame, {});
      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).toHaveBeenCalledTimes(1);
      expect(renderer.renderView).toHaveBeenCalledWith(view);

      letTheFirstFrameFinish();
      await settle();

      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView, 'the view is free again once its frame came back').toHaveBeenCalledTimes(2);
    });

    it('takes the next frame after one whose render failed', async () => {
      const {child, renderer} = await setupRendering();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));

      emit(child, OnFrame, {});
      await settle();

      emit(child, OnFrame, {});
      await settle();

      expect(renderer.renderView).toHaveBeenCalledTimes(2);
    });

    it('reports a failed render instead of letting the rejection escape', async () => {
      const {child, renderer} = await setupRendering();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));

      const escaped = await captureUncaught(() => emit(child, OnFrame, {}));

      expect(escaped, 'the rejection stays inside the listener').toEqual([]);
      expect(consoleError, 'and the failure is reported').toHaveBeenCalledTimes(1);
    });

    it('reports a render that keeps failing the same way once, not once per frame', async () => {
      const {child, renderer} = await setupRendering();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      renderer.renderView.mockRejectedValue(new Error('the render failed'));

      for (let frame = 0; frame < 3; frame++) {
        emit(child, OnFrame, {});
        await settle();
      }

      expect(renderer.renderView, 'every frame still takes its turn').toHaveBeenCalledTimes(3);
      expect(consoleError, 'and one report carries all three').toHaveBeenCalledTimes(1);
    });

    it('reports again after a frame that came back', async () => {
      const {child, renderer} = await setupRendering();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));
      emit(child, OnFrame, {});
      await settle();

      // the mock answers with a resolved promise again, which is its default
      emit(child, OnFrame, {});
      await settle();

      renderer.renderView.mockRejectedValueOnce(new Error('the render failed'));
      emit(child, OnFrame, {});
      await settle();

      expect(consoleError, 'a failure behind a frame that came back is its own episode').toHaveBeenCalledTimes(2);
    });
  });
});
