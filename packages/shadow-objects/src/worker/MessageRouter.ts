import {off, on} from '@spearwolf/eventize';
import {ChangeTrailRefusedError} from '../ChangeTrailRefusedError.js';
import {
  AppliedChangeTrail,
  ChangeTrail,
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  MessageToView,
  ShadowObjectsExport,
} from '../constants.js';
import {importModule, missingShadowObjectsExportMessage} from '../in-the-dark/importModule.js';
import {Kernel, type MessageToViewEvent} from '../in-the-dark/Kernel.js';
import type {AppliedChangeTrailEvent, ImportedModuleEvent, ShadowObjectsModule, SyncEvent} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {toUrlString} from '../utils/toUrlString.js';

interface ConfigurePayloadData {
  importModule?: string;
}

/**
 * A payload this side can read is an object: every branch below takes a `type` off it and
 * then reads further fields. `null`, `undefined`, a number or a string come from someone who
 * does not speak this protocol, and reading through them takes the whole worker down over one
 * message. Deliberately a plain boolean rather than a type predicate: `event.data` is `any` on
 * both call sites, and narrowing it would only cost the branches below the payload types they
 * already have.
 */
export const isReadableMessageData = (data: unknown): boolean => typeof data === 'object' && data !== null;

/**
 * Reduces a throw to the two fields that survive the wire. `RemoteWorkerEnv` builds an error
 * from them, and it decides between a confirmation and a refusal by whether `error` is there
 * at all -- so the wording must never come out empty, not even for an `Error` carrying no
 * message of its own.
 *
 * Reading a throw means running its code: `String()` goes through its `toString()`, and
 * `message` and `name` can be getters of the thrown value's own making. A value that throws
 * from there -- an object whose `toString()` fails, one with no prototype at all -- must not
 * take the answer with it: the caller in the view is waiting on a reply, and without one it
 * sits out its `configureTimeout` or `changeTrailTimeout` and learns nothing about why.
 */
const describeError = (error: unknown): {error: string; errorName?: string} => {
  try {
    return error instanceof Error
      ? {error: error.message || String(error), errorName: error.name}
      : {error: String(error) || 'unknown error'};
  } catch {
    // No name goes with it: whatever the value would have said about itself is exactly what
    // could not be read. The throw is already on the console -- both callers log it before
    // they ask for a description.
    return {error: 'an error that cannot be described'};
  }
};

export interface MessageRouterOptions {
  kernel?: Kernel;
  postMessage?: typeof self.postMessage;
}

export class MessageRouter {
  #importedModules: Set<ShadowObjectsModule> = new Set();

  /**
   * A plain field rather than the lazy getter `WorkerRuntime.logger` needs to be: a `MessageRouter`
   * is only ever built from `WorkerRuntime.onmessage`, and only past the branch that answers the
   * `CONSOLE_LOGGER` configuration message and returns -- so by the time this field initializer
   * runs, that configuration has already been installed. The `Kernel` this router holds builds its
   * own logger the same way, in its own field initializer, on the same guarantee; which of the two
   * is built first is not something either one depends on.
   */
  readonly logger = new ConsoleLogger('MessageRouter');

  #isDestroyed = false;

  /** Whether this router has been torn down. Once it is, every message that reaches it is discarded. */
  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  kernel: Kernel;

  postMessage: typeof self.postMessage;

  constructor(options?: MessageRouterOptions) {
    this.kernel = options?.kernel ?? new Kernel();

    this.postMessage = options?.postMessage ?? self.postMessage.bind(self);

    on(this.kernel, MessageToView, 'onMessageToView', this);
  }

  route(event: MessageEvent) {
    const data = event.data;

    if (!isReadableMessageData(data)) {
      if (this.logger.isDebug) {
        this.logger.debug('discarding a message it cannot read', data);
      }
      return;
    }

    // After the teardown the kernel is empty and nothing of it reaches the view any more, so a
    // change trail applied here would build entities nobody ever hears about. A second destroy
    // meets the same barrier: the confirmation belongs to the destroy that was answered, and the
    // one waiter there is settled on it.
    if (this.#isDestroyed) {
      if (this.logger.isDebug) {
        this.logger.debug('discarding a message that arrived after the teardown', data.type);
      }
      return;
    }

    switch (data.type) {
      case Configure:
        this.#configure(data);
        break;

      case ChangeTrail:
        this.#onChangeTrail(data);
        break;

      case Destroy:
        this.#onDestroy(data);
        break;

      default:
        if (this.logger.isWarn) {
          this.logger.warn('unknown message', data.type ?? data);
        }
    }
  }

  onMessageToView(event: MessageToViewEvent) {
    const {transferables: transfer, ...data} = event;
    // WebIDL defaults `transfer` to `[]`, so a missing key and an empty list are the same call.
    this.postMessage({type: MessageToView, data}, {transfer: transfer ?? []});
  }

  async #configure(data: ConfigurePayloadData) {
    const url = data.importModule;
    try {
      if (!url) throw new Error('missing "importModule" url');
      const module = await import(/* @vite-ignore */ toUrlString(url));

      // the import outlived a teardown that happened while it was in flight: registering it now
      // would fill a kernel that is already down
      if (this.#isDestroyed) {
        if (this.logger.isDebug) {
          this.logger.debug('discarding a module that arrived after the teardown', url);
        }
        return;
      }

      if (module[ShadowObjectsExport]) {
        await importModule(this.kernel, module[ShadowObjectsExport], this.#importedModules);
        this.postMessage({type: ImportedModule, url});
      } else {
        this.postMessage({
          type: ImportedModule,
          url,
          error: missingShadowObjectsExportMessage,
        } as ImportedModuleEvent);
      }
    } catch (error) {
      // an error report is not gated on a debug switch, the same way `RemoteWorkerEnv` keeps its
      // own error reports ungated: a failure is worth printing regardless of what debug logging
      // is set to
      this.logger.error('failed to import module', error);
      this.postMessage({type: ImportedModule, url, ...describeError(error)} as ImportedModuleEvent);
    }
  }

  #onChangeTrail(data: SyncEvent) {
    // One change trail, one confirmation -- and only where a serial asked for one. A caller
    // waiting on that serial decides between rejection and resolution on the first message it
    // sees, so a second one behind it would make the outcome a matter of order.
    try {
      this.kernel.run(data);
    } catch (error) {
      this.logger.error('failed to apply change trail', error);
      if (data.serial) {
        const refusal = error instanceof ChangeTrailRefusedError ? error : undefined;
        this.postMessage({
          type: AppliedChangeTrail,
          serial: data.serial,
          // what the entry threw, not the refusal wrapped around it: the number travels in a
          // field of its own, so the reason stays the reason
          ...describeError(refusal?.cause ?? error),
          ...(refusal ? {appliedCount: refusal.appliedCount} : {}),
        } as AppliedChangeTrailEvent);
      }
      return;
    }

    if (data.serial) {
      this.postMessage({type: AppliedChangeTrail, serial: data.serial} as AppliedChangeTrailEvent);
    }
  }

  #onDestroy(data: any) {
    if (this.logger.isDebug) {
      this.logger.debug('on destroy', data);
    }

    // `route()` is the barrier, so this runs once: every later message, a second destroy included,
    // is discarded before it gets here.
    this.#isDestroyed = true;

    // taken off before the kernel goes down: a message a teardown callback dispatches reaches
    // the view a microtask later, behind the confirmation this call is about to send. What an
    // `onDestroy` sends to the view during a worker teardown is therefore dropped, where a
    // local environment still delivers it.
    off(this.kernel, this);

    try {
      this.kernel.destroy();
    } catch (error) {
      // the confirmation is owed either way -- without it the view sits out its destroy
      // timeout before terminating the worker, and learns nothing it could act on
      this.logger.error('failed to tear the kernel down', error);
    }

    // releases the module objects this router imported; nothing can import into it again
    this.#importedModules.clear();

    this.postMessage({type: Destroyed});
  }
}
