import {eventize, type EventizeApi} from '@spearwolf/eventize';
import type {ComponentContext} from './ComponentContext.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

export interface ShadowEnv extends EventizeApi {}

export class ShadowEnv {
  static AfterSync = 'afterSync';
  static ContextLost = 'contextLost';
  static ContextCreated = 'contextCreated';

  #comCtx?: ComponentContext;
  #shaObjEnvProxy?: IShadowObjectEnvProxy;
  #syncScheduled = false;

  constructor() {
    eventize(this);
  }

  get view(): ComponentContext | undefined {
    return this.#comCtx;
  }

  set view(ctx: ComponentContext | null | undefined) {
    if (ctx !== this.#comCtx) {
      this.#comCtx = ctx ?? undefined;
      if (ctx) {
        ctx.reCreateChanges();
      }
    }
  }

  get envProxy(): IShadowObjectEnvProxy | undefined {
    return this.#shaObjEnvProxy;
  }

  set envProxy(proxy: IShadowObjectEnvProxy | null | undefined) {
    if (proxy !== this.#shaObjEnvProxy) {
      const prevProxy = this.#shaObjEnvProxy;
      this.#shaObjEnvProxy = proxy ?? undefined;

      if (prevProxy) {
        prevProxy.destroy();
        this.emit(ShadowEnv.ContextLost, this, prevProxy);
      }

      if (proxy) {
        // we don't need to explicitly call create() on the proxy - this is done by the proxy constructor
        this.view?.reCreateChanges();
        this.emit(ShadowEnv.ContextCreated, this);
      }
    }
  }

  get isReady(): boolean {
    return Boolean(this.#comCtx && this.#shaObjEnvProxy);
  }

  sync(): Promise<void> {
    // TODO return Promise<void> vs Promise<ShadowEnv> ?
    const onSync = this.onceAsync(ShadowEnv.AfterSync);
    if (this.#syncScheduled) return onSync;
    this.#syncScheduled = true;
    queueMicrotask(async () => {
      this.#syncScheduled = false;
      if (this.isReady) {
        const data = this.view!.buildChangeTrails();
        if (data.length > 0) {
          await this.envProxy!.applyChangeTrail(data);
          this.emit(ShadowEnv.AfterSync, this);
        }
      }
    });
    return onSync;
  }
}
