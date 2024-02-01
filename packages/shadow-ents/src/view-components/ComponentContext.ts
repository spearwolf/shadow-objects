import {removeFrom} from '../array-utils.js';
import {ChangeTrailPhase} from '../constants.js';
import {toNamespace} from '../toNamespace.js';
import type {IComponentChangeType, NamespaceType} from '../types.js';
import {ComponentChanges} from './ComponentChanges.js';
import {ComponentMemory} from './ComponentMemory.js';
import type {ViewComponent} from './ViewComponent.js';

interface ViewInstance {
  component: ViewComponent;
  children: string[]; // we use an Array here and not a Set, because we want to keep the insertion order
  changes: ComponentChanges;
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
 * Each time a change trail is created (a call to {@link ComponentContext.buildChangeTrails}),
 * the past changes are summarized and returned as the result. This means that the change trail
 * is always the path of changes from the time of the previous change trail (or from the beginning)
 * to the current call to the {@link ComponentContext.buildChangeTrails} method.
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
  static get(namespace?: NamespaceType): ComponentContext {
    if (globalThis.__shadowEntsContexts === undefined) {
      globalThis.__shadowEntsContexts = new Map<NamespaceType, ComponentContext>();
    }
    const ns = toNamespace(namespace);
    if (globalThis.__shadowEntsContexts.has(ns)) {
      return globalThis.__shadowEntsContexts.get(ns)!;
    } else {
      const ctx = new ComponentContext();
      globalThis.__shadowEntsContexts.set(ns, ctx);
      return ctx;
    }
  }

  #components: Map<string, ViewInstance> = new Map();
  #rootComponents: string[] = []; // we use an Array here and not a Set, because we want to keep the insertion order

  readonly #changeTrailState = new ComponentMemory();

  addComponent(component: ViewComponent) {
    let viewInstance: ViewInstance | undefined;

    if (this.#components.has(component.uuid)) {
      viewInstance = this.#components.get(component.uuid);
      viewInstance.component = component;
      viewInstance.children = [];
    } else {
      viewInstance = {
        component: component,
        children: [],
        changes: new ComponentChanges(component.uuid),
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
  }

  hasComponent(component: ViewComponent) {
    return this.#components.has(component.uuid);
  }

  isRootComponent(component: ViewComponent) {
    return this.#rootComponents.includes(component.uuid);
  }

  destroyComponent(component: ViewComponent) {
    if (this.hasComponent(component)) {
      const entry = this.#components.get(component.uuid)!;
      entry.children.slice(0).forEach((childUuid) => this.#components.get(childUuid)?.component.removeFromParent());
      entry.changes.destroy();
    }
  }

  removeFromParent(childUuid: string, parent: ViewComponent) {
    if (this.hasComponent(parent)) {
      const childEntry = this.#components.get(childUuid)!;
      const entry = this.#components.get(parent.uuid)!;
      const childIdx = entry.children.indexOf(childUuid);
      if (childIdx !== -1) {
        entry.children.splice(childIdx, 1);
        childEntry.changes.setParent(undefined);
      }
      this.#appendToOrdered(childEntry.component, this.#rootComponents);
    }
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
    this.#components.get(component.uuid)?.changes.changeProperty(propKey, value, isEqual);
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
  }

  clear() {
    this.#changeTrailState.clear();
    this.#rootComponents.slice(0).forEach((uuid) => this.removeSubTree(uuid));

    if (this.#rootComponents.length !== 0) {
      throw new Error('component-context panic: #rootComponents is not empty!');
    }

    if (this.#components.size !== 0) {
      throw new Error('component-context panic: #components is not empty!');
    }
  }

  buildChangeTrails() {
    const pathOfChanges = this.#buildPathOfChanges();
    const trail: IComponentChangeType[] = [];

    console.log(
      'path of changes:',
      pathOfChanges.map((c) => c.uuid),
    );

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.StructuralChanges);
    }

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.ContentUpdates);
    }

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.Removal);
    }

    this.#changeTrailState.write(trail);

    for (const changes of pathOfChanges) {
      if (changes.isDestroyed) {
        this.#deleteComponent(changes.uuid);
      }

      changes.clear();

      if (changes.isDead) {
        this.#deleteComponent(changes.uuid);
      }
    }

    // for (const uuid of Array.from(this.#components.keys()).slice(0)) {
    //   const changes = this.#components.get(uuid)!.changes;
    //   if (changes.isDead || changes.isDestroyed) {
    //     this.#deleteComponent(uuid);
    //   }
    // }

    return trail;
  }

  #deleteComponent(uuid: string) {
    console.log('deleteComponent:', uuid);
    this.#components.delete(uuid);
    removeFrom(this.#rootComponents, uuid);
  }

  #buildPathOfChanges(): ComponentChanges[] {
    const path: ComponentChanges[] = [];

    const buildPath = (uuid: string) => {
      const component = this.#components.get(uuid);
      if (component) {
        if (component.changes.hasChanges()) {
          path.push(component.changes);
        }
        component.children.forEach((childUuid) => buildPath(childUuid));
      }
    };

    for (const uuid of this.#rootComponents) {
      buildPath(uuid);
    }

    return path;
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
}
