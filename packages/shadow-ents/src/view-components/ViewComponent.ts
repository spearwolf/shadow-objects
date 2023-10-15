import {ComponentContext} from './ComponentContext.js';
import {generateUUID} from './generateUUID.js';

/**
 * The EntityView is a proxy for the actual entity object.
 * With the help of this digital twin the _real_ entity is created, properties are set, events are triggered, etc.
 *
 * While the user is responsible for creating a twin, the actual entities are later managed async by the EntityKernel.
 * The kernel can, but does not have to, run in the same javascript environment. It is also conceivable, for example,
 * that the kernel runs in a web-worker, while the entity twins are created within the main document.
 */
export class ViewComponent {
  #uuid: string;
  #token: string;
  #namespace?: string | symbol;
  #order = 0;

  #viewspace: ComponentContext;
  #parent?: ViewComponent;

  get uuid() {
    return this.#uuid;
  }

  get token() {
    return this.#token;
  }

  get parent(): ViewComponent | undefined {
    return this.#parent;
  }

  set parent(parent: ViewComponent | null | undefined) {
    if (parent) {
      parent.addChild(this);
    } else {
      this.removeFromParent();
    }
  }

  /**
   * The order property sets the order to lay out an entity in a children array of the parent entity container.
   * Items in a children array are sorted by ascending order value and then by their insertion order.
   */
  get order(): number {
    return this.#order;
  }

  set order(order: number | null | undefined) {
    const prevOrder = this.#order;
    this.#order = order ?? 0;
    if (prevOrder !== this.#order) {
      this.#viewspace.changeOrder(this);
    }
  }

  constructor(token: string, parent?: ViewComponent, order = 0, namespace?: string | symbol) {
    this.#uuid = generateUUID();

    this.#token = token;
    this.#parent = parent;
    this.#order = order;
    this.#namespace = namespace;

    this.#viewspace = ComponentContext.get(this.#namespace);
    this.#viewspace.addEntity(this);
  }

  isChildOf(entity: ViewComponent) {
    return this.#parent === entity;
  }

  removeFromParent() {
    if (this.#parent) {
      this.#viewspace.removeChildFromParent(this.uuid, this.#parent);
      this.#parent = undefined;
    }
  }

  addChild(child: ViewComponent) {
    if (!child.isChildOf(this)) {
      child.removeFromParent();
      child.#parent = this;
      this.#viewspace.addToChildren(this, child);
    }
  }

  setProperty<T = unknown>(name: string, value: T, isEqual?: (a: T, b: T) => boolean) {
    this.#viewspace.setProperty(this, name, value, isEqual);
  }

  removeProperty(name: string) {
    this.#viewspace.removeProperty(this, name);
  }

  destroy() {
    this.removeFromParent();
    this.#viewspace.removeEntity(this);
  }
}
