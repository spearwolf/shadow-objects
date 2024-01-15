import {eventize} from '@spearwolf/eventize';
import {connect, createEffect, createSignal, value, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {generateUUID} from '../generateUUID.js';
import {toNamespace} from '../toNamespace.js';
import type {NamespaceType} from '../types.js';
import {RequestContextEventName, ShadowElementType} from './constants.js';
import type {RequestContextEvent} from './events.js';
import {isShadowElement} from './isShadowElement.js';

// TODO children order

type SignalFuncs<T> = [SignalReader<T>, SignalWriter<T>];

export class ShadowEntsBase extends HTMLElement {
  static observedAttributes = ['ns'];

  static relevantParentElementTypes: readonly ShadowElementType[] = [ShadowElementType.ShadowEntsBase];

  readonly isShadowElement = true;

  readonly shadowType: ShadowElementType = ShadowElementType.ShadowEntsBase;

  readonly uuid = generateUUID();

  readonly #childQueue = eventize({});

  /** the shadow ents namespace */
  get ns(): NamespaceType {
    return value(this.#ns[0]);
  }

  set ns(value: NamespaceType | null | undefined) {
    this.#ns[1](toNamespace(value));
  }

  get parentShadowElement(): ShadowEntsBase | undefined {
    return this.#getParentShadowElementSignalByType(this.shadowType)[0]();
  }

  isRelevantParentElementType(shadowType: ShadowElementType): boolean {
    return (
      this.shadowType === shadowType || Object.getPrototypeOf(this).constructor.relevantParentElementTypes.includes(shadowType)
    );
  }

  getParentShadowElementByType(shadowType: ShadowElementType): ShadowEntsBase | undefined {
    if (this.isRelevantParentElementType(shadowType)) {
      return value(this.#getParentShadowElementSignalByType(shadowType)[0]);
    }
    return undefined;
  }

  isParentShadowElement(element: ShadowEntsBase): boolean {
    return this.getParentShadowElementByType(element.shadowType) === element;
  }

  readonly #ns: SignalFuncs<NamespaceType> = createSignal(GlobalNS);

  #parentShadowElements = new Map<ShadowElementType, SignalFuncs<ShadowEntsBase | undefined>>();

  #getParentShadowElementSignalByType(shadowType: ShadowElementType): SignalFuncs<ShadowEntsBase | undefined> {
    if (!this.#parentShadowElements.has(shadowType)) {
      const sig = createSignal<ShadowEntsBase | undefined>();
      this.#parentShadowElements.set(shadowType, sig);

      sig[0]((el) => {
        if (el) {
          console.debug('subscribe to childQueue', this.uuid, {self: this, parent: el});
          return el.#childQueue.on(this);
        }
      });

      return sig;
    }
    return this.#parentShadowElements.get(shadowType);
  }

  #setParentShadowElement(element: ShadowEntsBase) {
    this.#getParentShadowElementSignalByType(element.shadowType)[1](element ?? undefined);
  }

  constructor() {
    super();

    connect(this.#ns[0], this.#onNamespaceChange);

    // TODO remove me!
    createEffect(() => {
      const parent = this.parentShadowElement;
      console.info(
        '<shadow-ents-base ns=',
        String(this.ns || ''),
        'uuid=',
        this.uuid,
        '>',
        'parentShadowElement:',
        parent ? {uuid: parent?.uuid, parent} : undefined,
        {self: this},
      );
    });
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.debug('attributeChangedCallback', this.uuid, name, '=', oldValue, '->', newValue);

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
    console.debug('connectedCallback', this.uuid);

    // we want to create our context here:
    // find a parent element for each relevant shadow type
    this.#dispatchRequestContextEvent();

    this.#registerListener();
  }

  disconnectedCallback() {
    console.debug('disconnectedCallback', this.uuid);

    this.#unregisterListener();

    // this is the opposite of context finding:
    // we take this element out of the shadow tree
    this.#disconnectFromShadowTree();
  }

  adoptedCallback() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument
    console.warn('TODO adoptedCallback', this.uuid, this.ownerDocument);
  }

  #onNamespaceChange = () => {
    console.debug('onNamespaceChange', {uuid: this.uuid, ns: this.ns, self: this});

    if (this.isConnected) {
      this.#disconnectFromShadowTree();
      this.#dispatchRequestContextEvent();
    }

    // TODO  we need to store all shadow-elements without a parentShadowElement somewhere
    // so we could re-request-context on namespace change
  };

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;
    if (
      requester != null &&
      requester !== this &&
      isShadowElement(requester) &&
      requester.ns === this.ns &&
      this.isRelevantParentElementType(requester.shadowType) &&
      (event.detail.types == null || event.detail.types.includes(this.shadowType))
    ) {
      event.stopPropagation();
      if (!requester.isParentShadowElement(this)) {
        requester.#setParentShadowElement(this);
        this.#childQueue.emit('onChildAddedToParent', this, requester);
      }
    }
  };

  #onChildRemoved(_child: ShadowEntsBase) {
    // console.debug('onChildRemoved parent:', this.uuid, 'child:', child.uuid);
  }

  #registerListener(): void {
    this.addEventListener(RequestContextEventName, this.#onRequestContext, {capture: false, passive: false});
  }

  #unregisterListener(): void {
    this.removeEventListener(RequestContextEventName, this.#onRequestContext, {capture: false});
  }

  #dispatchRequestContextEvent(types?: ShadowElementType[]): void {
    this.dispatchEvent(new CustomEvent(RequestContextEventName, {bubbles: true, detail: {requester: this, types}}));
  }

  #disconnectFromShadowTree() {
    for (const [getParent, setParent] of this.#parentShadowElements.values()) {
      const parent = value(getParent);
      if (parent) {
        parent.#onChildRemoved(this); // move to an effect?
        parent.#childQueue.off(this);
        setParent(undefined);
      }
    }
    this.#childQueue.emit('onParentDisconnectedFromShadowTree', this);
  }

  onParentDisconnectedFromShadowTree(element: ShadowEntsBase) {
    if (element === this) return;

    console.debug('onParentDisconnectedFromShadowTree', this.uuid, {self: this, parent: element});

    this.#disconnectFromShadowTree();
    if (this.isConnected) {
      this.#dispatchRequestContextEvent([element.shadowType]);
    }
  }

  onChildAddedToParent(parent: ShadowEntsBase, child: ShadowEntsBase) {
    if (parent === this || child === this) return;

    console.debug('onChildAddedToParent', this.uuid, {
      self: this,
      parent,
      child,
    });

    // TODO filter parent shadowType
    this.#dispatchRequestContextEvent([parent.shadowType]);
  }
}
