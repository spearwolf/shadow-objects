import {createEffect, createSignal, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {generateUUID} from '../generateUUID';
import {$isElement, $type, ElementType, RequestContextEventName} from './constants';
import type {RequestContextEvent} from './events';

// TODO namespace
// TODO children + order

export class ShadowEntsElement extends HTMLElement {
  readonly [$isElement] = true;

  readonly [$type]: ElementType = ElementType.Base;

  readonly uuid = generateUUID();

  #contextElementSignal: [SignalReader<ShadowEntsElement | undefined>, SignalWriter<ShadowEntsElement | undefined>] =
    createSignal();

  get contextElement(): ShadowEntsElement | undefined {
    return this.#contextElementSignal[0]();
  }

  constructor() {
    super();

    createEffect(() => {
      console.log(`contextElement#${this.uuid}`, this.contextElement);
    });
  }

  connectedCallback() {
    console.log('Custom element added to page', this.uuid);

    this.dispatchEvent(new CustomEvent(RequestContextEventName, {bubbles: true, detail: {requester: this}}));

    this.addEventListener(RequestContextEventName, this.#onRequestContext, {capture: false, passive: false});
  }

  disconnectedCallback() {
    console.log('Custom element removed from page', this.uuid);

    this.removeEventListener(RequestContextEventName, this.#onRequestContext, {capture: false});
  }

  adoptedCallback() {
    console.log('Custom element moved to new page', this.uuid);
  }

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;

    console.log('Custom element request context', {requester: requester?.uuid, self: this.uuid});

    if (requester != null && requester !== this) {
      console.log('Custom element stop propagation', requester);
      event.stopPropagation();
      requester.#setContextElement(this);
    }
  };

  #setContextElement(contextElement: ShadowEntsElement) {
    console.log('Custom element set context element', contextElement);
    this.#contextElementSignal[1](contextElement ?? undefined);
  }
}
