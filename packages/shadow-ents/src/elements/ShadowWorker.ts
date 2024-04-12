import {eventize, type EventizeApi} from '@spearwolf/eventize';
import {createEffect, createSignal, type SignalReader} from '@spearwolf/signalize';
import {createActor} from 'xstate';
import {ChangeTrail, Init, Loaded, Ready, WorkerLoadTimeout, WorkerReadyTimeout} from '../constants.js';
import type {SyncEvent, TransferablesType} from '../types.js';
import type {ViewComponent} from '../view/ViewComponent.js';
import {BaseEnv} from '../view/env/BaseEnv.js';
import {FrameLoop} from './FrameLoop.js';
import {ReRequestContext} from './ReRequestContext.js';
import type {ShadowEntity} from './ShadowEntity.js';
import type {ShadowEnv} from './ShadowEnv.js';
import {attachShadowEntity} from './attachShadowEntity.js';
import {attachSignal} from './attachSignal.js';
import {machine} from './shadow-worker/state-machine.js';
import {waitForMessageOfType} from './waitForMessageOfType.js';

const AUTO_SYNC_DEFAULT = 'frame';
const WORKER = 'worker';

const InitialHTML = `
  <shadow-env id="env">
    <shadow-entity id="root" token="vfx-ctx">
      <slot></slot>
    </shadow-entity>
  </shadow-env>
`;

const isANoneEmptyArray = (value: any) => Array.isArray(value) && value.length > 0;

const prepareChangeTrail = (data: SyncEvent): [SyncEvent, TransferablesType | undefined] => {
  let transferables: TransferablesType | undefined;

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

export interface ShadowWorker extends EventizeApi {
  viewComponent?: ViewComponent;
  viewComponent$: SignalReader<ViewComponent | undefined>;

  shadowEntity?: ShadowEntity;
  shadowEntity$: SignalReader<ShadowEntity | undefined>;

  syncShadowObjects(): void;

  sendEventToShadows(...args: unknown[]): void;
  sendEventsToShadows(...args: unknown[]): void;

  autoSync: string;
}

export class ShadowWorker extends HTMLElement {
  static observedAttributes = ['src', 'auto-sync'];

  #reRequestContext = new ReRequestContext();
  #changeTrailQueue: SyncEvent[] = [];
  #resetEnvNext = false;
  #waitingForNextWorker = false;

  reRequestContextTypes = [1, 2]; // we use <shadow-env> and <shadow-entity> components in this element

  readonly shadow: ShadowRoot;
  readonly shadowEnvElement: ShadowEnv;

  worker?: Worker;

  private preWorker?: Worker;
  private readonly actor: any;
  private readonly frameLoop: FrameLoop;

  private readonly setIsConnected: (value: boolean) => void;

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.retain(WORKER);

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.shadowEnvElement = this.shadow.getElementById('env') as ShadowEnv;
    attachShadowEntity(this, this.shadow.getElementById('root'));

    this.on('viewComponent', this.#onViewComponent.bind(this));

    attachSignal(this, WORKER);

    this.shadowEnv.on(BaseEnv.OnSync, this.#onSyncEnv, this);

    this.actor = createActor(machine);
    this.actor.on('loadWorker', ({src}: any) => this.#loadWorker(src));
    this.actor.on('initializeWorker', () => this.#initializeWorker());
    this.actor.on('destroyWorker', () => this.#destroyWorker());
    this.actor.on('createShadowObjects', () => this.#createShadowObjects());
    this.actor.start();
    this.actor.send({type: 'initialized', src: this.getAttribute('src')});

    this.frameLoop = new FrameLoop();

    const [getAutoSync, setAutoSync] = createSignal(AUTO_SYNC_DEFAULT);
    const [getIsConnected, setIsConnected] = createSignal(false);

    this.setIsConnected = setIsConnected;

    Object.defineProperties(this, {
      autoSync: {
        get: getAutoSync,
        set: (val) => {
          if (typeof val !== 'string') {
            val = val ? AUTO_SYNC_DEFAULT : 'no';
          }

          const sVal = `${val}`.trim().toLowerCase();

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
        const autoSync = (getAutoSync() || AUTO_SYNC_DEFAULT).trim().toLowerCase();
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
              console.warn(`<shadow-worker> invalid auto-sync value: ${autoSync}`);
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

  attributeChangedCallback(name: string, oldValue: string | undefined, newValue: string | undefined) {
    if (name === 'src' && oldValue !== newValue && this.src !== newValue) {
      this.actor.send({type: 'srcChanged', src: newValue});
    } else if (name === 'auto-sync') {
      this.autoSync = newValue;
    }
  }

  connectedCallback() {
    this.#reRequestContext.callToRequestContext(this.reRequestContextTypes);
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

  // TODO worker url
  createWorker() {
    return new Worker(new URL('../vfx.worker.js', import.meta.url), {type: 'module'});
  }

  /**
   * If called, then viewComponent is set and can be used
   */
  #onViewComponent(vc: ViewComponent) {
    console.debug('<shadow-worker> initialize view-component', {viewComponent: vc, shadowEnv: this.shadowEnv});

    // XXX do we really need to set additional properties on view component ?
    // or can we just throw away this method? or just sync?

    this.syncShadowObjects(); // initial sync
  }

  #onSyncEnv(data: SyncEvent) {
    if (isANoneEmptyArray(data.changeTrail)) {
      if (this.worker) {
        this.#postMessageToWorker(ChangeTrail, ...prepareChangeTrail(data));
      } else {
        this.#changeTrailQueue.push(data);
        if (!this.#waitingForNextWorker) {
          this.#waitingForNextWorker = true;
          this.once(WORKER, () => {
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

  #postMessageToWorker(type: string, data: object, transfer: Array<any>) {
    const options = Array.isArray(transfer) ? {transfer} : undefined;
    this.worker.postMessage({type, ...data}, options);
  }

  async #loadWorker(src: string) {
    this.preWorker = this.createWorker();

    try {
      await waitForMessageOfType(this.preWorker, Loaded, WorkerLoadTimeout);

      this.preWorker.postMessage({
        type: Init,
        importSrc: new URL(src, window.location.toString()).href,
      });

      await waitForMessageOfType(this.preWorker, Ready, WorkerReadyTimeout);

      this.actor.send({type: 'workerLoaded'});
    } catch (error) {
      console.warn('<shadow-worker> worker panic!', error);
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
    if (this.worker) {
      this.#resetEnvNext = true;
    }

    // TODO find a more friendly way to destroy the worker before termination
    this.worker?.terminate();
    this.worker = undefined;

    this.retainClear(WORKER);

    this.preWorker?.terminate();
    this.preWorker = undefined;
  }
}
