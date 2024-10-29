import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
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

  logger = new ConsoleLogger(ShaeOffscreenCanvas.displayName);

  get canRender() {
    return this.isRunning && this.canvas != null && this.canvas.width > 0 && this.canvas.height > 0;
  }

  constructor({entity, useProperty, provideContext, createSignal, createEffect, onDestroy}) {
    super(entity);

    const canvas$ = provideContext(CanvasContext);
    const offscreenCanvas$ = provideContext(OffscreenCanvasContext, this);

    onDestroy(() => {
      offscreenCanvas$.set(undefined);
    });

    const canvasSize$ = createSignal([0, 0, 0], {
      compare: vec3equals,
    });

    provideContext(CanvasSizeContext, canvasSize$);

    const getCanvasWidth = useProperty(CanvasWidth);
    const getCanvasHeight = useProperty(CanvasHeight);
    const getPixelRatio = useProperty(PixelRatio);

    createEffect(() => {
      const canvas = canvas$.get();

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

        canvasSize$.set([canvasWidth, canvasHeight, pixelRatio]);
      }
    }, [canvas$, getCanvasWidth, getCanvasHeight, getPixelRatio]);

    Object.defineProperties(this, {
      canvas: {
        get: canvas$.get,
        set: canvas$.set,
        enumerable: true,
      },
    });

    const getRunFrameLoop = useProperty(RunFrameLoop);

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
    });

    this.requestOffscreenCanvas();
  }

  requestOffscreenCanvas() {
    if (!this.canvasRequested) {
      this.canvasRequested = true;
      if (this.logger.isDebug) {
        this.logger.debug('request offscreen-canvas', this);
      }
      this.entity.dispatchMessageToView(RequestOffscreenCanvas);
    }
  }

  onViewEvent(type, data) {
    switch (type) {
      case OffscreenCanvas:
        if (this.logger.isDebug) {
          this.logger.debug('received offscreen-canvas', this);
        }
        this.canvasRequested = false;
        this.canvas = data.canvas;
        break;

      default:
        if (this.logger.isWarn) {
          this.logger.warn('unhandled view event, type=', type, 'data=', data, 'self=', this);
        }
    }
  }

  [FrameLoop.OnFrame](now) {
    if (!this.canRender) return;

    this.now = now / 1000;
    this.frameNo++;

    // TODO(feat) limit OnFrame events to fixed fps, e.g. 60fps

    this.traverseEmit(OnFrame, {canvas: this.canvas, now: this.now, frameNo: this.frameNo});
  }
}
