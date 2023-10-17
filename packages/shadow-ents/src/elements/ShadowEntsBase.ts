import {createEffect, createSignal, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {generateUUID} from '../generateUUID.js';
import {toNamespace} from '../toNamespace.js';
import type {NamespaceType} from '../types.js';
import {RequestContextEventName, ShadowElementType} from './constants.js';
import type {RequestContextEvent} from './events.js';

// TODO children + order

export class ShadowEntsBase extends HTMLElement {
  static observedAttributes = ['ns'];

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
    return this.#parentShadowElement$sig[0]();
  }

  #namespace$sig: [SignalReader<NamespaceType>, SignalWriter<NamespaceType>] = createSignal<NamespaceType>(GlobalNS);

  #parentShadowElement$sig: [SignalReader<ShadowEntsBase | undefined>, SignalWriter<ShadowEntsBase | undefined>] = createSignal();

  #setParentShadowElement(element: ShadowEntsBase) {
    this.#parentShadowElement$sig[1](element ?? undefined);
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
    console.warn('TODO adoptedCallback', this.uuid);
  }

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;

    if (requester != null && requester !== this && requester.ns === this.ns && this.isContextFor(requester)) {
      event.stopPropagation();
      requester.#setParentShadowElement(this);
    }
  };

  protected isContextFor(_element: ShadowEntsBase): boolean {
    // TODO check namespace
    return true;
  }

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
