import {removeFrom} from '../array-utils';
import {ChangeTrailPhase} from '../constants.js';
import type {IComponentChangeType} from '../types.js';
import {ComponentChanges} from './ComponentChanges';
import type {ViewComponent} from './ViewComponent';

interface ViewInstance {
  component: ViewComponent;
  children: string[]; // we use an Array here and not a Set, because we want to keep the insertion order
  changes: ComponentChanges;
}

declare global {
  // eslint-disable-next-line no-var
  var __shadowEntsComponentContexts: Map<string | symbol, ComponentContext> | undefined;
}

/**
 * The `ComponentContext` is the container for all _view components_ for a given namespace.
 *
 * If no namespace is specified when creating a `ComponentContext`, the global namespace is used.
 */
export class ComponentContext {
  static GlobalNS = Symbol.for('ShadowEntsGlobalNS');

  static get(namespace?: string | symbol): ComponentContext {
    if (globalThis.__shadowEntsComponentContexts === undefined) {
      globalThis.__shadowEntsComponentContexts = new Map<string | symbol, ComponentContext>();
    }
    const ns = namespace ?? ComponentContext.GlobalNS;
    if (globalThis.__shadowEntsComponentContexts.has(ns)) {
      return globalThis.__shadowEntsComponentContexts.get(ns)!;
    } else {
      const ctx = new ComponentContext();
      globalThis.__shadowEntsComponentContexts.set(ns, ctx);
      return ctx;
    }
  }

  #components: Map<string, ViewInstance> = new Map();
  #rootComponents: string[] = []; // we use an Array here and not a Set, because we want to keep the insertion order

  #removedComponentsChanges: ComponentChanges[] = [];

  addComponent(component: ViewComponent) {
    if (this.hasComponent(component)) {
      throw new Error(`a view component already exists with the uuid:${component.uuid}`);
    }
    const changes = new ComponentChanges(component.uuid, component.token, component.order);
    this.#components.set(component.uuid, {
      component: component,
      children: [],
      changes,
    });
    if (component.parent) {
      this.addToChildren(component.parent, component);
      changes.setParent(component.parent.uuid);
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

  removeComponent(component: ViewComponent) {
    if (this.hasComponent(component)) {
      const entry = this.#components.get(component.uuid)!;

      entry.children.slice(0).forEach((childUuid) => this.#components.get(childUuid)?.component.removeFromParent());

      this.#components.delete(component.uuid);
      removeFrom(this.#rootComponents, component.uuid);

      this.#removedComponentsChanges.push(entry.changes);
      entry.changes.destroyEntities();
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
      this.removeComponent(entry.component);
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
    this.#rootComponents.slice(0).forEach((uuid) => this.removeSubTree(uuid));

    if (this.#rootComponents.length !== 0) {
      throw new Error('component-context panic: #rootComponents is not empty!');
    }

    if (this.#components.size !== 0) {
      throw new Error('component-context panic: #components is not empty!');
    }
  }

  buildChangeTrails() {
    const trail: IComponentChangeType[] = [];
    const pathOfChanges = this.#buildPathOfChanges();

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.StructuralChanges);
    }

    for (const changes of pathOfChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.ContentUpdates);
      changes.clear();
    }

    for (const changes of this.#removedComponentsChanges) {
      changes.buildChangeTrail(trail, ChangeTrailPhase.Removal);
      changes.dispose();
    }

    this.#removedComponentsChanges.length = 0;

    return trail;
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
