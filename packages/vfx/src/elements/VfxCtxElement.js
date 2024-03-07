import {eventize} from '@spearwolf/eventize';
import {BaseEnv} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import '@spearwolf/shadow-ents/shadow-env.js';
import {connect, createSignal, value} from '@spearwolf/signalize';
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
} from '../constants.js';
import {waitForMessageOfType} from '../waitForMessageOfType.js';

const InitialHTML = `
  <p><code>vfx-ctx</code></p>
  <shadow-env id="env">
    <shadow-entity id="root" token="vfx-ctx">
      <slot></slot>
    </shadow-entity>
  </shadow-env>
`;

export class VfxCtxElement extends HTMLElement {
  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.retain('worker');

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.shadowEnvElement = this.shadow.getElementById('env');

    const [shadowEntityElement, setShadowEntityElement] = createSignal();
    const [viewComponent, setViewComponent] = createSignal();

    Object.defineProperties(this, {
      shadowEntityElement: {
        enumerable: true,
        get() {
          return value(shadowEntityElement);
        },
        set(value) {
          setShadowEntityElement(value);
        },
      },
      viewComponent: {
        enumerable: true,
        get() {
          return value(viewComponent);
        },
        set(value) {
          setViewComponent(value);
        },
      },
    });

    shadowEntityElement((el) => {
      if (el) {
        const con = connect([el, 'viewComponent'], setViewComponent);
        return () => {
          console.log('[vfx-ctx] shadowEntityElement: change-cleanup =>', el);
          con.destroy();
        };
      }
    });

    viewComponent((vc) => {
      if (vc) {
        this.#onViewComponent(vc);
      }
    });

    this.shadowEntityElement = this.shadow.getElementById('root');

    this.shadowEnv.on(BaseEnv.OnSync, this.#onEnvSync.bind(this));

    this.worker = this.createWorker();
  }

  get shadowEnv() {
    return this.shadowEnvElement.shadowEnv;
  }

  connectedCallback() {
    this.#setupWorker();

    // TODO start shadow-env sync loop
  }

  disconnectedCallback() {
    this.#destroyWorker();

    // TODO stop shadow-env sync loop
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
    console.log('[vfx-ctx] onViewComponent', {viewComponent: vc, shadowEnv: this.shadowEnv});

    // TODO set additional properties on view component ?

    this.shadowEnv.sync(); // initial sync
  }

  #onEnvSync(data) {
    console.log('[vfx-ctx] shadowEnv on sync, changeTrail=', data);
    this.#postMessageToWorker(ChangeTrail, data);
  }

  #postMessageToWorker(type, data) {
    this.once('worker', (worker) => worker.postMessage({type, ...data}));
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
