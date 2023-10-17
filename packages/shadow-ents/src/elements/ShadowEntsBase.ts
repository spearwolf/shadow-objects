import {createEffect, createSignal, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {generateUUID} from '../generateUUID.js';
import {toNamespace} from '../toNamespace.js';
import type {NamespaceType} from '../types.js';
import {RequestContextEventName, ShadowElementType} from './constants.js';
import type {RequestContextEvent} from './events.js';
import {isShadowElement} from './isShadowElement.js';

// TODO children + order

type SignalFuncs<T> = [SignalReader<T>, SignalWriter<T>];

export class ShadowEntsBase extends HTMLElement {
  static observedAttributes = ['ns'];

  static relevantParentElementTypes: readonly ShadowElementType[] = [ShadowElementType.ShadowEntsBase];

  readonly isShadowElement = true;

  readonly shadowType: ShadowElementType = ShadowElementType.ShadowEntsBase;

  readonly uuid = generateUUID();

  /** the shadow ents namespace */
  get ns(): NamespaceType {
    return this.#namespace$sig[0]();
  }

  set ns(value: NamespaceType | null | undefined) {
    this.#namespace$sig[1](toNamespace(value));
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
      return this.#getParentShadowElementSignalByType(shadowType)[0]();
    }
    return undefined;
  }

  #namespace$sig: SignalFuncs<NamespaceType> = createSignal<NamespaceType>(GlobalNS);

  #parentShadowElements = new Map<ShadowElementType, SignalFuncs<ShadowEntsBase | undefined>>();

  #getParentShadowElementSignalByType(shadowType: ShadowElementType): SignalFuncs<ShadowEntsBase | undefined> {
    if (!this.#parentShadowElements.has(shadowType)) {
      const sig = createSignal<ShadowEntsBase | undefined>();
      this.#parentShadowElements.set(shadowType, sig);
      return sig;
    }
    return this.#parentShadowElements.get(shadowType);
  }

  #setParentShadowElement(element: ShadowEntsBase) {
    this.#getParentShadowElementSignalByType(element.shadowType)[1](element ?? undefined);
  }

  constructor() {
    super();

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
        this.ns = newValue;
        break;
    }
  }

  connectedCallback() {
    console.debug('connectedCallback', this.uuid);

    this.dispatchRequestContextEvent();
    this.registerListener();
  }

  disconnectedCallback() {
    console.debug('disconnectedCallback', this.uuid);

    this.unregisterListener();
  }

  adoptedCallback() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument
    console.warn('TODO adoptedCallback', this.uuid, this.ownerDocument);
  }

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;

    if (
      requester != null &&
      requester !== this &&
      isShadowElement(requester) &&
      requester.ns === this.ns &&
      this.isRelevantParentElementType(requester.shadowType)
    ) {
      event.stopPropagation();
      requester.#setParentShadowElement(this);
    }
  };

  protected registerListener(): void {
    this.addEventListener(RequestContextEventName, this.#onRequestContext, {capture: false, passive: false});
  }

  protected unregisterListener(): void {
    this.removeEventListener(RequestContextEventName, this.#onRequestContext, {capture: false});
  }

  protected dispatchRequestContextEvent(): void {
    this.dispatchEvent(new CustomEvent(RequestContextEventName, {bubbles: true, detail: {requester: this}}));
  }
}
