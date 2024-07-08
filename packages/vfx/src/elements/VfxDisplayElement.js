import {eventize} from '@spearwolf/eventize';
import {ContextLost} from '@spearwolf/shadow-ents';
import {createEffect} from '@spearwolf/signalize';
import {FrameLoop} from '../shared/FrameLoop.js';
import {OffscreenCanvas, RequestOffscreenCanvas, RunFrameLoop} from '../shared/constants.js';

const DISPLAY_ID = 'display';
const ENTITY_ID = 'entity';

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
      <shae-ent id="${ENTITY_ID}" token="vfx-display">
        <slot></slot>
      </shae-ent>
    </div>
  </div>
`;

const ATTR_PIXEL_ZOOM = 'pixel-zoom';

export class VfxDisplayElement extends HTMLElement {
  #frameLoop = new FrameLoop();

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    this.shadowEntity = this.shadow.getElementById(ENTITY_ID);

    this.viewComponent.on(RequestOffscreenCanvas, () => {
      this.#transferCanvasToShadows();
    });

    createEffect(() => {
      // TODO refactor and verify VfxDisplayElement -> ContextLost effect
      const vc = this.shadowEntity.viewComponent$.get();
      if (vc) {
        return vc.on(ContextLost, () => {
          console.warn('[VfxDisplayElement] context lost', this);
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

  /** called by FrameLoop */
  onFrame() {
    const clientRect = this.canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio ?? 1;
    const pixelZoom = this.#getPixelZoom();

    if (
      this.#lastCanvasWidth !== clientRect.width ||
      this.#lastCanvasHeight !== clientRect.height ||
      this.#lastPixelRatio !== pixelRatio ||
      this.#lastPixelZoom !== pixelZoom
    ) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      this.#lastPixelRatio = pixelRatio / pixelZoom;

      if (pixelZoom !== this.#lastPixelZoom) {
        console.log('[VfxDisplayElement] pixelZoom changed to', pixelZoom);

        this.#lastPixelZoom = pixelZoom;

        this.canvas.style.imageRendering = `var(--display-image-rendering, ${pixelZoom > 1 ? 'pixelated' : 'auto'})`;
      }

      if (this.viewComponent) {
        this.viewComponent.setProperty('canvasWidth', this.#lastCanvasWidth);
        this.viewComponent.setProperty('canvasHeight', this.#lastCanvasHeight);
        this.viewComponent.setProperty('pixelRatio', this.#lastPixelRatio);
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

  #transferCanvasToShadows() {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.viewComponent.dispatchShadowObjectsEvent(OffscreenCanvas, {canvas: offscreen}, [offscreen]);
  }

  #reCreateCanvas() {
    const frame = this.canvas.parentElement;
    const canvas = this.canvas.cloneNode();
    frame.replaceChild(canvas, this.canvas);
    this.canvas = canvas;
  }
}
