import {eventize} from '@spearwolf/eventize';
import {BaseEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import '@spearwolf/shadow-ents/shadow-env.js';
import {createActor} from 'xstate';
import {FrameLoop} from '../shared/FrameLoop.js';
import {ChangeTrail, Init, Loaded, Ready, WorkerLoadTimeout, WorkerReadyTimeout} from '../shared/constants.js';
import {VfxElement} from './VfxElement.js';
import {attachShadowEntity} from './attachShadowEntity.js';
import {machine} from './vfx-ctx/state-machine.js';
import {waitForMessageOfType} from './waitForMessageOfType.js';

const InitialHTML = `
  <shadow-env id="env">
    <shadow-entity id="root" token="vfx-ctx">
      <slot></slot>
    </shadow-entity>
  </shadow-env>
`;

export class VfxCtxElement extends VfxElement {
  static observedAttributes = ['src'];

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

    this.worker = undefined;
    this.actor = createActor(machine);
    this.actor.on('loadWorker', ({src}) => this.#loadWorker(src));
    this.actor.on('initializeWorker', () => this.#initializeWorker());
    this.actor.on('destroyWorker', () => this.#destroyWorker());
    this.actor.on('createShadowObjects', () => this.#createShadowObjects());
    this.actor.start();
    this.actor.send({type: 'initialized', src: this.getAttribute('src')});

    this.frameLoop = new FrameLoop();
  }

  get state() {
    return this.actor.getSnapshot().value;
  }

  get src() {
    return this.actor.getSnapshot().context.src;
  }

  get shadowEnv() {
    return this.shadowEnvElement.shadowEnv;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && oldValue !== newValue && this.src !== newValue) {
      this.actor.send({type: 'srcChanged', src: newValue});
    }
  }

  connectedCallback() {
    super.connectedCallback();

    // TODO start shadow-env sync loop (configure via attribute? "sync-on-frame", "sync-interval=")
    this.frameLoop.start(this);

    this.actor.send({type: 'updateConnectedState', connected: true});
  }

  disconnectedCallback() {
    this.frameLoop.stop(this);

    this.actor.send({type: 'updateConnectedState', connected: false});
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

  async #loadWorker(src) {
    console.log('[vfx-ctx] loadWorker', src);

    this.worker = this.createWorker();

    try {
      await waitForMessageOfType(this.worker, Loaded, WorkerLoadTimeout);

      this.worker.postMessage({
        type: Init,
        importVfxSrc: new URL(src, window.location).href,
      });

      await waitForMessageOfType(this.worker, Ready, WorkerReadyTimeout);

      console.log('[vfx-ctx] workerLoaded!');

      this.actor.send({type: 'workerLoaded'});
    } catch (error) {
      console.warn('[vfx-ctx] workerFailed!', error);

      this.actor.send({type: 'workerFailed'});
    }
  }

  async #initializeWorker() {
    console.log('[vfx-ctx] initializeWorker');

    // TODO initialize worker ?

    queueMicrotask(() => {
      console.log('[vfx-ctx] workerReady!');

      this.actor.send({type: 'workerReady'});
    });

    // TODO this.actor.send({type: 'workerFailed'});
  }

  #createShadowObjects() {
    console.log('[vfx-ctx] createShadowObjects');

    // TODO reset the change-trail but leave view-components state as it is

    // we do this by publishing the worker instance
    // this will trigger the shadow-objects syncronization
    this.emit('worker', this.worker);
  }

  async #destroyWorker() {
    console.log('[vfx-ctx] destroyWorker');

    this.worker?.terminate();
    this.worker = undefined;

    this.retainClear('worker');
  }

  /*
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
  */
}
