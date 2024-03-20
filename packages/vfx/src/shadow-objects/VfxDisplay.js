import {eventize} from '@spearwolf/eventize';
import {createEffect, createSignal} from '@spearwolf/signalize';
import {FrameLoop} from '../shared/FrameLoop.js';
import {OffscreenCanvas, StartFrameLoop, StopFrameLoop} from '../shared/constants.js';

export class VfxDisplay {
  #frameLoop = new FrameLoop();

  isRunning = false;

  entity = null;

  get uuid() {
    return this.entity?.uuid ?? '?';
  }

  now = 0;
  frameNo = 0;

  get canRender() {
    return this.isRunning && this.canvas != null && this.canvas.width > 0 && this.canvas.height > 0;
  }

  constructor({entity, useContext, useProperty, provideContext}) {
    eventize(this);

    this.entity = entity;

    // TODO use shared vfx.canvas|multiViewRenderer --------
    useContext('multiViewRenderer')((val) => {
      console.debug('[VfxDisplay] multiViewRenderer changed to', val);
    });
    // -----------------------------------------------------

    const [getCanvas, setCanvas] = provideContext('canvas');

    const [getCanvasSize, setCanvasSize] = createSignal('canvasSize', [0, 0], {equals: (a, b) => a[0] === b[0] && a[1] === b[1]});

    provideContext('canvasSize', getCanvasSize);

    const getCanvasWidth = useProperty('canvasWidth');
    const getCanvasHeight = useProperty('canvasHeight');

    createEffect(() => {
      const canvas = getCanvas();
      if (canvas) {
        const w = getCanvasWidth();
        const h = getCanvasHeight();
        if (isNaN(w) || isNaN(h)) return;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        setCanvasSize([w, h]);
      }
    }, [getCanvas, getCanvasWidth, getCanvasHeight]);

    Object.defineProperties(this, {
      canvas: {
        get: getCanvas,
        set: setCanvas,
        enumerable: true,
      },
    });
  }

  onViewEvent(type, data) {
    console.debug(`[VfxCtxDisplay] ${this.uuid} onViewEvent, type=`, type, 'data=', data);

    switch (type) {
      case OffscreenCanvas:
        this.canvas = data.canvas;
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

  onFrame(now) {
    if (!this.canRender) return;

    this.now = now / 1000;
    this.frameNo++;

    const data = {canvas: this.canvas, now: this.now, frameNo: this.frameNo};
    this.entity.traverse((entity) => entity.emit('onRenderFrame', data));
    // TODO maybe we should create a <shadow-entity traverse-events="onRenderFrame, onIdle"> attribute ?
  }
}
