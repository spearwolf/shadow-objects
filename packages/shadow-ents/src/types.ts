import type {EventizeApi} from '@spearwolf/eventize';
import {AppliedChangeTrail, ImportedModule, type ComponentChangeType} from './constants.js';
import type {Kernel} from './entities/Kernel.js';
import type {Registry} from './entities/Registry.js';

export type ChangeTrailType = IComponentChangeType[];

export type TransferablesType = Transferable[];

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
  serial?: number;
}

export interface ImportedModuleEvent {
  type: typeof ImportedModule;
  url?: string;
  error?: string;
}

export interface AppliedChangeTrailEvent {
  type: typeof AppliedChangeTrail;
  serial?: number;
  error?: string;
}

// TODO interface ShadowsObjectsApi (params for constructor|function)

export interface ShadowObjectConstructor {
  new (...args: any[]): {};
  displayName?: string;
}

export type ShadowObjectType = EventizeApi;

export type NamespaceType = string | symbol;

export type ShadowObjectsModuleInitializer = (shadowObjects: {
  define: (token: string, constructor: ShadowObjectConstructor) => void;
  kernel: Kernel;
  registry: Registry;
}) => Promise<void>;

export interface ShadowObjectsModule {
  define?: Record<string, ShadowObjectConstructor>;
  routes?: Record<string, string[]>;
  initialize?: ShadowObjectsModuleInitializer;
}
