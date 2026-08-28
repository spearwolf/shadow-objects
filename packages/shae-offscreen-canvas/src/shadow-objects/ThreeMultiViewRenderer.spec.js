import {LocalShadowObjectEnv} from '@spearwolf/shadow-objects';
import {Registry} from '@spearwolf/shadow-objects/shadow-objects.js';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ThreeMultiViewRendererContext} from '../shared/constants.js';
import {ThreeMultiViewRenderer} from './ThreeMultiViewRenderer.js';

// `new WebGLRenderer({canvas})` fails in this runner: happy-dom's `OffscreenCanvas` has no WebGL
// context and no `addEventListener`, so the real constructor throws before `ThreeMultiViewRenderer`
// ever gets an instance to hold. `RecordingRenderer` stands in for the WebGL half only — everything
// else `three` exports stays real. It reproduces the one piece of behaviour
// `ThreeMultiViewRenderer.updateSize()` depends on: the initial size is the canvas size, `setSize`
// writes the new size back onto the canvas, and `getSize(target)` fills the `Vector2` handed in.
// `vi.mock` is hoisted above every other statement of this file, so the switch its factory reads
// has to be hoisted with it.
const webgl = vi.hoisted(() => ({rendererThrows: false}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();

  class RecordingRenderer {
    constructor({canvas, alpha}) {
      if (webgl.rendererThrows) {
        throw new Error('no WebGL context');
      }

      this.canvas = canvas;
      this.alpha = alpha;
      this.log = [];
      this._width = canvas.width;
      this._height = canvas.height;
    }

    setPixelRatio(value) {
      this.log.push(['setPixelRatio', value]);
    }

    setScissorTest(flag) {
      this.log.push(['setScissorTest', flag]);
    }

    setScissor(x, y, w, h) {
      this.log.push(['setScissor', x, y, w, h]);
    }

    setViewport(...args) {
      this.log.push(['setViewport', ...args]);
    }

    render(scene, camera) {
      this.log.push(['render', scene, camera]);
    }

    setSize(width, height, updateStyle = true) {
      this.log.push(['setSize', width, height, updateStyle]);
      this._width = width;
      this._height = height;
      this.canvas.width = width;
      this.canvas.height = height;
    }

    getSize(target) {
      return target.set(this._width, this._height);
    }

    dispose() {
      this.log.push(['dispose']);
    }
  }

  return {...actual, WebGLRenderer: RecordingRenderer};
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeEnv = () => {
  const env = new LocalShadowObjectEnv(new Registry());
  env.kernel.logger.enable = false;
  env.registry.define('ThreeMultiViewRenderer', ThreeMultiViewRenderer);
  return env;
};

describe('ThreeMultiViewRenderer', () => {
  let env;

  beforeEach(() => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.resolve({mark: 'imageBitmap'})),
    );
  });

  afterEach(() => {
    env?.destroy();
    env = undefined;
    vi.unstubAllGlobals();
    webgl.rendererThrows = false;
  });

  const create = () => {
    env = makeEnv();
    const uuid = crypto.randomUUID();
    env.kernel.createEntity(uuid, 'ThreeMultiViewRenderer');
    const [mvr] = env.kernel.findShadowObjects(uuid);
    return {uuid, mvr};
  };

  it('publishes the instance itself under ThreeMultiViewRendererContext', async () => {
    const {uuid, mvr} = create();

    await settle();

    expect(env.kernel.getEntity(uuid).useContext(ThreeMultiViewRendererContext)()).toBe(mvr);
  });

  it('sets up pixel ratio, scissor test and a 320x240 alpha canvas', () => {
    const {mvr} = create();

    expect(mvr.renderer.log).toContainEqual(['setPixelRatio', 1]);
    expect(mvr.renderer.log).toContainEqual(['setScissorTest', true]);
    expect(mvr.renderer.canvas.width).toBe(320);
    expect(mvr.renderer.canvas.height).toBe(240);
    expect(mvr.renderer.alpha).toBe(true);
  });

  describe('teardown after a renderer that never came to be', () => {
    // The kernel takes this path itself: `constructShadowObject()` catches a throwing constructor
    // and tears the creation scope down, and that runs every callback `onDestroy()` collected —
    // including the one this constructor registered before it threw. The creation API is stood in
    // for here because there is no instance to reach it through: the constructor does not return.
    it('disposes nothing when the renderer constructor threw', () => {
      webgl.rendererThrows = true;

      let releaseOnDestroy;
      const creationApi = {
        provideContext: () => ({set: () => {}}),
        onDestroy: (callback) => {
          releaseOnDestroy = callback;
        },
      };

      expect(() => new ThreeMultiViewRenderer(creationApi)).toThrow('no WebGL context');
      expect(releaseOnDestroy).toBeTypeOf('function');

      expect(() => releaseOnDestroy()).not.toThrow();
    });
  });

  describe('createView', () => {
    it('answers the default size and hands out consecutive ids', () => {
      const {mvr} = create();

      const view1 = mvr.createView();
      const view2 = mvr.createView();
      const view3 = mvr.createView(800, 600);

      expect(view1).toMatchObject({viewId: 1, width: 320, height: 240});
      expect(view2).toMatchObject({viewId: 2, width: 320, height: 240});
      expect(view3).toMatchObject({viewId: 3, width: 800, height: 600});
    });
  });

  describe('updateSize', () => {
    it('grows the renderer to the largest view', () => {
      const {mvr} = create();

      mvr.createView(800, 600);
      mvr.updateSize();

      expect(mvr.renderer.log).toContainEqual(['setSize', 800, 600, false]);
      expect(mvr.renderer.canvas.width).toBe(800);
      expect(mvr.renderer.canvas.height).toBe(600);
    });

    it('never sinks below the 320x240 default', () => {
      const {mvr} = create();

      mvr.createView(100, 100);
      const logLengthBefore = mvr.renderer.log.length;
      mvr.updateSize();

      // the smaller view does not shrink anything below the default the renderer already has
      expect(mvr.renderer.log.length).toBe(logLengthBefore);
      expect(mvr.renderer.canvas.width).toBe(320);
      expect(mvr.renderer.canvas.height).toBe(240);
    });

    it('does not call setSize again while the size stays the same', () => {
      const {mvr} = create();

      mvr.createView(800, 600);
      mvr.updateSize();
      const setSizeCallsAfterFirst = mvr.renderer.log.filter((entry) => entry[0] === 'setSize').length;

      mvr.updateSize();
      const setSizeCallsAfterSecond = mvr.renderer.log.filter((entry) => entry[0] === 'setSize').length;

      expect(setSizeCallsAfterSecond).toBe(setSizeCallsAfterFirst);
    });

    it('shrinks back once the largest view goes', () => {
      const {mvr} = create();

      const bigView = mvr.createView(800, 600);
      mvr.createView(320, 240);
      mvr.updateSize();
      expect(mvr.renderer.canvas.width).toBe(800);

      mvr.destroyView(bigView);
      mvr.updateSize();

      expect(mvr.renderer.canvas.width).toBe(320);
      expect(mvr.renderer.canvas.height).toBe(240);
    });

    it('sizes nothing once its entity is gone', () => {
      const {uuid, mvr} = create();
      mvr.createView(800, 600);

      env.kernel.destroyEntity(uuid);

      expect(() => mvr.updateSize()).not.toThrow();
    });
  });

  describe('destroyView', () => {
    it('accepts a view object as well as a bare id', () => {
      const {mvr} = create();

      const view = mvr.createView(500, 500);
      const other = mvr.createView(600, 600);

      mvr.destroyView(view);
      mvr.destroyView(other.viewId);

      // both are gone: growing past the default no longer counts either of their sizes
      mvr.updateSize();
      expect(mvr.renderer.canvas.width).toBe(320);
      expect(mvr.renderer.canvas.height).toBe(240);
    });

    it('destroys nothing when it is handed nothing', () => {
      const {mvr} = create();

      const view = mvr.createView(500, 500);

      expect(() => mvr.destroyView(undefined)).not.toThrow();
      expect(() => mvr.destroyView(null)).not.toThrow();

      // the view it did get is still there: it is the only thing that grows the canvas past 320x240
      mvr.updateSize();
      expect(mvr.renderer.canvas.width).toBe(500);
      expect(view.viewId).toBe(1);
    });
  });

  describe('renderView', () => {
    it('returns without rendering when the view has no scene', async () => {
      const {mvr} = create();
      const view = mvr.createView(100, 100);
      view.camera = {mark: 'camera'};

      await expect(mvr.renderView(view)).resolves.toBeUndefined();
      expect(mvr.renderer.log.some((entry) => entry[0] === 'render')).toBe(false);
    });

    it('returns without rendering when the view has no camera', async () => {
      const {mvr} = create();
      const view = mvr.createView(100, 100);
      view.scene = {mark: 'scene'};

      await expect(mvr.renderView(view)).resolves.toBeUndefined();
      expect(mvr.renderer.log.some((entry) => entry[0] === 'render')).toBe(false);
    });

    it('returns without rendering when the view has no area', async () => {
      const {mvr} = create();
      const view = mvr.createView(0, 100);
      view.scene = {mark: 'scene'};
      view.camera = {mark: 'camera'};

      await expect(mvr.renderView(view)).resolves.toBeUndefined();
      expect(mvr.renderer.log.some((entry) => entry[0] === 'render')).toBe(false);
    });

    it('rejects a view it did not create', async () => {
      const {mvr} = create();
      const foreignView = {viewId: 99999, width: 100, height: 100, scene: {}, camera: {}, viewport: undefined};

      await expect(mvr.renderView(foreignView)).rejects.toThrow('not my view: 99999');
    });

    it('scissors and views the full view area when no viewport is set', async () => {
      const {mvr} = create();
      const view = mvr.createView(100, 100);
      view.scene = {mark: 'scene'};
      view.camera = {mark: 'camera'};

      await mvr.renderView(view);

      expect(mvr.renderer.log).toContainEqual(['setScissor', 0, 0, 100, 100]);
      expect(mvr.renderer.log).toContainEqual(['setViewport', 0, 0, 100, 100]);
      expect(mvr.renderer.log).toContainEqual(['render', view.scene, view.camera]);
    });

    it('applies a custom viewport while the scissor still covers the full view area', async () => {
      const {mvr} = create();
      const view = mvr.createView(100, 100);
      view.scene = {mark: 'scene'};
      view.camera = {mark: 'camera'};
      view.viewport = [10, 20, 30, 40];

      await mvr.renderView(view);

      expect(mvr.renderer.log).toContainEqual(['setScissor', 0, 0, 100, 100]);
      expect(mvr.renderer.log).toContainEqual(['setViewport', 10, 20, 30, 40]);
    });

    it('crops the image from the bottom-left of the canvas at the view size', async () => {
      const {mvr} = create();

      const bigView = mvr.createView(800, 600);
      bigView.scene = {mark: 'bigScene'};
      bigView.camera = {mark: 'bigCamera'};
      await mvr.renderView(bigView);
      expect(mvr.renderer.canvas.height).toBe(600);

      const smallView = mvr.createView(320, 240);
      smallView.scene = {mark: 'smallScene'};
      smallView.camera = {mark: 'smallCamera'};

      await mvr.renderView(smallView);

      expect(createImageBitmap).toHaveBeenLastCalledWith(mvr.canvas, 0, 360, 320, 240);
    });

    it('draws one view at a time, in the order the calls arrived', async () => {
      const {mvr} = create();

      const first = mvr.createView(100, 100);
      first.scene = {mark: 'firstScene'};
      first.camera = {mark: 'firstCamera'};

      const second = mvr.createView(200, 200);
      second.scene = {mark: 'secondScene'};
      second.camera = {mark: 'secondCamera'};

      // The read-back of the first frame is held open by hand: this is the window in which the
      // second view would draw over the pixels the first one is still being read from.
      let finishFirstReadBack;
      createImageBitmap.mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirstReadBack = () => resolve({mark: 'firstImage'});
        }),
      );

      const firstRender = mvr.renderView(first);
      const secondRender = mvr.renderView(second);

      await settle();

      expect(mvr.renderer.log.filter((entry) => entry[0] === 'render')).toEqual([['render', first.scene, first.camera]]);

      finishFirstReadBack();
      await settle();

      expect(mvr.renderer.log.filter((entry) => entry[0] === 'render')).toEqual([
        ['render', first.scene, first.camera],
        ['render', second.scene, second.camera],
      ]);

      await expect(firstRender).resolves.toEqual({mark: 'firstImage'});
      await expect(secondRender).resolves.toEqual({mark: 'imageBitmap'});
    });

    // A rejected link does not end the chain: the view behind the rejected one still takes its turn.
    // The rejection here comes from the ownership guard, so nothing is drawn for the foreign view at all.
    it('carries on with the next view after a call that was rejected', async () => {
      const {mvr} = create();

      const foreign = {viewId: 99999, width: 100, height: 100, scene: {}, camera: {}, viewport: undefined};

      const mine = mvr.createView(100, 100);
      mine.scene = {mark: 'scene'};
      mine.camera = {mark: 'camera'};

      const failing = mvr.renderView(foreign);
      const following = mvr.renderView(mine);

      await expect(failing).rejects.toThrow('not my view: 99999');
      await expect(following).resolves.toEqual({mark: 'imageBitmap'});
    });

    it('answers no image for a view destroyed while it waited for its turn', async () => {
      const {mvr} = create();

      const first = mvr.createView(100, 100);
      first.scene = {mark: 'firstScene'};
      first.camera = {mark: 'firstCamera'};

      const second = mvr.createView(100, 100);
      second.scene = {mark: 'secondScene'};
      second.camera = {mark: 'secondCamera'};

      let finishFirstReadBack;
      createImageBitmap.mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirstReadBack = () => resolve({mark: 'firstImage'});
        }),
      );

      mvr.renderView(first);
      const secondRender = mvr.renderView(second);

      // handed back while it is still waiting behind the first view
      mvr.destroyView(second);

      finishFirstReadBack();

      await expect(secondRender).resolves.toBeUndefined();
      expect(mvr.renderer.log.filter((entry) => entry[0] === 'render')).toEqual([['render', first.scene, first.camera]]);
    });
  });

  describe('teardown', () => {
    // Holds what the kernel's own `clearOnDestroy` guarantees, not the explicit
    // `multiViewRenderer.set(null)` in the class's own `onDestroy` block: removing that line
    // leaves every case in this file green, `clearOnDestroy` writes `undefined` on its own once
    // the provider feed is released. No guard here tells the two apart — same situation as
    // `CanvasRenderingContext.js`'s explicit clearing block.
    it('leaves the context empty for the entity that provided it', async () => {
      const {uuid} = create();
      const entity = env.kernel.getEntity(uuid);
      await settle();

      env.kernel.destroyEntity(uuid);
      await settle();

      expect(entity.useContext(ThreeMultiViewRendererContext)()).toBeUndefined();
    });

    it('disposes the renderer and releases the canvas on destroy', () => {
      const {uuid, mvr} = create();
      const {renderer} = mvr;

      env.kernel.destroyEntity(uuid);

      expect(renderer.log).toContainEqual(['dispose']);
      expect(mvr.renderer).toBeNull();
      expect(mvr.canvas).toBeNull();
    });

    it('answers no image once its entity is gone', async () => {
      const {uuid, mvr} = create();
      const view = mvr.createView(100, 100);
      view.scene = {};
      view.camera = {};

      env.kernel.destroyEntity(uuid);

      await expect(mvr.renderView(view)).resolves.toBeUndefined();
    });
  });
});
