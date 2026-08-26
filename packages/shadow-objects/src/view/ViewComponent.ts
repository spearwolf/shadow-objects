import {emit, eventize, off} from '@spearwolf/eventize';
import {VoidToken} from '../constants.js';
import {generateUUID} from '../utils/generateUUID.js';
import {ComponentContext, ComponentContextDisposedError} from './ComponentContext.js';

class ViewComponentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViewComponentError';
  }
}

/**
 * Guards every path that attaches a child to a parent: the constructor, {@link ViewComponent#addChild}
 * and the `parent` setter all funnel through here so that they fail with the same message.
 */
function assertUsableAsParent(parent: ViewComponent, childContext: ComponentContext | undefined) {
  if (parent.context == null) {
    throw new ViewComponentError('cannot add a child to a destroyed view component');
  }
  if (parent.context !== childContext) {
    throw new ViewComponentError('cannot add a child from another context');
  }
}

export class ViewComponent {
  /**
   * The last thing a component says before {@link ViewComponent#destroy} takes every subscription
   * off it. An integration that put something on the instance — event subscriptions, an own
   * `dispatchEvent` — hears it here and can set that up again on the same component; a context
   * that takes the component back in (`vc.context = ctx`) revives it under the same uuid.
   *
   * It travels via `emit()` rather than {@link ViewComponent#dispatchEvent}, so an own
   * `dispatchEvent` an integration installed does not see it and cannot carry it further. Leaving
   * a context says nothing: `vc.context = null` detaches the component and keeps everything on it.
   *
   * Not to be confused with the `Destroyed` exported at the top level of the package: that one is
   * `'destroyed'` and belongs to the worker channel, this one is `'view-component-destroyed'`.
   */
  static readonly Destroyed = 'view-component-destroyed';

  readonly #uuid: string;

  #token: string;

  #context?: ComponentContext;

  #parent?: ViewComponent;
  #order = 0;
  readonly #autoDestructionOnParentRemoval: boolean;

  get uuid() {
    return this.#uuid;
  }

  get token() {
    return this.#token;
  }

  set token(token: string | undefined) {
    token ??= VoidToken;
    if (token === this.#token) return;
    this.#token = token;
    this.#context?.changeToken(this, token);
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

  get context(): ComponentContext | undefined {
    return this.#context;
  }

  /**
   * @throws {ComponentContextDisposedError} if the new {@link ComponentContext} has been disposed.
   *   The component keeps its current one in that case: leaving the old one is only worth it if
   *   the new one can actually be joined.
   * @throws {ComponentUuidInUseError} if another component of the new {@link ComponentContext}
   *   holds this component's uuid. A uuid names one component of a {@link ComponentContext} at a
   *   time, and it is free again once its holder has left. This one is thrown after the old
   *   {@link ComponentContext} has been left, so the component holds none afterwards — assign one
   *   again to take it back in.
   */
  set context(context: ComponentContext | null | undefined) {
    const next = context ?? undefined;
    if (this.#context === next) return;

    // checked before the teardown below, so a rejected join costs the component nothing
    if (next?.isDisposed) {
      throw new ComponentContextDisposedError(
        `the view component ${this.#uuid} cannot join the component context because it has been disposed`,
      );
    }

    const previousContext = this.#context;

    if (this.#context) {
      // leaving, not ending: an element that leaves the document hands its context back and takes
      // the same component in again when it returns, so the subscriptions on it have to survive
      this.#leaveContext();
    }

    this.#context = next;

    try {
      next?.addComponent(this);
    } catch (error) {
      // a failed join must not leave a destroyed component pointing at a context that never
      // took it in — every later mutation would silently go nowhere while `isDestroyed` lies
      this.#context = undefined;
      throw error;
    }

    // after the join, not before it: `addComponent` is what creates the ComponentChanges the
    // properties are written into, so they end up in the same CreateEntities change as the token
    // and the parent rather than in a separate one behind it. A move to no context carries
    // nothing — there is no receiver for it
    if (next != null && previousContext != null) {
      previousContext.transferPropertiesTo(this, next);
    }
  }

  /**
   * A destroyed component is detached from its {@link ComponentContext}: it no longer appears
   * in any change trail and no longer has a corresponding entity.
   *
   * Every mutation that only concerns the component itself (`token`, `order`, properties,
   * `removeFromParent`) is silently ignored while destroyed. Operations that would tie a second,
   * live component to it (`addChild`, the `parent` setter) throw instead, because ignoring them
   * would leave the caller with a wrong picture of the entity tree.
   * {@link ViewComponent#destroy} finds nothing left to detach and still takes off whatever lies
   * on the component at that moment.
   *
   * Assigning `null` or `undefined` to {@link ViewComponent#context} reports the same state: it
   * detaches the component without silencing it, so {@link ViewComponent#dispatchEvent} reaches
   * every listener on it. After a {@link ViewComponent#destroy} it reaches those registered since.
   * Children are not traversed either way.
   *
   * Assigning a {@link ViewComponent#context} revives the component under the same uuid.
   */
  get isDestroyed(): boolean {
    return this.#context == null;
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
      this.#context?.changeOrder(this);
    }
  }

  /**
   * Whether the corresponding entity should be destroyed when its parent entity is destroyed.
   *
   * Set via the constructor option of the same name; immutable after creation.
   * Children that opt out (the default) are promoted to root entities when their
   * parent is destroyed, so they remain reachable.
   */
  get autoDestructionOnParentRemoval(): boolean {
    return this.#autoDestructionOnParentRemoval;
  }

  constructor(
    token: string,
    options?: {
      parent?: ViewComponent;
      order?: number;
      context?: ComponentContext;
      uuid?: string;
      autoDestructionOnParentRemoval?: boolean;
    },
  ) {
    eventize(this);

    if (options instanceof ViewComponent) {
      options = {parent: options};
    }

    this.#uuid = options?.uuid ?? generateUUID();

    this.#token = token ?? VoidToken;
    this.#order = options?.order ?? 0;
    this.#parent = options?.parent;
    this.#autoDestructionOnParentRemoval = options?.autoDestructionOnParentRemoval ?? false;

    const ctx = options?.context ?? ComponentContext.get();

    if (this.#parent) {
      assertUsableAsParent(this.#parent, ctx);
    }

    this.context = ctx;
  }

  isChildOf(parent: ViewComponent) {
    return this.#parent === parent;
  }

  removeFromParent() {
    if (this.#parent) {
      this.#context?.removeFromParent(this, this.#parent);
      this.#parent = undefined;
    } else {
      this.#context?.moveToRoot(this);
    }
  }

  addChild(child: ViewComponent) {
    if (child.#context == null) {
      throw new ViewComponentError('cannot add a destroyed view component as a child');
    }

    assertUsableAsParent(this, child.#context);

    // walking up via #parent is safe: the entity tree is kept acyclic by exactly this guard
    for (let ancestor: ViewComponent | undefined = this; ancestor != null; ancestor = ancestor.#parent) {
      if (ancestor === child) {
        throw new ViewComponentError(
          'cannot add the component itself or one of its ancestors as a child: this would create a cycle',
        );
      }
    }

    if (!child.isChildOf(this)) {
      child.removeFromParent();
      child.#parent = this;
      this.#context!.addToChildren(this, child);
    }
  }

  /**
   * @returns `true` if the value differs from the last one written to the change trail.
   *   A destroyed component always returns `false`.
   */
  setProperty<T = unknown>(name: string, value: T, isEqual?: (a: T, b: T) => boolean): boolean {
    return this.#context?.setProperty(this, name, value, isEqual) ?? false;
  }

  removeProperty(name: string) {
    this.#context?.removeProperty(this, name);
  }

  dispatchShadowObjectsEvent(type: string, data: unknown, transferables?: Transferable[]) {
    this.#context?.dispatchShadowObjectsEvent(this, type, data, transferables);
  }

  dispatchEvent(type: string, data: unknown, traverseChildren: boolean) {
    emit(this as ViewComponent, type, data);

    if (traverseChildren) {
      for (const child of this.#context?.getChildren(this) ?? []) {
        child.dispatchEvent(type, data, traverseChildren);
      }
    }
  }

  /**
   * Leave the context without ending the component. What a consumer put on the instance — event
   * subscriptions, an own `dispatchEvent` — belongs to the component and not to its membership in
   * a context, so a component that is taken back in keeps answering with all of it.
   */
  #leaveContext() {
    this.removeFromParent();

    // the context pointer goes first: destroyComponent() detaches every component that still
    // names the context, and would call destroy() on it otherwise
    const context = this.#context;
    this.#context = undefined;
    context?.destroyComponent(this);
  }

  /**
   * End the component: it leaves its {@link ComponentContext} and goes silent. Every `on()` and
   * `once()` subscription made on it is removed, and a `dispatchEvent` an integration installed on
   * the instance is dropped with them. A promise from `onceAsync()` is not reached and settles
   * only when the event it waits for arrives.
   *
   * Calling it more than once is safe. Each call takes off what is on the component at that
   * moment — a subscription made afterwards is heard again.
   *
   * {@link ViewComponent.Destroyed} goes out on the component right before the subscriptions come
   * off, so whoever holds something on it hears it. A listener that wants its subscription back
   * does not set it up inside the handler — that one would come off with the rest.
   */
  destroy() {
    this.#leaveContext();

    // an integration may shadow `dispatchEvent` on the instance; dropping the own property
    // uncovers the method on the prototype again, it does not remove it
    if (Object.hasOwn(this, 'dispatchEvent')) {
      delete (this as {dispatchEvent?: ViewComponent['dispatchEvent']}).dispatchEvent;
    }

    // last, and before the subscriptions come off: the component is in its final shape by now, and
    // whoever hears this still hears it
    emit(this as ViewComponent, ViewComponent.Destroyed);

    off(this);
  }
}
