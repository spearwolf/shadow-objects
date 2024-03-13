import {eventize} from '@spearwolf/eventize';
import {BaseEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import '@spearwolf/shadow-ents/shadow-env.js';
import {FrameLoop} from '../shared/FrameLoop.js';
import {
  ChangeTrail,
  Closed,
  Destroy,
  Init,
  Loaded,
  Ready,
  WorkerDestroyTimeout,
  WorkerLoadTimeout,
  WorkerReadyTimeout,
} from '../shared/constants.js';
import {VfxElement} from './VfxElement.js';
import {attachShadowEntity} from './attachShadowEntity.js';
import {waitForMessageOfType} from './waitForMessageOfType.js';

const InitialHTML = `
  <shadow-env id="env">
    <shadow-entity id="root" token="vfx-ctx">
      <slot></slot>
    </shadow-entity>
  </shadow-env>
`;

export class VfxCtxElement extends VfxElement {
  #frameLoop = new FrameLoop();

  reRequestContextTypes = [1, 2]; // we use <shadow-env> and <shadow-entity> components in this element

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.retain('worker');

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.shadowEnvElement = this.shadow.getElementById('env');
    attachShadowEntity(this, this.shadow.getElementById('root'));

    this.on('viewComponent', this.#onViewComponent.bind(this));

    this.shadowEnv.on(BaseEnv.OnSync, this.#onEnvSync, this);

    this.worker = this.createWorker();
  }

  get shadowEnv() {
    return this.shadowEnvElement.shadowEnv;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#setupWorker();
    // TODO start shadow-env sync loop (configure via attribute? "sync-on-frame", "sync-interval=")
    this.#frameLoop.start(this);
  }

  disconnectedCallback() {
    this.#destroyWorker();
    this.#frameLoop.stop(this);
  }

  onFrame() {
    this.syncShadowObjects();
  }

  createWorker() {
    return new Worker(new URL('../vfx.worker.js', import.meta.url), {type: 'module'});
  }

  /**
   * if called, then viewComponent is set and can be used
   *
   * @param {import('@spearwolf/shadow-ents').ViewComponent} vc view component
   */
  #onViewComponent(vc) {
    console.debug('[vfx-ctx] onViewComponent', {viewComponent: vc, shadowEnv: this.shadowEnv});

    vc.setProperty('bar', 666); // TODO remove me!

    // XXX set additional properties on view component ?

    this.syncShadowObjects(); // initial sync
  }

  #onEnvSync(data) {
    if (Array.isArray(data.changeTrail) && data.changeTrail.length > 0) {
      let transferables;

      data.changeTrail.forEach((changeItem) => {
        if (changeItem.transferables) {
          if (!transferables) {
            transferables = changeItem.transferables;
          } else {
            transferables = [...transferables, ...changeItem.transferables];
          }
          delete changeItem.transferables;
        }
      });

      console.debug('[vfx-ctx] shadowEnv on sync, changeTrail=', data, 'transferables=', transferables);

      this.#postMessageToWorker(ChangeTrail, data, transferables);
    }
  }

  #postMessageToWorker(type, data, transfer) {
    const options = Array.isArray(transfer) ? {transfer} : undefined;
    this.once('worker', (worker) => worker.postMessage({type, ...data}, options));
  }

  async #setupWorker() {
    this.worker ??= this.createWorker();

    const {worker} = this;

    await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout);

    worker.postMessage({
      type: Init,
      importVfxSrc: new URL(this.getAttribute('src'), window.location).href,
    });

    await waitForMessageOfType(worker, Ready, WorkerReadyTimeout);

    console.debug('[vfx-ctx] worker is ready');

    this.emit('worker', worker);
  }

  async #destroyWorker() {
    const {worker} = this;
    this.worker = undefined;
    this.retainClear('worker');

    // TODO shadowEnv.reset() - reset change-trail but leave view-components state as it is

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
