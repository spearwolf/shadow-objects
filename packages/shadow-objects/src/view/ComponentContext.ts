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
export class ComponentContext {
  static readonly ReRequestParentRoots = 're-request-parent-roots';

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

  addComponent(component: ViewComponent) {
    let viewInstance: ViewInstance | undefined;

    if (this.#components.has(component.uuid)) {
      viewInstance = this.#components.get(component.uuid);
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

    viewInstance.changes.create(component.token, component.parent?.uuid, component.order);

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
    if (this.hasComponent(component)) {
      const entry = this.#components.get(component.uuid)!;
      entry.children.slice(0).forEach((childUuid) => this.#components.get(childUuid)?.component.removeFromParent());
      entry.changes.destroy();
      this.#viewInstances = undefined;
    }
  }

  getChildren(component: ViewComponent): ViewComponent[] {
    return this.#components.get(component.uuid)?.children.map((uuid) => this.#components.get(uuid)!.component) ?? [];
  }

  removeFromParent(childUuid: string, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      const childEntry = this.#components.get(childUuid)!;
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
    const childEntry = this.#components.get(childUuid)!;
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

  removeSubTree(uuid: string) {
    const entry = this.#components.get(uuid);
    if (entry) {
      entry.children.slice(0).forEach((childUuid) => this.removeSubTree(childUuid));
      this.destroyComponent(entry.component);
      this.#deleteComponent(uuid);
    }
  }

  setProperty<T = unknown>(component: ViewComponent, propKey: string, value: T, isEqual?: (a: T, b: T) => boolean) {
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

  changeOrder(component: ViewComponent) {
    if (component.parent) {
      const parentEntry = this.#components.get(component.parent.uuid)!;
      removeFrom(parentEntry.children, component.uuid);
      this.#appendToOrdered(component, parentEntry.children);
    } else {
      removeFrom(this.#rootComponents, component.uuid);
      this.#appendToOrdered(component, this.#rootComponents);
    }
    this.#components.get(component.uuid)?.changes.changeOrder(component.order);
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
   * Inform all root components that they should re-request their parents
   */
  dispatchReRequestParentRoots() {
    for (const uuid of this.#rootComponents) {
      this.dispatchMessage(uuid, ComponentContext.ReRequestParentRoots);
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
        changes.create(cMem.token, cMem.parentUuid, cMem.order);

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

  clear() {
    this.#viewInstances = undefined;
    this.#componentMemory.clear();

    this.#rootComponents.slice(0).forEach((uuid) => this.removeSubTree(uuid));

    if (this.#rootComponents.length !== 0) {
      throw new Error('component-context panic: #rootComponents is not empty!');
    }

    if (this.#components.size !== 0) {
      throw new Error('component-context panic: #components is not empty!');
    }
  }

  #deleteComponent(uuid: string) {
    // console.log('deleteComponent:', uuid, this.#components.has(uuid) ? 'x' : '');
    if (this.#components.has(uuid)) {
      this.#components.delete(uuid);
      removeFrom(this.#rootComponents, uuid);
      this.#viewInstances = undefined;
    }
  }

  #buildPathOfChanges(): ComponentChanges[] {
    return this.#traverseLevelOrderBFS()
      .filter((vi) => vi.changes.hasChanges())
      .map((vi) => vi.changes);
  }

  #appendToOrdered(component: ViewComponent, childUuids: string[]) {
    if (childUuids.length === 0) {
      childUuids.push(component.uuid);
      return;
    }

    if (childUuids.includes(component.uuid)) {
      return;
    }

    const len = childUuids.length;
    const childComponents = new Array<ViewComponent>(len);

    childComponents[0] = this.#components.get(childUuids[0])!.component;

    if (component.order < childComponents[0].order) {
      childUuids.unshift(component.uuid);
      return;
    }

    if (len === 1) {
      childUuids.push(component.uuid);
      return;
    }

    const lastIdx = len - 1;
    childComponents[lastIdx] = this.#components.get(childUuids[lastIdx])!.component;

    if (component.order >= childComponents[lastIdx].order) {
      childUuids.push(component.uuid);
      return;
    }

    if (len === 2) {
      childUuids.splice(1, 0, component.uuid);
      return;
    }

    for (let i = lastIdx - 1; i >= 1; i--) {
      childComponents[i] = this.#components.get(childUuids[i])!.component;
      if (component.order >= childComponents[i].order) {
        childUuids.splice(i + 1, 0, component.uuid);
        return;
      }
    }
  }

  #viewInstances?: ViewInstance[];

  #traverseLevelOrderBFS(): ViewInstance[] {
    if (this.#viewInstances) return this.#viewInstances;

    const lvl = new Map<number, ViewInstance[]>();

    const traverse = (uuid: string, depth: number) => {
      const viewInstance = this.#components.get(uuid);
      if (viewInstance == null) return;

      if (lvl.has(depth)) {
        lvl.get(depth).push(viewInstance);
      } else {
        lvl.set(depth, [viewInstance]);
      }

      for (const childUuid of viewInstance.children) {
        traverse(childUuid, depth + 1);
      }
    };

    this.#rootComponents.forEach((uuid) => traverse(uuid, 0));

    this.#viewInstances = Array.from(lvl.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, vi]) => vi)
      .flat();

    return this.#viewInstances;
  }
}
