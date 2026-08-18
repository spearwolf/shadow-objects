import {ChangeTrailPhase, ContextLost, GlobalNS} from '../constants.js';
import type {ChangeTrailType, IComponentChangeType, NamespaceType} from '../types.js';
import {removeFrom} from '../utils/array-utils.js';
import {toNamespace} from '../utils/toNamespace.js';
import {ComponentChanges} from './ComponentChanges.js';
import {ComponentMemory} from './ComponentMemory.js';
import type {ViewComponent} from './ViewComponent.js';

interface ViewInstance {
  component: ViewComponent;
  children: string[]; // we use an Array here and not a Set, because we want to keep the insertion order
  changes: ComponentChanges;
  propIsEqual?: Map<string, (a: any, b: any) => boolean>;
}

declare global {
  // eslint-disable-next-line no-var
  var __shadowEntsContexts: Map<string | symbol, ComponentContext> | undefined;
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
 * There is only one {@link ComponentContext} (a singleton) for each namespace.
 */
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
    if (globalThis.__shadowEntsContexts == null) {
      globalThis.__shadowEntsContexts = new Map<NamespaceType, ComponentContext>();
    }
    return globalThis.__shadowEntsContexts;
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

  readonly #componentMemory = new ComponentMemory();

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

  addComponent(component: ViewComponent) {
    if (this.#isDisposed) {
      throw new ComponentContextDisposedError(
        `the view component ${component.uuid} cannot join the component context because it has been disposed`,
      );
    }

    let viewInstance = this.#components.get(component.uuid);

    if (viewInstance) {
      if (viewInstance.component !== component) {
        // another component claims this uuid: promote the children of the previous one to
        // root components, otherwise they would stay in the map but drop out of the tree
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
    const entry = this.#components.get(component.uuid);

    // destroying an entry twice would put the destroy count ahead of the create count: a
    // component that joins again afterwards would be destroyed by the very next change trail
    if (entry !== undefined && !entry.changes.isDestroyed) {
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

  removeFromParent(childUuid: string, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      // the child may already be gone (destroyComponent, removeSubTree) while the component
      // still holds on to its parent — detaching it must not resurrect it as a root
      const childEntry = this.#components.get(childUuid);
      if (childEntry === undefined) return;

      const parentEntry = this.#components.get(parent.uuid)!;
      const childIdx = parentEntry.children.indexOf(childUuid);
      if (childIdx !== -1) {
        parentEntry.children.splice(childIdx, 1);
        childEntry.changes.setParent(undefined);
      }
      this.#appendToOrdered(childEntry.component, this.#rootComponents);
      this.#viewInstances = undefined;
    }
  }

  moveToRoot(childUuid: string) {
    const childEntry = this.#components.get(childUuid);
    if (childEntry) {
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
      this.destroyComponent(entry.component);
      this.#deleteComponent(uuid);
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
    // ordered list — two components sharing one uuid share one entry, and the one that outlives
    // the entry keeps pointing back at us
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
   * sender, so this side cannot narrow the set down at all. A round runs once per entity that
   * connects, which makes n roots coming up in one namespace n²/2 messages, each one a full
   * ancestor request through the DOM. That is the more expensive of the two re-request channels —
   * six hundred roots spend some two hundred seventy milliseconds on it where the same build
   * without the channel spends about twenty, while a hundred roots in one namespace are not worth
   * the thought.
   *
   * A sender alone would not settle it. The receiver would still have to work out whether it sits
   * below that sender, and the only test that sees the whole way is an ascent per candidate —
   * quadratic again, and blind at a closed shadow boundary on top. Both channels would have to be
   * rebuilt in one go: one round for everything that connects in the same task, instead of one
   * round each.
   *
   * Numbers above are for 600 roots in one namespace, measured 2026-08-18 in Chromium via
   * Playwright 1.62.1 — a snapshot, not a guarantee; see `Backlog.md`'s Performance section for
   * the full size series and how to reproduce it.
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
   * Create the component change trails at this point in time.
   * The next call will only return the differences from the previous call.
   *
   * @see {@link ComponentContext.reCreateChanges}
   */
  buildChangeTrails(clearChanges = true): ChangeTrailType {
    const trails: IComponentChangeType[] = [];

    if (!this.hasComponents()) return trails;

    const pathOfChanges = this.#buildPathOfChanges();

    // console.log(
    //   'path of changes:',
    //   pathOfChanges.map((c) => c.uuid),
    // );

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trails, ChangeTrailPhase.StructuralChanges);
    }

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trails, ChangeTrailPhase.ContentUpdates);
    }

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trails, ChangeTrailPhase.Removal);

      if (changes.isDestroyed || (changes.isNew && !changes.isCreated)) {
        this.#deleteComponent(changes.uuid);
      }

      if (clearChanges) changes.clear();
    }

    this.#componentMemory.write(trails);

    return trails;
  }

  /**
   * Resets the internal component change states so that all view components are regenerated with the next change trail.
   * The outstanding events are taken over.
   *
   * @see {@link ComponentContext.buildChangeTrails}
   */
  reCreateChanges() {
    if (this.#componentMemory.isEmpty()) return;

    this.buildChangeTrails(false);

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

    // destroy first, while the context is still live: a component whose context is gone
    // would otherwise keep reporting itself as alive
    for (const {component} of Array.from(this.#components.values())) {
      component.destroy();
    }

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

  #deleteComponent(uuid: string) {
    const entry = this.#components.get(uuid);
    if (entry === undefined) return;

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
      const other = this.#components.get(childUuids[i])?.component;
      if (other !== undefined && order < other.order) {
        childUuids.splice(i, 0, component.uuid);
        return;
      }
    }

    childUuids.push(component.uuid);
  }

  #viewInstances?: ViewInstance[];

  #traverseLevelOrderBFS(): ViewInstance[] {
    if (this.#viewInstances) return this.#viewInstances;

    const lvl = new Map<number, ViewInstance[]>();

    const traverse = (uuid: string, depth: number) => {
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