import {ChangeTrailPhase, ContextLost, GlobalNS} from '../constants.js';
import type {ChangeTrailType, IComponentChangeType, NamespaceType} from '../types.js';
import {removeFrom} from '../utils/array-utils.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {toNamespace} from '../utils/toNamespace.js';
import {ComponentChanges} from './ComponentChanges.js';
import {ComponentMemory} from './ComponentMemory.js';
import type {ViewComponent} from './ViewComponent.js';

interface ViewInstance {
  component: ViewComponent;
  children: string[]; // we use an Array here and not a Set, because we want to keep the insertion order
  changes: ComponentChanges;
  propIsEqual?: Map<string, (a: any, b: any) => boolean> | undefined;
}

declare global {
  var __shadowObjectsContexts: Map<string | symbol, ComponentContext> | undefined;
}

/**
 * Thrown when a {@link ViewComponent} tries to join a {@link ComponentContext} that has
 * already been disposed.
 */
export class ComponentContextDisposedError extends Error {
  constructor(message = 'the component context has been disposed') {
    super(message);
    this.name = 'ComponentContextDisposedError';
  }
}

/**
 * Thrown when a {@link ViewComponent} tries to join a {@link ComponentContext} under a uuid
 * another component of that {@link ComponentContext} is holding. A uuid names one component at a
 * time; it becomes free again once its holder has left.
 */
export class ComponentUuidInUseError extends Error {
  readonly uuid: string;

  constructor(uuid: string) {
    super(`the view component cannot join the component context because the uuid ${uuid} is already held by another component`);
    this.name = 'ComponentUuidInUseError';
    this.uuid = uuid;
  }
}

/**
 * The {@link ComponentContext} represents the current real-time state of the _view components_.
 *
 * Changes to the components and their hierarchy are also logged to the {@link ComponentChanges}.
 *
 * Each time a change trail is created (a call to {@link ComponentContext#buildChangeTrails}),
 * the past changes are summarized and returned as the result. This means that the change trail
 * is always the path of changes from the time of the previous change trail (or from the beginning)
 * to the current call to the {@link ComponentContext#buildChangeTrails} method.
 *
 * In addition, there is the {@link ComponentMemory}. The memory represents the component state at
 * the time of the last change trail, as opposed to the {@link ComponentContext}, which represents
 * the current real-time state of the _view components_.
 *
 * A context is always associated with a namespace.
 * If no namespace is specified when creating a {@link ComponentContext}, the global namespace is used.
 * There is only one {@link ComponentContext} instance per namespace: the constructor returns the
 * existing instance for an already-occupied namespace rather than building a second one, so
 * {@link ComponentContext.get} is the way consumers are meant to reach it.
 */
export class ComponentContext {
  static readonly ReRequestParentRoots = 're-request-parent-roots';
  static readonly ReRequestParent = 're-request-parent';

  /**
   * Ask the element behind a component to let the properties hanging on it look for their host
   * again.
   *
   * A context knows nothing about `<shae-prop>` — a property has no view component and cannot be
   * addressed here. The signal still belongs next to the two above: it travels the same broadcast
   * channel to the same receivers, and the element on the other end is the one that can reach the
   * properties below it.
   */
  static readonly ReRequestEntHost = 're-request-ent-host';

  static getContextsMap(): Map<NamespaceType, ComponentContext> {
    if (globalThis.__shadowObjectsContexts == null) {
      globalThis.__shadowObjectsContexts = new Map<NamespaceType, ComponentContext>();
    }
    return globalThis.__shadowObjectsContexts;
  }

  static get(namespace?: NamespaceType): ComponentContext {
    const ns = toNamespace(namespace);
    const ctxMap = ComponentContext.getContextsMap();
    if (ctxMap.has(ns)) {
      return ctxMap.get(ns)!;
    }
    return new ComponentContext(ns);
  }

  ns?: NamespaceType;

  #components: Map<string, ViewInstance> = new Map();
  #rootComponents: string[] = []; // we use an Array here and not a Set, because we want to keep the insertion order
  #isDisposed = false;

  // which instances name this ComponentContext, and the one place that can say so. #components holds one
  // entry per uuid, and an entry outlives the departure of its component until the next change
  // trail — so a uuid standing in that map is no statement about anyone still being a member
  readonly #componentInstances = new Set<ViewComponent>();

  readonly #componentMemory = new ComponentMemory();

  readonly #logger = new ConsoleLogger('ComponentContext');

  /**
   * The change trail this context built last, as long as nobody has settled it yet.
   * `owners[i]` is the bookkeeping that produced `entries[i]`; `retiring` are the components the
   * build read as spent, which is a verdict of the build and not of the commit — a component
   * destroyed while the trail travels owes its destruction to the *next* trail, and dropping its
   * entry here would leave the entity standing with nothing left to take it down.
   */
  #uncommittedTrail?: {entries: IComponentChangeType[]; owners: ComponentChanges[]; retiring: ComponentChanges[]} | undefined;

  /** The components a build reads as spent: destroyed, or created and dropped without ever going out. */
  #retiringComponents(participants: ComponentChanges[]): ComponentChanges[] {
    return participants.filter((changes) => changes.isDestroyed || (changes.isNew && !changes.isCreated));
  }

  /**
   * Carry out the verdict the build took, for the components whose every entry is settled.
   *
   * A component that has been claimed again since the build stays: a uuid its holder has left is
   * free, and the entry now belongs to whoever took it over.
   */
  #retireComponents(retiring: ComponentChanges[], stillPending?: Set<ComponentChanges>): void {
    for (const changes of retiring) {
      if (stillPending?.has(changes)) continue;
      if (changes.isCreated) continue;
      this.#deleteComponent(changes.uuid, changes);
    }
  }

  /**
   * Release the record of the built trail and drop the components it retired, without folding
   * anything into their bookkeeping.
   */
  #retireBuiltTrail(): void {
    const uncommitted = this.#uncommittedTrail;
    if (uncommitted == null) return;

    this.#uncommittedTrail = undefined;

    this.#retireComponents(uncommitted.retiring);
  }

  constructor(namespace: NamespaceType = GlobalNS) {
    const ns = toNamespace(namespace);
    const ctxMap = ComponentContext.getContextsMap();
    if (ctxMap.has(ns)) {
      return ctxMap.get(ns)!;
    }
    this.ns = ns;
    ctxMap.set(ns, this);
  }

  /**
   * Whether this context has been torn down by {@link ComponentContext.dispose}.
   *
   * A disposed context holds no components, produces empty change trails and no longer
   * occupies its namespace. It cannot be revived; use {@link ComponentContext.get} to
   * obtain a fresh context for the same namespace.
   */
  get isDisposed(): boolean {
    return this.#isDisposed;
  }

  /**
   * Take a component in: it becomes a member of this {@link ComponentContext} and a
   * `CreateEntities` change is written for its uuid.
   *
   * Called by the {@link ViewComponent#context} setter, and by nothing else.
   *
   * @throws {ComponentContextDisposedError} if this {@link ComponentContext} has been disposed
   * @throws {ComponentUuidInUseError} if another member of this {@link ComponentContext} holds
   *   `component.uuid`
   */
  addComponent(component: ViewComponent) {
    if (this.#isDisposed) {
      throw new ComponentContextDisposedError(
        `the view component ${component.uuid} cannot join the component context because it has been disposed`,
      );
    }

    let viewInstance = this.#components.get(component.uuid);

    if (viewInstance) {
      if (viewInstance.component !== component) {
        // a uuid names one component at a time. The entry of a component that has left this
        // ComponentContext outlives it until the next change trail, so a later component may take the
        // uuid over — but not while the component holding it is still a member here: the two
        // would share one entry and one set of create/destroy counts, and the entity behind
        // the uuid would outlive both of them
        if (this.#componentInstances.has(viewInstance.component)) {
          throw new ComponentUuidInUseError(component.uuid);
        }

        // the predecessor promoted its children to root components on its way out; this is the
        // net that keeps a children list from outliving the component that filled it
        for (const childUuid of viewInstance.children.slice(0)) {
          this.#components.get(childUuid)?.component.removeFromParent();
        }
      }

      viewInstance.component = component;
      viewInstance.children = [];
    } else {
      viewInstance = {
        component,
        children: [],
        changes: new ComponentChanges(component.uuid),
        propIsEqual: undefined,
      };
      this.#components.set(component.uuid, viewInstance);
    }

    viewInstance.changes.create(
      component.token,
      component.parent?.uuid,
      component.order,
      component.autoDestructionOnParentRemoval,
    );

    if (component.parent) {
      this.addToChildren(component.parent, component);
      viewInstance.changes.setParent(component.parent.uuid);
    } else {
      this.#appendToOrdered(component, this.#rootComponents);
    }

    this.#componentInstances.add(component);
    this.#viewInstances = undefined;
  }

  hasComponent(component: ViewComponent) {
    return this.#components.has(component.uuid);
  }

  hasComponents() {
    return this.#components.size > 0;
  }

  isRootComponent(component: ViewComponent) {
    return this.#rootComponents.includes(component.uuid);
  }

  destroyComponent(component: ViewComponent) {
    // every way out of this context comes through here, so this is where an instance stops
    // naming us — unconditional, because a caller from outside runs through twice:
    // destroyComponent(vc) → vc.destroy() → destroyComponent(vc)
    this.#componentInstances.delete(component);

    const entry = this.#components.get(component.uuid);

    // destroying an entry twice would put the destroy count ahead of the create count: a
    // component that joins again afterwards would be destroyed by the very next change trail.
    // And the entry belongs to whoever holds the uuid now — a component that has already left
    // goes a second time without taking that one's entity down with it
    if (entry !== undefined && entry.component === component && !entry.changes.isDestroyed) {
      for (const childUuid of entry.children.slice(0)) {
        this.#components.get(childUuid)?.component.removeFromParent();
      }
      entry.changes.destroy();
      this.#viewInstances = undefined;
    }

    // a component this context has torn down must not keep pointing at it, otherwise it keeps
    // reporting itself as alive. A component drops that pointer as it leaves its context, before
    // it calls back in here, so this branch is taken at most once
    if (component.context === this) {
      component.destroy();
    }
  }

  getChildren(component: ViewComponent): ViewComponent[] {
    return this.#components.get(component.uuid)?.children.map((uuid) => this.#components.get(uuid)!.component) ?? [];
  }

  removeFromParent(component: ViewComponent, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      // the child may already be gone (destroyComponent, removeSubTree) while the component
      // still holds on to its parent — detaching it must not resurrect it as a root.
      // And an entry a later component has taken over must not be touched by the one that left it
      // behind — same guard as destroyComponent() and moveToRoot(), for the same reason: mutating
      // it here would corrupt the live component's parent and its place among the roots
      const childEntry = this.#components.get(component.uuid);
      if (childEntry === undefined || childEntry.component !== component) return;

      const parentEntry = this.#components.get(parent.uuid)!;
      const childIdx = parentEntry.children.indexOf(component.uuid);
      if (childIdx !== -1) {
        parentEntry.children.splice(childIdx, 1);
        childEntry.changes.setParent(undefined);
      }
      this.#appendToOrdered(childEntry.component, this.#rootComponents);
      this.#viewInstances = undefined;
    }
  }

  moveToRoot(component: ViewComponent) {
    // an entry a later component has taken over must not be touched by the one that left it
    // behind — same guard as destroyComponent() and removeFromParent(), for the same reason:
    // mutating it here would corrupt the live component's parent and its place among the roots
    const childEntry = this.#components.get(component.uuid);
    if (childEntry !== undefined && childEntry.component === component) {
      childEntry.changes?.setParent(undefined);
      this.#appendToOrdered(childEntry.component, this.#rootComponents);
    }
    this.#viewInstances = undefined;
  }

  changeToken(component: ViewComponent, token?: string) {
    this.#components.get(component.uuid)?.changes.changeToken(token);
  }

  isChildOf(child: ViewComponent, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      const entry = this.#components.get(parent.uuid)!;
      return entry.children.includes(child.uuid);
    }
    return false;
  }

  addToChildren(parent: ViewComponent, child: ViewComponent) {
    const entry = this.#components.get(parent.uuid);
    if (entry) {
      this.#appendToOrdered(child, entry.children);
      this.#components.get(child.uuid)?.changes.setParent(parent.uuid);
      removeFrom(this.#rootComponents, child.uuid);
      this.#viewInstances = undefined;
    } else {
      throw new Error(`the view component ${parent.uuid} cannot have a child added to it because the component do not exist!`);
    }
  }

  /**
   * Destroy a component and all its descendants without writing anything to a change trail.
   * Each of them is detached from this context and reports {@link ViewComponent#isDestroyed}.
   *
   * @see {@link ComponentContext.clear}
   */
  removeSubTree(uuid: string) {
    this.#removeSubTree(uuid, new Set());
  }

  #removeSubTree(uuid: string, visited: Set<string>) {
    if (visited.has(uuid)) return;
    visited.add(uuid);

    const entry = this.#components.get(uuid);
    if (entry) {
      for (const childUuid of entry.children.slice(0)) {
        this.#removeSubTree(childUuid, visited);
      }
      // the entry goes before the teardown, not after it: `ViewComponent.Destroyed` travels
      // while the component is still able to act, and a listener there may put the component
      // back into this ComponentContext. Deleting the entry afterwards would take that join with
      // it and leave the component naming a ComponentContext that holds nothing under its uuid —
      // free for a second component to claim, with both alive. Nothing here needs the entry
      // afterwards: this path writes no change trail, so the change bookkeeping in it has no
      // reader left, and the child uuid comes out of the parent's children list from here, while
      // the parent link is still there to name it — the teardown drops that link
      this.#deleteComponent(uuid);
      this.destroyComponent(entry.component);
    }
  }

  /**
   * @returns `true` if the value differs from the last value written to a change trail
   */
  setProperty<T = unknown>(component: ViewComponent, propKey: string, value: T, isEqual?: (a: T, b: T) => boolean): boolean {
    const vi = this.#components.get(component.uuid);
    if (vi != null) {
      if (isEqual != null) {
        vi.propIsEqual ??= new Map();
        vi.propIsEqual.set(propKey, isEqual);
      } else if (vi.propIsEqual?.has(propKey)) {
        vi.propIsEqual.delete(propKey);
      }
      return vi.changes.changeProperty(propKey, value, isEqual);
    }
    return false;
  }

  removeProperty(component: ViewComponent, propKey: string) {
    this.#components.get(component.uuid)?.changes.removeProperty(propKey);
  }

  /**
   * Hand the properties of `component` over to the context it has just joined.
   *
   * Called by the {@link ViewComponent#context} setter, and by nothing else. It reads the state
   * this context still holds for the component: leaving a context destroys it, but the entry
   * survives until the next {@link ComponentContext.buildChangeTrails}, so the properties are
   * still there to be read once the join has happened.
   *
   * The equality function travels with each property, because it is a rule about the key and not
   * about the value — the same key means the same notion of "unchanged" wherever it lives. It does
   * not get to decide about the arrival, though: the target holds nothing for the key yet, so it
   * would be asked whether the value equals `undefined`, and a function that says yes would drop
   * the property instead of carrying it over. The value is therefore written first and the rule
   * registered after it — the other way round, the write would delete the entry it just made,
   * because {@link ComponentContext.setProperty} keeps only what its caller passes.
   *
   * What the registered rule is for: {@link ComponentContext.reCreateChanges} is its one reader,
   * and it compares with it when it rebuilds a component from the memory. A later
   * {@link ComponentContext.setProperty} does not consult it — it uses its own argument, or none.
   *
   * Built like {@link ComponentChanges.transferEventsTo}, with one difference: the properties are
   * copied, not moved. What stays behind goes down with the entity in this context.
   */
  transferPropertiesTo(component: ViewComponent, target: ComponentContext) {
    const vi = this.#components.get(component.uuid);
    if (vi === undefined) return;

    for (const [key, value] of vi.changes.getProperties()) {
      target.setProperty(component, key, value);

      const isEqual = vi.propIsEqual?.get(key);
      if (isEqual != null) {
        target.#registerPropIsEqual(component, key, isEqual);
      }
    }
  }

  #registerPropIsEqual(component: ViewComponent, propKey: string, isEqual: (a: any, b: any) => boolean) {
    const vi = this.#components.get(component.uuid);
    if (vi === undefined) return;

    vi.propIsEqual ??= new Map();
    vi.propIsEqual.set(propKey, isEqual);
  }

  changeOrder(component: ViewComponent) {
    // a component this context does not (or no longer) hold must never be re-inserted into an
    // ordered list — this is public API, so the argument may well be a component whose uuid has
    // no entry here at all, and a uuid put back into an ordered list without one makes clear() panic
    const entry = this.#components.get(component.uuid);
    if (entry === undefined) return;

    const parentEntry = component.parent ? this.#components.get(component.parent.uuid) : undefined;
    if (parentEntry !== undefined) {
      removeFrom(parentEntry.children, component.uuid);
      this.#appendToOrdered(component, parentEntry.children);
    } else if (component.parent == null) {
      removeFrom(this.#rootComponents, component.uuid);
      this.#appendToOrdered(component, this.#rootComponents);
    }

    entry.changes.changeOrder(component.order);
    this.#viewInstances = undefined;
  }

  /**
   * @returns all view-components in breadth-first order
   */
  traverseLevelOrderBFS(): ViewComponent[] {
    return this.#traverseLevelOrderBFS().map((vi) => vi.component);
  }

  /**
   * Dispatch an event to the shadow objects linked to the view component
   */
  dispatchShadowObjectsEvent(component: ViewComponent, type: string, data: unknown, transferables?: Transferable[]) {
    this.#components.get(component.uuid)?.changes.createEvent(type, data, transferables);
  }

  /**
   * Dispatch an event to all view components
   */
  broadcastEvent(type: string, data: unknown = undefined) {
    for (const c of this.traverseLevelOrderBFS()) {
      c.dispatchEvent(type, data, false);
    }
  }

  /**
   * Dispatch an event (usually from the shadow-objects from the worker env) to a specific view component
   */
  dispatchMessage(uuid: string, type: string, data: unknown = undefined, traverseChildren = false) {
    this.#components.get(uuid)?.component.dispatchEvent(type, data, traverseChildren);
  }

  /**
   * Inform all root components that they should re-request their parents.
   *
   * Every root is asked, because there is nothing here to ask about: the message carries no
   * sender, so this side cannot narrow the set down at all. The receiver is the one that can:
   * it re-asks the element tree, and whoever answers first wins.
   *
   * Delivery is immediate: the round is over by the time the call returns. Nothing inside the
   * library calls it — an entity that has just arrived hands its round to the collector
   * below — and it stays because running a round at a moment of one's own choosing is what this
   * method is for.
   */
  dispatchReRequestParentRoots() {
    // a root that answers with a parent is taken out of #rootComponents right away, so walking
    // the live array would skip the entry that slid into the freed slot — every second candidate
    for (const uuid of this.#rootComponents.slice(0)) {
      this.dispatchMessage(uuid, ComponentContext.ReRequestParentRoots);
    }
  }

  /**
   * Inform the children of `component` that they should re-request their parents.
   *
   * The receivers are the components hanging on `component` right now, and every one of them has
   * to let go: the message carries no sender and needs no filter, because there is nothing here to
   * decide. {@link ComponentContext.ReRequestParentRoots} is the signal for it — it means "drop
   * your parent and ask again", which is what the roots happen to be asked for most often, not
   * what it says.
   */
  dispatchReRequestParentChildren(component: ViewComponent) {
    // getChildren() hands out a fresh array, so a child that re-parents mid-loop cannot displace
    // the entry behind it
    for (const child of this.getChildren(component)) {
      this.dispatchMessage(child.uuid, ComponentContext.ReRequestParentRoots);
    }
  }

  /**
   * Inform the siblings of `component` that they should re-request their parents.
   *
   * This narrows the candidate set for one specific question: which components could have bound
   * to an ancestor further away than they should have, because `component` was not yet answering
   * when they asked? Such a component sits below `component` in the element tree and shares its
   * parent — any entity in between would have answered first. As long as `component` has no
   * parent of its own, the roots are that same set.
   *
   * The signal alone does not decide anything: the receiver re-asks, and whoever answers first
   * wins. Which components exist as candidates is what this method knows; whether one of them
   * really sits below `component` is settled on the receiving side, which is where the element
   * tree is visible — `data` is what carries the sender's identity there.
   *
   * The two signals differ in the order they work in, and that decides more than it looks like:
   * {@link ComponentContext.ReRequestParentRoots} releases the parent before asking, so a
   * component that gets the same answer back re-joins its parent's children at the end;
   * {@link ComponentContext.ReRequestParent} asks first and releases only where nobody answers,
   * which leaves every component that is already bound where it stands, order included.
   *
   * Delivery is immediate, and nothing inside the library calls it — it stays for the
   * same reason {@link ComponentContext.dispatchReRequestParentRoots} does.
   */
  dispatchReRequestParentSiblings(component: ViewComponent, data: unknown = undefined) {
    const parent = component.parent;
    if (parent == null) {
      this.dispatchReRequestParentRoots();
      return;
    }
    // getChildren() hands out a fresh array, so a child that re-parents mid-loop cannot displace
    // the entry behind it — unlike #rootComponents, which is the live list
    for (const child of this.getChildren(parent)) {
      if (child !== component) {
        this.dispatchMessage(child.uuid, ComponentContext.ReRequestParent, data);
      }
    }
  }

  /**
   * The peers waiting for a round: sender by sender in arrival order, each with the data the
   * round it asks for would carry.
   */
  #pendingPeerReRequests = new Map<ViewComponent, unknown>();

  #peerReRequestFlushScheduled = false;

  /**
   * Take a peer re-request from `sender` — an entity that has just become one and may be the new
   * closest ancestor for entities that bound while it was not yet answering.
   *
   * Everything that arrives in the same task shares one round. Alone, each arrival is a broadcast
   * over the whole candidate set: the root channel carries no sender and has to ask every root,
   * the sibling channel asks every child of one parent. n entities coming up together then cost
   * n(n+1)/2 messages, and each message is a full ancestor request through the DOM — for 600 roots
   * in one namespace that is 180 300 messages and some 257 ms on top of a build that takes 42 ms
   * with the channel switched off. One round per task costs 600 messages and 2 ms on top. The
   * point where a round per arrival costs more than a frame lies at about 145 roots in one
   * namespace; one round per task stays clear of it over the whole measured range, up to 600.
   *
   * Numbers measured 2026-08-22 in Chromium via Playwright 1.62.1 — a snapshot, not a guarantee;
   * the size series is in `packages/shadow-objects/docs/guides.md`, under "How Many Entities Fit
   * in One Namespace".
   *
   * @param data travels with the round as long as `sender` is the only one in it — see
   *   {@link ComponentContext.dispatchReRequestParentSiblings} for what a receiver does with it.
   *
   * @internal
   */
  collectPeerReRequest(sender: ViewComponent, data: unknown = undefined): void {
    this.#pendingPeerReRequests.set(sender, data);

    if (!this.#peerReRequestFlushScheduled) {
      this.#peerReRequestFlushScheduled = true;
      queueMicrotask(() => {
        this.#flushPeerReRequests();
      });
    }
  }

  /** Run the collected rounds, one per candidate set. */
  #flushPeerReRequests(): void {
    this.#peerReRequestFlushScheduled = false;

    if (this.#pendingPeerReRequests.size === 0) return;

    // emptied before the first message goes out: an entity that arrives while the round is being
    // delivered lands in a fresh map and books a round of its own, instead of disappearing into a
    // round that is already running
    const pending = this.#pendingPeerReRequests;
    this.#pendingPeerReRequests = new Map();

    // the candidate set is decided here and not when the request came in: a sender's parent can
    // have been settled since, and a sender that has left this context in the meantime is a new
    // ancestor for nobody. `null` stands for the roots, which is the candidate set of a sender
    // without a parent
    const rounds = new Map<ViewComponent | null, {data: unknown}>();

    for (const [sender, data] of pending) {
      // membership, and #componentInstances is the only thing that answers it: an entry in
      // #components outlives the departure of its component until the next change trail, so a
      // lookup by uuid still hands back the sender that has left — and hands back the entry of a
      // namesake that took the uuid over. Both are the same mistake, a round for an ancestor that
      // is not there any more
      if (!this.#componentInstances.has(sender)) continue;

      const key = sender.parent ?? null;
      const round = rounds.get(key);
      if (round === undefined) {
        rounds.set(key, {data});
      } else {
        // `data` names one new ancestor and a receiver can only be filtered against one. Where
        // several senders share a candidate set, the round asks unconditionally — the wider
        // answer, and the one a receiver gives itself when it is told no ancestor at all.
        //
        // What decides this is the number of senders, not how they compare to the candidate set:
        // two elements inserted at runtime below six hundred siblings already cost six hundred
        // ascents instead of two. The filter is kept for the case that produces it — a single
        // element arriving on its own — and the round stays linear either way
        round.data = undefined;
      }
    }

    for (const [parent, round] of rounds) {
      if (parent == null) {
        this.dispatchReRequestParentRoots();
      } else {
        // the sender is asked along with the rest: a second sender of the same round can sit above
        // it, and an element never answers its own request — the message costs it one ascent and
        // can save it a wrong parent.
        // getChildren() hands out a fresh array, so a child that re-parents mid-loop cannot
        // displace the entry behind it
        for (const child of this.getChildren(parent)) {
          this.dispatchMessage(child.uuid, ComponentContext.ReRequestParent, round.data);
        }
      }
    }
  }

  /**
   * Create the component change trails at this point in time.
   * The next call will only return the differences from the previous call.
   *
   * @param commit whether the trail counts as applied the moment it is built. Pass `false` when
   *   the trail still has to travel to a Shadow Environment that may refuse it, and settle it
   *   afterwards with {@link ComponentContext.commitChangeTrail}.
   *
   * @see {@link ComponentContext.commitChangeTrail}
   * @see {@link ComponentContext.reCreateChanges}
   */
  buildChangeTrails(commit = true): ChangeTrailType {
    // a collected round settles where entities hang, and a trail built before it ran would carry
    // the hierarchy of a moment that is already over. Running it here makes that a rule rather
    // than a matter of which microtask happens to come first
    this.#flushPeerReRequests();

    if (this.#uncommittedTrail != null) {
      // Two sync cycles can be in flight at once, and the older one no longer has a trail to
      // settle once this one has taken the diff. It falls back on the optimistic reading --
      // everything it carried counts as applied -- rather than on a state in which two trails
      // claim the same entries.
      if (this.#logger.isDebug) {
        this.#logger.debug('committing an open change trail because a second one is being built', this.#uncommittedTrail.entries);
      }
      this.commitChangeTrail(this.#uncommittedTrail.entries.length);
    }

    const entries: IComponentChangeType[] = [];
    const owners: ComponentChanges[] = [];
    const participants = this.hasComponents() ? this.#buildPathOfChanges() : [];

    // The entry → component assignment is taken from the length of the trail before and after
    // each call, which keeps it out of the entries themselves: they travel to the Shadow
    // Environment, and nothing that is only this side's bookkeeping belongs on that wire.
    const build = (changes: ComponentChanges, phase: ChangeTrailPhase) => {
      const before = entries.length;
      changes.buildChangeTrail(entries, phase);
      for (let i = before; i < entries.length; i++) {
        owners[i] = changes;
      }
    };

    for (const changes of participants) build(changes, ChangeTrailPhase.StructuralChanges);
    for (const changes of participants) build(changes, ChangeTrailPhase.ContentUpdates);
    for (const changes of participants) build(changes, ChangeTrailPhase.Removal);

    // read while the build still stands: whether a component is spent is a statement about this
    // trail, and the round trip that follows must not be able to change the answer
    this.#uncommittedTrail = {entries, owners, retiring: this.#retiringComponents(participants)};

    if (commit) this.commitChangeTrail(entries.length);

    return entries;
  }

  /**
   * Fold the first `appliedCount` entries of the change trail this context built last into the
   * state the next trail is diffed against, and write them to the Component Memory. Every entry
   * behind that line stays pending and goes out again with the next trail.
   *
   * A component is retired -- its entry dropped -- only where the build read it as spent and every
   * entry it contributed is settled. One component can hold a creation and an event in the same
   * trail, and a creation sent twice is refused by the Shadow Environment, which already holds an
   * entity behind that uuid.
   *
   * @param appliedCount how many entries the Shadow Environment applied, counted from the front.
   *   Clamped to the length of the trail.
   * @param changeTrail the trail this call settles. Given, the call is ignored unless it is the
   *   very trail this context built last -- a cycle that lost its trail to a later build must not
   *   draw a line through that later trail.
   */
  commitChangeTrail(appliedCount: number, changeTrail?: ChangeTrailType): void {
    const uncommitted = this.#uncommittedTrail;
    if (uncommitted == null) return;
    if (changeTrail != null && changeTrail !== uncommitted.entries) return;

    const {entries, owners, retiring} = uncommitted;
    const count = Math.min(Math.max(appliedCount, 0), entries.length);

    // released before anything is folded: a listener reached from here finds no half-settled record
    this.#uncommittedTrail = undefined;

    const stillPending = new Set(owners.slice(count));

    for (let i = 0; i < count; i++) {
      // `count` is clamped to `entries.length`, and `build()` above assigns an owner for every
      // index `entries` gains, so both arrays hold an entry at `i`.
      owners[i]!.commitChange(entries[i]!);
    }

    this.#componentMemory.write(count === entries.length ? entries : entries.slice(0, count));

    this.#retireComponents(retiring, stillPending);
  }

  /**
   * Resets the internal component change states so that all view components are regenerated with the next change trail.
   * The outstanding events are taken over.
   *
   * The trail this produces belongs to a Shadow Environment that holds none of these uuids -- a
   * fresh proxy. One whose Kernel still holds them refuses the first re-created creation it reads,
   * and every cycle that follows, because a uuid names one entity at a time.
   *
   * @see {@link ComponentContext.buildChangeTrails}
   */
  reCreateChanges() {
    if (this.#componentMemory.isEmpty()) return;

    const trails = this.buildChangeTrails(false);

    // The trail is written to the memory but not folded back into the components: the recreation
    // below builds every one of them anew and needs the events of the instances it replaces, which
    // a commit would release. What the trail retires is retired here instead.
    this.#componentMemory.write(trails);
    this.#retireBuiltTrail();

    for (const [uuid, cMem] of this.#componentMemory) {
      const c = this.#components.get(uuid);
      if (c) {
        const changes = new ComponentChanges(uuid);
        changes.create(cMem.token, cMem.parentUuid, cMem.order, cMem.autoDestructionOnParentRemoval);

        if (cMem.properties) {
          for (const [key, value] of cMem.properties) {
            changes.changeProperty(key, value, c.propIsEqual?.get(key));
          }
        }

        c.changes.transferEventsTo(changes);
        c.changes.clear();

        c.changes = changes;
      }
    }

    this.#componentMemory.clear();

    this.broadcastEvent(ContextLost);
  }

  /**
   * Remove all components without writing anything to a change trail. Every
   * {@link ViewComponent} this context holds is destroyed, so each of them reports
   * {@link ViewComponent#isDestroyed} and holds no context afterwards. The context itself stays
   * registered under its namespace and can be used again — assigning it to a component takes
   * that component back in under the same uuid.
   *
   * @see {@link ComponentContext.dispose} for the final teardown
   */
  clear() {
    this.#viewInstances = undefined;
    this.#componentMemory.clear();
    this.#uncommittedTrail = undefined;

    // destroy first, while the context is still live: a component whose context is gone
    // would otherwise keep reporting itself as alive.
    // The members are what this set holds, and walking #components instead would reach past them:
    // an entry outlives the departure of its component until the next change trail
    for (const component of Array.from(this.#componentInstances)) {
      component.destroy();
    }

    // a safety net, not currently reachable: every instance the loop above destroys takes
    // itself out of this set on the way through destroyComponent(), so it should already be
    // empty here. Kept for the same reason as the two panics below — a future call path that
    // adds to this set during its own teardown must not leave anything past the sweep
    this.#componentInstances.clear();

    for (const uuid of this.#rootComponents.slice(0)) {
      this.removeSubTree(uuid);
    }

    if (this.#rootComponents.length !== 0) {
      throw new Error('component-context panic: #rootComponents is not empty!');
    }

    if (this.#components.size !== 0) {
      throw new Error('component-context panic: #components is not empty!');
    }
  }

  /**
   * Tear the context down for good: every {@link ViewComponent} it holds is destroyed, the
   * component memory is dropped, and the namespace is released so that
   * {@link ComponentContext.get} creates a fresh context for it.
   *
   * Unlike {@link ComponentContext.clear} this is final. The context holds no components,
   * produces empty change trails, and rejects any component that tries to join it. Calling
   * it more than once is a no-op.
   *
   * A {@link ShadowEnv} bound to this context keeps its reference; destroy the environment
   * first if you want the namespace released on both sides.
   */
  dispose() {
    if (this.#isDisposed) return;

    this.clear();

    this.#isDisposed = true;

    const ctxMap = ComponentContext.getContextsMap();
    if (this.ns != null && ctxMap.get(this.ns) === this) {
      ctxMap.delete(this.ns);
    }
  }

  /**
   * Drop the component entry behind `uuid`, and with it the uuid's place in every children list.
   *
   * @param expectedChanges the bookkeeping that asked for the deletion. A round trip lies between
   *   the build of a change trail and its commit, and an entry that a different bookkeeping stands
   *   behind by then belongs to a component that joined in the meantime.
   */
  #deleteComponent(uuid: string, expectedChanges?: ComponentChanges) {
    const entry = this.#components.get(uuid);
    if (entry === undefined) return;
    if (expectedChanges !== undefined && entry.changes !== expectedChanges) return;

    // a uuid must never survive in a children list, otherwise every later lookup
    // on that list dereferences a component that no longer exists
    const parentUuid = entry.component.parent?.uuid;
    if (parentUuid !== undefined) {
      const parentEntry = this.#components.get(parentUuid);
      if (parentEntry !== undefined) {
        removeFrom(parentEntry.children, uuid);
      }
    }

    this.#components.delete(uuid);
    removeFrom(this.#rootComponents, uuid);
    this.#viewInstances = undefined;
  }

  #buildPathOfChanges(): ComponentChanges[] {
    return this.#traverseLevelOrderBFS()
      .filter((vi) => vi.changes.hasChanges())
      .map((vi) => vi.changes);
  }

  /**
   * Insert a component into an ordered list of uuids.
   *
   * The list is kept sorted by ascending {@link ViewComponent#order}. Components sharing
   * the same order value keep their insertion order, so the new component is placed after
   * all components with an equal order.
   *
   * Uuids without a matching view instance are skipped instead of dereferenced, so a
   * partially torn down list can never turn a reordering into an exception.
   */
  #appendToOrdered(component: ViewComponent, childUuids: string[]) {
    if (childUuids.includes(component.uuid)) {
      return;
    }

    const {order} = component;

    for (let i = 0; i < childUuids.length; i++) {
      const other = this.#components.get(childUuids[i]!)?.component;
      if (other !== undefined && order < other.order) {
        childUuids.splice(i, 0, component.uuid);
        return;
      }
    }

    childUuids.push(component.uuid);
  }

  #viewInstances?: ViewInstance[] | undefined;

  #traverseLevelOrderBFS(): ViewInstance[] {
    if (this.#viewInstances) return this.#viewInstances;

    const lvl = new Map<number, ViewInstance[]>();

    // The same set `#removeSubTree()` keeps, for the same reason: `addToChildren()` writes a children
    // list without taking the child out of the one it already stands in, so a component can be reached
    // twice and a children list can point back at an ancestor.
    const visited = new Set<string>();

    const traverse = (uuid: string, depth: number) => {
      if (visited.has(uuid)) return;
      visited.add(uuid);

      const viewInstance = this.#components.get(uuid);
      if (viewInstance == null) return;

      const atDepth = lvl.get(depth);
      if (atDepth) {
        atDepth.push(viewInstance);
      } else {
        lvl.set(depth, [viewInstance]);
      }

      for (const childUuid of viewInstance.children) {
        traverse(childUuid, depth + 1);
      }
    };

    for (const uuid of this.#rootComponents) {
      traverse(uuid, 0);
    }

    this.#viewInstances = Array.from(lvl.entries())
      .sort((a, b) => a[0] - b[0])
      .flatMap(([, vi]) => vi);

    return this.#viewInstances;
  }
}
