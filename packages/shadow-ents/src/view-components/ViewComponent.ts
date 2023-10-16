import {generateUUID} from '../generateUUID.js';
import {ComponentContext} from './ComponentContext.js';

export class ViewComponent {
  #uuid: string;
  #token: string;
  #namespace?: string | symbol;
  #order = 0;

  #context: ComponentContext;
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
   * The order property sets the order to lay out a component in a children array of the parent component.
   *
   * Items in a children array are sorted by ascending order value and then by their insertion order.
   */
  get order(): number {
    return this.#order;
  }

  set order(order: number | null | undefined) {
    const prevOrder = this.#order;
    this.#order = order ?? 0;
    if (prevOrder !== this.#order) {
      this.#context.changeOrder(this);
    }
  }

  constructor(token: string, parent?: ViewComponent, order = 0, namespace?: string | symbol) {
    this.#uuid = generateUUID();

    this.#token = token;
    this.#parent = parent;
    this.#order = order;
    this.#namespace = namespace;

    this.#context = ComponentContext.get(this.#namespace);
    this.#context.addComponent(this);
  }

  isChildOf(entity: ViewComponent) {
    return this.#parent === entity;
  }

  removeFromParent() {
    if (this.#parent) {
      this.#context.removeFromParent(this.uuid, this.#parent);
      this.#parent = undefined;
    }
  }

  addChild(child: ViewComponent) {
    if (!child.isChildOf(this)) {
      child.removeFromParent();
      child.#parent = this;
      this.#context.addToChildren(this, child);
    }
  }

  setProperty<T = unknown>(name: string, value: T, isEqual?: (a: T, b: T) => boolean) {
    this.#context.setProperty(this, name, value, isEqual);
  }

  removeProperty(name: string) {
    this.#context.removeProperty(this, name);
  }

  destroy() {
    this.removeFromParent();
    this.#context.removeComponent(this);
  }
}
