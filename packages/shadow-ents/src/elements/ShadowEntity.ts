import {connect, createEffect, createSignal, value, type SignalFuncs, type SignalReader} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {generateUUID} from '../generateUUID.js';
import {toNamespace} from '../toNamespace.js';
import type {NamespaceType} from '../types.js';
import type {IShadowElement} from './IShadowElement.js';
import {RequestContextEventName, ShadowElementType} from './constants.js';
import type {RequestContextEvent} from './events.js';
import {isShadowElement} from './isShadowElement.js';
import {sortElementsByHtmlOrder} from './sortElementsByHtmlOrder.js';

export class ShadowEntity extends HTMLElement implements IShadowElement {
  static observedAttributes = ['ns'];

  readonly contextTypes: ShadowElementType[] = [ShadowElementType.ShadowEntity, ShadowElementType.ShadowEnv];

  readonly isShadowElement = true;

  readonly uuid = generateUUID();

  readonly shadowTypes: Set<ShadowElementType> = new Set([ShadowElementType.ShadowEntity]);

  readonly #ns: SignalFuncs<NamespaceType> = createSignal(GlobalNS);

  #contextElements = new Map<ShadowElementType, SignalFuncs<IShadowElement | undefined>>();
  #contextChildren = new Map<ShadowElementType, IShadowElement[]>();

  constructor() {
    super();
    connect(this.ns$, this.#onNamespaceChange);
    // TODO add context-types as observedAttributes + reactive property
    // TODO add shadow-types as observedAttributes + reactive property
  }

  /**
   * the shadow namespace
   */
  get ns(): NamespaceType {
    return value(this.#ns[0]);
  }

  get ns$(): SignalReader<NamespaceType> {
    return this.#ns[0];
  }

  set ns(value: NamespaceType | null | undefined) {
    this.#ns[1](toNamespace(value));
  }

  /**
   * Returns the parent element of _shadow-type_.
   *
   * This is the _shadow-context_ element.
   *
   * Only the types defined in {@link ShadowEntity.contextTypes} can have context elements.
   */
  getContextByType(shadowType: ShadowElementType): IShadowElement | undefined {
    const getParent = this.getContextByType$(shadowType)?.[0];
    return getParent ? value(getParent) : undefined;
  }

  setContextByType(element: IShadowElement, type: ShadowElementType) {
    this.getContextByType$(type)?.[1](element ?? undefined);
  }

  getContextByType$(shadowType: ShadowElementType): SignalFuncs<IShadowElement | undefined> {
    if (!this.#contextElements.has(shadowType) && this.contextTypes.includes(shadowType)) {
      const context$$ = createSignal<IShadowElement | undefined>();
      this.#contextElements.set(shadowType, context$$);

      const [runContextCallbacks] = createEffect(
        () => {
          const ctx = value(context$$[0]);
          if (ctx != null) {
            this.onAttachedToContext(ctx, shadowType);
            return () => {
              ctx.onChildRemovedFromContext(this, shadowType);
            };
          }
        },
        {dependencies: [context$$[0]]},
      );

      // TODO destroy the effect?

      runContextCallbacks();

      return context$$;
    }

    return this.#contextElements.get(shadowType);
  }

  hasContextElements(): boolean {
    return Array.from(this.#contextElements.values()).some(([el]) => value(el) != null);
  }

  hasContextChildren(): boolean {
    return Array.from(this.#contextChildren.values()).some((children) => children.length > 0);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    switch (name) {
      case 'ns':
        {
          const nextNs = toNamespace(newValue);
          if (toNamespace(oldValue) !== nextNs) {
            this.#ns[1](nextNs);
          }
        }
        break;
    }
  }

  connectedCallback() {
    this.#registerEventListeners();

    // we want to create our context here:
    // find a parent element for each relevant shadow type
    this.#dispatchRequestContextEvent();
  }

  disconnectedCallback() {
    // this is the opposite of context finding:
    // we take this element out of the shadow tree
    this.#disconnectFromShadowTree();

    this.#unregisterEventListeners();
  }

  adoptedCallback() {
    // TODO disconnect and reconnect to shadow tree
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument
    console.warn('TODO adoptedCallback', {shadowEntity: this});
  }

  onChildRemovedFromContext(child: IShadowElement, type: ShadowElementType) {
    this.removeContextChild(child, type);
  }

  onAttachedToContext(parent: IShadowElement, type: ShadowElementType) {
    parent.addContextChild(this, type);
  }

  addContextChild(child: IShadowElement, type: ShadowElementType) {
    if (!this.#contextChildren.has(type)) {
      this.#contextChildren.set(type, []);
    }

    const children = this.#contextChildren.get(type)!;

    if (!children.includes(child)) {
      children.push(child);
      this.#contextChildren.set(type, sortElementsByHtmlOrder(this, children) as IShadowElement[]);
    }
  }

  removeContextChild(child: IShadowElement, type: ShadowElementType) {
    if (this.#contextChildren.has(type)) {
      const children = this.#contextChildren.get(type)!;
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
      }
    }
  }

  getChildrenOfContext(type: ShadowElementType): IShadowElement[] | undefined {
    const children = this.#contextChildren.get(type);
    if (children != null) {
      return children;
    }
    if (this.shadowTypes.has(type)) {
      return this.#contextChildren.set(type, []).get(type);
    }
    return undefined;
  }

  #registerEventListeners(): void {
    this.addEventListener(RequestContextEventName, this.#onRequestContext, {capture: false, passive: false});
  }

  #unregisterEventListeners(): void {
    this.removeEventListener(RequestContextEventName, this.#onRequestContext, {capture: false});
  }

  #onNamespaceChange = () => {
    // TODO a namespace change should trigger a re-connection of all descendants

    if (this.isConnected && this.hasContextElements()) {
      this.#disconnectFromShadowTree();
      this.#dispatchRequestContextEvent();
    }
  };

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;
    if (requester != null && requester !== this && isShadowElement(requester) && requester.ns === this.ns) {
      const wantedTypes = event.detail!.types;

      if (wantedTypes.length === 0) {
        event.stopPropagation();
        return;
      }

      const shadowTypes = wantedTypes.filter((type) => this.shadowTypes.has(type));

      if (shadowTypes.length === 0) return;

      for (const type of shadowTypes) {
        wantedTypes.splice(wantedTypes.indexOf(type), 1);
        requester.setContextByType(this, type);
      }

      if (wantedTypes.length === 0) {
        event.stopPropagation();
      }
    }
  };

  #dispatchRequestContextEvent(): void {
    if (this.contextTypes.length > 0) {
      this.dispatchEvent(
        new CustomEvent(RequestContextEventName, {
          bubbles: true,
          detail: {requester: this, types: [...this.contextTypes]},
        }),
      );
    }
  }

  #disconnectFromShadowTree() {
    for (const [, setContext] of this.#contextElements.values()) {
      setContext(undefined);
    }
    this.#contextChildren.clear();
  }
}
