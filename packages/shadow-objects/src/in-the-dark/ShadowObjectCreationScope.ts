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

/**
 * What a creation-API call gets once the scope has closed: a real `Signal`, created and destroyed
 * on the spot. Reading it gives `undefined` and writing to it reaches nobody -- a destroyed signal
 * keeps its value but has neither effect nor link left on it. It belongs to whoever asked for it
 * and goes when they do, so a scope that is asked again and again after its end holds nothing.
 */
const inertSignal = (): Signal<any> => {
  const sig = createSignal<any>(undefined);
  destroySignal(sig);
  return sig;
};

/** The same for `createEffect()`: a real `Effect`, never run, already destroyed. */
const inertEffect = (): ReturnType<typeof createEffect> => {
  const effect = createEffect(() => {}, {autorun: false});
  effect.destroy();
  return effect;
};

/** The handle a late `on()` or `once()` gets: there is no subscription behind it. */
const noSubscription = (): void => {};

/**
 * Everything a single shadow-object was given at construction time, and the end of all of it.
 *
 * The scope holds the signals, links and subscriptions the creation API hands out, and it hands the API
 * itself to the kernel through `createAPI()`. The instance stays with the kernel: a shadow-object only ever
 * sees the API object, never the scope behind it.
 *
 * One scope belongs to exactly one shadow-object, and it ends with it -- or, where the constructor throws,
 * without it: a scope that never reached `bindTo()` is torn down by the kernel on the spot, and everything the
 * constructor registered before the throw is released, although no shadow-object came out of it.
 *
 * Eight methods share their name with a module-level import: `on`, `once`, `emit`, `onDestroy`,
 * `onViewEvent`, `createSignal`, `createEffect` and `createMemo`. They are named that way deliberately,
 * because those names are part of the `ShadowObjectCreationAPI` contract a shadow-object destructures by
 * name. Seven of them call or reference their namesake inside their own body; `onDestroy` is the exception,
 * as its import is the entity event that `bindTo()` subscribes to. A bare name inside one of these eight
 * bodies is therefore always the import, and a call on the method of the same name always carries `this.`
 * -- `inertSignal`, `inertEffect` and `noSubscription` are bare names of a different kind, module-level
 * functions with no method of the same name to tell them apart from.
 */
export class ShadowObjectCreationScope {
  readonly #entity: Entity;
  readonly #logger: ConsoleLogger;
  readonly #displayName: string;

  // The kernel's list of member names whose deprecation report has already been made. Shared by
  // every scope of one kernel, which is what makes the report fall once per kernel and name.
  readonly #shownDeprecations: Set<string>;

  // The cleanup callbacks of the shadow-object itself, registered through `onDestroy()`.
  readonly #unsubscribePrimary = new Set<() => any>();

  // The cleanup callbacks the creation API registered on its own behalf. A `Set` iterating in
  // insertion order: which cleanup runs before which is observable behaviour.
  readonly #unsubscribeSecondary = new Set<() => any>();

  // The releases of the provider feeds, one per context name this shadow-object provides. The
  // entity hands each of them out when the provider is attached to it, and they fall after every
  // other cleanup callback, so a write the teardown still makes -- the `undefined` of a
  // `clearOnDestroy`, or one from an `onDestroy` callback -- reaches the entity-side signal instead
  // of stopping at the provider. Where the entity lives on, that is what makes the write count: the
  // entity hands it on to its own context signal one microtask later, and from there to its readers
  // and to the entities below it. The order matters in the other direction as well, because a
  // release also lets a provider that stays on the entity write its value once more, and that
  // hand-over may only happen once the write of the leaving provider is through.
  //
  // Where the entity is destroyed, the two kinds of target part ways. The signal behind
  // `provideContext()` takes the write and keeps it: the microtask that would hand it on falls
  // after the entity has cleared and destroyed its context signals, and the children that outlive
  // it were re-bound before the teardown even began. The signal behind `provideGlobalContext()`
  // stays a member of the kernel-wide chain of its name until the entity's own destruction runs at
  // `Priority.Min`, so the write does travel on to the inherited signals of other entities -- with
  // no observable difference, because the entity takes its signal out of that chain in the same run,
  // and what the chain resolves to without it is what those readers were going to see anyway: the
  // contribution of the next entity that holds the name, or nothing where there is none. The
  // ordering is kept for the paths on which it is observable.
  readonly #unsubscribeContextFeeds = new Set<() => any>();

  readonly #contextReaders = new Map<string | symbol, SignalReader<any>>();
  readonly #contextReaderCompares = new Map<string | symbol, CompareFunc<any> | undefined>();
  readonly #contextParentReaders = new Map<string | symbol, SignalReader<any>>();
  readonly #contextParentReaderCompares = new Map<string | symbol, CompareFunc<any> | undefined>();
  readonly #contextProviders = new Map<string | symbol, Signal<any>>();
  readonly #contextRootProviders = new Map<string | symbol, Signal<any>>();

  // The provider signals that already have their `clearOnDestroy` write registered in
  // `#unsubscribeSecondary`. Keyed by the signal itself rather than by name, because a
  // `provideContext(name)` and a `provideGlobalContext(name)` call can share one name while landing
  // in two different maps above -- a name-keyed set would conflate the two providers.
  readonly #clearOnDestroyRegistered = new Set<Signal<any>>();

  readonly #propertyReaders = new Map<string, SignalReader<any>>();
  readonly #propertyCompares = new Map<string, CompareFunc<any> | undefined>();

  #shadowObject: ShadowObjectType | undefined;
  #releaseScope: (() => void) | undefined;
  #forgetShadowObject: (() => void) | undefined;
  #unsubscribeFromEntityDestroy: (() => void) | undefined;

  #isTornDown = false;

  // Armed at the *end* of `tearDown()`, not at its start, and the difference is the whole point:
  // the teardown runs the shadow-object's own cleanup callbacks, and those are allowed the creation
  // API -- a goodbye to the view, a last write. What they register there is still swept up by the
  // steps behind them. What arrives after the teardown has returned is not, which is what this
  // closes.
  #isCreationApiClosed = false;

  // The member names whose late call has already been reported, at most as many as the API has
  // members. Lazy, because a scope that is used correctly never allocates it.
  #lateCallsReported: Set<string> | undefined;

  /**
   * The name the kernel gave this scope, taken from the constructor it belongs to rather than from
   * the shadow-object that came out of it. The two agree for most forms -- a class and a function
   * that returns nothing both leave their own name on the instance's `constructor` -- but not for a
   * function that returns an object literal: `new` hands that literal back, and it reports `Object`.
   * Reports about the shadow-object are keyed by this name, so the kernel reads it here instead of
   * asking the instance.
   */
  get displayName(): string {
    return this.#displayName;
  }

  /**
   * The four teardown handles, read without waiting on a garbage collector: a test can check that
   * `tearDown()` let go of them by comparing this before and after, rather than by proving the
   * absence of a reference through a `WeakRef`.
   *
   * @internal
   */
  get debugHandles(): {
    shadowObject: ShadowObjectType | undefined;
    releaseScope: (() => void) | undefined;
    forgetShadowObject: (() => void) | undefined;
    unsubscribeFromEntityDestroy: (() => void) | undefined;
  } {
    return {
      shadowObject: this.#shadowObject,
      releaseScope: this.#releaseScope,
      forgetShadowObject: this.#forgetShadowObject,
      unsubscribeFromEntityDestroy: this.#unsubscribeFromEntityDestroy,
    };
  }

  /**
   * How many cleanup callbacks the scope is holding, one count per set, read without waiting on a
   * garbage collector: a test can subscribe and unsubscribe n times and see that the scope let go
   * of each handle as it went, rather than inferring it from what a collector happened to do.
   *
   * @internal
   */
  get debugCleanupCounts(): {primary: number; secondary: number; contextFeeds: number} {
    return {
      primary: this.#unsubscribePrimary.size,
      secondary: this.#unsubscribeSecondary.size,
      contextFeeds: this.#unsubscribeContextFeeds.size,
    };
  }

  constructor(entity: Entity, logger: ConsoleLogger, displayName: string, shownDeprecations: Set<string>) {
    this.#entity = entity;
    this.#logger = logger;
    this.#displayName = displayName;
    this.#shownDeprecations = shownDeprecations;
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
   *
   * One scope serves one shadow-object, once: the call is part of the contract, and both ways of breaking
   * it are refused below.
   */
  bindTo(shadowObject: ShadowObjectType, releaseScope: () => void, forgetShadowObject: () => void): void {
    // Refused rather than quietly returned, unlike `tearDown()`, where a second call is two teardown paths
    // legitimately meeting. A second binding is nothing of the sort -- it would mean one scope serving two
    // shadow-objects. It would replace the handles of the first: the release of the kernel's map entry and
    // the unsubscribe from the entity's `onDestroy`, leaving the first shadow-object standing in the kernel
    // and on the entity with nothing left to take it out.
    //
    // The teardown is asked about first, because it is the only one of the two checks that still applies to
    // a torn-down scope: `tearDown()` lets go of `#shadowObject` at its own end, so a scope that has already
    // torn down would otherwise sail straight past the second check below and rebind. Once a scope carries a
    // shadow-object, it is the second check that tells a live scope's first binding from its second -- the
    // two never overlap on a scope that is still live.
    if (this.#isTornDown) {
      throw new Error(`the creation scope of "${this.#displayName}" has torn down and cannot be bound`);
    }
    if (this.#shadowObject !== undefined) {
      throw new Error(`the creation scope of "${this.#displayName}" is already bound to a shadow-object`);
    }

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
   * Runs once, whichever path reaches it first.
   *
   * Three lead here. Two belong to a shadow-object that lived: its entity is destroyed, or it leaves the
   * constructor set of an entity that stays. On the third, the kernel calls this directly on a scope that
   * `bindTo()` never saw, because the constructor threw -- there is no shadow-object then, and three of the
   * handles below are still unset (`#releaseScope` and `#unsubscribeFromEntityDestroy` at the start,
   * `#forgetShadowObject` at the end), which is why all three are called optionally.
   *
   * The provider feeds are released after everything else, so that a write made on the way out reaches the
   * entity-side signal rather than stopping at the provider, and so that the entity hands the context over to
   * a provider that stays only once that write is through.
   *
   * The flag makes the teardown a one-time act: a destroy callback reaching back into the kernel finds no
   * way to start it a second time. Releasing both handles right after ends the retention in both directions
   * -- the kernel's map points from the shadow-object to this scope, the subscription points from the entity
   * to the same scope.
   *
   * The kernel is told to forget the shadow-object at the very end, so a destroy callback that reaches back
   * into the kernel still finds its shadow-object listed among the ones the constructor created. Once that
   * call is through, the four handles above are let go of as well -- the shadow-object, both kernel releases
   * and the entity subscription -- so a scope past this point holds none of the four through these fields.
   *
   * Every step below runs behind its own guard, so a callback or signal teardown that throws does not stop
   * the ones after it: the remaining callbacks, the remaining signal releases, and the provider feed
   * hand-over all still happen. A caught error goes to the logger by displayName and the label of the step
   * that failed, and is not re-thrown -- neither `changeToken()` nor `destroyEntity()` deliver it to their
   * caller, nor does it stop the destroy notification the entity is still delivering to whatever comes after
   * this shadow-object in the same run.
   *
   * The creation API is closed as the very last step, after everything above has run. Until then it
   * is open, because the cleanup callbacks of the shadow-object run inside this method and are
   * entitled to it -- a last message to the view, a last write to a context. What such a callback
   * registers is still reached by the steps behind it. What arrives once this method has returned
   * is not, and is turned away by `#refuseAfterTearDown()`.
   */
  tearDown(): void {
    if (this.#isTornDown) return;
    this.#isTornDown = true;

    this.#runGuarded('scope release', () => this.#releaseScope?.());
    this.#runGuarded('entity destroy subscription', () => this.#unsubscribeFromEntityDestroy?.());

    // Without a shadow-object there is nothing to report here: none ever came to be, because the
    // constructor threw before it could.
    if (this.#logger.isInfo && this.#shadowObject !== undefined) {
      this.#logger.info('destroy shadow-object', this.#displayName, {shadowObject: this.#shadowObject, entity: this.#entity});
    }

    for (const callback of this.#unsubscribePrimary) {
      this.#runGuarded('onDestroy callback', callback);
    }

    for (const callback of this.#unsubscribeSecondary) {
      this.#runGuarded('creation-api cleanup', callback);
    }

    for (const callback of this.#unsubscribeContextFeeds) {
      this.#runGuarded('context feed release', callback);
    }

    for (const sig of this.#contextReaders.values()) {
      this.#runGuarded('context reader', () => destroySignal(sig));
    }

    for (const sig of this.#contextParentReaders.values()) {
      this.#runGuarded('parent context reader', () => destroySignal(sig));
    }

    for (const sig of this.#propertyReaders.values()) {
      this.#runGuarded('property reader', () => destroySignal(sig));
    }

    for (const sig of this.#contextProviders.values()) {
      this.#runGuarded('context provider', () => destroySignal(sig));
    }

    for (const sig of this.#contextRootProviders.values()) {
      this.#runGuarded('global context provider', () => destroySignal(sig));
    }

    this.#unsubscribePrimary.clear();
    this.#unsubscribeSecondary.clear();
    this.#unsubscribeContextFeeds.clear();
    this.#contextReaders.clear();
    this.#contextReaderCompares.clear();
    this.#contextParentReaders.clear();
    this.#contextParentReaderCompares.clear();
    this.#propertyReaders.clear();
    this.#propertyCompares.clear();
    this.#contextProviders.clear();
    this.#contextRootProviders.clear();
    this.#clearOnDestroyRegistered.clear();

    this.#runGuarded('forget shadow-object', () => this.#forgetShadowObject?.());

    // Let go of the shadow-object and both kernel handles: nothing reads them past this point --
    // the info line above already ran, `#releaseScope` and `#unsubscribeFromEntityDestroy` were
    // called at the start of this method, and `#forgetShadowObject` was just called above. A scope
    // past this point holds neither the shadow-object nor either kernel handle through these
    // fields. `#entity` is a separate, `readonly` field the scope carries for its whole life --
    // it stays set here, and the entity, with the kernel behind it, stays reachable through it
    // whether or not the scope has torn down.
    this.#shadowObject = undefined;
    this.#releaseScope = undefined;
    this.#forgetShadowObject = undefined;
    this.#unsubscribeFromEntityDestroy = undefined;

    this.#isCreationApiClosed = true;
  }

  /**
   * Isolates one teardown step from the ones around it: a step that throws is reported through the
   * logger -- ungated, so the report stays visible outside localhost -- and does not stop `tearDown()`
   * from reaching the steps that follow.
   */
  #runGuarded(step: string, run: () => void): void {
    try {
      run();
    } catch (error) {
      this.#logger.error(`shadow-object teardown failed (${step}):`, this.#displayName, error);
    }
  }

  /**
   * Books an `on()` or `once()` subscription into the cleanup set and hands back a handle that takes
   * it out again. Unsubscribing releases the callback there and then rather than at the teardown, so
   * a shadow-object that subscribes and unsubscribes over the whole life of its entity holds one
   * handle at a time instead of one per call. The target makes no difference to that: a subscription
   * on the entity ends the same way one on any other object does.
   */
  #trackSubscription(unsubscribe: () => void): () => void {
    this.#unsubscribeSecondary.add(unsubscribe);

    return Object.assign(() => {
      this.#unsubscribeSecondary.delete(unsubscribe);
      unsubscribe();
    }, unsubscribe);
  }

  /**
   * The body the three cached readers share: one reader per name, created on the first call and fed
   * from the entity-side source, plus a warning when a later call brings a different {compare}
   * function than the one the reader was created with.
   *
   * `linkSource` is a thunk because the source may only be read when a reader is actually created.
   */
  #cachedReader<K extends string | symbol>(
    name: K,
    readers: Map<K, SignalReader<any>>,
    compares: Map<K, CompareFunc<any> | undefined>,
    linkSource: () => SignalReader<any>,
    opts: SignalValueOptions<any> | undefined,
    apiName: string,
    subject: string,
  ): SignalReader<any> {
    let reader = readers.get(name);

    if (reader === undefined) {
      reader = createSignal<any>(undefined, opts).get;
      readers.set(name, reader);
      compares.set(name, opts?.compare);
      // Destroying this link is what ends the feed: the entity-side signal must not go on writing
      // into a reader that the teardown has already destroyed.
      const ln = link(linkSource(), reader);
      this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
    } else if (opts?.compare != null && compares.get(name) !== opts.compare) {
      // Through `error` for the same reason as the deprecation report below: the options of this
      // call are being dropped, and the caller has to hear that outside `localhost` too, where the
      // shared `enable` behind `isWarn` is off.
      this.#logger.error(
        `[shadow-objects] ${apiName}("${String(name)}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per ${subject}.`,
      );
    }

    return reader;
  }

  /**
   * Reports the deprecated call form in which a bare compare function stands where the options
   * object belongs, at most once per kernel and member name.
   *
   * Through `error` rather than `warn`: this names a mistake in the calling code, and its author
   * has to see it wherever the application runs. `logger.warn` is asked `isWarn` first, and the
   * shared `enable` behind that getter is off anywhere but `localhost` -- a deprecation notice
   * that goes silent everywhere the code actually ships is no notice at all. See the table of
   * call against getter under "Console Logger" in `docs/api-reference.md`.
   *
   * One line per kernel and member name: a shadow-object calling a deprecated member inside a
   * loop would otherwise fill the console.
   */
  #reportDeprecatedIsEqualOption(options: unknown, apiName: string): void {
    if (typeof options !== 'function' || this.#shownDeprecations.has(apiName)) return;
    this.#logger.error(
      `[shadow-objects] Deprecation Warning: The "isEqual" option of "${apiName}()" is now passed as {compare} argument. Please update your code accordingly.`,
    );
    this.#shownDeprecations.add(apiName);
  }

  /**
   * Answers whether the creation API still has anything to give, and reports it where it has not.
   *
   * Past the teardown the scope has released what it held and cleared what it tracked. A call
   * arriving now would fill those maps again with entries no second teardown ever reaches -- the
   * teardown runs once, and it has run. Such a call is therefore turned away rather than served.
   *
   * Turned away quietly: the callers that arrive late are the ones with nobody to catch a throw --
   * a timer, a continuation behind an `await`, a callback of some other object that outlived this
   * one. It is reported instead, through `error` for the same reason the deprecation report above
   * uses it: this names a mistake in the calling code, and its author has to see it wherever the
   * application runs. Once per member name and scope, because a stale timer comes back on its next
   * tick and a line per tick would bury the first one.
   */
  #refuseAfterTearDown(apiName: string): boolean {
    if (!this.#isCreationApiClosed) return false;

    if (!this.#lateCallsReported?.has(apiName)) {
      (this.#lateCallsReported ??= new Set()).add(apiName);
      this.#logger.error(
        `[shadow-objects] ${apiName}(): the creation scope of "${this.#displayName}" has torn down — the call does nothing. Something is still holding the creation API past the end of its shadow-object.`,
      );
    }

    return true;
  }

  useProperty<T = any>(name: string, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>> {
    if (this.#refuseAfterTearDown('useProperty')) return inertSignal().get;

    this.#reportDeprecatedIsEqualOption(options, 'useProperty');

    const opts = typeof options === 'function' ? {compare: options} : options;

    return this.#cachedReader(
      name,
      this.#propertyReaders,
      this.#propertyCompares,
      () => this.#entity.getPropertyReader(name),
      opts,
      'useProperty',
      'property',
    );
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

  /**
   * The body the two context providers share: one provider signal per name, created on the first
   * call, attached to the entity-side context signal, and cleared on teardown unless the caller
   * opted out -- a clearing that finds the way to the entity side still open. A source signal handed
   * in instead of an initial value feeds the provider through a link of its own.
   *
   * The entity keeps every provider of a name together and answers the attachment with the release
   * that detaches this one again. Releasing it does more than cut the feed: the entity then lets a
   * provider that stays write its value once more, so the name ends up with a value that is actually
   * still being provided rather than with what this shadow-object left behind on its way out.
   *
   * `attachToEntity` is called inside the creation branch only, so the entity-side signal is
   * requested when a provider is actually created. The `clearOnDestroy` check sits outside that
   * branch: every call is allowed to ask for the clearing, not only the one that created the signal.
   * The request is booked once per provider, though -- a repeated ask does not queue a second write,
   * and once a provider has one on file, an opt-out on a later call does not take it back.
   */
  #provideContextSignal(
    name: string | symbol,
    providers: Map<string | symbol, Signal<any>>,
    attachToEntity: (provider: Signal<any>) => () => void,
    sourceOrInitialValue: unknown,
    opts: ProvideContextOptions<any> | undefined,
  ): Signal<any> {
    let ctxProvider = providers.get(name);

    if (ctxProvider == null) {
      const isSig = isSignal(sourceOrInitialValue);
      const initialValue = isSig ? undefined : toMaybe(sourceOrInitialValue);

      ctxProvider = createSignal(initialValue, opts?.compare ? {compare: opts.compare} : undefined);

      if (isSig) {
        const ln = link(sourceOrInitialValue as SignalReader<any>, ctxProvider);
        this.#unsubscribeSecondary.add(ln.destroy.bind(ln));
      }

      // The release runs after every `clearOnDestroy` callback below, so a write to `undefined`
      // still reaches the context signal on the entity side before the feed is cut.
      this.#unsubscribeContextFeeds.add(attachToEntity(ctxProvider));
      providers.set(name, ctxProvider);
    }

    if ((opts?.clearOnDestroy ?? true) && !this.#clearOnDestroyRegistered.has(ctxProvider)) {
      this.#clearOnDestroyRegistered.add(ctxProvider);
      this.#unsubscribeSecondary.add(() => {
        ctxProvider.set(undefined);
      });
    }

    return ctxProvider;
  }

  provideContext<T = unknown>(
    name: string | symbol,
    sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
    options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
  ) {
    if (this.#refuseAfterTearDown('provideContext')) return inertSignal();

    this.#reportDeprecatedIsEqualOption(options, 'provideContext');

    const opts = typeof options === 'function' ? {compare: options} : options;

    return this.#provideContextSignal(
      name,
      this.#contextProviders,
      (provider) => this.#entity.attachContextProvider(name, provider),
      sourceOrInitialValue,
      opts,
    );
  }

  provideGlobalContext<T = unknown>(
    name: string | symbol,
    sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
    options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
  ) {
    if (this.#refuseAfterTearDown('provideGlobalContext')) return inertSignal();

    this.#reportDeprecatedIsEqualOption(options, 'provideGlobalContext');

    const opts = typeof options === 'function' ? {compare: options} : options;

    return this.#provideContextSignal(
      name,
      this.#contextRootProviders,
      (provider) => this.#entity.attachGlobalContextProvider(name, provider),
      sourceOrInitialValue,
      opts,
    );
  }

  useContext<T = unknown>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>) {
    if (this.#refuseAfterTearDown('useContext')) return inertSignal().get;

    this.#reportDeprecatedIsEqualOption(options, 'useContext');

    const opts = typeof options === 'function' ? {compare: options} : options;

    return this.#cachedReader(
      name,
      this.#contextReaders,
      this.#contextReaderCompares,
      () => this.#entity.useContext(name),
      opts,
      'useContext',
      'context',
    );
  }

  useParentContext<T = unknown>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>) {
    if (this.#refuseAfterTearDown('useParentContext')) return inertSignal().get;

    this.#reportDeprecatedIsEqualOption(options, 'useParentContext');

    const opts = typeof options === 'function' ? {compare: options} : options;

    return this.#cachedReader(
      name,
      this.#contextParentReaders,
      this.#contextParentReaderCompares,
      () => this.#entity.useParentContext(name),
      opts,
      'useParentContext',
      'parent context',
    );
  }

  createSignal(...args: any[]): any {
    if (this.#refuseAfterTearDown('createSignal')) return inertSignal();

    // @ts-ignore
    const sig = createSignal(...args);
    this.#unsubscribeSecondary.add(() => {
      destroySignal(sig);
    });
    return sig;
  }

  createEffect(...args: any[]): ReturnType<typeof createEffect> {
    if (this.#refuseAfterTearDown('createEffect')) return inertEffect();

    // @ts-ignore
    const effect = createEffect(...args);
    this.#unsubscribeSecondary.add(effect.destroy);
    return effect;
  }

  createMemo<T = unknown>(...args: Parameters<typeof createMemo<T>>): SignalReader<T> {
    if (this.#refuseAfterTearDown('createMemo')) return inertSignal().get;

    const sig = createMemo<T>(...args);
    this.#unsubscribeSecondary.add(() => {
      destroySignal(sig);
    });
    return sig;
  }

  createResource<T = unknown>(factory: () => T | undefined, cleanup?: (resource: NonNullable<T>) => unknown): Signal<Maybe<T>> {
    if (this.#refuseAfterTearDown('createResource')) return inertSignal();

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
      // `effect.destroy()` runs the consumer's `cleanup`, which may throw. The two releases below
      // still have to run in that case -- a `finally` reaches them without swallowing the throw, so
      // `#runGuarded()` in `tearDown()` still sees and reports it.
      try {
        effect.destroy();
      } finally {
        resourceSignal.set(undefined);
        destroySignal(resourceSignal);
      }
    });

    return resourceSignal;
  }

  on(...args: any[]): ReturnType<typeof on> {
    if (this.#refuseAfterTearDown('on')) return noSubscription;

    const [firstArg] = args;
    const unsubscribe =
      typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)
        ? // @ts-ignore
          on(this.#entity, ...args)
        : // @ts-ignore
          on(...args);

    return this.#trackSubscription(unsubscribe);
  }

  once(...args: any[]): ReturnType<typeof once> {
    if (this.#refuseAfterTearDown('once')) return noSubscription;

    const [firstArg] = args;
    const unsubscribe =
      typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)
        ? // @ts-ignore
          once(this.#entity, ...args)
        : // @ts-ignore
          once(...args);

    return this.#trackSubscription(unsubscribe);
  }

  emit(...args: any[]): void {
    if (this.#refuseAfterTearDown('emit')) return;

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
    if (this.#refuseAfterTearDown('onViewEvent')) return;

    const unsub = on(this.#entity, onViewEvent, (type: string, data: unknown) => {
      callback(type, data);
    });
    this.#unsubscribeSecondary.add(unsub);
  }

  onDestroy(callback: () => any): void {
    if (this.#refuseAfterTearDown('onDestroy')) return;

    this.#unsubscribePrimary.add(callback);
  }

  dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren = false): void {
    if (this.#refuseAfterTearDown('dispatchMessageToView')) return;

    this.#entity.dispatchMessageToView(type, data, transferables, traverseChildren);
  }
}
