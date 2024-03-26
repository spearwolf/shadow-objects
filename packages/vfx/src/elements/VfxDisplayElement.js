import {eventize} from '@spearwolf/eventize';
import {ContextLost} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {FrameLoop} from '../shared/FrameLoop.js';
import {OffscreenCanvas, StartFrameLoop, StopFrameLoop} from '../shared/constants.js';
import {VfxElement} from './VfxElement.js';
import {attachShadowEntity} from './attachShadowEntity.js';

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
    <canvas id="display" class="content"></canvas>
    <div class="content">
      <shadow-entity id="entity" token="vfx-display">
        <slot></slot>
      </shadow-entity>
    </div>
  </div>
`;

const DISPLAY_ID = 'display';
const ENTITY_ID = 'entity';
const PIXEL_ZOOM_ATTR = 'pixel-zoom';

export class VfxDisplayElement extends VfxElement {
  #frameLoop = new FrameLoop();

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    attachShadowEntity(this);

    this.viewComponent$((vc) => {
      if (vc) {
        this.#transferCanvasToShadows();

        return vc.on(ContextLost, () => {
          this.#reCreateCanvas();
          this.#transferCanvasToShadows();
          if (this.isConnected) {
            this.sendEventToShadows(StartFrameLoop);
          }
        });
      }
    });

    this.shadowEntity = this.shadow.getElementById(ENTITY_ID);
  }

  connectedCallback() {
    super.connectedCallback();
    this.#frameLoop.start(this);
    this.sendEventToShadows(StartFrameLoop);
  }

  disconnectedCallback() {
    this.#frameLoop.stop(this);
    this.sendEventToShadows(StopFrameLoop);
  }

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;
  #lastPixelRatio = 0;
  #lastPixelZoom = 1;

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
        this.syncShadowObjects();
      }
    }
  }

  get pixelZoom() {
    return this.#getPixelZoom();
  }

  set pixelZoom(val) {
    if (val !== this.#getPixelZoom()) {
      if (val > 0) {
        this.setAttribute(PIXEL_ZOOM_ATTR, `${val}`);
      } else {
        this.removeAttribute(PIXEL_ZOOM_ATTR);
      }
    }
  }

  #getPixelZoom() {
    let val = parseInt(this.getAttribute(PIXEL_ZOOM_ATTR), 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    }
    return val;
  }

  #transferCanvasToShadows() {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.sendEventToShadows(OffscreenCanvas, {canvas: offscreen}, [offscreen]);
  }

  #reCreateCanvas() {
    const frame = this.canvas.parentElement;
    const canvas = this.canvas.cloneNode();
    frame.replaceChild(canvas, this.canvas);
    this.canvas = canvas;
  }
}
