import {on} from '@spearwolf/eventize';
import {FrameLoop, LocalShadowObjectEnv} from '@spearwolf/shadow-objects';
import {MessageToView, Registry} from '@spearwolf/shadow-objects/shadow-objects.js';
import {createEffect} from '@spearwolf/signalize';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {shadowObjects} from '../shadow-objects.js';
import {
  CanvasContext,
  CanvasHeight,
  CanvasSizeContext,
  CanvasWidth,
  Fps,
  OffscreenCanvas,
  OffscreenCanvasContext,
  OnFrame,
  PixelRatio,
  RequestOffscreenCanvas,
  RunFrameLoop,
} from '../shared/constants.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeEnv = async () => {
  const env = new LocalShadowObjectEnv(new Registry());
  env.kernel.logger.enable = false;
  await env.importModule(shadowObjects);
  return env;
};

describe('ShaeOffscreenCanvas', () => {
  let env;

  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    env?.destroy();
    env = undefined;
    vi.unstubAllGlobals();
  });

  describe('registration', () => {
    it('registers every token it names', async () => {
      env = await makeEnv();

      for (const token of [
        'ShaeOffscreenCanvas',
        'ThreeMultiViewRenderer',
        'ThreeRenderView',
        'Canvas2D',
        'CanvasBitmapRenderer',
      ]) {
        expect(env.registry.hasToken(token)).toBe(true);
      }

      expect(env.registry.findTokensByRoute('ThreeRenderView')).toEqual(new Set(['ThreeRenderView', 'CanvasBitmapRenderer']));
    });
  });

  describe('requesting the canvas', () => {
    it('asks the view for an offscreen-canvas exactly once at creation', async () => {
      env = await makeEnv();

      const received = [];
      on(env.kernel, MessageToView, (message) => received.push(message));

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await settle();

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({uuid, type: RequestOffscreenCanvas});
    });

    it('does not ask again while the request still stands', async () => {
      env = await makeEnv();

      const received = [];
      on(env.kernel, MessageToView, (message) => received.push(message));

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await settle();
      expect(received).toHaveLength(1);

      const [so] = env.kernel.findShadowObjects(uuid);
      so.requestOffscreenCanvas();

      await settle();
      expect(received).toHaveLength(1);
    });

    it('asks again once a canvas has arrived', async () => {
      env = await makeEnv();

      const received = [];
      on(env.kernel, MessageToView, (message) => received.push(message));

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await settle();

      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas: {width: 0, height: 0}}}]);

      const [so] = env.kernel.findShadowObjects(uuid);
      so.requestOffscreenCanvas();

      await settle();
      expect(received).toHaveLength(2);
    });
  });

  describe('canvas and size', () => {
    it('publishes the received canvas identically under CanvasContext', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      const canvas = {width: 0, height: 0};
      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas}}]);

      await settle();

      expect(env.kernel.getEntity(uuid).useContext(CanvasContext)()).toBe(canvas);
    });

    it('sizes the canvas from canvasWidth/canvasHeight/pixelRatio and publishes CanvasSizeContext', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      const canvas = {width: 0, height: 0};
      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas}}]);
      env.kernel.changeProperties(uuid, [
        [CanvasWidth, 320],
        [CanvasHeight, 240],
        [PixelRatio, 2],
      ]);

      await settle();

      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(480);
      expect(env.kernel.getEntity(uuid).useContext(CanvasSizeContext)()).toEqual([640, 480, 2]);
    });

    it('leaves canvas and context untouched while a size is NaN', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      const canvas = {width: 0, height: 0};
      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas}}]);
      // pixelRatio is never set, so useProperty(PixelRatio)() reads undefined and isNaN(undefined) is true
      env.kernel.changeProperties(uuid, [
        [CanvasWidth, 320],
        [CanvasHeight, 240],
      ]);

      await settle();

      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
      expect(env.kernel.getEntity(uuid).useContext(CanvasSizeContext)()).toEqual([0, 0, 0]);
    });

    it('does not run the size effect again for a value-equal re-write', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      const canvas = {width: 0, height: 0};
      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas}}]);
      env.kernel.changeProperties(uuid, [
        [CanvasWidth, 320],
        [CanvasHeight, 240],
        [PixelRatio, 1],
      ]);

      await settle();

      let runs = 0;
      const getCanvasSize = env.kernel.getEntity(uuid).useContext(CanvasSizeContext);
      createEffect(() => {
        getCanvasSize();
        runs++;
      });

      expect(runs).toBe(1);

      // A raw width that still rounds to the same canvas width re-runs the sizing effect — the
      // property reader itself changed — but produces a value-equal [w, h, pixelRatio] array under
      // a new reference. The comparator on canvasSize$ is what keeps a value-equal set() from
      // reaching a consumer a second time.
      env.kernel.changeProperties(uuid, [[CanvasWidth, 320.4]]);

      await settle();

      expect(runs).toBe(1);
    });

    it('does not rewrite canvas.width/height a second time for a value-equal resize', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      // A canvas double that records every write to width/height, even a value-equal one — the
      // point of `canvas.width !== canvasWidth` is exactly to avoid such a write: in a browser it
      // resets the bitmap, so a guard that stops gating and always writes is not cosmetic.
      let _width = 0;
      let _height = 0;
      const widthWrites = [];
      const heightWrites = [];
      const canvas = {
        get width() {
          return _width;
        },
        set width(value) {
          widthWrites.push(value);
          _width = value;
        },
        get height() {
          return _height;
        },
        set height(value) {
          heightWrites.push(value);
          _height = value;
        },
      };

      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas}}]);
      env.kernel.changeProperties(uuid, [
        [CanvasWidth, 320],
        [CanvasHeight, 240],
        [PixelRatio, 1],
      ]);
      await settle();

      expect(widthWrites).toEqual([320]);
      expect(heightWrites).toEqual([240]);

      // Same trick as above: a raw width that still rounds to 320 re-runs the effect without
      // changing the outcome, so the write must not happen a second time.
      env.kernel.changeProperties(uuid, [[CanvasWidth, 320.4]]);
      await settle();

      expect(widthWrites).toEqual([320]);
      expect(heightWrites).toEqual([240]);
    });
  });

  describe('the frame comparison in the loop', () => {
    const startLoop = async (uuid, kernel) => {
      kernel.changeProperties(uuid, [[RunFrameLoop, true]]);
      await settle();
    };

    it('starts the loop and requests exactly one animation frame', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await startLoop(uuid, env.kernel);

      const [so] = env.kernel.findShadowObjects(uuid);
      expect(so.isRunning).toBe(true);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('cancels the pending frame once switched off', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await startLoop(uuid, env.kernel);

      env.kernel.changeProperties(uuid, [[RunFrameLoop, false]]);
      await settle();

      const [so] = env.kernel.findShadowObjects(uuid);
      expect(so.isRunning).toBe(false);
      expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('caps the frame rate from the fps property, defaulting to 60fps, and re-caps on change', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await startLoop(uuid, env.kernel);
      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas: {width: 100, height: 100}}}]);
      await settle();

      const hostFrames = [];
      on(env.kernel.getEntity(uuid), OnFrame, (data) => hostFrames.push(data));

      // The stub never calls back on its own, so this drives FrameLoop's real #isDue gating by
      // invoking the captured rAF callback by hand — every other case in this block calls
      // so[FrameLoop.OnFrame] directly instead, which bypasses maxFps entirely.
      const fire = (now) => requestAnimationFrame.mock.calls.at(-1)[0](now);

      fire(0);
      expect(hostFrames).toHaveLength(1); // the first frame is always due

      fire(10);
      // 10ms since the last delivered frame is under 0.75 * 1000/60 ≈ 12.5ms: still capped at the
      // 60fps default. `#frameLoop`'s own constructor default is 90fps (threshold ≈ 8.3ms), which
      // 10ms would have cleared — so this frame being held back is also what shows that the effect
      // ran at all and put the 60 in place of that 90.
      expect(hostFrames).toHaveLength(1);

      fire(100);
      // 100ms since the last delivered frame clears the 60fps default's ≈ 12.5ms threshold — a
      // lower default (e.g. 1fps, threshold 750ms) would have kept this one capped too, which is
      // what ties the assertion to 60 specifically and not to some other cap that also blocks 10ms.
      expect(hostFrames).toHaveLength(2);

      env.kernel.changeProperties(uuid, [[Fps, 1000]]);
      await settle();

      fire(100.5);
      // 0.5ms since the last delivered frame stays under 0.75 * 1000/1000 = 0.75ms even at the
      // raised cap: still capped, so the count stays where fire(100) left it.
      expect(hostFrames).toHaveLength(2);

      fire(101);
      // 1ms since the last delivered frame clears the 0.75ms threshold at 1000fps — a spacing that
      // stayed capped for as long as the 60fps default held.
      expect(hostFrames).toHaveLength(3);
    });

    describe('calling FrameLoop.OnFrame by hand', () => {
      const makeTree = async () => {
        env = await makeEnv();

        const hostUuid = crypto.randomUUID();
        const childUuid1 = crypto.randomUUID();
        const childUuid2 = crypto.randomUUID();

        env.kernel.createEntity(hostUuid, 'ShaeOffscreenCanvas');
        env.kernel.createEntity(childUuid1, 'plainChild', hostUuid);
        env.kernel.createEntity(childUuid2, 'plainChild', childUuid1);

        const hostFrames = [];
        const child1Frames = [];
        const child2Frames = [];

        on(env.kernel.getEntity(hostUuid), OnFrame, (data) => hostFrames.push(data));
        on(env.kernel.getEntity(childUuid1), OnFrame, (data) => child1Frames.push(data));
        on(env.kernel.getEntity(childUuid2), OnFrame, (data) => child2Frames.push(data));

        return {hostUuid, hostFrames, child1Frames, child2Frames};
      };

      it('emits nothing while the loop is not running, even with a sized canvas', async () => {
        const {hostUuid, hostFrames} = await makeTree();

        // RunFrameLoop is never switched on here, so isRunning stays false — the canvas alone
        // (present and sized) must not be enough to render a frame.
        env.kernel.dispatchEventsToEntity(hostUuid, [{type: OffscreenCanvas, data: {canvas: {width: 100, height: 100}}}]);
        await settle();

        const [so] = env.kernel.findShadowObjects(hostUuid);
        so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});

        expect(hostFrames).toHaveLength(0);
      });

      it('emits nothing without a canvas', async () => {
        const {hostUuid, hostFrames} = await makeTree();

        await startLoop(hostUuid, env.kernel);

        const [so] = env.kernel.findShadowObjects(hostUuid);
        so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});

        expect(hostFrames).toHaveLength(0);
      });

      it('emits nothing at canvas width 0', async () => {
        const {hostUuid, hostFrames} = await makeTree();

        await startLoop(hostUuid, env.kernel);
        env.kernel.dispatchEventsToEntity(hostUuid, [{type: OffscreenCanvas, data: {canvas: {width: 0, height: 100}}}]);
        await settle();

        const [so] = env.kernel.findShadowObjects(hostUuid);
        so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});

        expect(hostFrames).toHaveLength(0);
      });

      it('emits nothing at canvas height 0', async () => {
        const {hostUuid, hostFrames} = await makeTree();

        await startLoop(hostUuid, env.kernel);
        env.kernel.dispatchEventsToEntity(hostUuid, [{type: OffscreenCanvas, data: {canvas: {width: 100, height: 0}}}]);
        await settle();

        const [so] = env.kernel.findShadowObjects(hostUuid);
        so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});

        expect(hostFrames).toHaveLength(0);
      });

      it('reaches every entity of the subtree and counts up the frame number', async () => {
        const {hostUuid, hostFrames, child1Frames, child2Frames} = await makeTree();

        await startLoop(hostUuid, env.kernel);
        const canvas = {width: 100, height: 100};
        env.kernel.dispatchEventsToEntity(hostUuid, [{type: OffscreenCanvas, data: {canvas}}]);
        await settle();

        const [so] = env.kernel.findShadowObjects(hostUuid);
        so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});
        so[FrameLoop.OnFrame]({now: 1, deltaTime: 1});
        so[FrameLoop.OnFrame]({now: 2, deltaTime: 1});

        expect(hostFrames).toHaveLength(3);
        expect(child1Frames).toHaveLength(3);
        expect(child2Frames).toHaveLength(3);

        expect(hostFrames.map((f) => f.frameNo)).toEqual([1, 2, 3]);
        expect(hostFrames[0]).toMatchObject({now: 0, deltaTime: 0, canvas});
        expect(child2Frames[2]).toMatchObject({now: 2, deltaTime: 1, canvas, frameNo: 3});
      });
    });
  });

  describe('the fps counter', () => {
    const makeRunning = async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');
      env.kernel.changeProperties(uuid, [[RunFrameLoop, true]]);
      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas: {width: 100, height: 100}}}]);
      await settle();

      const [so] = env.kernel.findShadowObjects(uuid);
      so.logger.enable = true;
      return so;
    };

    it('sets fpsCounterTime to the timestamp of the very first frame', async () => {
      const so = await makeRunning();

      so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});

      expect(so.fpsCounterTime).toBe(0);
    });

    it('reports nothing before the interval is due and keeps counting', async () => {
      const so = await makeRunning();

      so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});
      so[FrameLoop.OnFrame]({now: 4.9, deltaTime: 4.9});

      expect(so.fpsCounter).toBe(2);
      expect(so.fpsCounterTime).toBe(0);
    });

    it('reports the rounded rate once the interval is due and resets', async () => {
      const so = await makeRunning();
      const infoSpy = vi.spyOn(so.logger, 'info').mockImplementation(() => {});

      so[FrameLoop.OnFrame]({now: 0, deltaTime: 0});
      so[FrameLoop.OnFrame]({now: 4.9, deltaTime: 4.9});
      so[FrameLoop.OnFrame]({now: 5, deltaTime: 0.1});

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(so.fpsCounter).toBe(0);
      expect(so.fpsCounterTime).toBe(5);
    });
  });

  describe('events from the view', () => {
    it('warns exactly once about an unknown event type', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      const [so] = env.kernel.findShadowObjects(uuid);
      so.logger.enable = true;
      const warnSpy = vi.spyOn(so.logger, 'warn').mockImplementation(() => {});

      env.kernel.dispatchEventsToEntity(uuid, [{type: 'somethingUnknown', data: {}}]);

      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('does not warn about the known offscreen-canvas event', async () => {
      env = await makeEnv();

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      const [so] = env.kernel.findShadowObjects(uuid);
      so.logger.enable = true;
      const warnSpy = vi.spyOn(so.logger, 'warn').mockImplementation(() => {});

      env.kernel.dispatchEventsToEntity(uuid, [{type: OffscreenCanvas, data: {canvas: {width: 0, height: 0}}}]);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('teardown', () => {
    it('stops the loop and clears the contexts a child reads', async () => {
      env = await makeEnv();

      const hostUuid = crypto.randomUUID();
      const childUuid = crypto.randomUUID();

      env.kernel.createEntity(hostUuid, 'ShaeOffscreenCanvas');
      env.kernel.createEntity(childUuid, 'plainChild', hostUuid);

      env.kernel.changeProperties(hostUuid, [[RunFrameLoop, true]]);
      env.kernel.dispatchEventsToEntity(hostUuid, [{type: OffscreenCanvas, data: {canvas: {width: 10, height: 10}}}]);
      await settle();

      const [so] = env.kernel.findShadowObjects(hostUuid);
      const child = env.kernel.getEntity(childUuid);

      env.kernel.destroyEntity(hostUuid);
      await settle();

      expect(so.isRunning).toBe(false);
      expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
      expect(child.useContext(CanvasContext)()).toBeUndefined();
      expect(child.useContext(OffscreenCanvasContext)()).toBeUndefined();
    });

    // The teardown block gives back the view channel along with the context signals and the frame
    // loop, so a request made through this shadow object after its entity is gone finds no channel
    // to send through. A call still has to stay silent instead of throwing — freeing the channel
    // alone would turn every request after destroy into a TypeError, which is no improvement over
    // the silence it replaces.
    it('frees the view channel it held after destroy, and a later request stays silent', async () => {
      env = await makeEnv();

      const received = [];
      on(env.kernel, MessageToView, (message) => received.push(message));

      const uuid = crypto.randomUUID();
      env.kernel.createEntity(uuid, 'ShaeOffscreenCanvas');

      await settle();
      received.length = 0;

      const [so] = env.kernel.findShadowObjects(uuid);

      env.kernel.destroyEntity(uuid);
      await settle();

      expect(so.dispatchMessageToView).toBeUndefined();
      expect(so.canvasRequested).toBe(false);

      expect(() => so.requestOffscreenCanvas()).not.toThrow();
      await settle();

      expect(received).toEqual([]);
    });
  });
});