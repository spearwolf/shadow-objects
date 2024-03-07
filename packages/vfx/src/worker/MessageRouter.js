import {Kernel} from '@spearwolf/shadow-ents/shadow-objects.js';
import {Closed, Destroy, Init} from '../constants.js';

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
          this.#importVfxSrc(event.data.importVfxSrc);
        }
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

  /**
   * @param {string} src
   */
  #importVfxSrc(src) {
    import(/* @vite-ignore */ src).then((module) => {
      console.debug('[MessageRouter] imported', module);
    });
  }
}
