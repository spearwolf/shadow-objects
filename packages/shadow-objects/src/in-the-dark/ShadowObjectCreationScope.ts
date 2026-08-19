import {emit, on, once, Priority} from '@spearwolf/eventize';
import {
  type CompareFunc,
  createEffect,
  createMemo,
  createSignal,
  destroySignal,
  isSignal,
  link,
  type Signal,
  type SignalReader,
} from '@spearwolf/signalize';
import type {Maybe, ProvideContextOptions, ShadowObjectCreationAPI, ShadowObjectType, SignalValueOptions} from '../types.js';
import type {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {toMaybe} from '../utils/toMaybe.js';
import type {Entity} from './Entity.js';
import {onDestroy, onViewEvent} from './events.js';

let provideContextOptionsDeprecatedShown = false;
let provideGlobalContextOptionsDeprecatedShown = false;
let useContextOptionsDeprecatedShown = false;
let useParentContextOptionsDeprecatedShown = false;
let usePropertyOptionsDeprecatedShown = false;

/**
 * Everything a single shadow-object was given at construction time, and the end of all of it.
 *
 * The scope holds the signals, links and subscriptions the creation API hands out, and it hands the API
 * itself to the kernel through `createAPI()`. The instance stays with the kernel: a shadow-object only ever
 * sees the API object, never the scope behind it.
 *
 * One scope belongs to exactly one shadow-object, and it ends with it.
 */
export class ShadowObjectCreationScope {
  readonly #entity: Entity;
  readonly #logger: ConsoleLogger;
  readonly #displayName: string;

  // The cleanup callbacks of the shadow-object itself, registered through `onDestroy()`.
  readonly #unsubscribePrimary = new Set<() => any>();

  // The cleanup callbacks the creation API registered on its own behalf. A `Set` iterating in
  // insertion order: which cleanup runs before which is observable behaviour.
  readonly #unsubscribeSecondary = new Set<() => any>();

  readonly #contextReaders = new Map<string | symbol, SignalReader<any>>();
  readonly #contextReaderCompares = new Map<string | symbol, CompareFunc<any> | undefined>();
  readonly #contextParentReaders = new Map<string | symbol, SignalReader<any>>();
  readonly #contextParentReaderCompares = new Map<string | symbol, CompareFunc<any> | undefined>();
  readonly #contextProviders = new Map<string | symbol, Signal<any>>();
  readonly #contextRootProviders = new Map<string | symbol, Signal<any>>();

  readonly #propertyReaders = new Map<string, SignalReader<any>>();
  readonly #propertyCompares = new Map<string, CompareFunc<any> | undefined>();

  #shadowObject: ShadowObjectType | undefined;
  #releaseScope: (() => void) | undefined;
  #forgetShadowObject: (() => void) | undefined;
  #unsubscribeFromEntityDestroy: (() => void) | undefined;

  #isTornDown = false;

  constructor(entity: Entity, logger: ConsoleLogger, displayName: string) {
    this.#entity = entity;
    this.#logger = logger;
    this.#displayName = displayName;
  }

  /**
   * The object that goes into `new construct(…)`.
   *
   * Every member is a bound function, because a shadow-object constructor is expected to destructure the
   * API in its parameter list — a member that took its receiver from the call site would lose it there.
   */
  createAPI(): ShadowObjectCreationAPI {
    return {
      entity: this.#entity,

      provideContext: this.provideContext.bind(this),
      provideGlobalContext: this.provideGlobalContext.bind(this),
      useContext: this.useContext.bind(this),
      useParentContext: this.useParentContext.bind(this),

      dispatchMessageToView: this.dispatchMessageToView.bind(this),

      useProperty: this.useProperty.bind(this),
      useProperties: this.useProperties.bind(this),

      createResource: this.createResource.bind(this),
      createEffect: this.createEffect.bind(this),
      createSignal: this.createSignal.bind(this),
      createMemo: this.createMemo.bind(this),

      on: this.on.bind(this),
      once: this.once.bind(this),
      emit: this.emit.bind(this),
      onViewEvent: this.onViewEvent.bind(this),
      onDestroy: this.onDestroy.bind(this),
    };
  }

  /**
   * Binds the scope to the shadow-object it made the API for and subscribes to the destruction of the entity.
   *
   * A shadow-object reaches its end on two independent paths: the entity is destroyed, or the shadow-object
   * leaves the constructor set of a still living entity (token or route change). Both run the same teardown,
   * and each path reaches it through a handle of its own.
   *
   * The kernel keeps two releases rather than one, because they belong to opposite ends of the teardown:
   * `releaseScope` runs at its start, `forgetShadowObject` at its end.
   */
  bindTo(shadowObject: ShadowObjectType, releaseScope: () => void, forgetShadowObject: () => void): void {
    this.#shadowObject = shadowObject;
    this.#releaseScope = releaseScope;
    this.#forgetShadowObject = forgetShadowObject;

    if (this.#logger.isInfo) {
      this.#logger.info('create shadow-object', this.#displayName, {shadowObject, entity: this.#entity});
    }

    this.#unsubscribeFromEntityDestroy = once(this.#entity, onDestroy, Priority.Low, () => {
      this.tearDown();
    });
  }

  /**
   * Runs once, whichever of the two paths reaches it first.
   *
   * The flag makes the teardown a one-time act: a destroy callback reaching back into the kernel finds no
   * way to start it a second time. Releasing both handles right after ends the retention in both directions
   * -- the kernel's map points from the shadow-object to this scope, the subscription points from the entity
   * to the same scope.
   *
   * The kernel is told to forget the shadow-object at the very end, so a destroy callback that reaches back
   * into the kernel still finds its shadow-object listed among the ones the constructor created.
   */
  tearDown(): void {
    if (this.#isTornDown) return;
    this.#isTornDown = true;

    this.#releaseScope?.();
    this.#unsubscribeFromEntityDestroy?.();

    if (this.#logger.isInfo) {
      this.#logger.info('destroy shadow-object', this.#displayName, {shadowObject: this.#shadowObject, entity: this.#entity});
    }

    for (const callback of this.#unsubscribePrimary) {
      callback();
    }

    for (const callback of this.#unsubscribeSecondary) {
      callback();
    }

    for (const sig of this.#contextReaders.values()) {
      destroySignal(sig);
    }

    for (const sig of this.#contextParentReaders.values()) {
      destroySignal(sig);
    }

    for (const sig of this.#propertyReaders.values()) {
      destroySignal(sig);
    }

    for (const sig of this.#contextProviders.values()) {
      destroySignal(sig);
    }

    for (const sig of this.#contextRootProviders.values()) {
      destroySignal(sig);
    }

    this.#unsubscribePrimary.clear();
    this.#unsubscribeSecondary.clear();
    this.#contextReaders.clear();
    this.#contextParentReaders.clear();
    this.#propertyReaders.clear();
    this.#contextProviders.clear();
    this.#contextRootProviders.clear();

    this.#forgetShadowObject?.();
  }

  useProperty<T = any>(name: string, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>> {
    if (!usePropertyOptionsDeprecatedShown && options != null && typeof options === 'function') {
      console.warn(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useProperty()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      usePropertyOptionsDeprecatedShown = true;
    }

    const opts = typeof options === 'function' ? {compare: options} : options;

    let propReader = this.#propertyReaders.get(name);

    if (propReader === undefined) {
      propReader = createSignal<any>(undefined, opts).get;
      this.#propertyReaders.set(name, propReader);
      this.#propertyCompares.set(name, opts?.compare);
      const con = link(this.#entity.getPropertyReader(name), propReader);
      this.#unsubscribeSecondary.add(con.destroy.bind(con));
    } else if (opts?.compare != null && this.#propertyCompares.get(name) !== opts.compare) {
      console.warn(
        `[shadow-objects] useProperty("${name}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per property.`,
      );
    }

    return propReader;
  }

  useProperties<T extends Record<string, unknown> = Record<string, unknown>>(
    props: {[K in keyof T]: string},
  ): {
    [K in keyof T]: SignalReader<Maybe<T[K]>>;
  } {
    const result = {} as {[K in keyof T]: SignalReader<Maybe<T[K]>>};
    for (const key in props) {
      if (Object.hasOwn(props, key)) {
        result[key] = this.useProperty(props[key]);
      }
    }
    return result;
  }

  provideContext<T = unknown>(
    name: string | symbol,
    sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
    options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
  ) {
    if (!provideContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
      console.warn(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      provideContextOptionsDeprecatedShown = true;
    }

    const opts = typeof options === 'function' ? {compare: options} : options;

    let ctxProvider = this.#contextProviders.get(name);

    if (ctxProvider == null) {
      const isSig = isSignal(sourceOrInitialValue);
      const initialValue = isSig ? undefined : toMaybe(sourceOrInitialValue as T);

      ctxProvider = createSignal(initialValue, opts?.compare ? {compare: opts.compare} : undefined);

      if (isSig) {
        const ln = link(sourceOrInitialValue as SignalReader<T>, ctxProvider);
        this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
      }

      // Destroying this link is registered before any `clearOnDestroy` callback below: the write to
      // `undefined` then no longer reaches the entity's own context signal.
      const ln = link(ctxProvider, this.#entity.provideContext(name));
      this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
      this.#contextProviders.set(name, ctxProvider);
    }

    if (ctxProvider != null && (opts?.clearOnDestroy ?? true)) {
      this.#unsubscribeSecondary.add(() => {
        ctxProvider.set(undefined);
      });
    }

    return ctxProvider;
  }

  provideGlobalContext<T = unknown>(
    name: string | symbol,
    sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
    options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
  ) {
    if (!provideGlobalContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
      console.warn(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideGlobalContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      provideGlobalContextOptionsDeprecatedShown = true;
    }

    const opts = typeof options === 'function' ? {compare: options} : options;

    let ctxProvider = this.#contextRootProviders.get(name);

    if (ctxProvider == null) {
      const isSig = isSignal(sourceOrInitialValue);
      const initialValue = isSig ? undefined : toMaybe(sourceOrInitialValue as T);

      ctxProvider = createSignal(initialValue, opts?.compare ? {compare: opts.compare} : undefined);

      if (isSig) {
        const ln = link(sourceOrInitialValue as SignalReader<T>, ctxProvider);
        this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
      }

      // Destroying this link is registered before any `clearOnDestroy` callback below: the write to
      // `undefined` then no longer reaches the root context signal.
      const ln = link(ctxProvider, this.#entity.provideGlobalContext(name));
      this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
      this.#contextRootProviders.set(name, ctxProvider);
    }

    if (ctxProvider != null && (opts?.clearOnDestroy ?? true)) {
      this.#unsubscribeSecondary.add(() => {
        ctxProvider.set(undefined);
      });
    }

    return ctxProvider;
  }

  useContext<T = unknown>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>) {
    if (!useContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
      console.warn(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      useContextOptionsDeprecatedShown = true;
    }

    const opts = typeof options === 'function' ? {compare: options} : options;

    let ctxReader = this.#contextReaders.get(name);

    if (ctxReader === undefined) {
      ctxReader = createSignal<any>(undefined, opts).get;
      this.#contextReaders.set(name, ctxReader);
      this.#contextReaderCompares.set(name, opts?.compare);
      const ln = link(this.#entity.useContext(name), ctxReader);
      this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
    } else if (opts?.compare != null && this.#contextReaderCompares.get(name) !== opts.compare) {
      console.warn(
        `[shadow-objects] useContext("${String(name)}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per context.`,
      );
    }

    return ctxReader;
  }

  useParentContext<T = unknown>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>) {
    if (!useParentContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
      console.warn(
        '[shadow-objects] Deprecation Warning: The "isEqual" option of "useParentContext()" is now passed as {compare} argument. Please update your code accordingly.',
      );
      useParentContextOptionsDeprecatedShown = true;
    }

    const opts = typeof options === 'function' ? {compare: options} : options;

    let ctxReader = this.#contextParentReaders.get(name);

    if (ctxReader === undefined) {
      ctxReader = createSignal<any>(undefined, opts).get;
      this.#contextParentReaders.set(name, ctxReader);
      this.#contextParentReaderCompares.set(name, opts?.compare);
      const ln = link(this.#entity.useParentContext(name), ctxReader);
      this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
    } else if (opts?.compare != null && this.#contextParentReaderCompares.get(name) !== opts.compare) {
      console.warn(
        `[shadow-objects] useParentContext("${String(name)}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per parent context.`,
      );
    }

    return ctxReader;
  }

  createSignal(...args: any[]): any {
    // @ts-ignore
    const sig = createSignal(...args);
    this.#unsubscribeSecondary.add(() => {
      destroySignal(sig);
    });
    return sig;
  }

  createEffect(...args: any[]): ReturnType<typeof createEffect> {
    // @ts-ignore
    const effect = createEffect(...args);
    this.#unsubscribeSecondary.add(effect.destroy);
    return effect;
  }

  createMemo<T = unknown>(...args: Parameters<typeof createMemo<T>>): SignalReader<T> {
    const sig = createMemo<T>(...args);
    this.#unsubscribeSecondary.add(() => {
      destroySignal(sig);
    });
    return sig;
  }

  createResource<T = unknown>(factory: () => T | undefined, cleanup?: (resource: NonNullable<T>) => unknown): Signal<Maybe<T>> {
    const resourceSignal = createSignal<Maybe<T>>();

    const effect = createEffect(() => {
      const resource = toMaybe(factory());
      resourceSignal.set(resource);

      if (resource !== undefined && cleanup) {
        return () => {
          cleanup(resource);
          resourceSignal.set(undefined);
        };
      }

      return () => {
        resourceSignal.set(undefined);
      };
    });

    this.#unsubscribeSecondary.add(() => {
      effect.destroy();
      resourceSignal.set(undefined);
      destroySignal(resourceSignal);
    });

    return resourceSignal;
  }

  on(...args: any[]): ReturnType<typeof on> {
    const [firstArg] = args;
    if (typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)) {
      // @ts-ignore
      const unsub = on(this.#entity, ...args);
      this.#unsubscribeSecondary.add(unsub);
      return unsub;
    }
    // @ts-ignore
    const unsub = on(...args);
    this.#unsubscribeSecondary.add(unsub);
    // Unsubscribing takes the callback out of the cleanup set as well, so a shadow-object that
    // subscribes and unsubscribes over and over does not grow that set without bound.
    return Object.assign(() => {
      this.#unsubscribeSecondary.delete(unsub);
      unsub();
    }, unsub);
  }

  once(...args: any[]): ReturnType<typeof once> {
    const [firstArg] = args;
    if (typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)) {
      // @ts-ignore
      const unsub = once(this.#entity, ...args);
      this.#unsubscribeSecondary.add(unsub);
      return unsub;
    }
    // @ts-ignore
    const unsub = once(...args);
    this.#unsubscribeSecondary.add(unsub);
    // Unsubscribing takes the callback out of the cleanup set as well, so a shadow-object that
    // subscribes and unsubscribes over and over does not grow that set without bound.
    return Object.assign(() => {
      this.#unsubscribeSecondary.delete(unsub);
      unsub();
    }, unsub);
  }

  emit(...args: any[]): void {
    const [firstArg] = args;
    if (typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)) {
      // @ts-ignore
      emit(this.#entity, ...args);
    } else {
      // @ts-ignore
      emit(...args);
    }
  }

  onViewEvent(callback: (type: string, data: unknown) => any): void {
    const unsub = on(this.#entity, onViewEvent, (type: string, data: unknown) => {
      callback(type, data);
    });
    this.#unsubscribeSecondary.add(unsub);
  }

  onDestroy(callback: () => any): void {
    this.#unsubscribePrimary.add(callback);
  }

  dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren = false): void {
    this.#entity.dispatchMessageToView(type, data, transferables, traverseChildren);
  }
}