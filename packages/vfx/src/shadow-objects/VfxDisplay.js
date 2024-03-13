import {eventize} from '@spearwolf/eventize';
import {createEffect} from '@spearwolf/signalize';
import {FrameLoop} from '../shared/FrameLoop.js';
import {OffscreenCanvas, StartFrameLoop, StopFrameLoop} from '../shared/constants.js';

export class VfxDisplay {
  #frameLoop = new FrameLoop();

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

  constructor({entity, useContext, useProperty}) {
    eventize(this);

    this.entity = entity;

    this.getMultiViewRenderer = useContext('multiViewRenderer'); // TODO use shared vfx.canvas|multiViewRenderer

    this.getMultiViewRenderer((val) => {
      console.log('[VfxDisplay] multiViewRenderer changed to', val);
    });

    this.#subscribeToCanvasSize(useProperty('canvasWidth'), useProperty('canvasHeight'));
  }

  onEvent(type, data) {
    console.debug(`[VfxCtxDisplay] ${this.uuid} onEvent, type=`, type, 'data=', data);

    switch (type) {
      case OffscreenCanvas:
        this.canvas = data.canvas;
        this.onCanvasChange(this.canvas);
        break;

      case StartFrameLoop:
        if (!this.isRunning) {
          this.isRunning = true;
          this.#frameLoop.start(this);
        }
        break;

      case StopFrameLoop:
        if (this.isRunning) {
          this.isRunning = false;
          this.#frameLoop.stop(this);
        }
        break;
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

  onFrame(now) {
    if (!this.canRender) return;

    this.now = now / 1000;
    this.frameNo++;

    // TODO remove me: ---

    this.ctx ??= this.canvas.getContext('2d');

    const halfHeight = Math.floor(this.height / 2);

    this.ctx.fillStyle = this.fillStyle0;
    this.ctx.fillRect(0, 0, this.width, halfHeight);

    this.ctx.fillStyle = this.fillStyle1;
    this.ctx.fillRect(0, halfHeight, this.width, this.height - halfHeight);

    // -------------------
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
}
