import {eventize} from '@spearwolf/eventize';
import {BaseEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import '@spearwolf/shadow-ents/shadow-env-legacy.js';
import {createEffect, createSignal} from '@spearwolf/signalize';
import {createActor} from 'xstate';
import {FrameLoop} from '../shared/FrameLoop.js';
import {attachSignal} from '../shared/attachSignal.js';
import {ChangeTrail, Init, Loaded, Ready, WorkerLoadTimeout, WorkerReadyTimeout} from '../shared/constants.js';
import {VfxElement} from './VfxElement.js';
import {attachShadowEntity} from './attachShadowEntity.js';
import {machine} from './vfx-ctx/state-machine.js';
import {waitForMessageOfType} from './waitForMessageOfType.js';

const DEFAULT_AUTO_SYNC = 'frame';

const InitialHTML = `
  <shadow-env-legacy id="env">
    <shadow-entity id="root" token="vfx-ctx">
      <slot></slot>
    </shadow-entity>
  </shadow-env-legacy>
`;

const isANoneEmptyArray = (value) => Array.isArray(value) && value.length > 0;

const prepareChangeTrail = (data) => {
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

  return [data, transferables];
};

export class VfxCtxElement extends VfxElement {
  static observedAttributes = ['src', 'auto-sync'];

  reRequestContextTypes = [1, 2]; // we use <shadow-env> and <shadow-entity> components in this element

  #changeTrailQueue = [];

  #resetEnvNext = false;
  #waitingForNextWorker = false;

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.retain('worker');

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.shadowEnvElement = this.shadow.getElementById('env');
    attachShadowEntity(this, this.shadow.getElementById('root'));

    this.on('viewComponent', this.#onViewComponent.bind(this));

    this.preWorker = undefined;
    attachSignal(this, 'worker');

    this.shadowEnv.on(BaseEnv.OnSync, this.#onEnvSync, this);

    this.actor = createActor(machine);
    this.actor.on('loadWorker', ({src}) => this.#loadWorker(src));
    this.actor.on('initializeWorker', () => this.#initializeWorker());
    this.actor.on('destroyWorker', () => this.#destroyWorker());
    this.actor.on('createShadowObjects', () => this.#createShadowObjects());
    this.actor.start();
    this.actor.send({type: 'initialized', src: this.getAttribute('src')});

    this.frameLoop = new FrameLoop();

    const [getAutoSync, setAutoSync] = createSignal(DEFAULT_AUTO_SYNC);
    const [getIsConnected, setIsConnected] = createSignal(false);

    this.setIsConnected = setIsConnected;

    Object.defineProperties(this, {
      autoSync: {
        get: getAutoSync,
        set: (val) => {
          if (typeof val !== 'string') {
            val = val ? DEFAULT_AUTO_SYNC : 'no';
          }

          let sVal = `${val}`.trim().toLowerCase();

          if (this.getAttribute('auto-sync') !== sVal) {
            this.setAttribute('auto-sync', sVal);
          }

          setAutoSync(sVal);
        },
        enumerable: true,
      },
    });

    createEffect(() => {
      if (getIsConnected()) {
        const autoSync = (getAutoSync() || DEFAULT_AUTO_SYNC).trim().toLowerCase();
        let delay = undefined;

        if (['true', 'yes', 'on', 'frame', 'auto-sync'].includes(autoSync)) {
          this.frameLoop.start(this);
          return () => {
            this.frameLoop.stop(this);
          };
        } else if (autoSync.toLowerCase().endsWith('fps')) {
          const fps = parseInt(autoSync, 10);
          if (fps > 0) {
            delay = Math.floor(1000 / fps);
          } else {
            console.warn(`[vfx-ctx] invalid auto-sync value: ${autoSync}`);
          }
        } else {
          delay = parseInt(autoSync, 10);
          if (isNaN(delay)) {
            delay = undefined;
            if (!['false', 'no', 'off'].includes(autoSync)) {
              console.warn(`[vfx-ctx] invalid auto-sync value: ${autoSync}`);
            }
          }
        }

        if (delay !== undefined && delay > 0) {
          const id = setInterval(() => {
            this.syncShadowObjects();
          }, delay);
          return () => {
            clearInterval(id);
          };
        }
      }
    }, [getAutoSync, getIsConnected]);
  }

  get state() {
    return this.actor.getSnapshot().value;
  }

  get src() {
    return this.actor.getSnapshot().context.src;
  }

  get shadowEnv() {
    return this.shadowEnvElement?.getShadowEnv();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && oldValue !== newValue && this.src !== newValue) {
      this.actor.send({type: 'srcChanged', src: newValue});
    } else if (name === 'auto-sync') {
      this.autoSync = newValue;
    }
  }

  connectedCallback() {
    super.connectedCallback();

    this.setIsConnected(true);

    this.actor.send({type: 'updateConnectedState', connected: true});
  }

  disconnectedCallback() {
    this.setIsConnected(false);

    this.actor.send({type: 'updateConnectedState', connected: false});
  }

  /**
   * The frameLoop (if activated) calls this method on every frame
   */
  onFrame() {
    this.syncShadowObjects();
  }

  createWorker() {
    return new Worker(new URL('../vfx.worker.js', import.meta.url), {type: 'module'});
  }

  /**
   * If called, then viewComponent is set and can be used
   *
   * @param {import('@spearwolf/shadow-ents').ViewComponent} vc view component
   */
  #onViewComponent(vc) {
    console.debug('[vfx-ctx] onViewComponent', {viewComponent: vc, shadowEnv: this.shadowEnv});

    vc.setProperty('bar', 666); // TODO remove me!

    // XXX do we really need to set additional properties on view component ?
    // or can we just throw away this method?

    this.syncShadowObjects(); // initial sync
  }

  #onEnvSync(data) {
    if (isANoneEmptyArray(data.changeTrail)) {
      if (this.worker) {
        this.#postMessageToWorker(ChangeTrail, ...prepareChangeTrail(data));
      } else {
        this.#changeTrailQueue.push(data);

        if (!this.#waitingForNextWorker) {
          this.#waitingForNextWorker = true;
          this.once('worker', () => {
            this.#waitingForNextWorker = false;
            this.#postChangeTrailQueueToWorker();
          });
        }
      }
    }
  }

  #postChangeTrailQueueToWorker() {
    if (this.worker && this.#changeTrailQueue.length > 0) {
      const changeTrail = [];
      const transfer = [];

      for (const data of this.#changeTrailQueue) {
        const segment = prepareChangeTrail(data);
        changeTrail.push(...segment[0].changeTrail);
        if (isANoneEmptyArray(segment[1])) {
          transfer.push(...segment[1]);
        }
      }

      this.#changeTrailQueue.length = 0;

      this.#postMessageToWorker(ChangeTrail, {changeTrail}, transfer.length > 0 ? transfer : undefined);
    }
  }

  #postMessageToWorker(type, data, transfer) {
    const options = Array.isArray(transfer) ? {transfer} : undefined;
    // console.debug(`[vfx-ctx] postMessage:${type}, data=`, data, 'transfer=', options);
    this.worker.postMessage({type, ...data}, options);
  }

  async #loadWorker(src) {
    console.debug('[vfx-ctx] loadWorker', src);

    this.preWorker = this.createWorker();

    try {
      await waitForMessageOfType(this.preWorker, Loaded, WorkerLoadTimeout);

      this.preWorker.postMessage({
        type: Init,
        importVfxSrc: new URL(src, window.location).href,
      });

      await waitForMessageOfType(this.preWorker, Ready, WorkerReadyTimeout);

      this.actor.send({type: 'workerLoaded'});
    } catch (error) {
      console.warn('[vfx-ctx] workerFailed!', error);

      this.actor.send({type: 'workerFailed'});
    }
  }

  async #initializeWorker() {
    // TODO initialize worker ?

    queueMicrotask(() => {
      this.actor.send({type: 'workerReady'});
    });

    // TODO this.actor.send({type: 'workerFailed'}) ?
  }

  #createShadowObjects() {
    console.debug('[vfx-ctx] createShadowObjects, resetEnvNext=', this.#resetEnvNext);

    // we do this by publishing the worker instance
    // this will trigger the shadow-objects syncronization
    const worker = this.preWorker;
    this.preWorker = undefined;
    this.worker = worker;

    if (this.#resetEnvNext) {
      this.shadowEnvElement.resetEnv();
      // TODO what should happen with the events ?
      // maybe we should collect them all (from queue) and re-emit ?
      this.#changeTrailQueue.length = 0;
    }
  }

  async #destroyWorker() {
    console.debug('[vfx-ctx] destroyWorker');

    if (this.worker) {
      this.#resetEnvNext = true;
    }

    // TODO find a more friendly way to destroy the worker before termination
    this.worker?.terminate();
    this.worker = undefined;

    this.retainClear('worker');

    this.preWorker?.terminate();
    this.preWorker = undefined;
  }
}
