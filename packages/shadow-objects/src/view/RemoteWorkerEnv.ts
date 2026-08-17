import {emit, once, retain} from '@spearwolf/eventize';
import {
  AppliedChangeTrail,
  ChangeTrail,
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  Loaded,
  MessageToView,
  WorkerChangeTrailTimeout,
  WorkerConfigureTimeout,
  WorkerDestroyTimeout,
  WorkerLoadTimeout,
} from '../constants.js';
import createWorker from '../create-worker.js';
import type {AppliedChangeTrailEvent, ChangeTrailType, ImportedModuleEvent, TransferablesType} from '../types.js';
import {CONSOLE_LOGGER, ConsoleLogger, consoleLoggerConfigKey, loadConsoleLoggerConfig} from '../utils/ConsoleLogger.js';
import {toUrlString} from '../utils/toUrlString.js';
import {waitForMessageOfType} from '../utils/waitForMessageOfType.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

const removeTransferables = (changeTrail: ChangeTrailType): TransferablesType | undefined => {
  let transferables: TransferablesType | undefined;

  if (changeTrail != null && Array.isArray(changeTrail)) {
    for (const changeItem of changeTrail) {
      if (changeItem.transferables) {
        if (!transferables) {
          transferables = changeItem.transferables;
        } else {
          transferables = [...transferables, ...changeItem.transferables];
        }
        delete changeItem.transferables;
      }
    }
  }

  return transferables;
};

/**
 * The reason every pending and every later worker request is rejected with
 * once the worker has failed.
 */
export class WorkerFailedError extends Error {
  /** `'error'` when the worker itself threw, `'messageerror'` when it sent something that could not be deserialized. */
  readonly type: 'error' | 'messageerror';

  constructor(type: 'error' | 'messageerror', message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WorkerFailedError';
    this.type = type;
  }
}

/**
 * The reason a request is rejected with once the environment has been torn down
 * with {@link RemoteWorkerEnv.destroy}. The worker is gone; no reply can arrive.
 */
export class WorkerDestroyedError extends Error {
  constructor(message = 'the worker environment has been destroyed') {
    super(message);
    this.name = 'WorkerDestroyedError';
  }
}

/** What {@link RemoteWorkerEnv.WorkerFailed} carries. */
export interface WorkerFailedEvent {
  /** the environment whose worker failed */
  env: RemoteWorkerEnv;
  /** what the worker reported */
  type: 'error' | 'messageerror';
  /** a readable description of the failure */
  message: string;
  /** the error every pending and every later request is rejected with */
  reason: WorkerFailedError;
  /** the worker event the failure was read from */
  event: ErrorEvent | MessageEvent;
}

export class RemoteWorkerEnv implements IShadowObjectEnvProxy {
  static WorkerLoaded = 'workerLoaded';
  static WorkerFailed = 'workerFailed';

  #worker?: Worker;
  #isDestroyed = false;
  #changeTrailSerial = 0;

  /**
   * Aborted exactly once, with the error that ends this environment: a {@link WorkerFailedError}
   * when the worker broke down, a {@link WorkerDestroyedError} when it was torn down. Whichever
   * comes first keeps the signal, so a teardown never buries the failure that provoked it.
   * It settles every request already waiting for a reply and turns away every later one.
   */
  readonly #workerFailure = new AbortController();

  readonly logger = new ConsoleLogger('RemoteWorkerEnv');

  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  /**
   * Resolves once the worker is up.
   *
   * Every read hands out a promise that can reject, so a caller that only wants to
   * kick the environment off and never awaits the result should still attach a
   * `catch()` — otherwise a worker failure surfaces as an unhandled rejection.
   *
   * @throws {WorkerFailedError} if the worker fails before or after that happens
   * @throws {WorkerDestroyedError} once the environment has been torn down — including every
   *   read after a load that had already succeeded, because there is no environment left to hand out
   */
  get workerLoaded(): Promise<RemoteWorkerEnv> {
    const {signal} = this.#workerFailure;
    if (signal.aborted) return Promise.reject(signal.reason);

    return new Promise<RemoteWorkerEnv>((resolve, reject) => {
      let unsubscribeLoaded: (() => void) | undefined;
      let settled = false;

      const onFailure = () => {
        if (settled) return;
        settled = true;
        unsubscribeLoaded?.();
        reject(signal.reason);
      };

      unsubscribeLoaded = once(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerLoaded, (env: RemoteWorkerEnv) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onFailure);
        resolve(env);
      });

      // a retained WorkerLoaded is replayed inside once(), before it returns —
      // then there is nothing left to wait for and no abort listener to attach
      if (settled) return;

      signal.addEventListener('abort', onFailure, {once: true});
    });
  }

  constructor() {
    retain(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerLoaded);
    // a consumer that subscribes only after the failure still gets to hear about it
    retain(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed);
  }

  async start(): Promise<void> {
    // both endings of this environment abort the signal, and it keeps the reason of whichever
    // came first. A finished environment must not spawn a worker: nothing would ever reach it,
    // and nothing would ever shut it down again
    const {signal} = this.#workerFailure;
    if (signal.aborted) throw signal.reason;

    if (this.#worker) {
      if (this.logger.isWarn) {
        this.logger.warn('already started');
      }

      return this.workerLoaded.then((): void => {
        if (this.isDestroyed) {
          throw new WorkerDestroyedError();
        }
      });
    }

    const worker = (this.#worker = createWorker());

    // registered before the load handshake begins: a worker that dies while it is
    // still coming up must not leave the caller waiting for the load timeout
    worker.addEventListener('error', this.onWorkerError.bind(this));
    worker.addEventListener('messageerror', this.onWorkerMessageError.bind(this));

    this.configureConsoleLogger(worker);

    try {
      await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout, undefined, signal);

      // the handshake completed but the environment ended while its reply was on the way here.
      // The reason of that ending is what the caller gets — a fresh error of our own would read
      // as a start that went wrong, and the catch below would report it as one
      if (this.isDestroyed) {
        throw signal.aborted ? signal.reason : new WorkerDestroyedError();
      }

      worker.addEventListener('message', this.onMessageFromWorker.bind(this));

      queueMicrotask(() => {
        emit(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerLoaded, this);
      });
    } catch (error) {
      // the failure path reports with the worker event in hand; anything else is on us
      if (error !== signal.reason) {
        this.logger.error('failed to start', error);
      }

      this.#worker = undefined;

      // only a start that nobody else is unwinding owns this worker: the reference is gone,
      // nobody can reach it any more, and leaving it running would keep a thread open for an
      // environment that never started. A failure has already terminated it, and a teardown
      // in flight is waiting for its Destroyed reply — cutting that short here would leave
      // destroy() to sit out its timeout and skip the worker-side teardown entirely.
      if (!this.#isDestroyed) {
        worker.terminate();
      }

      throw error;
    }
  }

  applyChangeTrail(changeTrail: ChangeTrailType, waitForConfirmation: boolean): Promise<void> {
    const {signal} = this.#workerFailure;
    if (signal.aborted) return Promise.reject(signal.reason);

    const worker = this.#worker;
    if (worker == null) return Promise.reject(new WorkerDestroyedError());

    const transferables = removeTransferables(changeTrail);
    const message = {type: ChangeTrail, changeTrail} as any;

    const serial = ++this.#changeTrailSerial;
    if (waitForConfirmation) {
      message.serial = serial;
    }

    worker.postMessage(message, transferables ?? []);

    if (waitForConfirmation) {
      return waitForMessageOfType(
        worker,
        AppliedChangeTrail,
        WorkerChangeTrailTimeout,
        (data: AppliedChangeTrailEvent) => {
          if (data.error) throw data.error;
          return data.serial === serial;
        },
        signal,
      );
    } else {
      return Promise.resolve();
    }
  }

  importScript(url: URL | string): Promise<void> {
    const {signal} = this.#workerFailure;
    if (signal.aborted) return Promise.reject(signal.reason);

    const worker = this.#worker;
    if (worker == null) return Promise.reject(new WorkerDestroyedError());

    url = toUrlString(url);
    worker.postMessage({type: Configure, importModule: url});
    return waitForMessageOfType(
      worker,
      ImportedModule,
      WorkerConfigureTimeout,
      (data: ImportedModuleEvent) => {
        if (data.error) throw data.error;
        return data.url === url;
      },
      signal,
    );
  }

  destroy(): void {
    // the teardown counts even when there is no worker to tear down: everything that comes
    // afterwards has to meet an environment that is gone
    this.#isDestroyed = true;

    // releasing the reference here is what makes the teardown idempotent: a repeated call finds
    // nothing left, sends no second Destroy and terminates nothing twice
    const worker = this.#worker;
    this.#worker = undefined;

    // settles everything still waiting for a reply: a start() in the middle of its load handshake
    // would otherwise sit out WorkerLoadTimeout, and workerLoaded would never hear anything again
    this.#workerFailure.abort(new WorkerDestroyedError());

    if (worker == null) return;

    worker.postMessage({type: Destroy});

    waitForMessageOfType(worker, Destroyed, WorkerDestroyTimeout).finally(() => {
      worker.terminate();
    });
  }

  private onWorkerError(event: ErrorEvent) {
    this.handleWorkerFailure('error', event, event.message || 'the worker reported an error');
  }

  private onWorkerMessageError(event: MessageEvent) {
    this.handleWorkerFailure('messageerror', event, 'the worker sent a message that could not be deserialized');
  }

  private handleWorkerFailure(type: 'error' | 'messageerror', event: ErrorEvent | MessageEvent, message: string): void {
    // a deliberate teardown, or a failure that was already reported: the first one wins
    if (this.#isDestroyed) return;

    this.#isDestroyed = true;

    const reason = new WorkerFailedError(type, message, {
      cause: type === 'error' ? ((event as ErrorEvent).error ?? event) : event,
    });

    this.logger.error(message, event);

    const worker = this.#worker;
    this.#worker = undefined;

    // settle everyone waiting for a reply before the worker goes away — it can no longer arrive
    this.#workerFailure.abort(reason);

    worker?.terminate();

    // the ShadowEnv is told first, so that the state it derives from this is already
    // settled when consumers hear about it. Whatever happens down that path stays
    // there — the public event is announced either way
    try {
      (this as IShadowObjectEnvProxy).onProxyFailed?.(reason);
    } catch (error) {
      this.logger.error('the proxy-failed callback threw', error);
    }

    emit(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed, {
      env: this,
      type,
      message,
      reason,
      event,
    } as WorkerFailedEvent);
  }

  private onMessageFromWorker(event: MessageEvent) {
    if (event.data?.type === MessageToView) {
      (this as IShadowObjectEnvProxy).onMessageToView?.(event.data.data);
    } else if (this.logger.isDebug) {
      this.logger.debug('message from worker', event);
    }
  }

  private configureConsoleLogger(worker: Worker) {
    const configKey = ['RemoteWorkerEnv', 'workerConfig'];
    const workerConfig = JSON.parse(loadConsoleLoggerConfig(configKey, '{}'));

    if (this.logger.isInfo) {
      this.logger.info('load console-logger worker config', {storageKey: consoleLoggerConfigKey(configKey), workerConfig});
    }

    worker.postMessage({
      type: CONSOLE_LOGGER,
      config: {
        ...ConsoleLogger.sharedConfig,
        enable: this.logger.isEnabled,
        ...workerConfig,
        ...(ConsoleLogger.isEnabled ? {} : {enable: false}),
      },
    });
  }
}