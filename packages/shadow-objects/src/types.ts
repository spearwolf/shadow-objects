import type {AnyEventNames, EventArgs, EventizedObject, on, once, SubscribeArgs} from '@spearwolf/eventize';
import type {CompareFunc, createEffect, createMemo, createSignal, Signal, SignalReader} from '@spearwolf/signalize';
import type {AppliedChangeTrail, ComponentChangeType, ImportedModule, Inspect, Inspected} from './constants.js';
import type {Entity} from './in-the-dark/Entity.js';
import type {InspectRequest, KernelSnapshot} from './inspect/types.js';
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
 *
 * The one-element form is written by `ViewComponent.setPropertyWithoutValue()`, which goes through
 * `ComponentContext` into the bookkeeping of `ComponentChanges`; `setProperty(name, undefined)`
 * stands beside it and is a removal. It also arrives from outside, in a Change Trail a caller
 * assembles itself — `Kernel.createEntity()` and `Kernel.changeProperties()` are the two entrances
 * that read it.
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

/**
 * What goes on the wire for an `inspect()` over a worker: the request as the caller gave it, and
 * the serial the answer is matched by. The request is plain data and survives structured cloning.
 */
export interface InspectEvent {
  type: typeof Inspect;
  serial: number;
  request: InspectRequest;
}

/**
 * The worker's answer to an {@link InspectEvent}: the snapshot, or the two fields of a throw that
 * survive structured cloning -- see {@link ImportedModuleEvent.errorName}. Exactly one of
 * `snapshot` and `error` is set by the router; a reply carrying neither is rejected by the view
 * side rather than read through.
 */
export interface InspectedEvent {
  type: typeof Inspected;
  serial: number;
  snapshot?: KernelSnapshot;
  error?: string;
  errorName?: string;
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
   * A listener that throws ends the delivery where it stands and the error reaches this call. That
   * is deliberate, and it is the one dispatch in the library that works this way: the listeners
   * belong to whoever emits here, so a failure is its own bug and belongs where it happened.
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
  /** The name the Kernel reports a Shadow Object built from this constructor under; without it, the constructor's `name`. */
  displayName?: string;
}

export interface ShadowObjectConstructorFunc {
  (params: ShadowObjectCreationAPI): object | undefined | void;
  /** The name the Kernel reports a Shadow Object built from this constructor under; without it, the constructor's `name`. */
  displayName?: string;
}

/** The four lifecycle hooks a Shadow Object can implement, by the name of their symbol. */
export type LifecycleHookName = 'onCreate' | 'onDestroy' | 'onParentChanged' | 'onViewEvent';

/**
 * What a creation scope knows about its Shadow Object: the display name and the five name lists
 * the creation API filled while the constructor ran. Read-only; a torn-down scope answers empty
 * lists.
 */
export interface ShadowObjectScopeDescription {
  displayName: string;
  usesProperties: string[];
  usesContexts: (string | symbol)[];
  usesParentContexts: (string | symbol)[];
  providesContexts: (string | symbol)[];
  providesGlobalContexts: (string | symbol)[];
}

/** {@link ShadowObjectScopeDescription} plus what only the Kernel can add: the tokens and the hooks. */
export interface ShadowObjectDescription extends ShadowObjectScopeDescription {
  /** The tokens the constructor is defined under in the Kernel's Registry, in definition order. */
  definedUnder: string[];
  /** Which of the four lifecycle hooks the instance implements. */
  hooks: LifecycleHookName[];
}

/** The three maps of a Registry, with constructors reduced to display names. */
export interface RegistryDescription {
  /** token -> display names of the constructors defined under it, in definition order. */
  tokens: Record<string, string[]>;
  /** token -> tokens it routes to. */
  routes: Record<string, string[]>;
  /** `@prop` and `token@prop` keys -> tokens (property routes). */
  propRoutes: Record<string, string[]>;
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
