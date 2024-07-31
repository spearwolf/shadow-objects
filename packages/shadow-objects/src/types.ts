import type {EventizedObject} from '@spearwolf/eventize';
import type {CompareFunc, SignalObject, SignalReader} from '@spearwolf/signalize';
import {AppliedChangeTrail, ImportedModule, type ComponentChangeType} from './constants.js';
import type {Entity} from './entities/Entity.js';
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

export interface ShadowObjectParams {
  entity: Entity;

  provideContext<T = unknown>(name: string | symbol, initialValue?: T, isEqual?: CompareFunc<T>): SignalObject<T>;
  useContext<T = any>(name: string | symbol, isEqual?: CompareFunc<T>): SignalReader<T>;
  useProperty<T = any>(name: string, isEqual?: CompareFunc<T>): SignalReader<T>;

  onDestroy(callback: () => any): void;
}

export interface ShadowObjectConstructor {
  new (...args: any[]): {};
  displayName?: string;
}

export type ShadowObjectType = EventizedObject;

export type NamespaceType = string | symbol;

export type ShadowObjectsModuleInitializer = (shadowObjects: {
  define: (token: string, constructor: ShadowObjectConstructor) => void;
  kernel: Kernel;
  registry: Registry;
}) => Promise<void>;

export interface ShadowObjectsModule {
  extends?: ShadowObjectsModule[];
  define?: Record<string, ShadowObjectConstructor>;
  routes?: Record<string, string[]>;
  initialize?: ShadowObjectsModuleInitializer;
}
