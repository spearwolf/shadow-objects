import {emitStrict, off, on, once, Priority} from '@spearwolf/eventize';
import {
  batch,
  createSignal,
  link,
  Signal,
  SignalAutoMap,
  type SignalLink,
  type SignalReader,
  type SignalWriter,
  type SignalWriterParams,
  value,
} from '@spearwolf/signalize';
import type {ComponentPropertiesType, IComponentEvent} from '../types.js';
import {MicrotaskCollector} from '../utils/MicrotaskCollector.js';
import {runGuarded} from '../utils/runGuarded.js';
import {onDestroy, onViewEvent} from './events.js';
import {Kernel} from './Kernel.js';
import {SignalsPath} from './SignalsPath.js';

type ContextNameType = string | symbol;

interface IContextValue {
  name: ContextNameType;
  inherited: Signal<unknown>;
  provide: Signal<unknown>;
  context: Signal<unknown>;
  valuePath: SignalsPath;

  /**
   * The links that feed `provide`, one per provider of this name on this entity. They all write
   * into that one signal, so the value standing there is the one written last -- and the set is
   * what makes it possible to ask a provider that is still here for its value once another one
   * lets go. See {@link Entity.attachContextProvider}.
   */
  providerFeeds: Set<SignalLink<any>>;

  unsubscribePathValue: () => void;
  unsubscribeFromParent?: (() => void) | undefined;
}

interface IRootContextValue {
  signal: Signal<any>;

  /** The links that feed `signal`, exactly as {@link IContextValue.providerFeeds} feeds `provide`. */
  providerFeeds: Set<SignalLink<any>>;

  /** Takes the entity's signal back out of the kernel-wide chain of this name. */
  cleanup: () => void;
}

/** One context value an entity has waiting for its readers in the current round. */
interface IDeferredContextValue {
  value: unknown;
  name: ContextNameType;
  uuid: string;
}

/**
 * The context values waiting to reach their readers, one collector per kernel.
 *
 * Per kernel rather than per module for two reasons that are the same one: a write below can fail,
 * and what it is reported to is a logger, of which there is one per kernel; and an application
 * running two shadow environments in one realm would otherwise hand the values of one to a round
 * the other started. The kernel is the key, so a collector reaches no further than the kernel it
 * belongs to and needs no teardown of its own -- every round empties it, and the last one is
 * emptied by the kernel going out of reach.
 */
const contextValueCollectors = new WeakMap<Kernel, MicrotaskCollector<Signal<unknown>, IDeferredContextValue>>();

const collectorOf = (kernel: Kernel): MicrotaskCollector<Signal<unknown>, IDeferredContextValue> => {
  let collector = contextValueCollectors.get(kernel);
  if (collector == null) {
    collector = new MicrotaskCollector<Signal<unknown>, IDeferredContextValue>((contextValues) => {
      for (const [contextSignal, entry] of contextValues) {
        // one hand-over is one context value: `set()` runs the effects that read it synchronously
        // and throws what one of them threw
        runGuarded(
          kernel.logger,
          () => contextSignal.set(entry.value),
          `an effect of a context value failed (${String(entry.name)}):`,
          entry.uuid,
        );
      }
    });
    contextValueCollectors.set(kernel, collector);
  }
  return collector;
};

/**
 * Collects the context values written in one task and hands them to their readers a microtask
 * later, one at a time. A second value for the same signal replaces the one waiting, so a name
 * written twice in a task reaches its readers once, with the value that stood at the end of it.
 */
const deferContextValueUpdate = (kernel: Kernel, signal: Signal<unknown>, val: unknown, name: ContextNameType, uuid: string) => {
  collectorOf(kernel).add(signal, {value: val, name, uuid});
};

/**
 * An entity has a parent and children, replicating the hierarchy of view-components.
 *
 * A signal is created for each view-component property.
 *
 * Shadow-objects can use the signal properties via the entity.
 */
export class Entity {
  #kernel: Kernel;
  #uuid: string;

  #props = new SignalAutoMap();
  #context: Map<ContextNameType, IContextValue> = new Map();

  #rootContexts: Map<ContextNameType, IRootContextValue> = new Map();

  // There is one place the parent is kept: `parentUuid` answers from `#parent.uuid`, so a half-set
  // link -- a uuid with no matching entity, or an entity with no uuid to show for it -- has no field
  // left to hold it in.
  #parent?: Entity | undefined;

  #childrenUuids: Set<string> = new Set();
  #children: Entity[] = [];

  #order = 0;

  #isReleased = false;

  get kernel(): Kernel {
    return this.#kernel;
  }

  get uuid(): string {
    return this.#uuid;
  }

  get order(): number {
    return this.#order;
  }

  set order(value: number) {
    if (this.#order !== value) {
      this.#order = value;
      if (this.#parent) {
        this.#parent.resortChildren();
      }
      // The place among the siblings is part of the traversal order the kernel caches.
      this.#kernel.noteEntityTreeChange(this.#uuid);
    }
  }

  get parentUuid(): string | undefined {
    return this.#parent?.uuid;
  }

  set parentUuid(parentUuid: string | undefined) {
    if (this.#parent?.uuid !== parentUuid) {
      // Resolve the new parent FIRST so an unknown-uuid throw doesn't orphan us mid-mutation.
      const nextParent = parentUuid ? this.#kernel.getEntity(parentUuid) : undefined;

      if (nextParent != null) {
        this.assertAttachableTo(nextParent);
      }

      // A parent that follows right away binds the contexts itself, so the detachment skips it. The
      // entity keeps reading the parent it leaves until the one it joins takes over.
      this.#detachFromParent(nextParent == null);

      this.#parent = nextParent;

      if (this.#parent) {
        this.#parent.addChild(this);
      }

      this.#updateAutoDestructionSubscription();

      // The link is written; the kernel writes down where the entity stands now. This is the route
      // a shadow-object takes when it moves an entity without going through `Kernel.setParent()`,
      // and the report is the only thing the two share -- the `onParentChanged` notification stays
      // with `setParent()`.
      this.#kernel.noteEntityTreeChange(this.#uuid);
    }
  }

  get parent(): Entity | undefined {
    return this.#parent;
  }

  set parent(parent: Entity | undefined) {
    this.parentUuid = parent?.uuid;
  }

  // Reads the same field `parent` and `parentUuid` do, so `Kernel.noteEntityTreeChange()` -- which
  // reads `hasParent` to decide whether the uuid belongs in the root set -- sees what they see.
  get hasParent(): boolean {
    return !!this.#parent;
  }

  get children(): readonly Entity[] {
    return this.#children;
  }

  constructor(kernel: Kernel, uuid: string) {
    this.#kernel = kernel;
    this.#uuid = uuid;
  }

  traverse(callback: (entity: Entity) => void) {
    this.#traverse(callback, new Set());
  }

  // The visited set guards the one traversal an outside shadow object drives, over a tree it did not
  // build. `addChild()` writes a children list without touching the parent link, so no ancestor check
  // can cover it.
  #traverse(callback: (entity: Entity) => void, visited: Set<Entity>) {
    if (visited.has(this)) return;
    visited.add(this);

    callback(this);

    for (const child of this.#children) {
      child.#traverse(callback, visited);
    }
  }

  /**
   * Releases everything the entity holds: its properties, its subscriptions, its contexts and its place
   * in the entity tree.
   *
   * It runs once, whichever way it is reached. The kernel reaches it directly, right behind the
   * destruction notification it sends on the entity, so that every listener on that notification has
   * had its turn first -- down to `Priority.Min`, which is nobody's but the caller's. The entity is
   * not a listener on its own notification: registering it in the constructor would put it ahead of
   * anything registered at the same priority, because eventize breaks a tie by order of registration,
   * and the bulk `off(this)` below would then take the listeners still waiting in that delivery with
   * it. The flag makes a second call cost nothing and keeps every step below written for a
   * single run: `kernel.getEntity()` hands the entity to anyone, and this method is as reachable as
   * the rest of it.
   *
   * The flag is raised before the first step rather than after the last, because that is what a release
   * running twice would cost: the steps below are written for one pass, not for a repeat.
   *
   * Every step below runs behind a guard of its own, the way `ShadowObjectCreationScope.tearDown()`
   * gives each of its steps one: a step that throws is reported through the kernel's logger, named by
   * the step and by the uuid of this entity, and costs only itself -- the steps behind it still run.
   * The method therefore never throws to its own caller. The plain resets at the end -- clearing a
   * collection, overwriting a field -- cannot throw and run unguarded, exactly as `tearDown()` empties
   * its own sets at the end.
   */
  [onDestroy]() {
    if (this.#isReleased) return;
    this.#isReleased = true;

    // `SignalAutoMap.clear()` destroys every property signal and only then re-raises whatever a
    // dependent effect's cleanup threw along the way, so it belongs behind a guard of its own like
    // every other step here -- it is not the plain reset it looks like.
    this.#runGuarded('properties', () => this.#props.clear());
    this.#runGuarded('listeners', () => off(this));
    this.#runGuarded('auto-destruction subscription', () => this.#autoDestructionSubscription?.());

    for (const rootCtx of this.#rootContexts.values()) {
      this.#runGuarded('global context cleanup', () => rootCtx.cleanup());
      this.#runGuarded('global context signal', () => rootCtx.signal.destroy());
    }

    for (const ctx of this.#context.values()) {
      this.#runGuarded('context value reset', () => ctx.context.set(undefined));
      this.#runGuarded('context value subscription', () => ctx.unsubscribePathValue());
      this.#runGuarded('context parent subscription', () => ctx.unsubscribeFromParent?.());
      this.#runGuarded('context value path', () => ctx.valuePath.dispose());
      this.#runGuarded('inherited context signal', () => ctx.inherited.destroy());
      this.#runGuarded('provided context signal', () => ctx.provide.destroy());
      this.#runGuarded('context signal', () => ctx.context.destroy());
    }

    this.#rootContexts.clear();
    this.#context.clear();

    this.#parent = undefined;

    this.#childrenUuids.clear();
    this.#children.length = 0;
  }

  /**
   * Isolates one release step from the ones around it: a step that throws is reported through the
   * kernel's logger and does not stop `[onDestroy]()` from reaching the steps that follow. The
   * report goes out through the shared `runGuarded()`; what this wrapper adds is the label of the
   * step and the uuid of the entity it belongs to.
   */
  #runGuarded(step: string, run: () => void): void {
    runGuarded(this.#kernel.logger, run, `entity teardown step failed (${step}):`, this.#uuid);
  }

  /**
   * Refuses a parent that would close the entity tree into a ring: the entity itself, or an entity that
   * already sits below it. The walk follows the parent chain upwards, which is a chain exactly because
   * this guard keeps it one.
   *
   * `Kernel.setParent()` calls it before it detaches, and the `parentUuid` setter before it resolves the
   * link, so a refused attachment leaves the entity where it was instead of orphaned halfway through.
   * `ViewComponent.addChild()` guards the same thing on the view side.
   */
  assertAttachableTo(nextParent: Entity) {
    for (let e: Entity | undefined = nextParent; e != null; e = e.parent) {
      if (e === this) {
        throw new Error(
          `entity "${nextParent.uuid}" cannot become the parent of "${this.uuid}": it is the entity itself or one of its descendants`,
        );
      }
    }
  }

  /**
   * Puts `child` into the children list, at its place among the siblings.
   *
   * Nothing here notifies. Neither this method nor {@link Entity.removeChild} nor a detachment
   * sends anything to a listener on the entity -- the one notification over a moved entity is
   * `onParentChanged`, and `Kernel.setParent()` is the call that sends it.
   */
  addChild(child: Entity) {
    if (this.#childrenUuids.has(child.uuid)) {
      throw new Error(`child with uuid: ${child.uuid} already exists! parentUuid: ${this.uuid}`);
    }

    this.#childrenUuids.add(child.uuid);
    this.#insertChildInOrder(child);

    // the child may have created its contexts while it was still unattached: they hang on the root
    // of the entity context tree until something binds them to the parent they now have
    for (const [, ctx] of child.#context) {
      child.#subscribeToParent(ctx);
    }
  }

  /**
   * Puts a child at its place among the siblings, so building a subtree costs one insertion per
   * child. The scan runs from the end because children usually arrive with an equal or rising
   * `order`, which makes the common case a plain append. A child lands behind every sibling that
   * shares its `order` -- the same place a stable sort would give it.
   *
   * The result only matches a full sort while `#children` is already sorted when the insertion
   * starts, so name what keeps it that way: the insertion here preserves the order, `removeChild()`
   * cuts an element out with `splice`, the destroy handler empties the list, and the `order` setter
   * re-sorts through the parent. That last one is the condition worth stating, because it needs the
   * child to know its parent -- the parent link has to be established. Every way an entity is
   * attached inside this class goes through the `parentUuid` setter, which sets the parent before it
   * calls `addChild()`. A caller that reaches for `addChild()` on its own leaves the child without a
   * parent link, and a later `order` on such a child never reaches this list.
   */
  #insertChildInOrder(child: Entity) {
    let i = this.#children.length;
    while (i > 0 && child.order < this.#children[i - 1]!.order) i--;
    this.#children.splice(i, 0, child);
  }

  resortChildren() {
    this.#children.sort((a, b) => a.order - b.order);
  }

  removeChild(child: Entity) {
    // The identity decides here, not the uuid: `indexOf` answers -1 for an entity this list
    // does not hold, and a `splice(-1, 1)` on that answer would cut the last child out
    // instead of none. The ordered uuid lists of `ComponentContext` carry the same guard where
    // they cut a uuid out.
    const idx = this.#children.indexOf(child);
    if (idx !== -1) {
      this.#childrenUuids.delete(child.uuid);
      this.#children.splice(idx, 1);
    }
  }

  /**
   * @param rebindContexts bind every context back to the root of the entity context tree. An entity
   *   that carries a context out of a subtree keeps following the value it can still see, rather
   *   than freezing on the last one the former parent held. Only a caller that attaches the entity
   *   to the next parent in the same breath passes `false` -- that parent binds the contexts itself,
   *   and the detour over the root would be visible to `useParentContext()`, which hands out the
   *   inherited value without the microtask collector `useContext()` has in front of it.
   */
  removeFromParent(rebindContexts = true) {
    this.#detachFromParent(rebindContexts);
  }

  #detachFromParent(rebindContexts: boolean) {
    // The field `parent` and `parentUuid` both answer from: clearing it here clears what either
    // getter would report, with nothing left over for a second check to find.
    if (this.#parent) {
      this.#parent.removeChild(this);

      this.#parent = undefined;

      if (rebindContexts) {
        for (const [, ctx] of this.#context) {
          this.#subscribeToParent(ctx);
        }
      }

      this.#unsubscribeAutoDestruction();

      // Detached is a place too: an entity with no parent is a root, and the root set is where
      // every traversal starts.
      this.#kernel.noteEntityTreeChange(this.#uuid);
    }
  }

  #autoDestructionEnabled = false;
  #autoDestructionSubscription?: (() => void) | undefined;

  get autoDestructionOnParentRemoval(): boolean {
    return this.#autoDestructionEnabled;
  }

  set autoDestructionOnParentRemoval(autoDestruct: boolean) {
    if (this.#autoDestructionEnabled === autoDestruct) return;
    this.#autoDestructionEnabled = autoDestruct;
    this.#updateAutoDestructionSubscription();
  }

  #unsubscribeAutoDestruction() {
    if (this.#autoDestructionSubscription) {
      this.#autoDestructionSubscription();
      this.#autoDestructionSubscription = undefined;
    }
  }

  #updateAutoDestructionSubscription() {
    this.#unsubscribeAutoDestruction();
    if (this.#autoDestructionEnabled && this.#parent) {
      this.#autoDestructionSubscription = once(this.#parent, onDestroy, Priority.Max, () => {
        this.#autoDestructionSubscription = undefined;
        this.#kernel.destroyEntity(this.#uuid);
      });
    }
  }

  /**
   * Binds every context of this entity to its current position in the entity tree -- to the parent
   * if there is one, to the root otherwise. `addChild()` and `removeFromParent()` each do this for
   * the entity they move, so a caller needs this only when it changed the position by other means
   * or wants the binding re-established without knowing which of the two ran.
   *
   * Moving an entity through the kernel is not such a case: both directions bring their own binding,
   * and a third one would reach every `useParentContext()` reader as another change.
   */
  reSubscribeToParentContexts() {
    for (const [, ctx] of this.#context) {
      this.#subscribeToParent(ctx);
    }
  }

  dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren = false) {
    this.#kernel.dispatchMessageToView({uuid: this.#uuid, type, data, transferables, traverseChildren});
  }

  /**
   * Hands the events the view sent to whoever listens on this entity, one delivery per event.
   *
   * Each delivery is guarded, and the reason is where this call sits: the kernel makes it from
   * inside a change trail, on a path that builds. Unguarded, a single shadow-object that cannot cope
   * with a single view event would leave through `Kernel.run()` and refuse the whole trail -- the
   * same argument that puts a guard around the `onParentChanged` notification, which is a delivery
   * on a building path as well. The guard is per event, so one that fails costs neither the events
   * behind it nor the caller anything; `emitStrict()` inside it makes the same promise one level
   * down, to the listeners of one event.
   */
  dispatchViewEvents(events: IComponentEvent[]) {
    for (const {type, data} of events) {
      runGuarded(
        this.#kernel.logger,
        // the concrete class is needed here: eventize cannot reduce its emitter conditional
        // (`NonTypedEmitter<this>`) over the polymorphic `this` type, and no overload then matches
        () => emitStrict(this as Entity, onViewEvent, type, data),
        'entity view event delivery failed:',
        type,
        this.#uuid,
      );
    }
  }

  dispatchViewEvent(type: string, data: unknown) {
    this.dispatchViewEvents([{type, data}]);
  }

  #getPropSignal<T = unknown>(key: string): Signal<T> {
    return this.#props.get<T>(key);
  }

  getPropertyReader<T = unknown>(key: string): SignalReader<T> {
    return this.#getPropSignal<T>(key).get;
  }

  /**
   * A write head for one property. Every write through it drops the cache behind
   * `truthyProps()`: that cache answers `Kernel.#updateShadowObjects()`, which picks the shadow
   * objects of this entity along the property routes of the registry, and a write the cache does
   * not see routes the entity to a state it no longer has.
   *
   * What comes back is a function of the entity, not the `set` of the signal behind the property.
   * The signalize helpers that take a signal-like -- `isSignal()`, `destroySignal()`, `touch()` --
   * do not recognise it; `getPropertyReader()` hands out the signal's own reader for that.
   *
   * A fresh closure is handed out on every call rather than one cached per key: `SignalAutoMap`
   * hands out "a fresh, live" signal for a key whose signal was destroyed from the outside, so a
   * writer cached against the signal captured on an earlier call could end up closing over a corpse.
   * The call sites this feeds -- `setProperty()` from a change-trail application, at most once per
   * property that actually changed -- do not turn this into a hot path.
   */
  getPropertyWriter<T = unknown>(key: string): SignalWriter<T> {
    const signal = this.#getPropSignal<T>(key);
    return (value: unknown, params?: SignalWriterParams<T>) => {
      this.clearTruthyPropsCache();
      signal.set(value as T, params);
    };
  }

  setProperties(properties: ComponentPropertiesType) {
    batch(() => {
      // an entry that names only the key sets the property to `undefined` — the key is there, the value is not
      for (const [key, val] of properties) {
        this.setProperty(key, val);
      }
    });
  }

  setProperty(key: string, value: unknown) {
    this.getPropertyWriter(key)(value);
  }

  getProperty<T = unknown>(key: string): T {
    return value(this.getPropertyReader<T>(key));
  }

  propKeys(): string[] {
    return Array.from(this.#props.keys()) as string[];
  }

  propEntries(): [string, unknown][] {
    return Array.from(this.#props.entries()).map(([key, sig]) => [key, sig.value]) as [string, unknown][];
  }

  #truthyPropsCache: Set<string> | undefined;

  clearTruthyPropsCache() {
    this.#truthyPropsCache = undefined;
  }

  truthyProps(): Set<string> | undefined {
    if (this.#truthyPropsCache) {
      return this.#truthyPropsCache.size ? this.#truthyPropsCache : undefined;
    }
    const truthyProps = new Set<string>();
    for (const [key, sig] of this.#props.entries()) {
      if (typeof key === 'string') {
        const val = sig.value;
        if (val != null && val !== false && val !== '') {
          truthyProps.add(key);
        }
      }
    }
    this.#truthyPropsCache = truthyProps;
    return truthyProps.size ? truthyProps : undefined;
  }

  hasContext(name: ContextNameType): boolean {
    return this.#context.has(name);
  }

  useContext<T = unknown>(name: ContextNameType): SignalReader<T> {
    return this.#findOrCreateContext(name).context.get as SignalReader<T>;
  }

  useParentContext<T = unknown>(name: ContextNameType): SignalReader<T> {
    return this.#findOrCreateContext(name).inherited.get as SignalReader<T>;
  }

  provideContext<T = unknown>(name: ContextNameType): Signal<T> {
    return this.#findOrCreateContext(name).provide as Signal<T>;
  }

  provideGlobalContext<T = unknown>(name: ContextNameType): Signal<T> {
    // The signal behind it is created without an initial value — a context signal does start out
    // empty and holds no `T` until a provider writes one. The cast keeps the same contract
    // `provideContext()` hands out; callers see the `undefined` through `Maybe<T>` in the
    // shadow-object API.
    return this.#findOrCreateGlobalContext(name).signal as Signal<T>;
  }

  /**
   * Attaches a provider signal to the context of `name` on this entity and answers with the release
   * that detaches it again.
   *
   * Every provider of one name writes into the single signal that `provideContext()` hands out, so
   * what a consumer reads is what was written last. The release therefore does two things: it cuts
   * this feed, and it then lets a provider that is still attached write its value once more. Without
   * that second step the context would keep whatever the departure left standing -- the `undefined`
   * of a clearing provider, or the last value of one that opted out of it -- even though this entity
   * still has a provider of the name that says otherwise.
   *
   * A value written straight into the signal from `provideContext()` is not a feed and is therefore
   * overwritten by the next release. Feeding a value in through this method is what makes it survive
   * one.
   */
  attachContextProvider(name: ContextNameType, provider: Signal<any>): () => void {
    const ctx = this.#findOrCreateContext(name);
    return Entity.#attachProviderFeed(provider, ctx.provide, ctx.providerFeeds);
  }

  /**
   * The counterpart of {@link Entity.attachContextProvider} for the global context of `name`.
   *
   * Within one entity the situation is the same one: every provider feeds the single signal this
   * entity contributes to the kernel-wide chain of that name, and a release hands the name back to a
   * provider that stays. Across entities the chain decides on its own -- it resolves to the first
   * entry that holds something, so an entity whose signal falls empty lets the next one through.
   */
  attachGlobalContextProvider(name: ContextNameType, provider: Signal<any>): () => void {
    const rootCtx = this.#findOrCreateGlobalContext(name);
    return Entity.#attachProviderFeed(provider, rootCtx.signal, rootCtx.providerFeeds);
  }

  static #attachProviderFeed(provider: Signal<any>, target: Signal<any>, feeds: Set<SignalLink<any>>): () => void {
    const feed = link(provider, target);
    feeds.add(feed);

    return () => {
      // A release called a second time finds nothing of its own left and leaves the context to
      // whoever holds it by then.
      if (!feeds.delete(feed)) return;
      feed.destroy();
      Entity.#handOverToRemainingProvider(feeds);
    };
  }

  /**
   * Lets the provider that stays write its value into the context signal again.
   *
   * The set iterates in the order the providers were attached and the loop keeps the last hit, so the
   * winner is the one attached last that still holds a value. Attachment order is the order in which the
   * providers took the name: attaching feeds the value straight through, so a later attachment writes
   * over an earlier one, and the hand-over falls back on that order instead of inventing one of its own.
   * It is not the order of the writes -- a provider that writes to its signal after attaching carries
   * the name until the next departure, and the hand-over does not restore that write, because what this
   * entity keeps on file is its providers and not the sequence in which they wrote. Providers holding
   * nothing are passed over -- by the same `!= null` rule with which `SignalsPath` resolves a context
   * chain, and for the same reason: a provider without a value has nothing to say about the name, and
   * electing it would clear a name that is still being provided.
   *
   * A feed whose link is destroyed is passed over as well. A shadow-object owns the signal it was
   * handed and may end it early, which destroys the link without the release ever having run: such a
   * feed still reports a value through its source while its writes go nowhere, so electing it would
   * leave the write of the departure standing, silently and over a provider that is alive.
   *
   * `touch()` is what makes the winner write, because `SignalLink.write()` is protected: touching is
   * the only public way to push the current value of a source through its link again, and the source
   * of a provider that merely stays has no reason to change.
   *
   * Where no remaining feed qualifies, nothing is written: then what the departure left stands,
   * which is the `undefined` of a clearing provider or the last value of one that opted out.
   */
  static #handOverToRemainingProvider(feeds: Set<SignalLink<any>>): void {
    let winner: SignalLink<any> | undefined;
    for (const feed of feeds) {
      if (!feed.isDestroyed && feed.source.value != null) winner = feed;
    }
    winner?.touch();
  }

  #findOrCreateGlobalContext(name: ContextNameType): IRootContextValue {
    if (this.#rootContexts.has(name)) {
      return this.#rootContexts.get(name)!;
    }
    const rootCtx = this.#kernel.findOrCreateRootContext(name);
    const signal = createSignal() as Signal<any>;
    const cleanup = rootCtx.add(signal);
    const ctx: IRootContextValue = {cleanup, signal, providerFeeds: new Set()};
    this.#rootContexts.set(name, ctx);
    return ctx;
  }

  #findOrCreateContext(name: ContextNameType): IContextValue {
    if (this.#context.has(name)) {
      return this.#context.get(name)!;
    }

    const inherited = createSignal();
    const provide = createSignal();
    const context = createSignal();

    const valuePath = new SignalsPath([provide, inherited]);

    const unsubscribePathValue = on(valuePath, SignalsPath.Value, (val) => {
      deferContextValueUpdate(this.#kernel, context, val, name, this.#uuid);
    });

    const ctx: IContextValue = {name, inherited, provide, context, valuePath, providerFeeds: new Set(), unsubscribePathValue};
    this.#context.set(name, ctx);

    this.#subscribeToParent(ctx);

    return ctx;
  }

  #subscribeToParent(ctx: IContextValue) {
    ctx.unsubscribeFromParent?.();
    ctx.unsubscribeFromParent = undefined;
    if (this.parent) {
      const parentCtx = this.parent.#findOrCreateContext(ctx.name);
      const linkToParent = link(parentCtx.context, ctx.inherited);
      ctx.unsubscribeFromParent = linkToParent.destroy.bind(linkToParent);
    } else {
      const rootCtx = this.#kernel.findOrCreateRootContext(ctx.name);
      const linkToRoot = link(rootCtx.value$, ctx.inherited);
      ctx.unsubscribeFromParent = linkToRoot.destroy.bind(linkToRoot);
    }
  }
}
