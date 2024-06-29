import {Priority, eventize, type EventizeApi} from '@spearwolf/eventize';
import {createEffect, type SignalReader} from '@spearwolf/signalize';
import {signal, signalReader} from '@spearwolf/signalize/decorators';
import {type MessageToViewEvent} from '../core.js';
import {ComponentContext} from './ComponentContext.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

export interface ShadowEnv extends EventizeApi {}

export class ShadowEnv {
  static AfterSync = 'afterSync';
  static ContextLost = 'contextLost';
  static ContextCreated = 'contextCreated';

  #comCtx?: ComponentContext;
  #shaObjEnvProxy?: IShadowObjectEnvProxy;
  #syncScheduled = false;
  #syncAfterContextCreated = false;
  #whenReady!: Promise<ShadowEnv>;

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
      if (this.proxyReady) {
        this.#whenReady = Promise.resolve(this);
      } else {
        this.#whenReady = this.onceAsync<ShadowEnv>(ShadowEnv.ContextCreated);
      }
    }, [this.proxyReady$]);

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
      this.#comCtx = ctx ?? undefined;
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

  readonly ready = async (): Promise<ShadowEnv> => {
    return this.#whenReady;
  };

  sync(): Promise<ShadowEnv> {
    if (!this.isReady) {
      this.#syncAfterContextCreated = true;
      return this.#whenReady;
    }
    const onSync = this.onceAsync<ShadowEnv>(ShadowEnv.AfterSync);
    if (this.#syncScheduled) return onSync;
    this.#syncScheduled = true;
    queueMicrotask(() => {
      this.#syncNow();
    });
    return onSync;
  }

  async #syncNow() {
    this.#syncScheduled = false;
    if (this.isReady) {
      const data = this.view!.buildChangeTrails();
      if (data.length > 0) {
        try {
          await this.envProxy!.applyChangeTrail(data);
        } catch (error) {
          console.error('ShadowEnv: failed to apply change trail', error);
        } finally {
          this.emit(ShadowEnv.AfterSync, this);
        }
      }
    }
  }

  #onMessageToView(event: Omit<MessageToViewEvent, 'transferables'>) {
    console.log('ShadowEnv: onMessageToView', event.type, event.data);
    this.view?.dispatchMessage(event.uuid, event.type, event.data);
  }

  // TODO ShadowEnv#destroy()
}
