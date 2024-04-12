import {ChangeTrail, Closed, Destroy, Init, Ready} from '../constants.js';
import {Kernel} from '../entities/Kernel.js';
import {shadowObjects} from '../entities/ShadowObject.js';
import type {ShadowObjectConstructor, SyncEvent} from '../types.js';

interface InitPayloadData {
  importSrc?: string;
}

export interface MessageRouterOptions {
  kernel?: Kernel;
  postMessage?: typeof self.postMessage;
}

export class MessageRouter {
  kernel: Kernel;
  postMessage: typeof self.postMessage;

  constructor(options?: MessageRouterOptions) {
    this.kernel = options?.kernel ?? new Kernel();
    this.postMessage = options?.postMessage ?? self.postMessage.bind(self);

    // TODO subscribe to kernel "message" events
  }

  route(event: MessageEvent) {
    switch (event.data.type) {
      case Init:
        this.#onInit(event.data);
        break;

      case ChangeTrail:
        this.#onChangeTrail(event.data);
        break;

      case Destroy:
        this.#onDestroy(event.data);
        break;

      default:
        console.warn('[MessageRouter] unknown message', event.data.type ?? event.data);
    }
  }

  #onChangeTrail(data: SyncEvent) {
    // console.debug('[MessageRouter] parseChangeTrail', {data, kernel: this.kernel});
    this.kernel.run(data);
  }

  #onInit(data: InitPayloadData) {
    // console.debug('[MessageRouter] on init', data);

    if ('importSrc' in data) {
      this.#loadScript(data.importSrc);
    } else {
      console.error('[MessageRouter] missing importSrc property!');
    }
  }

  #onDestroy(data: any) {
    console.debug('[MessageRouter] on destroy', data);
    // XXX do we need cleanup here ?
    this.postMessage({type: Closed});
  }

  async #loadScript(src: string) {
    const mod = await import(/* @vite-ignore */ src);

    // console.debug('[MessageRouter] imported', vfxMod);

    if (typeof mod.onload === 'function') {
      mod.onload({
        shadowObjects: {
          define: (token: string, constructor: ShadowObjectConstructor) =>
            shadowObjects.define(token, constructor, this.kernel.registry),
        },
        kernel: this.kernel,
        registry: this.kernel.registry,
      });
      // TODO remember constructors from define() for later cleanup (src changed, maybe we should support hotswap here?)
    }

    this.postMessage({type: Ready});
  }
}
