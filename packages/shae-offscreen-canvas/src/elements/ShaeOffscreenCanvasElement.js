import {on} from '@spearwolf/eventize';
import {ContextLost} from '@spearwolf/shadow-objects';
import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
import {createEffect} from '@spearwolf/signalize';
import {
  CanvasHeight,
  CanvasWidth,
  Fps,
  OffscreenCanvas,
  PixelRatio,
  RequestOffscreenCanvas,
  RunFrameLoop,
} from '../shared/constants.js';
import {FrameLoop} from '../shared/FrameLoop.js';

const DISPLAY_ID = 'display';
const ENTITY_ID = 'entity';

const DEFAULT_FPS = 60;

const InitialHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .frame {
      position: relative;
      height: 100%;
    }
    .content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  </style>
  <div class="frame">
    <canvas id="${DISPLAY_ID}" class="content"></canvas>
    <div class="content">
      <shae-ent id="${ENTITY_ID}" %NS% token="ShaeOffscreenCanvas">
        <slot></slot>
      </shae-ent>
    </div>
  </div>
`;

const ATTR_PIXEL_ZOOM = 'pixel-zoom';
const ATTR_FPS = 'fps';
const ATTR_NS = 'ns';

export class ShaeOffscreenCanvasElement extends HTMLElement {
  #frameLoop = new FrameLoop();
  #offscreenTransferred = false;
  #frameLoopIsRunning = false;

  logger = new ConsoleLogger('ShaeOffscreenCanvasElement');

  get ns() {
    return this.shadowEntity?.ns;
  }

  constructor(initialHTML = InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});

    const ns = this.#readNsAttr() || '';
    this.shadow.innerHTML = initialHTML.replaceAll('%NS%', ns ? `ns="${ns}"` : '');

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    this.shadowEntity = this.shadow.getElementById(ENTITY_ID);

    createEffect(() => {
      const vc = this.shadowEntity.viewComponent$.get();
      if (vc) {
        const unsubscribeRequestOffscreenCanvas = on(vc, RequestOffscreenCanvas, () => {
          if (this.#offscreenTransferred) {
            this.#reCreateCanvas();
          }
          this.#transferCanvasToShadows();
        });

        const unsubscribeContextlost = on(vc, ContextLost, () => {
          if (this.logger.isWarn) {
            this.logger.warn('ContextLost', this);
          }
          this.#reCreateCanvas();
          this.#transferCanvasToShadows();
        });

        vc.setProperty(RunFrameLoop, this.#frameLoopIsRunning);

        return () => {
          unsubscribeRequestOffscreenCanvas();
          unsubscribeContextlost();
        };
      }
    });
  }

  get viewComponent() {
    return this.shadowEntity.viewComponent;
  }

  connectedCallback() {
    this.#frameLoop.start(this);
    this.frameLoopIsRunning = true;
  }

  get frameLoopIsRunning() {
    return this.#frameLoopIsRunning;
  }

  set frameLoopIsRunning(val) {
    this.#frameLoopIsRunning = val;
    if (this.viewComponent) {
      this.viewComponent.setProperty(RunFrameLoop, val);
    }
  }

  disconnectedCallback() {
    this.#frameLoop.stop(this);
    this.frameLoopIsRunning = false;
  }

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;
  #lastPixelRatio = 0;
  #lastPixelZoom = 1;
  #lastFps = 0;

  [FrameLoop.OnFrame]() {
    const clientRect = this.canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio ?? 1;
    const pixelZoom = this.#getPixelZoom();
    const fps = this.#getFps();

    if (
      this.#lastCanvasWidth !== clientRect.width ||
      this.#lastCanvasHeight !== clientRect.height ||
      this.#lastPixelRatio !== pixelRatio ||
      this.#lastPixelZoom !== pixelZoom ||
      this.#lastFps !== fps
    ) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      this.#lastPixelRatio = pixelRatio / pixelZoom;

      if (fps !== this.#lastFps) {
        if (this.logger.isInfo) {
          this.logger.info('fps changed to', fps);
        }
        this.#lastFps = fps;
      }

      if (pixelZoom !== this.#lastPixelZoom) {
        if (this.logger.isInfo) {
          this.logger.info('pixelZoom changed to', pixelZoom);
        }

        this.#lastPixelZoom = pixelZoom;

        this.canvas.style.imageRendering = `var(--display-image-rendering, ${pixelZoom > 1 ? 'pixelated' : 'auto'})`;
      }

      if (this.viewComponent) {
        this.viewComponent.setProperty(CanvasWidth, this.#lastCanvasWidth);
        this.viewComponent.setProperty(CanvasHeight, this.#lastCanvasHeight);
        this.viewComponent.setProperty(PixelRatio, this.#lastPixelRatio);
        this.viewComponent.setProperty(Fps, this.#lastFps);
        this.shadowEntity.syncShadowObjects();
      }
    }
  }

  get pixelZoom() {
    return this.#getPixelZoom();
  }

  set pixelZoom(val) {
    if (val !== this.#getPixelZoom()) {
      if (val > 0) {
        this.setAttribute(ATTR_PIXEL_ZOOM, `${val}`);
      } else {
        this.removeAttribute(ATTR_PIXEL_ZOOM);
      }
    }
  }

  #getPixelZoom() {
    let val = parseInt(this.getAttribute(ATTR_PIXEL_ZOOM), 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    }
    return val;
  }

  #getFps() {
    if (!this.hasAttribute(ATTR_FPS)) {
      return DEFAULT_FPS;
    }
    let val = parseInt(this.getAttribute(ATTR_FPS), 10);
    if (isNaN(val) || val < 1) {
      val = 0;
    }
    return val;
  }

  #transferCanvasToShadows() {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.viewComponent.dispatchShadowObjectsEvent(OffscreenCanvas, {canvas: offscreen}, [offscreen]);
    this.#offscreenTransferred = true;
  }

  #reCreateCanvas() {
    const frame = this.canvas.parentElement;
    const canvas = this.canvas.cloneNode();
    frame.replaceChild(canvas, this.canvas);
    this.canvas = canvas;
    this.#offscreenTransferred = false;
  }

  #readNsAttr() {
    if (this.hasAttribute(ATTR_NS)) {
      return this.getAttribute(ATTR_NS)?.trim() || '';
    }
    return '';
  }
}
