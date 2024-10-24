import {on} from '@spearwolf/eventize';
import {batch, createEffect, createSignal} from '@spearwolf/signalize';
import {readBooleanAttribute} from '../utils/attr-utils.js';
import {FrameLoop} from '../utils/FrameLoop.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {RemoteWorkerEnv} from '../view/RemoteWorkerEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ATTR_AUTO_SYNC, ATTR_LOCAL, ATTR_NO_AUTOSTART, ATTR_NO_STRUCTURED_CLONE, ATTR_SRC} from './constants.js';
import {ShaeElement} from './ShaeElement.js';

export class ShaeWorkerElement extends ShaeElement {
  static override observedAttributes = [...ShaeElement.observedAttributes, ATTR_LOCAL, ATTR_SRC, ATTR_NO_STRUCTURED_CLONE];

  static DefaultAutoSync = 'frame';

  readonly isShaeWorkerElement = true;

  readonly shadowEnv = new ShadowEnv();

  autostart = true;

  isConnected$ = createSignal(false);
  autoSync$ = createSignal(ShaeWorkerElement.DefaultAutoSync);

  #shouldDestroy = false;
  #started = false;
  #frameLoop?: FrameLoop;
  #unsubscribeAutoSync?: () => void;

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      this.shadowEnv.view = ComponentContext.get(ns);
    });

    on(this.shadowEnv, ShadowEnv.ContextCreated, () => {
      this.dispatchEvent(
        new CustomEvent(ShadowEnv.ContextCreated.toLowerCase(), {
          bubbles: false,
          detail: {shadowEnv: this.shadowEnv},
        }),
      );
    });

    on(this.shadowEnv, ShadowEnv.ContextLost, () => {
      this.dispatchEvent(
        new CustomEvent(ShadowEnv.ContextLost.toLowerCase(), {
          bubbles: false,
          detail: {shadowEnv: this.shadowEnv},
        }),
      );
    });

    this.autoSync$.onChange((sVal) => {
      const hasAttr = this.hasAttribute(ATTR_AUTO_SYNC);
      const attrVal = hasAttr ? this.getAttribute(ATTR_AUTO_SYNC) : undefined;

      if (sVal === ShaeWorkerElement.DefaultAutoSync) {
        if (hasAttr && attrVal !== sVal) {
          this.setAttribute(ATTR_AUTO_SYNC, sVal);
        }
      } else if (attrVal !== sVal) {
        this.setAttribute(ATTR_AUTO_SYNC, sVal);
      }
    });

    // XXX we don't expose ShadowEnv.AfterSync here, because the frequency of this event is too high

    this.#createAutoSyncEffect();
  }

  get shouldAutostart(): boolean {
    return this.autostart && !readBooleanAttribute(this, ATTR_NO_AUTOSTART);
  }

  get autoSync() {
    return this.autoSync$.value;
  }

  set autoSync(val: any) {
    if (typeof val !== 'string') {
      val = val ? ShaeWorkerElement.DefaultAutoSync : 'no';
    }
    this.autoSync$.set(`${val}`.trim().toLowerCase());
  }

  get frameLoop(): FrameLoop {
    if (this.#frameLoop == null) {
      this.#frameLoop = new FrameLoop();
    }
    return this.#frameLoop;
  }

  /**
   * The frameLoop (if activated) calls this method on every frame
   */
  [FrameLoop.OnFrame]() {
    this.syncShadowObjects();
  }

  async importScript(src: URL | string): Promise<ShaeWorkerElement> {
    if (!src) {
      throw new Error('src is blank');
    }
    const shadowEnv = await this.shadowEnv.ready();
    console.log('shadowEnv', shadowEnv);
    await shadowEnv.envProxy.importScript(src);
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    batch(() => {
      if (this.hasAttribute(ATTR_AUTO_SYNC)) {
        this.autoSync$.set(this.getAttribute(ATTR_AUTO_SYNC));
      }
      this.isConnected$.set(true);
    });

    if (this.shouldAutostart) {
      this.start();
    }
  }

  disconnectedCallback() {
    this.isConnected$.set(false);

    this.#deferDestroy();
  }

  override attributeChangedCallback(name: string) {
    super.attributeChangedCallback(name);

    if (name === ATTR_LOCAL) {
      if (this.shadowEnv.envProxy != null) {
        throw new Error(
          '[ShaeWorkerElement] Changing the "local" attribute after the shadowEnv has been created is not supported.',
        );
      }
    }

    if (name === ATTR_NO_STRUCTURED_CLONE) {
      this.#updateNoStructuredClone();
    }

    if (name === ATTR_AUTO_SYNC) {
      this.autoSync = this.hasAttribute(ATTR_AUTO_SYNC) ? this.getAttribute(ATTR_AUTO_SYNC) : true;
    }

    if (name === ATTR_SRC) {
      this.importScript(this.getAttribute(ATTR_SRC));
    }
  }

  start(): Promise<ShadowEnv> {
    if (!this.#started) {
      this.#shouldDestroy = false;

      if (this.shadowEnv.view == null) {
        this.shadowEnv.view = ComponentContext.get(this.ns);
      }

      if (this.shadowEnv.envProxy == null) {
        const envProxy = readBooleanAttribute(this, ATTR_LOCAL) ? new LocalShadowObjectEnv() : new RemoteWorkerEnv();
        this.shadowEnv.envProxy = envProxy;
        this.#updateNoStructuredClone();
      }

      this.#started = true;
    }
    return this.shadowEnv.ready();
  }

  destroy() {
    this.shadowEnv.envProxy = undefined;
    this.#unsubscribeAutoSync?.();
    this.#unsubscribeAutoSync = undefined;
  }

  // TODO(test) add tests for defer destroy
  #deferDestroy() {
    if (!this.#shouldDestroy) {
      this.#shouldDestroy = true;
      queueMicrotask(() => {
        if (this.#shouldDestroy) {
          this.destroy();
        }
      });
    }
  }

  #createAutoSyncEffect() {
    const e = createEffect(() => {
      if (this.isConnected$.get()) {
        const autoSync = (this.autoSync$.get() || ShaeWorkerElement.DefaultAutoSync).trim().toLowerCase();
        let delay = undefined;

        if (['true', 'yes', 'on', 'frame', 'auto-sync'].includes(autoSync)) {
          // console.debug('[ShaeWorkerElement] auto-sync', autoSync, this);
          this.frameLoop.start(this);
          return () => {
            this.frameLoop.stop(this);
          };
        } else if (autoSync.toLowerCase().endsWith('fps')) {
          const fps = parseInt(autoSync, 10);
          if (fps > 0) {
            delay = Math.floor(1000 / fps);
          } else {
            console.warn(`[ShaeWorkerElement] invalid auto-sync value: ${autoSync}`);
          }
        } else {
          delay = parseInt(autoSync, 10);
          if (isNaN(delay)) {
            delay = undefined;
            if (!['false', 'no', 'off'].includes(autoSync)) {
              console.warn(`[ShaeWorkerElement] invalid auto-sync value: ${autoSync}`);
            }
          }
        }

        if (delay !== undefined && delay > 0) {
          // console.debug('[ShaeWorkerElement] auto-sync interval (ms)', delay, this);
          const id = setInterval(() => {
            this.syncShadowObjects();
          }, delay);
          return () => {
            clearInterval(id);
          };
          // } else {
          //   console.debug('[ShaeWorkerElement] auto-sync off', this);
        }
      }
    }, [this.autoSync$, this.isConnected$]);

    this.#unsubscribeAutoSync = () => e.destroy();
  }

  #updateNoStructuredClone() {
    const env = this.shadowEnv.envProxy;
    if (env && (env as LocalShadowObjectEnv).isLocalEnv) {
      (env as LocalShadowObjectEnv).disableStructuredClone = this.hasAttribute(ATTR_NO_STRUCTURED_CLONE);
    }
  }
}
