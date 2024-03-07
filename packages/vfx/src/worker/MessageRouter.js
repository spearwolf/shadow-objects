import {Kernel} from '@spearwolf/shadow-ents/shadow-objects.js';
import {ChangeTrail, Closed, Destroy, Init, Ready} from '../constants.js';

export class MessageRouter {
  constructor(kernel = new Kernel()) {
    this.kernel = kernel;
  }

  /**
   * @param {MessageEvent} event
   */
  parseMessage(event) {
    console.debug('[MessageRouter] got message', event.data);

    switch (event.data.type) {
      case Init:
        console.debug('[MessageRouter] init', event.data);
        if ('importVfxSrc' in event.data) {
          this.#importVfxSrc(event.data.importVfxSrc).then(() => {
            self.postMessage({type: Ready});
          });
        } else {
          console.error('[MessageRouter] missing importVfxSrc property!');
        }
        break;

      case ChangeTrail:
        this.#parseChangeTrail(event.data);
        break;

      case Destroy:
        console.debug('[MessageRouter] destroy', event.data);
        // TODO cleanup ?
        self.postMessage({type: Closed});
        break;

      default:
        console.warn('[MessageRouter] unknown message type', event.data.type);
    }
  }

  #parseChangeTrail(data) {
    console.debug('[MessageRouter] parseChangeTrail', {data, kernel: this.kernel});
    this.kernel.run(data);
  }

  async #importVfxSrc(src) {
    const module = await import(/* @vite-ignore */ src);

    console.debug('[MessageRouter] imported', module);

    // TODO setup shadow-objects from module
  }
}
