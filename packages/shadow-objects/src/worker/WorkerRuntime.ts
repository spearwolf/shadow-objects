import {Destroy, Loaded} from '../constants.js';
import {CONSOLE_LOGGER, ConsoleLogger, setConsoleLoggerStorage} from '../utils/ConsoleLogger.js';
import {isReadableMessageData, MessageRouter} from './MessageRouter.js';

export class WorkerRuntime {
  router?: MessageRouter;

  #loggerInstance?: ConsoleLogger;

  /**
   * Built on first use rather than in a field initializer: a `ConsoleLogger` reads its own
   * `<namespace>.enable` key once, when it is built, and in a worker the config that key lives in
   * arrives as a message. A logger built ahead of that message keeps the default for its own switch
   * for the rest of the thread; the shared switches reach it either way.
   *
   * The window is narrow: the two guard branches of `onmessage` that discard a message it cannot
   * read or a message that arrived after the teardown reach for this logger ahead of the
   * `CONSOLE_LOGGER` branch below them. A `RemoteWorkerEnv` cannot trigger either guard before its
   * configuration arrives -- it sends that message first -- but a foreign host driving this entry
   * point on its own could send something unreadable ahead of it.
   */
  get logger(): ConsoleLogger {
    return (this.#loggerInstance ??= new ConsoleLogger('WorkerRuntime'));
  }

  #isStarted = false;

  #isDestroyed = false;

  /** Whether this runtime is listening on the global scope. */
  get isStarted(): boolean {
    return this.#isStarted;
  }

  /** Whether a destroy has ended this runtime. Final: neither a message nor a `start()` revives it. */
  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  onmessage = (event: MessageEvent): void => {
    const data = event.data;

    // read before a router exists, so the check belongs here as well: a payload this side
    // cannot read would end the worker before anything of it is even built
    if (!isReadableMessageData(data)) {
      if (this.logger.isDebug) {
        this.logger.debug('discarding a message it cannot read', data);
      }
      return;
    }

    // the router that answered the destroy is released below, so without this the next message
    // would build a fresh one -- an untorn kernel behind the barrier the destroy just raised
    if (this.#isDestroyed) {
      if (this.logger.isDebug) {
        this.logger.debug('discarding a message that arrived after the teardown', data.type);
      }
      return;
    }

    if (data.type === CONSOLE_LOGGER) {
      setConsoleLoggerStorage(data.config);
      if (this.logger.isDebug) {
        this.logger.debug('console-logger config installed', data.config);
      }
      return;
    }

    this.router ??= new MessageRouter();
    this.router.route(event);

    if (data.type === Destroy) {
      // whoever put the listener on takes it off again: the router has confirmed the teardown
      // by now, and both it and its kernel would stay reachable from `self` for the rest of
      // the thread's life
      this.#isDestroyed = true;
      this.stop();
      this.router = undefined;
    }
  };

  start(): void {
    // a destroy is the end of this runtime: starting again would announce a second handshake for
    // an environment whose entities are gone
    if (this.#isDestroyed) return;

    // `addEventListener` de-dupes the listener, the announcement is not de-duped: a second
    // start would tell the view of a handshake it has already completed
    if (this.#isStarted) return;
    this.#isStarted = true;

    self.addEventListener('message', this.onmessage);
    self.postMessage({type: Loaded}); // inform the main thread that we are ready
  }

  /** Stops listening on the global scope. A later `start()` picks the work up again, unless a destroy has ended this runtime. */
  stop(): void {
    if (!this.#isStarted) return;
    this.#isStarted = false;

    self.removeEventListener('message', this.onmessage);
  }
}
