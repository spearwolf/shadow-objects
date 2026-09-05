import type {NamespaceType} from './types.js';

export enum ChangeTrailPhase {
  StructuralChanges = 1,
  ContentUpdates,
  Removal,
}

export enum ComponentChangeType {
  CreateEntities = 1,
  DestroyEntities,
  SetParent,
  UpdateOrder,
  ChangeProperties,
  ChangeToken,
  SendEvents,
}

export const GlobalNS: NamespaceType = Symbol.for('ShadowObjectsGlobalNS');

export const VoidToken = '#void';

/**
 * The event is dispatched by `ComponentContext.reCreateChanges` and forwarded to all `ViewComponent`.
 * The event itself has no other data.
 */
export const ContextLost = 'contextLost';

export const Configure = 'configure';
export const ChangeTrail = 'changeTrail';
export const Inspect = 'inspect';
export const Destroy = 'destroy';

export const Loaded = 'loaded';
export const AppliedChangeTrail = 'appliedChangeTrail';
export const ImportedModule = 'importedModule';
export const Destroyed = 'destroyed';
export const Inspected = 'inspected';

/**
 * The five replies a `RemoteWorkerEnv` waits for, each behind a deadline of its own: the `Loaded`
 * greeting of the load handshake, the `ImportedModule` answer to an `importScript()`, the
 * `AppliedChangeTrail` confirmation of a change trail sent with `waitForConfirmation`, the
 * `Inspected` answer to an `inspect()`, and the `Destroyed` receipt of a teardown. A `switch` over
 * the five is exhaustive.
 */
export type WorkerReplyType =
  | typeof Loaded
  | typeof AppliedChangeTrail
  | typeof ImportedModule
  | typeof Inspected
  | typeof Destroyed;

/**
 * The `messageToView` event is fired when the kernel receives a message from an entity (to its view component counterpart)
 */
export const MessageToView = 'messageToView';

export const WorkerLoadTimeout = 60000;
export const WorkerConfigureTimeout = 60000;
export const WorkerChangeTrailTimeout = 5000;
export const WorkerInspectTimeout = 5000;
export const WorkerDestroyTimeout = 5000;

export const ShadowObjectsExport = 'shadowObjects';
