import type {EventizedObject, on, once} from '@spearwolf/eventize';
import type {CompareFunc, createEffect, createMemo, createSignal, Signal, SignalReader} from '@spearwolf/signalize';
import {AppliedChangeTrail, ImportedModule, type ComponentChangeType} from './constants.js';
import type {Entity} from './in-the-dark/Entity.js';
import type {Kernel, Registry} from './shadow-objects.js';

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

export type EntityApi = Pick<
  Entity,
  'hasParent' | 'children' | 'dispatchMessageToView' | 'setProperties' | 'setProperty' | 'propKeys' | 'propEntries'
> &
  Readonly<Pick<Entity, 'uuid' | 'order' | 'parentUuid' | 'parent'>> & {
    traverse(callback: (entity: EntityApi) => any): void;
  };

export interface ShadowObjectParams {
  entity: EntityApi;

  provideContext<T = unknown>(name: string | symbol, initialValue?: T, isEqual?: CompareFunc<T>): Signal<T>;
  provideGlobalContext<T = unknown>(name: string | symbol, initialValue?: T, isEqual?: CompareFunc<T>): Signal<T>;

  useContext<T = any>(name: string | symbol, isEqual?: CompareFunc<T>): SignalReader<T>;
  useParentContext<T = any>(name: string | symbol, isEqual?: CompareFunc<T>): SignalReader<T>;
  useProperty<T = any>(name: string, isEqual?: CompareFunc<T>): SignalReader<T>;

  createEffect(...args: Parameters<typeof createEffect>): ReturnType<typeof createEffect>;
  createSignal<T = unknown>(...args: Parameters<typeof createSignal<T>>): ReturnType<typeof createSignal<T>>;
  createMemo<T = unknown>(...args: Parameters<typeof createMemo<T>>): SignalReader<T>;

  on(...args: Parameters<typeof on>): ReturnType<typeof on>;
  once(...args: Parameters<typeof once>): ReturnType<typeof once>;

  onDestroy(callback: () => any): void;
}

export interface ShadowObjectConstructor {
  new (params: ShadowObjectParams): {};
  displayName?: string;
}

export interface ShadowObjectConstructorFunc {
  (params: ShadowObjectParams): object | undefined | void;
  displayName?: string;
}

export type ShadowObjectType = EventizedObject;

export type NamespaceType = string | symbol;

export type ShadowObjectsModuleInitializer = (shadowObjects: {
  define: (token: string, constructor: ShadowObjectConstructor | ShadowObjectConstructorFunc) => void;
  kernel: Kernel;
  registry: Registry;
}) => Promise<void>;

export interface ShadowObjectsModule {
  extends?: ShadowObjectsModule[];
  define?: Record<string, ShadowObjectConstructor | ShadowObjectConstructorFunc>;
  routes?: Record<string, string[]>;
  initialize?: ShadowObjectsModuleInitializer;
}
