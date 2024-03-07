import {Closed, Destroy, Init} from '../constants.js';

export class MessageRouter {
  /**
   * @param {MessageEvent} event
   */
  parseMessage(event) {
    console.log('[MessageRouter] worker got message', event.data);

    switch (event.data.type) {
      case Init:
        if ('importVfxSrc' in event.data) {
          this.#importVfxSrc(event.data.importVfxSrc);
        }
        break;

      case Destroy:
        console.log('[MessageRouter] destroy', event.data);
        // TODO cleanup
        postMessage({type: Closed});
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
      console.log('[MessageRouter] imported', module);
    });
  }
}
