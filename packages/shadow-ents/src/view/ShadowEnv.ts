import {Priority, eventize, type EventizeApi} from '@spearwolf/eventize';
import {createEffect, createSignal, type SignalReader} from '@spearwolf/signalize';
import {signal, signalReader} from '@spearwolf/signalize/decorators';
import type {MessageToViewEvent} from '../shadow-objects.js';
import type {ChangeTrailType, NamespaceType} from '../types.js';
import {ComponentContext} from './ComponentContext.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

declare global {
  // eslint-disable-next-line no-var
  var __shadowEnvs: Map<NamespaceType, ShadowEnv> | undefined;
}

export interface ShadowEnv extends EventizeApi {}

export class ShadowEnv {
  static AfterSync = 'afterSync';
  static ContextLost = 'contextLost';
  static ContextCreated = 'contextCreated';

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

  readonly ns$ = createSignal<NamespaceType | undefined>();

  @signal() accessor viewReady = false;
  @signalReader() accessor viewReady$: SignalReader<boolean>;

  @signal() accessor proxyReady = false;
  @signalReader() accessor proxyReady$: SignalReader<boolean>;

  constructor() {
    eventize(this);

    this.retain(ShadowEnv.ContextCreated);
    this.on(ShadowEnv.ContextLost, Priority.AAA, () => {
      this.retainClear(ShadowEnv.ContextCreated);
    });

    createEffect(() => {
      if (this.viewReady && this.proxyReady) {
        this.view!.reCreateChanges();
        this.emit(ShadowEnv.ContextCreated, this);
        if (this.#syncAfterContextCreated) {
          this.#syncAfterContextCreated = false;
          this.#syncNow();
        }
        return () => {
          this.emit(ShadowEnv.ContextLost, this);
        };
      }
    }, [this.viewReady$, this.proxyReady$]);
  }

  get view(): ComponentContext | undefined {
    return this.#comCtx;
  }

  set view(ctx: ComponentContext | null | undefined) {
    if (ctx !== this.#comCtx) {
      if (this.#comCtx && this.#comCtx.ns && globalThis.__shadowEnvs) {
        globalThis.__shadowEnvs.delete(this.#comCtx.ns);
      }

      this.#comCtx = ctx ?? undefined;

      if (this.#comCtx && this.#comCtx.ns) {
        globalThis.__shadowEnvs ??= new Map();
        if (globalThis.__shadowEnvs.has(this.#comCtx.ns) && globalThis.__shadowEnvs.get(this.#comCtx.ns) !== this) {
          console.warn(
            'ShadowEnv: overwrite a namespace already in use',
            this.#comCtx.ns,
            globalThis.__shadowEnvs.get(this.#comCtx.ns),
          );
        }
        globalThis.__shadowEnvs.set(this.#comCtx.ns, this);
      }

      this.viewReady = Boolean(ctx);
    }
  }

  get envProxy(): IShadowObjectEnvProxy | undefined {
    return this.#shaObjEnvProxy;
  }

  set envProxy(proxy: IShadowObjectEnvProxy | null | undefined) {
    if (proxy !== this.#shaObjEnvProxy) {
      const prevProxy = this.#shaObjEnvProxy;
      this.#shaObjEnvProxy = proxy ?? undefined;

      if (this.#shaObjEnvProxy) {
        this.#shaObjEnvProxy.onMessageToView = this.#onMessageToView.bind(this);
      }

      if (prevProxy) {
        prevProxy.destroy();
      }

      this.proxyReady = false;

      proxy
        ?.start()
        .then(() => {
          this.proxyReady = true;
        })
        .catch((error) => {
          console.error('ShadowEnv: failed to start envProxy', error);
          this.proxyReady = false;
        });
    }
  }

  get isReady(): boolean {
    return Boolean(this.#comCtx && this.#shaObjEnvProxy && this.proxyReady);
  }

  readonly ready = (): Promise<ShadowEnv> => {
    return this.isReady ? Promise.resolve(this) : this.onceAsync(ShadowEnv.ContextCreated);
  };

  sync(): void {
    if (!this.isReady) {
      this.#syncAfterContextCreated = true;
      return;
    }
    if (this.#syncScheduled) return;
    this.#syncScheduled = true;
    queueMicrotask(this.#syncIfScheduled);
  }

  syncWait(): Promise<ChangeTrailType> {
    this.#syncWaitForConfirmation = true;
    this.sync();
    if (this.#afterNextSync) return this.#afterNextSync;
    this.#afterNextSync = this.onceAsync<ChangeTrailType>(ShadowEnv.AfterSync).then((changeTrail) => {
      this.#afterNextSync = undefined;
      return changeTrail;
    });
    return this.#afterNextSync;
  }

  destroy() {
    const ns = this.#comCtx?.ns;

    this.envProxy?.destroy();
    this.envProxy = undefined;
    this.view = undefined;

    if (ns) {
      if (globalThis.__shadowEnvs.has(ns)) {
        if (globalThis.__shadowEnvs.get(ns) === this) {
          globalThis.__shadowEnvs.delete(ns);
        }
      }
    }
  }

  #syncIfScheduled = () => {
    if (this.#syncScheduled) {
      this.#syncNow();
    }
  };

  async #syncNow() {
    this.#syncScheduled = false;
    if (this.isReady) {
      const data = this.view!.buildChangeTrails();
      if (data.length > 0) {
        try {
          const waitForConfirmation = this.#syncWaitForConfirmation;
          this.#syncWaitForConfirmation = false;
          await this.envProxy!.applyChangeTrail(data, waitForConfirmation);
        } catch (error) {
          console.error('ShadowEnv: failed to apply change trail', error);
        } finally {
          this.emit(ShadowEnv.AfterSync, data);
        }
      }
    }
  }

  #onMessageToView(event: Omit<MessageToViewEvent, 'transferables'>) {
    console.debug('ShadowEnv: onMessageToView', event.type, event.data);
    this.view?.dispatchMessage(event.uuid, event.type, event.data, event.traverseChildren);
  }
}
