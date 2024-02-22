export class OffscreenDisplay extends HTMLElement {
  static InitialHTML = `
    <style>
      :host {
        display: block;
        width: 320px;
        height: 240px;
      }
      .frame {
        position: relative;
        height: 100%;
      }
      canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    </style>
    <div class="frame">
      <canvas></canvas>
    </div>
  `;

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;

  #rafID = 0;

  constructor(initialHTML = OffscreenDisplay.InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;
  }

  queryCanvasElement() {
    return this.shadow.querySelector('canvas');
  }

  createWorker() {
    throw new Error('createWorker() must be implemented by subclass');
    // Example:
    //   return new Worker(new URL("./rainbow-line-worker.js", import.meta.url), {
    //     type: "module",
    //   });
  }

  getContextAttributes() {
    if (this.hasAttribute('no-alpha')) {
      return {alpha: false};
    }
    return {alpha: true};
  }

  #readCanvasSize() {
    const clientRect = this.canvas.getBoundingClientRect();
    this.#lastCanvasWidth = clientRect.width;
    this.#lastCanvasHeight = clientRect.height;
    return {width: clientRect.width, height: clientRect.height};
  }

  #ifCanvasSizeChanged(doSomething) {
    const clientRect = this.canvas.getBoundingClientRect();
    if (this.#lastCanvasWidth !== clientRect.width || this.#lastCanvasHeight !== clientRect.height) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      doSomething(clientRect.width, clientRect.height);
    }
  }

  #onFrame = () => {
    this.#ifCanvasSizeChanged((width, height) => {
      this.worker.postMessage({
        resize: {width, height},
      });
    });
    this.#requestAnimationFrame();
  };

  #requestAnimationFrame() {
    this.#rafID = requestAnimationFrame(this.#onFrame);
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
  }

  #setupWorker() {
    this.canvas = this.queryCanvasElement();
    const offscreen = this.canvas.transferControlToOffscreen();
    this.worker = this.createWorker();
    this.worker.postMessage(
      {
        canvas: offscreen,
        contextAttributes: this.getContextAttributes(),
        ...this.getInitialWorkerAttributes(),
      },
      [offscreen],
    );
  }

  getInitialWorkerAttributes() {
    return {};
  }

  asNumberValue(attributeName, defaultValue) {
    if (this.hasAttribute(attributeName)) {
      const value = parseFloat(this.getAttribute(attributeName));
      return isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
  }

  connectedCallback() {
    if (!this.worker) {
      this.#setupWorker();
    }
    this.worker.postMessage({
      isConnected: true,
      resize: this.#readCanvasSize(),
    });
    this.#requestAnimationFrame();
  }

  disconnectedCallback() {
    this.worker.postMessage({isConnected: false});
    this.#cancelAnimationFrame();
  }

  // TODO adpoptedCallback ?
}
