import type {EntityChangeType} from './constants';

export interface IEntityChangeEntry {
  type: EntityChangeType;
  uuid: string;
}

export interface IEntityChangeCreateEntity extends IEntityChangeEntry {
  type: EntityChangeType.CreateEntity;
  token: string;
  parentUuid?: string;
  order?: number;
  properties?: [string, unknown][];
}

export interface IEntityChangeDestroyEntity extends IEntityChangeEntry {
  type: EntityChangeType.DestroyEntity;
}

export interface IEntityChangeSetParent extends IEntityChangeEntry {
  type: EntityChangeType.SetParent;
  parentUuid: string | undefined;
  order?: number;
}

export interface IEntityChangeUpdateOrder extends IEntityChangeEntry {
  type: EntityChangeType.UpdateOrder;
  order: number;
}

export interface IEntityChangeProperties extends IEntityChangeEntry {
  type: EntityChangeType.ChangeProperties;
  properties: [string, unknown][];
}

export type EntityChangeEntryType =
  | IEntityChangeCreateEntity
  | IEntityChangeDestroyEntity
  | IEntityChangeSetParent
  | IEntityChangeUpdateOrder
  | IEntityChangeProperties;

export interface EntitiesSyncEvent {
  changeTrail: EntityChangeEntryType[];
}

export interface EntityConstructor {
  new (...args: any[]): {};
}
