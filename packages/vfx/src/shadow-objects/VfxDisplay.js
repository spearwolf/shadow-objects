import {createEffect, createSignal, destroySignal} from '@spearwolf/signalize';
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

  constructor({entity, useContext, useProperty, provideContext, onDestroy}) {
    this.entity = entity;

    // TODO use shared vfx.canvas|multiViewRenderer --------
    useContext('multiViewRenderer')((val) => {
      console.debug('[VfxDisplay] multiViewRenderer changed to', val);
    });
    // -----------------------------------------------------

    const [getCanvas, setCanvas] = provideContext('canvas');

    const [getCanvasSize, setCanvasSize] = createSignal([0, 0, 0], {
      equals: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2],
    });

    provideContext('canvasSize', getCanvasSize);

    const getCanvasWidth = useProperty('canvasWidth');
    const getCanvasHeight = useProperty('canvasHeight');
    const getPixelRatio = useProperty('pixelRatio');

    const [, unsubscribe] = createEffect(() => {
      const canvas = getCanvas();
      if (canvas) {
        const w = getCanvasWidth();
        const h = getCanvasHeight();
        const pixelRatio = getPixelRatio();

        if (isNaN(w) || isNaN(h) || isNaN(pixelRatio)) return;

        const canvasWidth = Math.round(w * pixelRatio);
        const canvasHeight = Math.round(h * pixelRatio);

        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
        }

        setCanvasSize([canvasWidth, canvasHeight, pixelRatio]);
      }
    }, [getCanvas, getCanvasWidth, getCanvasHeight, getPixelRatio]);

    Object.defineProperties(this, {
      canvas: {
        get: getCanvas,
        set: setCanvas,
        enumerable: true,
      },
    });

    onDestroy(() => {
      console.log('[VfxDisplay] onDestroy: bye, bye!');
      unsubscribe();
      destroySignal(getCanvasSize);
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
  }
}
