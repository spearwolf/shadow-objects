import {Loaded} from '../constants.js';
import {MessageRouter} from './MessageRouter.js';

export class WorkerRuntime {
  router = new MessageRouter();

  onmessage = (event: MessageEvent): void => {
    this.router.route(event);
  };

  start() {
    self.addEventListener('message', this.onmessage);
    self.postMessage({type: Loaded}); // inform the main thread that we are ready
  }
}
