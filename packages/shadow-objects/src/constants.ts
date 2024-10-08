import type {NamespaceType} from './types.ts';

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

export const GlobalNS: NamespaceType = Symbol.for('ShadowEntsGlobalNS');

export const VoidToken = '#void';

/**
 * The event is dispatched by {@link ComponentContext.reCreateChanges} and forwarded to all {@link ViewComponent}.
 * The event itself has no other data.
 */
export const ContextLost = 'contextLost';

export const Configure = 'configure';
export const ChangeTrail = 'changeTrail';
export const Destroy = 'destroy';

export const Loaded = 'loaded';
export const AppliedChangeTrail = 'appliedChangeTrail';
export const ImportedModule = 'importedModule';
export const Destroyed = 'destroyed';

/**
 * The `messageToView` event is fired when the kernel receives a message from an entity (to its view component counterpart)
 */
export const MessageToView = 'messageToView';

export const WorkerLoadTimeout = 16000;
export const WorkerConfigureTimeout = 16000;
export const WorkerChangeTrailTimeout = 4000;
export const WorkerDestroyTimeout = 1000;

export const ShadowObjectsExport = 'shadowObjects';
