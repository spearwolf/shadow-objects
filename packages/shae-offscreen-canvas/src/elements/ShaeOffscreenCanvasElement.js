import {on} from '@spearwolf/eventize';
import {ContextLost, FrameLoop} from '@spearwolf/shadow-objects';
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
const ATTR_NS = 'ns';

export class ShaeOffscreenCanvasElement extends HTMLElement {
  #frameLoop = FrameLoop.get();
  #offscreenTransferred = false;
  #frameLoopIsRunning = false;

  // A signal effect stays registered in the process-wide effect queue, holding this element (and
  // everything its callback reads) reachable through that closure, until its own destroy() runs —
  // the field is what makes that call reachable from outside the effect itself.
  #viewComponentEffect;

  logger = new ConsoleLogger('ShaeOffscreenCanvasElement');

  get ns() {
    return this.shadowEntity?.ns;
  }

  constructor(initialHTML = InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});

    // The template is parsed while its content is still detached from the document: a namespace
    // handed to setAttribute() cannot end the attribute or open a tag the way a value spliced into
    // markup can, and the entity element enters the shadow root with its namespace already set,
    // so it never connects to the global environment on its way to the one it belongs in.
    const template = document.createElement('template');
    template.innerHTML = initialHTML;

    const ns = this.#readNsAttr();
    if (ns) {
      template.content.getElementById(ENTITY_ID).setAttribute(ATTR_NS, ns);
    }

    this.shadow.appendChild(template.content);

    this.canvas = this.shadow.getElementById(DISPLAY_ID);
    this.shadowEntity = this.shadow.getElementById(ENTITY_ID);
  }

  get viewComponent() {
    return this.shadowEntity.viewComponent;
  }

  // Answering a canvas request or a lost context is something this element only does while it is
  // part of the document — the effect that listens for both is built here, not once in the
  // constructor, so an element outside the document has nothing left listening on its
  // ViewComponent. That holds as long as connectedCallback() runs outside of another signal
  // effect's callback: createEffect() attaches a new effect to whichever effect is currently on
  // the stack (EffectImpl#attachChildEffect), and a child effect is destroyed along with its
  // parent's own teardown — so an element connected from within somebody else's effect answers
  // only until that effect's next run or destruction, not until this element's own disconnect.
  #setupViewComponentEffect() {
    this.#destroyViewComponentEffect();

    this.#viewComponentEffect = createEffect(() => {
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

  #destroyViewComponentEffect() {
    this.#viewComponentEffect?.destroy();
    this.#viewComponentEffect = undefined;
  }

  connectedCallback() {
    this.#setupViewComponentEffect();
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
    this.#destroyViewComponentEffect();
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