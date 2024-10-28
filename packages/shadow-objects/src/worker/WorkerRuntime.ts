import {Loaded} from '../constants.js';
import {CONSOLE_LOGGER, CONSOLE_LOGGER_STORAGE} from '../utils/ConsoleLogger.js';
import {MessageRouter} from './MessageRouter.js';

export class WorkerRuntime {
  router?: MessageRouter;

  onmessage = (event: MessageEvent): void => {
    if (event.data.type === CONSOLE_LOGGER) {
      // @ts-ignore
      globalThis[CONSOLE_LOGGER_STORAGE] = event.data.config;
    } else {
      this.router ??= new MessageRouter();
      this.router.route(event);
    }
  };

  start() {
    self.addEventListener('message', this.onmessage);
    self.postMessage({type: Loaded}); // inform the main thread that we are ready
  }
}
