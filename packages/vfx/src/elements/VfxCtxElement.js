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
} from '../shared/constants.js';
import {waitForMessageOfType} from './waitForMessageOfType.js';

const InitialHTML = `
  <shadow-env id="env">
    <shadow-entity id="root" token="vfx-ctx">
      <slot></slot>
    </shadow-entity>
  </shadow-env>
`;

export class VfxCtxElement extends HTMLElement {
  #needsUpdate = false;

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
        const con = connect(el.viewComponent$, viewComponent);
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

    this.shadowEnv.on(BaseEnv.OnSync, this.#onEnvSync, this);

    this.worker = this.createWorker();
  }

  get shadowEnv() {
    return this.shadowEnvElement.shadowEnv;
  }

  connectedCallback() {
    this.#setupWorker();

    // TODO start shadow-env sync loop (configure via attribute? "sync-on-frame", "sync-interval=")
  }

  disconnectedCallback() {
    this.#destroyWorker();

    // TODO stop shadow-env sync loop
  }

  createWorker() {
    return new Worker(new URL('../vfx.worker.js', import.meta.url), {type: 'module'});
  }

  /**
   * sync shadow-env on microtask
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
   */
  update() {
    if (!this.#needsUpdate) {
      queueMicrotask(() => {
        if (this.#needsUpdate) {
          this.#needsUpdate = false;
          this.shadowEnv.sync();
        }
      });
      this.#needsUpdate = true;
    }
  }

  /**
   * if called, then viewComponent is set and can be used
   *
   * @param {import('@spearwolf/shadow-ents').ViewComponent} vc view component
   */
  #onViewComponent(vc) {
    console.debug('[vfx-ctx] onViewComponent', {viewComponent: vc, shadowEnv: this.shadowEnv});

    // TODO set additional properties on view component ?

    this.update(); // initial sync
  }

  #onEnvSync(data) {
    console.debug('[vfx-ctx] shadowEnv on sync, changeTrail=', data);
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
