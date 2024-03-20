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
 * The event is dispatched by {@link ComponentContext.resetChangesFromMemory} and forwarded to all {@link ViewComponent}.
 * The event itself has no other data.
 */
export const ContextLost = 'contextLost';
