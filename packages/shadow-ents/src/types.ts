import type {ComponentChangeType} from './constants.js';

export type ChangeTrailType = IComponentChangeType[];

export type TransferablesType = object[];

export interface IComponentChange {
  type: ComponentChangeType;
  uuid: string;
  transferables?: TransferablesType;
}

export interface IComponentEvent {
  type: string;
  data: unknown;
}

export type ComponentPropertiesType = [string, unknown][];

export interface ICreateEntitiesChange extends IComponentChange {
  type: ComponentChangeType.CreateEntities;
  token: string;
  parentUuid?: string;
  order?: number;
  properties?: ComponentPropertiesType;
}

export interface IChangeToken extends IComponentChange {
  type: ComponentChangeType.ChangeToken;
  token: string;
}

export interface IDestroyEntitiesChange extends IComponentChange {
  type: ComponentChangeType.DestroyEntities;
}

export interface ISetParentChange extends IComponentChange {
  type: ComponentChangeType.SetParent;
  parentUuid: string | undefined;
  order?: number;
}

export interface IUpdateOrderChange extends IComponentChange {
  type: ComponentChangeType.UpdateOrder;
  order: number;
}

export interface IPropertiesChange extends IComponentChange {
  type: ComponentChangeType.ChangeProperties;
  properties: ComponentPropertiesType;
}

export interface ISendEvents extends IComponentChange {
  type: ComponentChangeType.SendEvents;
  events: IComponentEvent[];
}

export type IComponentChangeType =
  | ICreateEntitiesChange
  | IDestroyEntitiesChange
  | ISetParentChange
  | IUpdateOrderChange
  | IPropertiesChange
  | IChangeToken
  | ISendEvents;

export interface SyncEvent {
  changeTrail: IComponentChangeType[];
}

export interface ShadowObjectConstructor {
  new (...args: any[]): {};
}

export type NamespaceType = string | symbol;
