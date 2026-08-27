import {Vector2, WebGLRenderer} from 'three';
import {ThreeMultiViewRendererContext} from '../shared/constants.js';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

const _size2 = new Vector2();

/**
 * Ends a link of the render chain: the chain carries the turn, not the outcome. A render that
 * failed must not leave the chain rejected and every view behind it unrendered, and the image of
 * one that succeeded has no business being held until the next call replaces it.
 */
const forgetOutcome = () => {};

export class ThreeMultiViewRenderer {
  static displayName = 'ThreeMultiViewRenderer';

  #views = new Map();
  #lastViewId = 0;
  #renderChain = Promise.resolve();

  constructor({provideContext, onDestroy}) {
    const multiViewRenderer = provideContext(ThreeMultiViewRendererContext, this);

    // The creation API's `onDestroy` callback is the one channel the kernel notifies this
    // class through when its entity ends, so the release lives here rather than in a
    // same-named method — a plain method of that name is never called by the kernel.
    onDestroy(() => {
      multiViewRenderer.set(null);
      this.#views.clear();
      this.renderer.dispose();
      this.renderer = null;
      this.canvas = null;
    });

    this.canvas = new OffscreenCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);

    // TODO(feat) how we can configure webgl-renderer parameters?
    this.renderer = new WebGLRenderer({canvas: this.canvas, alpha: true});

    this.renderer.setPixelRatio(1);
    this.renderer.setScissorTest(true);
  }

  createView(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
    const viewId = ++this.#lastViewId;
    const view = {viewId, width, height, viewport: undefined, scene: null, camera: null};
    this.#views.set(viewId, view);
    return view;
  }

  /**
   * Draws the view and reads the result off the canvas as an `ImageBitmap`.
   *
   * Every view of this renderer draws with the same `WebGLRenderer` onto the same canvas, and the
   * read-back is asynchronous. Drawing the next view while the read of the previous one is still
   * open would draw over the pixels being read, so the calls take their turn: one view is drawn
   * and read out at a time, in the order the calls arrived.
   */
  renderView(view) {
    // Whether the view belongs to this renderer is answered in the caller's turn: a caller handing
    // over a view this renderer never made has made its mistake now, and a view of this renderer
    // that is destroyed while it waits for its turn is not that mistake.
    const wasMine = this.#views.has(view?.viewId);

    const rendered = this.#renderChain.then(() => this.#renderViewNow(view, wasMine));

    this.#renderChain = rendered.then(forgetOutcome, forgetOutcome);

    return rendered;
  }

  async #renderViewNow(view, wasMine) {
    // A frame already in flight when the entity's teardown ran finds neither renderer nor
    // canvas here; `ThreeRenderView` treats no image the same as nothing to transfer.
    if (this.renderer == null) return;
    if (view?.scene == null || view?.camera == null) return;
    if (!(view.width > 0 && view.height > 0)) return;

    if (wasMine === false) {
      throw new Error(`not my view: ${view.viewId}`);
    }

    // The view was this renderer's when the call came in and is gone by the time its turn arrives:
    // nothing left to draw, and no size of its own left in `updateSize()` to crop against.
    if (this.#views.has(view.viewId) === false) return;

    this.updateSize();

    this.renderer.setScissor(0, 0, view.width, view.height);

    if (view.viewport == null) {
      this.renderer.setViewport(0, 0, view.width, view.height);
    } else {
      this.renderer.setViewport(...view.viewport);
    }

    this.renderer.render(view.scene, view.camera);

    // https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap
    return createImageBitmap(this.canvas, 0, this.canvas.height - view.height, view.width, view.height);
  }

  destroyView(view) {
    const viewId = typeof view === 'number' ? view : view.viewId;
    this.#views.delete(viewId);
  }

  updateSize() {
    let width = DEFAULT_WIDTH;
    let height = DEFAULT_HEIGHT;

    for (const view of this.#views.values()) {
      width = Math.max(width, view.width);
      height = Math.max(height, view.height);
    }

    this.renderer.getSize(_size2);
    if (_size2.width === width && _size2.height === height) return;

    this.renderer.setSize(width, height, false);
  }
}
