import {eventize} from '@spearwolf/eventize';
import {batch, createEffect, createSignal} from '@spearwolf/signalize';

export class OffscreenWorkerDisplay {
  static Canvas = 'onCanvas';
  static Init = 'onInit';
  static Resize = 'onResize';
  static Frame = 'onFrame';

  get ready() {
    return this.canvas && this.isConnected;
  }

  #rafID = 0;

  #contextAttributes = undefined;

  constructor() {
    eventize(this);

    const [canvas, setCanvas] = createSignal(null);
    const [isConnected, setIsConnected] = createSignal(false);

    const [canvasWidth, setCanvasWidth] = createSignal(0);
    const [canvasHeight, setCanvasHeight] = createSignal(0);

    Object.defineProperties(this, {
      canvas: {
        get: () => canvas(),
        set: (value) => setCanvas(value),
        enumerable: true,
      },
      isConnected: {
        get: () => isConnected(),
        set: (value) => setIsConnected(value),
        enumerable: true,
      },
      canvasWidth: {
        get: () => canvasWidth(),
        set: (value) => setCanvasWidth(value),
        enumerable: true,
      },
      canvasHeight: {
        get: () => canvasHeight(),
        set: (value) => setCanvasHeight(value),
        enumerable: true,
      },
    });

    this.now = 0;

    this.retain([OffscreenWorkerDisplay.Canvas, OffscreenWorkerDisplay.Init, OffscreenWorkerDisplay.Resize]);

    createEffect(() => {
      if (this.canvas) {
        this.emit(OffscreenWorkerDisplay.Canvas, this, this.#contextAttributes);
      }
    }, [canvas]);

    createEffect(() => {
      if (this.ready) {
        this.emit(OffscreenWorkerDisplay.Init, this);
      }
    }, [canvas, isConnected]);

    createEffect(() => {
      this.emit(OffscreenWorkerDisplay.Resize, this);
    }, [canvasWidth, canvasHeight]);
  }

  #requestAnimationFrame() {
    this.#rafID = requestAnimationFrame((now) => this.#onFrame(now));
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
  }

  #onFrame(now) {
    if (this.ready) {
      batch(() => {
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
      });

      this.now = now / 1000;

      if (this.canvasWidth > 0 && this.canvasHeight > 0) {
        this.emit(OffscreenWorkerDisplay.Frame, this);
      }
    }

    this.#requestAnimationFrame();
  }

  parseMessageData(data) {
    if (!data) return;

    if (data.canvas) {
      this.#contextAttributes = data.contextAttributes || undefined;
      this.canvas = data.canvas;
    }

    if (data.isConnected) {
      if (this.isConnected !== data.isConnected) {
        this.isConnected = data.isConnected;
        if (this.isConnected) {
          this.#requestAnimationFrame();
        } else {
          this.#cancelAnimationFrame();
        }
      }
    }

    if (data.resize && this.canvas) {
      this.canvas.width = Math.floor(data.resize.width);
      this.canvas.height = Math.floor(data.resize.height);
    }
  }
}
