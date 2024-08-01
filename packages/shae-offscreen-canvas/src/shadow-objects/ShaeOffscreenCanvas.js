import {createEffect, createSignal, destroySignal} from '@spearwolf/signalize';
import {
  CanvasContext,
  CanvasHeight,
  CanvasSizeContext,
  CanvasWidth,
  OffscreenCanvas,
  OffscreenCanvasContext,
  OnFrame,
  PixelRatio,
  RequestOffscreenCanvas,
  RunFrameLoop,
} from '../shared/constants.js';
import {FrameLoop} from '../shared/FrameLoop.js';
import {ShadowObjectBase} from './ShadowObjectBase.js';

const vec3equals = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export class ShaeOffscreenCanvas extends ShadowObjectBase {
  static displayName = 'ShaeOffscreenCanvas';

  #frameLoop = new FrameLoop();

  canvasRequested = false;
  isRunning = false;

  now = 0;
  frameNo = 0;

  get canRender() {
    return this.isRunning && this.canvas != null && this.canvas.width > 0 && this.canvas.height > 0;
  }

  constructor({entity, useProperty, provideContext, onDestroy}) {
    super(entity);

    const [getCanvas, setCanvas] = provideContext(CanvasContext);

    provideContext(OffscreenCanvasContext, this);

    // TODO create canvas context based on useProperty('canvasContextType')

    const [getCanvasSize, setCanvasSize] = createSignal([0, 0, 0], {
      equals: vec3equals,
    });

    provideContext(CanvasSizeContext, getCanvasSize);

    const getCanvasWidth = useProperty(CanvasWidth);
    const getCanvasHeight = useProperty(CanvasHeight);
    const getPixelRatio = useProperty(PixelRatio);

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
      unsubscribe();
      destroySignal(getCanvasSize);
    });

    const getRunFrameLoop = useProperty(RunFrameLoop);

    onDestroy(
      createEffect(() => {
        if (getRunFrameLoop()) {
          if (!this.isRunning) {
            this.isRunning = true;
            this.#frameLoop.start(this);
          }
        } else if (this.isRunning) {
          this.isRunning = false;
          this.#frameLoop.stop(this);
        }
      })[1],
    );

    this.requestOffscreenCanvas();
  }

  requestOffscreenCanvas() {
    if (!this.canvasRequested) {
      this.canvasRequested = true;
      console.debug('[ShaeOffscreenCanvas] request offscreen-canvas', this);
      this.entity.dispatchMessageToView(RequestOffscreenCanvas);
    }
  }

  onViewEvent(type, data) {
    switch (type) {
      case OffscreenCanvas:
        console.debug('[ShaeOffscreenCanvas] received offscreen-canvas', this);
        this.canvasRequested = false;
        this.canvas = data.canvas;
        break;

      default:
        console.debug(`[ShaeOffscreenCanvas] unhandled view event, type=`, type, 'data=', data, 'self=', this);
    }
  }

  [FrameLoop.OnFrame](now) {
    if (!this.canRender) return;

    this.now = now / 1000;
    this.frameNo++;

    this.traverseEmit(OnFrame, {canvas: this.canvas, now: this.now, frameNo: this.frameNo});
  }
}
