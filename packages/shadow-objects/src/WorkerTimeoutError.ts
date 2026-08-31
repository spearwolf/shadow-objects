import type {WorkerReplyType} from './constants.js';

/**
 * The reason a reply from the worker did not arrive in time.
 *
 * Four replies of a `RemoteWorkerEnv` have a deadline, and `messageType` names the one that stayed
 * out: the `Loaded` greeting of the load handshake, the `ImportedModule` answer to an
 * `importScript()`, the `AppliedChangeTrail` confirmation of a change trail sent with
 * `waitForConfirmation`, and the `Destroyed` receipt of a teardown.
 *
 * `timeout` carries the number of milliseconds that were waited, so a diagnosis knows which of the
 * four values was in force without reaching for the `timeouts` of the `RemoteWorkerEnv`.
 *
 * The error says nothing about what the worker did with the request. A confirmation window that
 * ran out leaves a Shadow Environment that may well have applied the whole change trail, which is
 * why `ShadowEnv` books it as applied; `ChangeTrailRefusedError` is the only refusal that names a
 * number.
 */
export class WorkerTimeoutError extends Error {
  /** the type of the message that did not arrive */
  readonly messageType: WorkerReplyType;

  /** how many milliseconds were waited for it */
  readonly timeout: number;

  constructor(messageType: WorkerReplyType, timeout: number) {
    super(`no ${messageType} message arrived from the worker within ${timeout}ms`);
    this.name = 'WorkerTimeoutError';
    this.messageType = messageType;
    this.timeout = timeout;
  }
}
