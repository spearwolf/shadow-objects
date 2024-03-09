import {eventize} from '@spearwolf/eventize';
import {createEffect} from '@spearwolf/signalize';

export class VfxDisplay {
  #rafID = 0;

  entity = null;

  get uuid() {
    return this.entity?.uuid ?? '?';
  }

  width = 0;
  height = 0;

  canvas = null;

  isRunning = false;

  now = 0;
  frameNo = 0;

  ctx = null; // TODO remove me!
  fillStyle0 = 'rgb(255 0 0)'; // TODO remove me!
  fillStyle1 = 'rgb(0 0 255)'; // TODO remove me!

  get canRender() {
    return this.isRunning && this.canvas && this.width > 0 && this.height > 0;
  }

  constructor({useContext, useProperty}) {
    eventize(this);

    this.getSharedCanvas = useContext('vfx.canvas'); // TODO use shared vfx.canvas|multiViewRenderer

    this.#subscribeToCanvasSize(useProperty('canvasWidth'), useProperty('canvasHeight'));
  }

  // TODO next steps: on animation frame render canvas
  // - use start|stop events from <vfx-display>

  onCreate(entity) {
    this.entity = entity;
  }

  onEvent(type, data) {
    console.debug(`[VfxCtxDisplay] ${this.uuid} onEvent, type=`, type, 'data=', data);

    switch (type) {
      case 'offscreenCanvas':
        this.canvas = data.canvas;
        this.onCanvasChange(this.canvas);
        break;

      case 'start':
        if (!this.isRunning) {
          this.isRunning = true;
          this.#requestAnimationFrame();
        }
        break;

      case 'stop':
        if (this.isRunning) {
          this.isRunning = false;
          this.#cancelAnimationFrame();
        }
    }
  }

  onCanvasChange(_canvas) {
    this.#updateCanvasSize();

    const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
    this.fillStyle0 = `rgb(${r} ${g} ${b})`;
    this.fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;
  }

  onCanvasSizeChange(_w, _h) {
    this.#updateCanvasSize();
  }

  onFrame() {
    // TODO remove me!

    this.ctx ??= this.canvas.getContext('2d');

    const halfHeight = Math.floor(this.height / 2);

    this.ctx.fillStyle = this.fillStyle0;
    this.ctx.fillRect(0, 0, this.width, halfHeight);

    this.ctx.fillStyle = this.fillStyle1;
    this.ctx.fillRect(0, halfHeight, this.width, this.height - halfHeight);
  }

  #updateCanvasSize() {
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  #subscribeToCanvasSize(getCanvasWidth, getCanvasHeight) {
    const [, unsubscribe] = createEffect(() => {
      const w = getCanvasWidth();
      const h = getCanvasHeight();
      if (isNaN(w) || isNaN(h)) return;
      this.width = w;
      this.height = h;
      this.onCanvasSizeChange(w, h);
    }, [getCanvasWidth, getCanvasHeight]);
    this.once('onDestroy', () => {
      console.debug(`[VfxDisplay] ${this.uuid} unsubscribe from canvas size change`);
      unsubscribe();
    });
  }

  #renderFrame(now) {
    if (this.canRender) {
      this.now = now / 1000;
      this.frameNo++;
      this.onFrame();
    }
    this.#requestAnimationFrame();
  }

  #requestAnimationFrame() {
    this.#rafID = requestAnimationFrame(this.#renderFrame.bind(this));
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
  }
}
