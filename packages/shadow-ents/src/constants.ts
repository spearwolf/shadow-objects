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
}

export const GlobalNS: NamespaceType = Symbol.for('ShadowEntsGlobalNS');

export const VoidToken = '#void';
