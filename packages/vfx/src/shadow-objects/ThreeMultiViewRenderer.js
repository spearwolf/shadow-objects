import {WebGLRenderer} from 'three';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

export class ThreeMultiViewRenderer {
  #views = new Map();
  #lastViewId = 0;

  constructor({provideContext, onDestroy}) {
    const [, setMultiViewRenderer] = provideContext('multiViewRenderer', this);

    onDestroy(() => {
      setMultiViewRenderer(null);
    });

    this.canvas = new OffscreenCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);

    // XXX how we can configure webgl-renderer parameters?
    this.renderer = new WebGLRenderer({canvas: this.canvas});
    this.renderer.setScissorTest(true);

    console.log('ThreeMultiViewRenderer created', this);
  }

  createView(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
    const viewId = ++this.#lastViewId;
    const view = {viewId, width, height, viewport: [0, 0, width, height], scene: null, camera: null};
    this.#views.set(viewId, view);
    return view;
  }

  renderView(view) {
    if (view?.scene == null || view?.camera == null) return;
    if (!(view.width > 0 && view.height > 0)) return;
    if (!(view.viewport[2] > 0 && view.viewport[3] > 0)) return;
    if (this.#views.has(view.viewId) === false) {
      throw new Error(`not my view: ${view.viewId}`);
    }

    this.updateSize();

    this.renderer.setScissor(0, 0, view.width, view.height);
    this.renderer.setViewport(...view.viewport);
    this.renderer.render(view.scene, view.camera);
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
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.renderer.setSize(width, height, false);
  }

  onDestroy() {
    this.renderer.dispose();
    this.renderer = null;
    console.log('ThreeMultiViewRenderer destroyed', this);
  }
}
