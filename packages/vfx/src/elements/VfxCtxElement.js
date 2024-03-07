import {Closed, Destroy, Init, Ready, WorkerDestroyTimeout, WorkerReadyTimeout} from '../constants.js';
import {waitForMessageOfType} from '../waitForMessageOfType.js';

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

  async #setupWorker() {
    this.worker ??= this.createWorker();

    const {worker} = this;

    await waitForMessageOfType(worker, Ready, WorkerReadyTimeout);
    worker.postMessage({
      type: Init,
      importVfxSrc: new URL(this.getAttribute('src'), window.location).href,
    });
  }

  async #destroyWorker() {
    const {worker} = this;
    this.worker = undefined;

    worker.postMessage({type: Destroy});

    waitForMessageOfType(worker, Closed, WorkerDestroyTimeout)
      .catch(() => {
        console.warn('[vfx-ctx] worker timeout', worker);
      })
      .finally(() => {
        console.debug('[vfx-ctx] terminate worker', worker);
        worker.terminate();
      });
  }
}
