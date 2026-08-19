import {emit, off, on, onceAsync, Priority, retain, retainClear} from '@spearwolf/eventize';
import {createEffect, createSignal, destroyObjectSignals, findObjectSignalByName} from '@spearwolf/signalize';
import {signal} from '@spearwolf/signalize/decorators';
import type {MessageToViewEvent} from '../shadow-objects.js';
import type {ChangeTrailType, NamespaceType} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {ComponentContext} from './ComponentContext.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

declare global {
  // eslint-disable-next-line no-var
  var __shadowEnvs: Map<NamespaceType, ShadowEnv> | undefined;
}

/**
 * The reason every pending {@link ShadowEnv.ready} and {@link ShadowEnv.syncWait} promise
 * is rejected with when the environment is destroyed.
 */
export class ShadowEnvDestroyedError extends Error {
  constructor(message = 'the shadow environment has been destroyed') {
    super(message);
    this.name = 'ShadowEnvDestroyedError';
  }
}

export class ShadowEnv {
  static AfterSync = 'afterSync';
  static ContextLost = 'contextLost';
  static ContextCreated = 'contextCreated';
  static ProxyFailed = 'proxyFailed';

  static get(ns: NamespaceType): ShadowEnv | undefined {
    if (ns == null) return undefined;
    return globalThis.__shadowEnvs?.get(ns);
  }

  #comCtx?: ComponentContext;
  #shaObjEnvProxy?: IShadowObjectEnvProxy;
  #syncScheduled = false;
  #syncAfterContextCreated = false;
  #syncWaitForConfirmation = false;
  #afterNextSync?: Promise<ChangeTrailType>;

  readonly logger = new ConsoleLogger('ShadowEnv');

  readonly ns$ = createSignal<NamespaceType | undefined>();

  @signal() accessor viewReady = false;
  @signal() accessor proxyReady = false;

  #isDestroyed = false;

  get isDestroyed() {
    return this.#isDestroyed;
  }

  constructor() {
    const self = this as ShadowEnv;
    retain(self, ShadowEnv.ContextCreated);

    on(self, ShadowEnv.ContextLost, Priority.Critical, () => {
      retainClear(self, ShadowEnv.ContextCreated);
    });

    createEffect(() => {
      if (this.viewReady && this.proxyReady) {
        this.view!.reCreateChanges();
        emit(self, ShadowEnv.ContextCreated, self);
        if (this.#syncAfterContextCreated) {
          this.#syncAfterContextCreated = false;
          this.#syncNow();
        }
        return () => {
          emit(self, ShadowEnv.ContextLost, self);
        };
      }
      // the two @signal accessors above create their signals during field initialization,
      // so both lookups resolve by the time the constructor body runs
    }, [findObjectSignalByName(this, 'viewReady')!, findObjectSignalByName(this, 'proxyReady')!]);
  }

  get view(): ComponentContext | undefined {
    return this.#comCtx;
  }

  set view(ctx: ComponentContext | null | undefined) {
    if (ctx !== this.#comCtx) {
      this.#releaseNamespace(this.#comCtx?.ns);

      this.#comCtx = ctx ?? undefined;

      if (this.#comCtx?.ns) {
        globalThis.__shadowEnvs ??= new Map();
        if (globalThis.__shadowEnvs.has(this.#comCtx.ns) && globalThis.__shadowEnvs.get(this.#comCtx.ns) !== this) {
          if (this.logger.isWarn) {
            this.logger.warn(
              'overwrite a namespace already in use',
              this.#comCtx.ns,
              globalThis.__shadowEnvs.get(this.#comCtx.ns),
            );
          }
        }
        globalThis.__shadowEnvs.set(this.#comCtx.ns, this);
      }

      this.viewReady = Boolean(ctx);
    }
  }

  /**
   * Releases the namespace registration, but only while this environment holds it. A namespace
   * carries one environment at a time, and an assignment that displaces another one leaves that
   * other environment registered under nothing -- taking its entry along on the way out would
   * make `ShadowEnv.get()` answer `undefined` for an environment that is very much alive.
   */
  #releaseNamespace(ns: NamespaceType | undefined): void {
    // the same truthiness check the `view` setter above uses before it registers a namespace,
    // so release and registration recognize the same namespace as "none"
    if (!ns) return;
    const shadowEnvs = globalThis.__shadowEnvs;
    if (shadowEnvs?.get(ns) === this) {
      shadowEnvs.delete(ns);
    }
  }

  get envProxy(): IShadowObjectEnvProxy | undefined {
    return this.#shaObjEnvProxy;
  }

  // Each assignment to `envProxy` opens a generation. A start that finishes outside the generation
  // it belongs to speaks for a proxy this environment has already let go, and is discarded.
  #proxyGeneration = 0;

  set envProxy(proxy: IShadowObjectEnvProxy | null | undefined) {
    if (proxy !== this.#shaObjEnvProxy) {
      const prevProxy = this.#shaObjEnvProxy;
      this.#shaObjEnvProxy = proxy ?? undefined;

      const generation = ++this.#proxyGeneration;

      if (this.#shaObjEnvProxy) {
        this.#shaObjEnvProxy.onMessageToView = this.#onMessageToView.bind(this);
        this.#shaObjEnvProxy.onProxyFailed = this.#onProxyFailed.bind(this);
      }

      if (prevProxy) {
        prevProxy.destroy();

        // a proxy this environment has let go speaks for an environment that is gone; whatever
        // it makes of its own failure from here on is no longer this environment's business
        prevProxy.onProxyFailed = undefined;

        // one microtask later, not synchronously: a local environment hands a message an
        // `onDestroy` sends towards the view to a microtask queued while `destroy()` runs, and
        // that message is still addressed to this environment. The microtask queue is served in
        // the order it was filled, so every message the teardown queued runs ahead of this line
        // -- and the released proxy falls silent for everything after it
        queueMicrotask(() => {
          prevProxy.onMessageToView = undefined;
        });
      }

      this.proxyReady = false;

      // the catch stays behind the then: a listener of ContextCreated that throws is reported here,
      // and turning this into `then(onFulfilled, onRejected)` would let it escape as an unhandled rejection
      proxy
        ?.start()
        .then(() => {
          if (generation !== this.#proxyGeneration) return;
          this.proxyReady = true;
        })
        .catch((error) => {
          if (generation !== this.#proxyGeneration) return;
          this.logger.error('failed to start envProxy', error);
          this.proxyReady = false;
        });
    }
  }

  get isReady(): boolean {
    return Boolean(this.#comCtx && this.#shaObjEnvProxy && this.proxyReady && !this.isDestroyed);
  }

  #whenDestroyed?: Promise<never>;
  #rejectWhenDestroyed?: (error: Error) => void;

  /**
   * A promise that rejects the moment this environment is destroyed.
   *
   * Every promise the public API hands out races against it. Without that race a caller
   * would wait forever, because {@link ShadowEnv.destroy} tears down the very listeners
   * those promises are built on.
   */
  #destroyedSignal(): Promise<never> {
    if (this.#whenDestroyed == null) {
      this.#whenDestroyed = new Promise<never>((_, reject) => {
        this.#rejectWhenDestroyed = reject;
      });
      // the signal is rejected unconditionally, also when nobody happens to be racing against it
      this.#whenDestroyed.catch(() => {});
    }
    return this.#whenDestroyed;
  }

  /**
   * Resolves once the environment is ready.
   *
   * @throws {ShadowEnvDestroyedError} if the environment is destroyed before that happens
   */
  readonly ready = async (): Promise<ShadowEnv> => {
    if (this.#isDestroyed) throw new ShadowEnvDestroyedError();
    if (this.isReady) return this;
    return Promise.race([onceAsync<ShadowEnv>(this as ShadowEnv, ShadowEnv.ContextCreated), this.#destroyedSignal()]);
  };

  sync(): void {
    if (this.#isDestroyed) return;
    if (!this.isReady) {
      this.#syncAfterContextCreated = true;
      return;
    }
    if (this.#syncScheduled) return;
    this.#syncScheduled = true;
    queueMicrotask(this.#syncIfScheduled);
  }

  /**
   * Like {@link ShadowEnv.sync}, but resolves with the change trail once the cycle completed.
   *
   * @throws {ShadowEnvDestroyedError} if the environment is destroyed before that happens
   */
  syncWait(): Promise<ChangeTrailType> {
    if (this.#isDestroyed) return Promise.reject(new ShadowEnvDestroyedError());

    this.#syncWaitForConfirmation = true;
    this.sync();

    if (this.#afterNextSync) return this.#afterNextSync;

    this.#afterNextSync = Promise.race([
      onceAsync<ChangeTrailType>(this as ShadowEnv, ShadowEnv.AfterSync),
      this.#destroyedSignal(),
    ]).then(
      (changeTrail) => {
        this.#afterNextSync = undefined;
        return changeTrail;
      },
      (error) => {
        this.#afterNextSync = undefined;
        throw error;
      },
    );

    return this.#afterNextSync;
  }

  /**
   * Tear the environment down: the proxy is destroyed, the namespace is released, all signals
   * and listeners are removed, and every caller still waiting on {@link ShadowEnv.ready} or
   * {@link ShadowEnv.syncWait} is rejected with a {@link ShadowEnvDestroyedError} instead of
   * being left pending forever. Calling it more than once is a no-op.
   */
  destroy() {
    if (this.#isDestroyed) return;

    // set first: isReady must report false for everything that runs below
    this.#isDestroyed = true;

    this.#syncScheduled = false;
    this.#syncAfterContextCreated = false;
    this.#syncWaitForConfirmation = false;

    // the `envProxy` setter destroys the previous proxy, so it must not be destroyed here as well
    this.envProxy = undefined;
    // the `view` setter releases the namespace registration on the way out, ownership-checked
    this.view = undefined;

    // settle everyone still waiting before the listeners they depend on are removed
    this.#rejectWhenDestroyed?.(new ShadowEnvDestroyedError());
    this.#afterNextSync = undefined;

    destroyObjectSignals(this);
    off(this);

    Object.freeze(this);
  }

  #syncIfScheduled = () => {
    if (this.#syncScheduled) {
      this.#syncNow();
    }
  };

  async #syncNow() {
    this.#syncScheduled = false;

    if (this.#isDestroyed) return;

    if (!this.isReady) {
      // the environment went away between scheduling and running this sync:
      // re-arm instead of dropping it, otherwise a pending syncWait() would never settle
      this.#syncAfterContextCreated = true;
      return;
    }

    const data = this.view!.buildChangeTrails();

    const waitForConfirmation = this.#syncWaitForConfirmation;
    this.#syncWaitForConfirmation = false;

    try {
      if (data.length > 0) {
        await this.envProxy!.applyChangeTrail(data, waitForConfirmation);
      }
    } catch (error) {
      this.logger.error('failed to apply change trail', error);
    } finally {
      // always emitted, even for an empty change trail, so that syncWait() settles on every cycle
      emit(this as ShadowEnv, ShadowEnv.AfterSync, data);
    }
  }

  #onMessageToView(event: Omit<MessageToViewEvent, 'transferables'>) {
    if (this.logger.isDebug) {
      this.logger.debug('onMessageToView', event.type, event.data);
    }
    this.view?.dispatchMessage(event.uuid, event.type, event.data, event.traverseChildren);
  }

  #onProxyFailed(reason: unknown) {
    // destroy() freezes this instance and destroys its signals; a proxy may report its failure afterwards
    if (this.#isDestroyed) return;

    this.logger.error('the environment proxy failed', reason);

    // the failure ends this proxy's turn the same way a reassignment would: a start of its own
    // that resolves afterwards must not report a lost environment as ready
    ++this.#proxyGeneration;

    try {
      // the reason before the consequence: ContextLost follows from dropping proxyReady
      emit(this as ShadowEnv, ShadowEnv.ProxyFailed, reason, this as ShadowEnv);
    } finally {
      // in the `finally`, because losing the environment is not up for debate:
      // a listener that throws must not leave `isReady` claiming otherwise
      this.proxyReady = false;
    }
  }
}