import {on} from '@spearwolf/eventize';
import {batch, createEffect, createSignal, destroySignal, Effect} from '@spearwolf/signalize';
import {readBooleanAttribute, readNumberAttribute} from '../utils/attr-utils.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {FrameLoop} from '../utils/FrameLoop.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {RemoteWorkerEnv, type RemoteWorkerEnvOptions} from '../view/RemoteWorkerEnv.js';
import {ShadowEnv, ShadowEnvDestroyedError} from '../view/ShadowEnv.js';
import {
  ATTR_AUTO_SYNC,
  ATTR_CHANGE_TRAIL_TIMEOUT,
  ATTR_CONFIGURE_TIMEOUT,
  ATTR_DESTROY_TIMEOUT,
  ATTR_LOAD_TIMEOUT,
  ATTR_LOCAL,
  ATTR_NO_AUTOSTART,
  ATTR_NO_STRUCTURED_CLONE,
  ATTR_SRC,
} from './constants.js';
import {ShaeElement} from './ShaeElement.js';

const WorkerTimeoutAttributes: [keyof RemoteWorkerEnvOptions, string][] = [
  ['loadTimeout', ATTR_LOAD_TIMEOUT],
  ['configureTimeout', ATTR_CONFIGURE_TIMEOUT],
  ['changeTrailTimeout', ATTR_CHANGE_TRAIL_TIMEOUT],
  ['destroyTimeout', ATTR_DESTROY_TIMEOUT],
];

export class ShaeWorkerElement extends ShaeElement {
  static override observedAttributes = [
    ...ShaeElement.observedAttributes,
    ATTR_LOCAL,
    ATTR_SRC,
    ATTR_NO_STRUCTURED_CLONE,
    ATTR_AUTO_SYNC,
  ];

  static DefaultAutoSync = 'frame';

  readonly isShaeWorkerElement = true;

  readonly shadowEnv = new ShadowEnv();

  readonly logger = new ConsoleLogger('ShaeWorkerElement');

  autostart = true;

  isConnected$ = createSignal(false);
  autoSync$ = createSignal(ShaeWorkerElement.DefaultAutoSync);
  src$ = createSignal('');

  #started = false;

  #autoSync?: Effect;
  #importScript?: Effect;

  /**
   * Points the environment at the namespace this element names.
   *
   * It hangs on `ns$`, which belongs to the base class and outlives this element's teardown, so
   * the handle is kept and released by hand — a listener left on a living signal is a listener the
   * global signal queue goes on holding, and with it this element.
   */
  #envViewBinding?: () => void;

  constructor() {
    super();

    this.#envViewBinding = this.ns$.onChange((ns) => {
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

    on(this.shadowEnv, ShadowEnv.ProxyFailed, (reason: unknown) => {
      this.dispatchEvent(
        new CustomEvent(ShadowEnv.ProxyFailed.toLowerCase(), {
          bubbles: false,
          detail: {shadowEnv: this.shadowEnv, reason},
        }),
      );
    });

    on(this.shadowEnv, ShadowEnv.SyncFailed, (reason: unknown, changeTrail: unknown) => {
      this.dispatchEvent(
        new CustomEvent(ShadowEnv.SyncFailed.toLowerCase(), {
          bubbles: false,
          detail: {shadowEnv: this.shadowEnv, reason, changeTrail},
        }),
      );
    });

    this.autoSync$.onChange((sVal) => {
      this.reflectAttribute(ATTR_AUTO_SYNC, () => {
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
    });

    this.#createAutoSyncEffect();
    this.#createImportScriptEffect();
  }

  #createImportScriptEffect() {
    this.#importScript = createEffect(
      () => {
        const src = this.src$.get();
        if (src) {
          this.importScript(src).catch(this.#onUnobservedRejection);
        }
      },
      {autorun: false},
    );
  }

  /**
   * Both {@link ShaeWorkerElement.start} and {@link ShaeWorkerElement.importScript} await
   * {@link ShadowEnv.ready}, which rejects once the environment is destroyed — the normal
   * outcome for an element that connects and disconnects within the same task. Nothing in the
   * element waits on those promises, so the rejection has to end here instead of surfacing as
   * an unhandled rejection in the browser or as a hard failure in a test runner.
   */
  #onUnobservedRejection = (error: unknown) => {
    if (error instanceof ShadowEnvDestroyedError) return;
    this.logger.error('shadowEnv failed', error);
  };

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
    return FrameLoop.get();
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
    // ready() only vouches for the proxy at the moment it resolves; a teardown can slip in
    // between that microtask and this line
    const envProxy = shadowEnv.envProxy;
    if (envProxy == null) {
      throw new ShadowEnvDestroyedError();
    }

    await envProxy.importScript(src);
    return this;
  }

  override connectedCallback() {
    // this element does not come back, and the refusal has to stand in front of `super`: the base
    // takes a returning element's subscriptions up again, and here there is nothing to take up —
    // the teardown took the environment with it, and an environment cannot be rebuilt around a
    // proxy that is gone. A `<shae-worker>` that is needed again is a new one
    if (this.isDestroyed) return;

    super.connectedCallback();

    batch(() => {
      const autoSync = this.getAttribute(ATTR_AUTO_SYNC);
      if (autoSync != null) {
        this.autoSync$.set(autoSync);
      }
      this.isConnected$.set(true);
    });
    if (this.shouldAutostart) {
      this.start().catch(this.#onUnobservedRejection);
    }
  }

  override disconnectedCallback() {
    this.isConnected$.set(false);
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string) {
    // the signals of this class are destroyed, so an attribute write would land in a value that
    // notifies nobody — and there is no return that would ever read it back
    if (this.isDestroyed) return;

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

  /**
   * The timeout attributes, read at the one moment they are needed: when the worker environment
   * is built. An attribute that is not there is left out, so the environment keeps its default,
   * and a value the environment does not accept is reported there. They are not observed —
   * setting one afterwards changes nothing about an environment that already exists, and a
   * `local` element builds no worker environment at all, so they do nothing there.
   */
  #readWorkerTimeouts(): RemoteWorkerEnvOptions {
    const options: RemoteWorkerEnvOptions = {};

    for (const [key, attr] of WorkerTimeoutAttributes) {
      const value = readNumberAttribute(this, attr);
      if (value !== undefined) options[key] = value;
    }

    return options;
  }

  start(): Promise<ShadowEnv> {
    if (!this.#started) {
      this.shadowEnv.view ??= ComponentContext.get(this.ns);

      if (this.shadowEnv.envProxy == null) {
        const envProxy = readBooleanAttribute(this, ATTR_LOCAL)
          ? new LocalShadowObjectEnv()
          : new RemoteWorkerEnv(this.#readWorkerTimeouts());
        this.shadowEnv.envProxy = envProxy;
        this.#disableStructuredClone();
      }

      this.#started = true;
    }

    return this.shadowEnv.ready();
  }

  /**
   * Tear this element down — for good.
   *
   * The effects and signals below belong to the element alone, so the element is what decides
   * whether they have already been released; the guard for that sits in `ShaeElement.destroy()`,
   * which has already set the flag by the time this runs. Here that matters more than anywhere
   * else: `shadowEnv.destroy()` dispatches a `contextlost` `CustomEvent` on this element on its
   * way out, and a listener on it that reaches back into `destroy()` finds the flag down and turns
   * around instead of tearing the same environment down a second time.
   *
   * Unlike `<shae-ent>` and `<shae-prop>`, this teardown is final: it destroys the signals and
   * takes the environment down with them, and neither comes back. `connectedCallback` turns a
   * returning element away rather than handing it a half of what it had, and `restore()` is
   * therefore not overridden — there is nothing to take up again.
   */
  protected override teardown() {
    this.#envViewBinding?.();
    this.#envViewBinding = undefined;

    this.#autoSync?.destroy();
    this.#importScript?.destroy();
    destroySignal(this.isConnected$, this.autoSync$, this.src$);
    this.shadowEnv.envProxy = undefined;
    this.shadowEnv.destroy();

    super.teardown();
  }

  #createAutoSyncEffect() {
    this.#autoSync = createEffect(() => {
      if (this.isConnected$.get()) {
        const autoSync = (this.autoSync$.get() || ShaeWorkerElement.DefaultAutoSync).trim().toLowerCase();
        let delay;

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