import {on} from '@spearwolf/eventize';
import {ContextLost, FrameLoop} from '@spearwolf/shadow-objects';
import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
import {createEffect, hibernate} from '@spearwolf/signalize';
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
  // ns is read once in the constructor and never watched again — a listener on it would be new
  // behavior nobody asked for, so it stays off this list. The constructor takes an initialHTML
  // argument, so subclassing is a supported way to extend this element — and a subclass that
  // declares its own observedAttributes instead of spreading this one silently loses fps and
  // pixel-zoom, the same trap other custom elements in this codebase guard against by spreading
  // their parent's list into their own.
  static observedAttributes = [ATTR_FPS, ATTR_PIXEL_ZOOM];

  #frameLoop = FrameLoop.get();
  #offscreenTransferred = false;
  #frameLoopIsRunning = false;

  // A signal effect stays registered in the process-wide effect queue, holding this element (and
  // everything its callback reads) reachable through that closure, until its own destroy() runs —
  // the field is what makes that call reachable from outside the effect itself.
  #viewComponentEffect;

  #displaySizeObserver;
  #displayWidth = 0;
  #displayHeight = 0;

  #pixelRatio = 1;
  #pixelRatioQuery;

  #fps = DEFAULT_FPS;
  #pixelZoom = 1;

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
  // ViewComponent. That holds as long as the element stays connected: connectedCallback() runs
  // this inside hibernate(), so the effect built here belongs to the element regardless of which
  // reactive context the caller was in when it appended it.
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

  // The first animation frame runs before the ResizeObserver's first delivery arrives (measured in
  // Chromium and Firefox), so a callback alone would leave #displayWidth/#displayHeight at their
  // initial 0x0 for that frame and ShaeOffscreenCanvas.canRender would hold the worker back a frame
  // for no reason. The one-time read below is what a display box already has on frame one.
  #observeDisplaySize() {
    this.#unobserveDisplaySize();

    const rect = this.canvas.getBoundingClientRect();
    this.#displayWidth = rect.width;
    this.#displayHeight = rect.height;

    this.#displaySizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // #reCreateCanvas() swaps the observed node without waiting for a delivery, so an entry can
        // still name a node this element gave up on the same task it was reported.
        if (entry.target === this.canvas) {
          this.#displayWidth = entry.contentRect.width;
          this.#displayHeight = entry.contentRect.height;
        }
      }
    });
    this.#displaySizeObserver.observe(this.canvas);
  }

  #unobserveDisplaySize() {
    this.#displaySizeObserver?.disconnect();
    this.#displaySizeObserver = undefined;
  }

  #watchPixelRatio() {
    this.#unwatchPixelRatio();

    const pixelRatio = window.devicePixelRatio ?? 1;
    this.#pixelRatio = pixelRatio;

    // The query names the ratio it was built for, so all it can ever report is the move away
    // from that one value — every change needs a query built for the value that follows.
    this.#pixelRatioQuery = window.matchMedia(`(resolution: ${pixelRatio}dppx)`);
    this.#pixelRatioQuery.addEventListener('change', this.#onPixelRatioChange);
  }

  #onPixelRatioChange = () => {
    this.#watchPixelRatio();
  };

  #unwatchPixelRatio() {
    this.#pixelRatioQuery?.removeEventListener('change', this.#onPixelRatioChange);
    this.#pixelRatioQuery = undefined;
  }

  connectedCallback() {
    // The whole body runs outside whatever reactive context the caller is in. An append() is an
    // ordinary call, and it can perfectly well stand inside a createEffect() of the application:
    // createEffect() attaches a new effect to whichever effect is currently on the stack, so the
    // effect built below would become a child of that foreign effect, and its next run would
    // release it — the element would go quiet without anyone destroying it. hibernate() clears the
    // effect stack for the duration, so the subscriptions belong to the element and come off where
    // the element decides.
    hibernate(() => {
      this.#setupViewComponentEffect();
      this.#observeDisplaySize();
      this.#watchPixelRatio();
      this.#frameLoop.start(this);
      this.frameLoopIsRunning = true;
    });
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
    this.#unwatchPixelRatio();
    this.#unobserveDisplaySize();
    this.#destroyViewComponentEffect();
  }

  attributeChangedCallback(name) {
    switch (name) {
      case ATTR_FPS:
        this.#fps = this.#getFps();
        break;
      case ATTR_PIXEL_ZOOM:
        this.#pixelZoom = this.#getPixelZoom();
        break;
    }
  }

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;
  #lastPixelRatio = 0;
  #lastPixelZoom = 1;
  #lastFps = 0;

  [FrameLoop.OnFrame]() {
    const width = this.#displayWidth;
    const height = this.#displayHeight;
    const pixelRatio = this.#pixelRatio;
    const pixelZoom = this.#pixelZoom;
    const fps = this.#fps;

    if (
      this.#lastCanvasWidth !== width ||
      this.#lastCanvasHeight !== height ||
      this.#lastPixelRatio !== pixelRatio ||
      this.#lastPixelZoom !== pixelZoom ||
      this.#lastFps !== fps
    ) {
      this.#lastCanvasWidth = width;
      this.#lastCanvasHeight = height;
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

    // Without unobserve() first, the outgoing node still delivers one last entry — with a 0x0
    // contentRect, ahead of the delivery for the replacement (measured in Chromium and Firefox).
    this.#displaySizeObserver?.unobserve(this.canvas);
    frame.replaceChild(canvas, this.canvas);
    this.canvas = canvas;
    this.#displaySizeObserver?.observe(canvas);

    this.#offscreenTransferred = false;
  }

  #readNsAttr() {
    if (this.hasAttribute(ATTR_NS)) {
      return this.getAttribute(ATTR_NS)?.trim() || '';
    }
    return '';
  }
}