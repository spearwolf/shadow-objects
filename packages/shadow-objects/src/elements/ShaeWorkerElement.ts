import {on} from '@spearwolf/eventize';
import {batch, createEffect, createSignal, destroySignal, Effect} from '@spearwolf/signalize';
import {readBooleanAttribute} from '../utils/attr-utils.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
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

  readonly logger = new ConsoleLogger('ShaeWorkerElement');

  autostart = true;

  isConnected$ = createSignal(false);
  autoSync$ = createSignal(ShaeWorkerElement.DefaultAutoSync);
  src$ = createSignal('');

  #shouldDestroy = false;
  #started = false;

  #frameLoop?: FrameLoop;
  #autoSync?: Effect;
  #importScript?: Effect;

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      this.shadowEnv.view = ComponentContext.get(ns);
    });

    on(this.shadowEnv, ShadowEnv.ContextCreated, () => {
      this.#importScript?.run();
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

    this.#createAutoSyncEffect();
    this.#createImportScriptEffect();

    this.style.display = 'contents';
  }

  #createImportScriptEffect() {
    this.#importScript = createEffect(
      () => {
        const src = this.src$.get();
        if (src) {
          this.importScript(src);
        }
      },
      {autorun: false},
    );
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
    this.#frameLoop ??= new FrameLoop();
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
    if (this.logger.isInfo) {
      this.logger.info('shadowEnv importScript:', src, {shadowEnv});
    }
    await shadowEnv.envProxy.importScript(src);
    return this;
  }

  connectedCallback() {
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
        throw new Error('Changing the "local" attribute after the shadowEnv has been created is not supported.');
      }
    }

    if (name === ATTR_NO_STRUCTURED_CLONE) {
      this.#disableStructuredClone();
    }

    if (name === ATTR_AUTO_SYNC) {
      this.autoSync = this.hasAttribute(ATTR_AUTO_SYNC) ? this.getAttribute(ATTR_AUTO_SYNC) : true;
    }

    if (name === ATTR_SRC) {
      const src = (this.getAttribute(ATTR_SRC) || '').trim();
      this.src$.set(src);
      if (this.shadowEnv.isReady) {
        this.#importScript?.run();
      }
    }
  }

  start(): Promise<ShadowEnv> {
    if (!this.#started) {
      this.#shouldDestroy = false;

      this.shadowEnv.view ??= ComponentContext.get(this.ns);

      if (this.shadowEnv.envProxy == null) {
        const envProxy = readBooleanAttribute(this, ATTR_LOCAL) ? new LocalShadowObjectEnv() : new RemoteWorkerEnv();
        this.shadowEnv.envProxy = envProxy;
        this.#disableStructuredClone();
      }

      this.#started = true;
    }

    return this.shadowEnv.ready();
  }

  destroy() {
    this.#autoSync?.destroy();
    this.#importScript?.destroy();
    destroySignal(this.isConnected$, this.autoSync$, this.src$);
    this.shadowEnv.envProxy = undefined;
    this.shadowEnv.destroy();
  }

  #deferDestroy() {
    // NOTE The destruction is halted until the next microtask—but a reconnect (adding the element back to the DOM before the next microtask)
    //  cannot stop this process, and that's okay. Once destroyed, it's destroyed forever.
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
    this.#autoSync = createEffect(() => {
      if (this.isConnected$.get()) {
        const autoSync = (this.autoSync$.get() || ShaeWorkerElement.DefaultAutoSync).trim().toLowerCase();
        let delay = undefined;

        if (['true', 'yes', 'on', 'frame', 'auto-sync'].includes(autoSync)) {
          if (this.logger.isDebug) {
            this.logger.debug('auto-sync', autoSync, this);
          }
          this.frameLoop.start(this);
          return () => {
            this.frameLoop.stop(this);
          };
        } else if (autoSync.toLowerCase().endsWith('fps')) {
          const fps = parseInt(autoSync, 10);
          if (fps > 0) {
            delay = Math.floor(1000 / fps);
          } else if (this.logger.isWarn) {
            this.logger.warn(`invalid auto-sync value: ${autoSync}`);
          }
        } else {
          delay = parseInt(autoSync, 10);
          if (isNaN(delay)) {
            delay = undefined;
            if (!['false', 'no', 'off'].includes(autoSync)) {
              this.logger.error(`invalid auto-sync value: ${autoSync}`);
            }
          }
        }

        if (delay !== undefined && delay > 0) {
          if (this.logger.isDebug) {
            this.logger.debug('auto-sync interval (ms)', delay, this);
          }
          const id = setInterval(() => {
            this.syncShadowObjects();
          }, delay);
          return () => {
            clearInterval(id);
          };
        } else if (this.logger.isDebug) {
          this.logger.debug('auto-sync off', this);
        }
      }
    }, [this.autoSync$, this.isConnected$]);
  }

  #disableStructuredClone() {
    const env = this.shadowEnv.envProxy as LocalShadowObjectEnv;
    if (env?.isLocalEnv) {
      env.disableStructuredClone = this.hasAttribute(ATTR_NO_STRUCTURED_CLONE);
    }
  }
}
