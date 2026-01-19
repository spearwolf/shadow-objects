import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
import {
  CanvasContext,
  CanvasHeight,
  CanvasSizeContext,
  CanvasWidth,
  Fps,
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

const SHOW_FPS_COUNTER_INTERVAL_SECONDS = 5;

export class ShaeOffscreenCanvas extends ShadowObjectBase {
  static displayName = 'ShaeOffscreenCanvas';

  #frameLoop = new FrameLoop(90);

  canvasRequested = false;
  isRunning = false;

  frameNo = 0;

  logger = new ConsoleLogger(ShaeOffscreenCanvas.displayName);

  fpsCounter = 0;
  fpsCounterTime = undefined;

  get canRender() {
    return this.isRunning && this.canvas != null && this.canvas.width > 0 && this.canvas.height > 0;
  }

  constructor({entity, useProperty, provideContext, createSignal, createEffect, onDestroy, dispatchMessageToView}) {
    super(entity);

    this.dispatchMessageToView = dispatchMessageToView;

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
    const getFps = useProperty(Fps);

    createEffect(() => {
      this.#frameLoop.setFps(getFps() ?? 60);
    });

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
      this.dispatchMessageToView(RequestOffscreenCanvas);
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

  [FrameLoop.OnFrame]({now, deltaTime}) {
    if (!this.canRender) return;

    this.frameNo++;

    this.updateFpsCounter(now);

    this.traverseEmit(OnFrame, {
      now,
      deltaTime,
      canvas: this.canvas,
      frameNo: this.frameNo,
    });
  }

  updateFpsCounter(now) {
    this.fpsCounter++;
    this.fpsCounterTime ??= now;

    if (now - this.fpsCounterTime >= SHOW_FPS_COUNTER_INTERVAL_SECONDS) {
      this.fpsCounterTime = now;
      if (this.logger.isInfo) {
        this.logger.info(
          'fpsCounter=',
          Math.round(this.fpsCounter / SHOW_FPS_COUNTER_INTERVAL_SECONDS),
          'measuredFps=',
          this.#frameLoop.measuredFps,
        );
      }
      this.fpsCounter = 0;
    }
  }
}
