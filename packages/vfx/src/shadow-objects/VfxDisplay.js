import {eventize} from '@spearwolf/eventize';
import {createEffect, value} from '@spearwolf/signalize';
import {FrameLoop} from '../shared/FrameLoop.js';
import {OffscreenCanvas, StartFrameLoop, StopFrameLoop} from '../shared/constants.js';

export class VfxDisplay {
  #frameLoop = new FrameLoop();

  isRunning = false;

  entity = null;

  get uuid() {
    return this.entity?.uuid ?? '?';
  }

  canvas = null;

  now = 0;
  frameNo = 0;

  get canRender() {
    return this.isRunning && this.canvas != null && this.getCanvasWidth() > 0 && this.getCanvasHeight() > 0;
  }

  constructor({entity, useContext, useProperty, provideContext}) {
    eventize(this);

    this.entity = entity;

    this.getMultiViewRenderer = useContext('multiViewRenderer'); // TODO use shared vfx.canvas|multiViewRenderer

    this.getMultiViewRenderer((val) => {
      console.log('[VfxDisplay] multiViewRenderer changed to', val);
    });

    const [canvasSize, setCanvasSize] = provideContext('canvasSize', [0, 0]);

    this.getCanvasWidth = () => value(canvasSize)[0];
    this.getCanvasHeight = () => value(canvasSize)[1];

    this.setCanvasSize = (w, h) => {
      setCanvasSize([w, h]);
    };

    this.#subscribeToCanvasSize(useProperty('canvasWidth'), useProperty('canvasHeight'));
  }

  onViewEvent(type, data) {
    console.debug(`[VfxCtxDisplay] ${this.uuid} onViewEvent, type=`, type, 'data=', data);

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

  onCanvasChange(canvas) {
    if (canvas) {
      canvas.width = this.getCanvasWidth();
      canvas.height = this.getCanvasHeight();
    }
  }

  onFrame(now) {
    if (!this.canRender) return;

    this.now = now / 1000;
    this.frameNo++;

    this.entity.emit('onRenderFrame', {canvas: this.canvas, now: this.now, frameNo: this.frameNo});
  }

  #subscribeToCanvasSize(getCanvasWidth, getCanvasHeight) {
    const [, unsubscribe] = createEffect(() => {
      const w = getCanvasWidth();
      const h = getCanvasHeight();
      if (isNaN(w) || isNaN(h)) return;
      if (this.canvas) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.setCanvasSize(w, h);
    }, [getCanvasWidth, getCanvasHeight]);
    this.once('onDestroy', () => {
      console.debug(`[VfxDisplay] ${this.uuid} unsubscribe from canvas size change`);
      unsubscribe();
    });
  }
}
