import {createEffect, createSignal, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {generateUUID} from '../generateUUID';
import {RequestContextEventName, ShadowElementType} from './constants';
import type {RequestContextEvent} from './events';

// TODO children + order

export class ShadowEntsBase extends HTMLElement {
  readonly isShadowElement = true;

  readonly shadowType: ShadowElementType = ShadowElementType.ShadowEntsBase;

  readonly uuid = generateUUID();

  #parentShadowElement$sig: [SignalReader<ShadowEntsBase | undefined>, SignalWriter<ShadowEntsBase | undefined>] = createSignal();

  #setParentShadowElement(element: ShadowEntsBase) {
    this.#parentShadowElement$sig[1](element ?? undefined);
  }

  get parentShadowElement(): ShadowEntsBase | undefined {
    return this.#parentShadowElement$sig[0]();
  }

  constructor() {
    super();

    // TODO remove me!
    createEffect(() => {
      console.log(`parentShadowElement#${this.uuid}`, '->', this.parentShadowElement?.uuid, this.parentShadowElement);
    });
  }

  connectedCallback() {
    console.log('connectedCallback', this.uuid);

    this.dispatchRequestContextEvent();
    this.registerListener();
  }

  disconnectedCallback() {
    console.log('disconnectedCallback', this.uuid);

    this.unregisterListener();
  }

  adoptedCallback() {
    console.log('TODO adoptedCallback', this.uuid);
  }

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;

    if (requester != null && requester !== this && this.isContextFor(requester)) {
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
