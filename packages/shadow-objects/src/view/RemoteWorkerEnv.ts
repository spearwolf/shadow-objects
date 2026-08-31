import {emitStrict, once, retain} from '@spearwolf/eventize';
import {ChangeTrailRefusedError} from '../ChangeTrailRefusedError.js';
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
import type {AppliedChangeTrailEvent, ChangeTrailType, ImportedModuleEvent, SyncEvent, TransferablesType} from '../types.js';
import {CONSOLE_LOGGER, ConsoleLogger, consoleLoggerConfigKey, loadConsoleLoggerConfig} from '../utils/ConsoleLogger.js';
import {toUrlString} from '../utils/toUrlString.js';
import {isTimeout, MaxWorkerTimeout, waitForMessageOfType} from '../utils/waitForMessageOfType.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

/**
 * Splits the transferables out of a change trail without writing to it. The trail handed in is a
 * snapshot that travels on after this call -- to the `ShadowEnv.AfterSync` consumers when the
 * environment applies it, to the `ShadowEnv.SyncFailed` consumers when it refuses it -- so an
 * entry carrying transferables is replaced by a shallow copy without them and every other
 * entry is passed through as it is. A trail that carries none is handed back object for
 * object.
 */
const splitTransferables = (
  changeTrail: ChangeTrailType,
): {changeTrail: ChangeTrailType; transferables?: TransferablesType | undefined} => {
  if (!Array.isArray(changeTrail)) return {changeTrail};

  let outbound: ChangeTrailType | undefined;
  let transferables: TransferablesType | undefined;

  for (let i = 0; i < changeTrail.length; i++) {
    const changeItem = changeTrail[i];
    if (changeItem?.transferables) {
      transferables = transferables ? [...transferables, ...changeItem.transferables] : [...changeItem.transferables];

      outbound ??= [...changeTrail];
      const withoutTransferables = {...changeItem};
      delete withoutTransferables.transferables;
      outbound[i] = withoutTransferables;
    }
  }

  return {changeTrail: outbound ?? changeTrail, transferables};
};

/**
 * What actually goes on the wire for a `ChangeTrail` message. `SyncEvent` describes the shape a
 * change trail carries once it is inside the worker, without the `type` discriminant that gets
 * it there — its two neighbors on the wire (`ImportedModuleEvent`, `AppliedChangeTrailEvent`)
 * both require that field, so adding it to `SyncEvent` itself would either make it mandatory
 * where `LocalShadowObjectEnv` never sets it, or optional on a public type whose neighbors need
 * it required. Kept local instead: it says exactly what this message is without touching the
 * exported type surface.
 */
interface ChangeTrailMessage extends SyncEvent {
  type: typeof ChangeTrail;
}

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

/**
 * The reason a request is rejected with when the worker reported a failure of its own -- a
 * module that would not import, a change trail its Kernel refused. An error does not survive
 * structured cloning as the object it is, so the two fields that do are rebuilt here, and
 * `name` is the name the error called itself inside the worker: a caller reads it the same
 * way it reads the name of an error a `LocalShadowObjectEnv` hands it. A name that is missing
 * or empty names no class, and `Error` is what such a reason is called -- the same name a
 * plain `new Error(message)` carries on the local side.
 *
 * What does not come across is the class and everything it added. `instanceof EntityUuidInUseError`
 * is `false` here and there is no `uuid` field, whatever `name` says; `instanceof WorkerReportedError`
 * is what tells such a reason apart from one raised on this side.
 */
export class WorkerReportedError extends Error {
  constructor(name: string | undefined, message: string) {
    super(message);
    this.name = name || 'Error';
  }
}

/**
 * How long a {@link RemoteWorkerEnv} waits for each of the four replies a worker owes it,
 * in milliseconds.
 */
export interface WorkerTimeouts {
  /** the `Loaded` handshake at the start */
  loadTimeout: number;
  /** the `ImportedModule` reply to an `importScript()` */
  configureTimeout: number;
  /** the `AppliedChangeTrail` confirmation of a change trail sent with `waitForConfirmation` */
  changeTrailTimeout: number;
  /** the `Destroyed` acknowledgement of a teardown */
  destroyTimeout: number;
}

/**
 * What {@link RemoteWorkerEnv} takes. Every value left out keeps its default — the four
 * `Worker*Timeout` constants. A value that is not a number of milliseconds from 1 to
 * 2147483647 — close to 25 days, the longest delay a timer keeps — is reported through the
 * logger and the default applies.
 */
export type RemoteWorkerEnvOptions = Partial<WorkerTimeouts>;

const DefaultWorkerTimeouts: WorkerTimeouts = {
  loadTimeout: WorkerLoadTimeout,
  configureTimeout: WorkerConfigureTimeout,
  changeTrailTimeout: WorkerChangeTrailTimeout,
  destroyTimeout: WorkerDestroyTimeout,
};

/**
 * Resolves the options against the defaults. A timeout is a number of milliseconds from 1 to
 * {@link MaxWorkerTimeout}; anything else is refused and reported, and the default stays.
 *
 * Zero and Infinity are refused along with the rest, and that is the point of the rule rather
 * than an oversight: `waitForMessageOfType()` arms no timer for either of them, so a teardown
 * given one of the two would wait for an acknowledgement a dead worker never sends — and the
 * `terminate()` that ends the teardown hangs on that very chain. One rule for all four values
 * is easier to hold on to than three that allow it and one that does not, and {@link MaxWorkerTimeout}
 * — close to 25 days — is as long as a wait can honestly be made.
 */
const resolveTimeouts = (options: RemoteWorkerEnvOptions | undefined, logger: ConsoleLogger): WorkerTimeouts => {
  const resolved: WorkerTimeouts = {...DefaultWorkerTimeouts};
  if (options == null) return resolved;

  for (const key of Object.keys(DefaultWorkerTimeouts) as (keyof WorkerTimeouts)[]) {
    // own keys only: what an object inherits from its prototype is not what its author wrote down
    if (!Object.hasOwn(options, key)) continue;

    const value = options[key];
    if (value === undefined) continue;

    if (isTimeout(value)) {
      resolved[key] = value;
    } else {
      logger.error(`ignoring the ${key} option: expected a number of milliseconds from 1 to ${MaxWorkerTimeout}, got`, value);
    }
  }

  return resolved;
};

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

  #worker?: Worker | undefined;
  #isDestroyed = false;
  #changeTrailSerial = 0;

  /**
   * Aborted exactly once, with the error that ends this environment: a {@link WorkerFailedError}
   * when the worker broke down, a {@link WorkerDestroyedError} when it was torn down. Whichever
   * comes first keeps the signal, so a teardown never buries the failure that provoked it.
   * It settles every request already waiting for a reply and turns away every later one.
   */
  readonly #workerFailure = new AbortController();

  readonly #logger = new ConsoleLogger('RemoteWorkerEnv');

  /** The logger this environment reports through. */
  get logger(): ConsoleLogger {
    return this.#logger;
  }

  readonly #timeouts: Readonly<WorkerTimeouts>;

  /**
   * The four timeouts this environment holds itself to, resolved once when it is built. The
   * object is frozen and the slot holds no setter, so the constructor is the one way in --
   * and `resolveTimeouts()` vets every value that goes through it.
   */
  get timeouts(): Readonly<WorkerTimeouts> {
    return this.#timeouts;
  }

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

  constructor(options?: RemoteWorkerEnvOptions) {
    // the logger is a field initializer and is therefore already in place
    this.#timeouts = Object.freeze(resolveTimeouts(options, this.logger));

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
      this.logger.warn('already started');

      return this.workerLoaded.then((): void => {
        if (this.isDestroyed) {
          throw new WorkerDestroyedError();
        }
      });
    }

    const worker = (this.#worker = createWorker());

    // registered before the load handshake begins: a worker that dies while it is
    // still coming up must not leave the caller waiting for the load timeout
    worker.addEventListener('error', this.onWorkerError);
    worker.addEventListener('messageerror', this.onWorkerMessageError);

    this.configureConsoleLogger(worker);

    try {
      await waitForMessageOfType(worker, Loaded, this.timeouts.loadTimeout, undefined, signal);

      // the handshake completed but the environment ended while its reply was on the way here.
      // The reason of that ending is what the caller gets — a fresh error of our own would read
      // as a start that went wrong, and the catch below would report it as one
      if (this.isDestroyed) {
        throw signal.aborted ? signal.reason : new WorkerDestroyedError();
      }

      worker.addEventListener('message', this.onMessageFromWorker);

      queueMicrotask(() => {
        this.announceLoaded();
      });
    } catch (error) {
      // the failure path reports with the worker event in hand; anything else is on us
      if (error !== signal.reason) {
        this.logger.error('failed to start', error);
      }

      this.stopListeningTo(worker);
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

    const {changeTrail: outbound, transferables} = splitTransferables(changeTrail);
    const message: ChangeTrailMessage = {type: ChangeTrail, changeTrail: outbound};

    if (!waitForConfirmation) {
      worker.postMessage(message, transferables ?? []);
      return Promise.resolve();
    }

    // the counter moves only where a number actually goes on the wire: it is the sole link
    // between a request and its confirmation, and a sequence with invisible jumps in it tells
    // a later diagnosis nothing
    const serial = ++this.#changeTrailSerial;
    message.serial = serial;

    worker.postMessage(message, transferables ?? []);

    return waitForMessageOfType(
      worker,
      AppliedChangeTrail,
      this.timeouts.changeTrailTimeout,
      (data: AppliedChangeTrailEvent) => {
        // the serial decides who a confirmation concerns -- an error belonging to another
        // trail would otherwise reject the request that happens to be waiting here
        if (data.serial !== serial) return false;
        if (data.error) {
          const reason = new WorkerReportedError(data.errorName, data.error);
          // Only a confirmation that names the count can move the line the view draws between
          // applied and pending; one that does not carries no more than the reason itself, and
          // is handed on as that reason.
          if (typeof data.appliedCount === 'number') {
            throw new ChangeTrailRefusedError(data.appliedCount, changeTrail.length, {cause: reason});
          }
          throw reason;
        }
        return true;
      },
      signal,
    );
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
      this.timeouts.configureTimeout,
      (data: ImportedModuleEvent) => {
        if (data.url !== url) return false;
        if (data.error) throw new WorkerReportedError(data.errorName, data.error);
        return true;
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
    // would otherwise sit out its load timeout, and workerLoaded would never hear anything again
    this.#workerFailure.abort(new WorkerDestroyedError());

    if (worker == null) return;

    this.stopListeningTo(worker);

    worker.postMessage({type: Destroy});

    waitForMessageOfType(worker, Destroyed, this.timeouts.destroyTimeout)
      .catch((error) => {
        // `.finally()` passes a rejection on, so without this the silence of a worker ends as an
        // unhandled rejection once the destroy timeout is up. It is terminated either way, and
        // by then there is nobody left to hand the error to
        this.logger.warn('the worker did not acknowledge the teardown', error);
      })
      .finally(() => {
        worker.terminate();
      });
  }

  private readonly onWorkerError = (event: ErrorEvent): void => {
    this.handleWorkerFailure('error', event, event.message || 'the worker reported an error');
  };

  private readonly onWorkerMessageError = (event: MessageEvent): void => {
    this.handleWorkerFailure('messageerror', event, 'the worker sent a message that could not be deserialized');
  };

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

    if (worker != null) this.stopListeningTo(worker);

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

    this.announceFailure({env: this, type, message, reason, event});
  }

  /**
   * Announces the completed handshake to the consumers.
   *
   * `emitStrict()` rather than `emit()`, and the retain policy is what decides it. `workerLoaded`
   * reads the retained value, and eventize writes that value only once the dispatch has run
   * through: under the plain dispatch a single listener that throws would take the replay for
   * every later subscriber with it, and every later read of `workerLoaded` would wait for a
   * failure or a teardown instead of resolving. The guarded dispatch serves every listener and
   * writes the retained value, because the event was delivered.
   *
   * What the listeners threw arrives here afterwards -- one of them unchanged, several as an
   * `AggregateError` in dispatch order -- and is reported. It goes no further: this runs from a
   * microtask, where a throw has no caller left to reach and would surface as an unhandled error.
   */
  private announceLoaded(): void {
    try {
      emitStrict(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerLoaded, this);
    } catch (error) {
      this.logger.error('a workerLoaded listener threw', error);
    }
  }

  /**
   * Announces the failure to the consumers. The same guarded dispatch as
   * {@link RemoteWorkerEnv.announceLoaded}, for the same reason: `WorkerFailed` is documented as
   * retained, and a consumer that subscribes only after the failure has to be able to hear about
   * it. Every listener is served, the retained value is written, and whatever was thrown is
   * reported here and reaches no caller.
   */
  private announceFailure(payload: WorkerFailedEvent): void {
    try {
      emitStrict(this as RemoteWorkerEnv, RemoteWorkerEnv.WorkerFailed, payload);
    } catch (error) {
      this.logger.error('a workerFailed listener threw', error);
    }
  }

  private readonly onMessageFromWorker = (event: MessageEvent): void => {
    if (event.data?.type === MessageToView) {
      (this as IShadowObjectEnvProxy).onMessageToView?.(event.data.data);
    } else {
      this.logger.debug('message from worker', event);
    }
  };

  /**
   * Takes every listener of this environment off a worker. Whoever registered them takes them
   * off again -- between the teardown and the `terminate()` that ends it the worker stays
   * alive, and through its listeners it keeps this environment and everything it references
   * reachable for exactly that long.
   */
  private stopListeningTo(worker: Worker): void {
    worker.removeEventListener('error', this.onWorkerError);
    worker.removeEventListener('messageerror', this.onWorkerMessageError);
    worker.removeEventListener('message', this.onMessageFromWorker);
  }

  private configureConsoleLogger(worker: Worker) {
    const configKey = ['RemoteWorkerEnv', 'workerConfig'];
    const storageKey = consoleLoggerConfigKey(configKey);
    const workerConfig = this.readWorkerConfig(configKey, storageKey);

    this.logger.info('load console-logger worker config', {storageKey, workerConfig});

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

  /**
   * The console-logger config for the worker, read from the storage key this environment
   * announces. The key is a diagnostic switch, set by hand and sharing its namespace with
   * everything else on this origin, so its content decides nothing about whether the worker
   * comes up: anything that is not a plain JSON object counts as no config at all, exactly
   * like an absent key.
   */
  private readWorkerConfig(configKey: string[], storageKey: string): Record<string, unknown> {
    const stored = loadConsoleLoggerConfig(configKey, '{}');

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      // error, not warn: whoever writes this key wants the worker to talk, and a silent
      // fallback would send them looking for the reason inside the worker
      this.logger.error(`ignoring the unreadable console-logger worker config at "${storageKey}"`, stored, error);
      return {};
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      this.logger.error(`ignoring the console-logger worker config at "${storageKey}": expected a JSON object`, stored);
      return {};
    }

    return parsed as Record<string, unknown>;
  }
}
