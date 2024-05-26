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

export const Init = 'init';
export const ChangeTrail = 'changeTrail';
export const Destroy = 'destroy';

export const Loaded = 'loaded';
export const Ready = 'ready';
export const Closed = 'closed';

export const WorkerLoadTimeout = 20000;
export const WorkerReadyTimeout = 20000;
export const WorkerDestroyTimeout = 1000;
