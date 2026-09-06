import type {
  AnyEventNames,
  ArgsFor,
  DefaultEventMap,
  EventArgs,
  EventizedObject,
  EventKeysOf,
  EventListenerMethods,
  EventMap,
  EventName,
  ListenerFor,
  ListenerFuncType,
  MultiArgsFor,
  NonTypedEmitter,
  SubscribeArgs,
  UnsubscribeFunc,
} from '@spearwolf/eventize';
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
 * side rather than read through. `serial` is what the request carried; `RemoteWorkerEnv` always
 * sends one, and matches the answer by it.
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

/**
 * The event map of a Shadow Object read off its own shape: every method is an event of that name,
 * carrying the method's parameters as its argument tuple. The map an `emit()` on the entity is
 * checked against when it names a Shadow Object that listens there -- see `ShadowObjectCreationAPI`.
 *
 * It is the runtime read back into a type. The Kernel attaches every Shadow Object to its Entity as
 * an eventize listener object, so an `emit('onPowerUp', 100)` on the entity calls `onPowerUp(100)`
 * on each Shadow Object that has such a method. Every method takes part, the ones nobody meant as
 * an event included -- and that is what the dispatch does, too. A `symbol`-keyed method, the
 * lifecycle hooks among them, stays out: the eventize maps treat a symbol as the escape hatch. Two
 * Shadow Objects on one entity make `EventsOf<A> & EventsOf<B>`.
 */
export type EventsOf<L> = {
  [K in keyof L as L[K] extends (...args: any[]) => any ? (K extends EventName ? K : never) : never]: L[K] extends (
    ...args: infer A
  ) => any
    ? A
    : never;
};

/** `true` for a map that declares dynamic names -- eventize's `DefaultEventMap`, or one with an index signature. */
type IsLooseMap<T> = string extends EventKeysOf<T> ? true : false;

/**
 * Where a subscription on the entity is checked against the map, this closes the loose forms for a
 * typed map: a rest parameter of `never` is an overload no call matches. The same way eventize closes
 * its loose overloads for a typed emitter.
 */
type LooseSubscribeArgs<TEvents> = IsLooseMap<TEvents> extends true ? SubscribeArgs : never;
type LooseEmitNames<TEvents> = IsLooseMap<TEvents> extends true ? AnyEventNames : never;

/**
 * What a Shadow Object constructor is handed.
 *
 * `TEvents` is the event map of the entity bus as this Shadow Object sees it, in the shape eventize
 * takes -- `{[eventName]: argumentTuple}` -- and it types the entity-implicit forms of `on()`,
 * `once()` and `emit()`. `EventsOf<OtherShadowObject>` derives it from the Shadow Object that is meant
 * to receive the event. Without it every form is as loose as eventize's default map, and the target
 * forms are typed by the target's own map either way. The map is a compile-time contract: nothing
 * at runtime holds two Shadow Objects on one entity to the same one.
 */
export interface ShadowObjectCreationAPI<TEvents extends EventMap = DefaultEventMap> {
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

  /**
   * Subscribe on the *entity* of this shadow object, or on a *target* given in front. Every form
   * eventize's standalone `on()` takes; the subscription ends with the shadow object, or earlier
   * through the handle. On the entity the event names and the listener are checked against `TEvents`;
   * on a target, against the target's own map. An object followed by anything is the target, an
   * object standing alone is a listener object on the entity.
   */
  // entity: typed by TEvents
  on<K extends EventKeysOf<TEvents> | symbol>(eventName: K, listener: ListenerFor<TEvents, K>): UnsubscribeFunc;
  on<K extends EventKeysOf<TEvents> | symbol>(eventName: K, priority: number, listener: ListenerFor<TEvents, K>): UnsubscribeFunc;
  on<K extends EventKeysOf<TEvents>>(
    eventNames: Array<K | [K, number]>,
    listener: (...args: MultiArgsFor<TEvents, K>) => void,
  ): UnsubscribeFunc;
  on<K extends EventKeysOf<TEvents>>(
    eventNames: Array<K | [K, number]>,
    priority: number,
    listener: (...args: MultiArgsFor<TEvents, K>) => void,
  ): UnsubscribeFunc;
  on<K extends EventKeysOf<TEvents>>(eventNames: K | K[], methodName: EventName, listenerObject: object): UnsubscribeFunc;
  on<K extends EventKeysOf<TEvents>>(
    eventNames: K | K[],
    priority: number,
    methodName: EventName,
    listenerObject: object,
  ): UnsubscribeFunc;
  on(listenerObject: EventListenerMethods<TEvents>): UnsubscribeFunc;
  on(priority: number, listenerObject: EventListenerMethods<TEvents>): UnsubscribeFunc;
  // entity: the forms that name no event stay open, as they do in eventize
  on(listener: ListenerFuncType): UnsubscribeFunc;
  on(priority: number, listener: ListenerFuncType): UnsubscribeFunc;
  on(priority: number, methodName: EventName, listenerObject: object): UnsubscribeFunc;
  // entity: every form, for a loose map only
  on(...args: LooseSubscribeArgs<TEvents>): UnsubscribeFunc;
  // target: typed by the target's map
  on<M extends EventMap, K extends EventKeysOf<M> | symbol>(
    target: EventizedObject<M>,
    eventName: K,
    listener: ListenerFor<M, K>,
  ): UnsubscribeFunc;
  on<M extends EventMap, K extends EventKeysOf<M> | symbol>(
    target: EventizedObject<M>,
    eventName: K,
    priority: number,
    listener: ListenerFor<M, K>,
  ): UnsubscribeFunc;
  on<M extends EventMap, K extends EventKeysOf<M>>(
    target: EventizedObject<M>,
    eventNames: Array<K | [K, number]>,
    listener: (...args: MultiArgsFor<M, K>) => void,
  ): UnsubscribeFunc;
  on<M extends EventMap>(target: EventizedObject<M>, listenerObject: EventListenerMethods<M>): UnsubscribeFunc;
  // target: any other object, every form -- eventize attaches to it on the spot
  on<T extends object>(target: NonTypedEmitter<T>, ...args: SubscribeArgs): UnsubscribeFunc;

  /**
   * Subscribe on the *entity* of this shadow object, or on a *target* given in front. Every form
   * eventize's standalone `once()` takes; the subscription ends with the shadow object, or earlier
   * through the handle. On the entity the event names and the listener are checked against `TEvents`;
   * on a target, against the target's own map. An object followed by anything is the target, an
   * object standing alone is a listener object on the entity.
   */
  // entity: typed by TEvents
  once<K extends EventKeysOf<TEvents> | symbol>(eventName: K, listener: ListenerFor<TEvents, K>): UnsubscribeFunc;
  once<K extends EventKeysOf<TEvents> | symbol>(
    eventName: K,
    priority: number,
    listener: ListenerFor<TEvents, K>,
  ): UnsubscribeFunc;
  once<K extends EventKeysOf<TEvents>>(
    eventNames: Array<K | [K, number]>,
    listener: (...args: MultiArgsFor<TEvents, K>) => void,
  ): UnsubscribeFunc;
  once<K extends EventKeysOf<TEvents>>(
    eventNames: Array<K | [K, number]>,
    priority: number,
    listener: (...args: MultiArgsFor<TEvents, K>) => void,
  ): UnsubscribeFunc;
  once<K extends EventKeysOf<TEvents>>(eventNames: K | K[], methodName: EventName, listenerObject: object): UnsubscribeFunc;
  once<K extends EventKeysOf<TEvents>>(
    eventNames: K | K[],
    priority: number,
    methodName: EventName,
    listenerObject: object,
  ): UnsubscribeFunc;
  once(listenerObject: EventListenerMethods<TEvents>): UnsubscribeFunc;
  once(priority: number, listenerObject: EventListenerMethods<TEvents>): UnsubscribeFunc;
  // entity: the forms that name no event stay open, as they do in eventize
  once(listener: ListenerFuncType): UnsubscribeFunc;
  once(priority: number, listener: ListenerFuncType): UnsubscribeFunc;
  once(priority: number, methodName: EventName, listenerObject: object): UnsubscribeFunc;
  // entity: every form, for a loose map only
  once(...args: LooseSubscribeArgs<TEvents>): UnsubscribeFunc;
  // target: typed by the target's map
  once<M extends EventMap, K extends EventKeysOf<M> | symbol>(
    target: EventizedObject<M>,
    eventName: K,
    listener: ListenerFor<M, K>,
  ): UnsubscribeFunc;
  once<M extends EventMap, K extends EventKeysOf<M> | symbol>(
    target: EventizedObject<M>,
    eventName: K,
    priority: number,
    listener: ListenerFor<M, K>,
  ): UnsubscribeFunc;
  once<M extends EventMap, K extends EventKeysOf<M>>(
    target: EventizedObject<M>,
    eventNames: Array<K | [K, number]>,
    listener: (...args: MultiArgsFor<M, K>) => void,
  ): UnsubscribeFunc;
  once<M extends EventMap>(target: EventizedObject<M>, listenerObject: EventListenerMethods<M>): UnsubscribeFunc;
  // target: any other object, every form -- eventize attaches to it on the spot
  once<T extends object>(target: NonTypedEmitter<T>, ...args: SubscribeArgs): UnsubscribeFunc;

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
  emit<K extends EventKeysOf<TEvents> | symbol>(eventName: K, ...eventArgs: ArgsFor<TEvents, K>): void;
  emit<K extends EventKeysOf<TEvents> | symbol>(eventNames: K[], ...eventArgs: ArgsFor<TEvents, K>): void;
  emit(eventNames: LooseEmitNames<TEvents>, ...eventArgs: EventArgs): void;
  /**
   * Emit an event on a specific *target* object -- another Entity, a Shadow Object, any eventized
   * object, or a plain one: eventize duck-types a target, so an object without listeners is a no-op.
   * The event names and arguments are checked against the target's own map where it has one.
   *
   * @param target - The object to emit the event on.
   * @param eventNames - The name(s) of the event(s) to emit.
   * @param eventArgs - Arguments to pass to the event listeners.
   */
  emit<M extends EventMap, K extends EventKeysOf<M> | symbol>(
    target: EventizedObject<M>,
    eventName: K,
    ...eventArgs: ArgsFor<M, K>
  ): void;
  emit<M extends EventMap, K extends EventKeysOf<M> | symbol>(
    target: EventizedObject<M>,
    eventNames: K[],
    ...eventArgs: ArgsFor<M, K>
  ): void;
  emit<T extends object>(target: NonTypedEmitter<T>, eventNames: AnyEventNames, ...eventArgs: EventArgs): void;

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
