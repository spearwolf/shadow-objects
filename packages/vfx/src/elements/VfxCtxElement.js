const InitialHTML = `
  <p><code>vfx-ctx</code></p>
  <slot></slot>
`;

export class VfxCtxElement extends HTMLElement {
  constructor(initialHTML = InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.worker = this.createWorker();
  }

  connectedCallback() {
    this.#setupWorker();
  }

  disconnectedCallback() {
    this.#destroyWorker();
  }

  createWorker() {
    return new Worker(new URL('../vfx.worker.js', import.meta.url), {type: 'module'});
  }

  #setupWorker() {
    this.worker ??= this.createWorker();
    this.worker.postMessage({
      message: 'hello hello',
      importVfxSrc: new URL(this.getAttribute('src'), window.location).href,
    });
  }

  #destroyWorker() {
    this.worker.postMessage({
      message: 'bye bye!',
    });
    // TODO wait for worker to finish or timeout
    this.worker.terminate();

    this.worker = undefined;
  }
}
