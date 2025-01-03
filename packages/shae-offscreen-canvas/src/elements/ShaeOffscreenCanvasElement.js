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
      <shae-ent id="${ENTITY_ID}" token="ShaeOffscreenCanvas">
        <slot></slot>
      </shae-ent>
    </div>
  </div>
`;

const ATTR_PIXEL_ZOOM = 'pixel-zoom';
const ATTR_FPS = 'fps';

export class ShaeOffscreenCanvasElement extends HTMLElement {
  #frameLoop = new FrameLoop();
  #offscreenTransferred = false;

  logger = new ConsoleLogger('ShaeOffscreenCanvasElement');

  constructor(initialHTML = InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    this.shadowEntity = this.shadow.getElementById(ENTITY_ID);

    on(this.viewComponent, RequestOffscreenCanvas, () => {
      if (this.#offscreenTransferred) {
        this.#reCreateCanvas();
      }
      this.#transferCanvasToShadows();
    });

    createEffect(() => {
      // TODO refactor and verify ShaeOffscreenCanvasElement -> ContextLost effect
      const vc = this.shadowEntity.viewComponent$.get();
      if (vc) {
        return on(vc, ContextLost, () => {
          if (this.logger.isWarn) {
            this.logger.warn('ContextLost', this);
          }
          this.#reCreateCanvas();
          this.#transferCanvasToShadows();
        });
      }
    });
  }

  get viewComponent() {
    return this.shadowEntity.viewComponent;
  }

  connectedCallback() {
    this.#frameLoop.start(this);
    this.viewComponent.setProperty(RunFrameLoop, true);
  }

  disconnectedCallback() {
    this.#frameLoop.stop(this);
    this.viewComponent.setProperty(RunFrameLoop, false);
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
}
