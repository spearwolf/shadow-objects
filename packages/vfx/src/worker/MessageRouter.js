import {Kernel, shadowObjects} from '@spearwolf/shadow-ents/shadow-objects.js';
import {ChangeTrail, Closed, Destroy, Init, Ready} from '../shared/constants.js';

export class MessageRouter {
  constructor(options) {
    this.kernel = options?.kernel ?? new Kernel();
    this.postMessage = options?.postMessage ?? self.postMessage.bind(self);
  }

  /**
   * @param {MessageEvent} event
   */
  parseMessage(event) {
    console.debug('[MessageRouter] got message', event.data);

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
        console.warn('[MessageRouter] unknown message type', event.data.type);
    }
  }

  #onChangeTrail(data) {
    console.debug('[MessageRouter] parseChangeTrail', {data, kernel: this.kernel});
    this.kernel.run(data);
  }

  #onInit(data) {
    console.debug('[MessageRouter] on init', data);

    if ('importVfxSrc' in data) {
      this.#importVfxSrc(data.importVfxSrc);
    } else {
      console.error('[MessageRouter] missing importVfxSrc property!');
    }
  }

  #onDestroy(data) {
    console.debug('[MessageRouter] on destroy', data);
    // TODO cleanup ?
    this.postMessage({type: Closed});
  }

  async #importVfxSrc(src) {
    const vfxMod = await import(/* @vite-ignore */ src);

    console.debug('[MessageRouter] imported', vfxMod);

    if (typeof vfxMod.onload === 'function') {
      // TODO remember constructors for later cleanup (src changed, maybe hotswap?)
      vfxMod.onload({
        shadowObjects: {define: (token, constructor) => shadowObjects.define(token, constructor, this.kernel.registry)},
        kernel: this.kernel,
        registry: this.kernel.registry,
      });
    }

    this.postMessage({type: Ready});
  }
}
