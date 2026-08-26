import type {AnyEventNames, EventArgs, EventizedObject, on, once, SubscribeArgs} from '@spearwolf/eventize';
import type {CompareFunc, createEffect, createMemo, createSignal, Signal, SignalReader} from '@spearwolf/signalize';
import type {AppliedChangeTrail, ComponentChangeType, ImportedModule} from './constants.js';
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

/**
 * A list of property entries in a Change Trail. An entry carries a key together with its
 * value; an entry that names only the key counts as set, without carrying a value — the
 * Entity behind it reads the property as `undefined`.
 */
export type ComponentPropertiesType = ([string] | [string, unknown])[];

export interface ICreateEntitiesChange extends IComponentChange {
  type: ComponentChangeType.CreateEntities;
  token: string;
  parentUuid?: string;
  order?: number;
  properties?: ComponentPropertiesType;
  autoDestructionOnParentRemoval?: boolean;
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
  /**
   * The name the error called itself in the worker. Structured cloning does not carry an
   * error class, so this and `error` are what the view side rebuilds one from. Absent means
   * the sender named no class, and the view reads it as `Error`.
   */
  errorName?: string;
}

export interface AppliedChangeTrailEvent {
  type: typeof AppliedChangeTrail;
  serial?: number;
  error?: string;
  /** The name the error called itself in the worker; see {@link ImportedModuleEvent.errorName}. */
  errorName?: string;
  /**
   * How many entries of the change trail the Kernel applied before it stopped. Stands only
   * next to an `error`, and only where the Kernel itself could say so; an absent field means
   * nothing is known about how far the trail got.
   */
  appliedCount?: number;
}

export type EntityApi = Readonly<
  Pick<Entity, 'uuid' | 'order' | 'hasParent' | 'propKeys' | 'propEntries' | 'kernel'> & {
    parent?: EntityApi | undefined;
    children: readonly EntityApi[];
    traverse(callback: (entity: EntityApi) => unknown): void;
  }
>;

export interface SignalValueOptions<T> {
  compare?: CompareFunc<T | undefined>;
}

export interface ProvideContextOptions<T> extends SignalValueOptions<T> {
  clearOnDestroy?: boolean;
}

export type Maybe<T = unknown> = NonNullable<T> | undefined;

export interface ShadowObjectCreationAPI {
  entity: EntityApi;

  dispatchMessageToView(type: string, data?: unknown, transferables?: TransferablesType, traverseChildren?: boolean): void;

  provideContext<T = unknown>(
    name: string | symbol,
    sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
    options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
  ): Signal<Maybe<T>>;

  provideGlobalContext<T = unknown>(
    name: string | symbol,
    sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
    options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
  ): Signal<Maybe<T>>;

  useContext<T = unknown>(
    name: string | symbol,
    options?: SignalValueOptions<T> | CompareFunc<T | undefined>,
  ): SignalReader<Maybe<T>>;

  useParentContext<T = unknown>(
    name: string | symbol,
    options?: SignalValueOptions<T> | CompareFunc<T | undefined>,
  ): SignalReader<Maybe<T>>;

  useProperty<T = unknown>(name: string, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>>;

  useProperties<T extends Record<string, unknown> = Record<string, unknown>>(
    props: {[K in keyof T]: string},
  ): {
    [K in keyof T]: SignalReader<Maybe<T[K]>>;
  };

  createResource<T = unknown>(factory: () => T | undefined, cleanup?: (resource: NonNullable<T>) => unknown): Signal<Maybe<T>>;

  // `typeof` keeps every overload intact — `Parameters<>`/`ReturnType<>` collapse them onto the
  // last one. For createEffect that made the common `createEffect(callback)` call a type error;
  // for createSignal it would drop the `{lazy: true}` factory form and claim `Signal<T>` where
  // `createSignal<T>()` without an initial value actually hands out a `Signal<T | undefined>`.
  createEffect: typeof createEffect;
  createSignal: typeof createSignal;
  // createMemo has a single signature, so the collapse is a no-op here; the return type is
  // narrowed on purpose, because the Kernel hands back the reader rather than signalize's value.
  createMemo<T = unknown>(...args: Parameters<typeof createMemo<T>>): SignalReader<T>;

  on(...args: SubscribeArgs): ReturnType<typeof on>;
  on(...args: [object, ...SubscribeArgs]): ReturnType<typeof on>;

  once(...args: SubscribeArgs): ReturnType<typeof once>;
  once(...args: [object, ...SubscribeArgs]): ReturnType<typeof once>;

  onViewEvent(callback: (type: string, data: unknown) => any): void;

  /**
   * Emit an event on the *entity* associated with this shadow object.
   *
   * @param eventNames - The name(s) of the event(s) to emit.
   * @param eventArgs - Arguments to pass to the event listeners.
   */
  emit(eventNames: AnyEventNames, ...eventArgs: EventArgs): void;
  /**
   * Emit an event on a specific *target* object.
   *
   * @param target - The object to emit the event on.
   * @param eventNames - The name(s) of the event(s) to emit.
   * @param eventArgs - Arguments to pass to the event listeners.
   */
  emit(target: EventizedObject, eventNames: AnyEventNames, ...eventArgs: EventArgs): void;

  onDestroy(callback: () => any): void;
}

export interface ShadowObjectConstructor {
  new (params: ShadowObjectCreationAPI): object;
  displayName?: string;
}

export interface ShadowObjectConstructorFunc {
  (params: ShadowObjectCreationAPI): object | undefined | void;
  displayName?: string;
}

export type ShadowObjectType = EventizedObject;

export type NamespaceType = string | symbol;

export type ShadowObjectsModuleInitializer = (shadowObjects: {
  define: (token: string, constructa: ShadowObjectConstructor | ShadowObjectConstructorFunc) => void;
  kernel: Kernel;
  registry: Registry;
}) => Promise<void>;

export interface ShadowObjectsModule {
  extends?: ShadowObjectsModule[];
  define?: Record<string, ShadowObjectConstructor | ShadowObjectConstructorFunc>;
  routes?: Record<string, string[]>;
  initialize?: ShadowObjectsModuleInitializer;
}
