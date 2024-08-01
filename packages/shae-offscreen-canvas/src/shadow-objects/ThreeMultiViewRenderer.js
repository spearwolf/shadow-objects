import {Vector2, WebGLRenderer} from 'three';
import {ThreeMultiViewRendererContext} from '../shared/constants.js';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

const _size2 = new Vector2();

export class ThreeMultiViewRenderer {
  static displayName = 'ThreeMultiViewRenderer';

  #views = new Map();
  #lastViewId = 0;

  constructor({provideContext, onDestroy}) {
    const [, setMultiViewRenderer] = provideContext(ThreeMultiViewRendererContext, this);

    onDestroy(() => {
      setMultiViewRenderer(null);
    });

    this.canvas = new OffscreenCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);

    // TODO how we can configure webgl-renderer parameters?
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

  async renderView(view) {
    if (view?.scene == null || view?.camera == null) return;
    if (!(view.width > 0 && view.height > 0)) return;

    if (this.#views.has(view.viewId) === false) {
      throw new Error(`not my view: ${view.viewId}`);
    }

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

  onDestroy() {
    this.renderer.dispose();
    this.renderer = null;
  }
}
