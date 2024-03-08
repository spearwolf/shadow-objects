import {eventize} from '@spearwolf/eventize';
import {createEffect} from '@spearwolf/signalize';

export class VfxDisplay {
  #uuid = '?';

  #width = 0;
  #height = 0;

  #canvas = null;

  constructor({useContext, useProperty}) {
    eventize(this);

    this.getSharedCanvas = useContext('vfx.canvas'); // TODO use shared vfx.canvas|multiViewRenderer

    this.#subscribeToCanvasSize(useProperty('canvasWidth'), useProperty('canvasHeight'));
  }

  // TODO next steps: on animation frame render canvas
  // - use start|stop events from <vfx-display>

  onCreate(entity) {
    this.#uuid = entity.uuid;
  }

  onEvent(type, data) {
    console.debug(`[VfxCtxDisplay] ${this.#uuid} onEvent, type=`, type, 'data=', data);

    switch (type) {
      case 'offscreenCanvas':
        this.#canvas = data.canvas;
        this.onCanvasChange(this.#canvas);
        break;
    }
  }

  onCanvasChange(canvas) {
    console.log(`[VfxDisplay] ${this.#uuid} got canvas`, canvas);
    this.#updateCanvasSize();
  }

  onCanvasSizeChange(w, h) {
    console.log(`[VfxDisplay] ${this.#uuid} canvas size change ${w} x ${h}`);
    this.#updateCanvasSize();
  }

  #updateCanvasSize() {
    if (this.#canvas) {
      this.#canvas.width = this.#width;
      this.#canvas.height = this.#height;
    }
  }

  #subscribeToCanvasSize(getCanvasWidth, getCanvasHeight) {
    const [, unsubscribe] = createEffect(() => {
      const w = getCanvasWidth();
      const h = getCanvasHeight();
      if (isNaN(w) || isNaN(h)) return;
      this.#width = w;
      this.#height = h;
      this.onCanvasSizeChange(w, h);
    }, [getCanvasWidth, getCanvasHeight]);
    this.once('onDestroy', () => {
      console.debug(`[VfxDisplay] ${this.#uuid} unsubscribe from canvas size change`);
      unsubscribe();
    });
  }
}
