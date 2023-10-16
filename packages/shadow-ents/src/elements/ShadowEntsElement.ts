import {generateUUID} from '../generateUUID';
import {$isElement, $type, $uuid, ElementContextEventName, ElementType, RequestContextEventName} from './constants';
import type {ElementContextEvent, RequestContextEvent} from './events';

export class ShadowEntsElement extends HTMLElement {
  readonly [$isElement] = true;

  readonly [$uuid]: string;
  readonly [$type]: ElementType = ElementType.Base;

  constructor() {
    super();

    this[$uuid] = generateUUID();

    this.addEventListener(RequestContextEventName, this.#onRequestContext.bind(this), {passive: false});
    this.addEventListener(ElementContextEventName, this.#onElementContext.bind(this), {passive: false});
  }

  connectedCallback() {
    console.log('Custom element added to page.');

    this.dispatchEvent(new CustomEvent(RequestContextEventName, {detail: {requester: this[$uuid]}}));
  }

  disconnectedCallback() {
    console.log('Custom element removed from page.');
  }

  adoptedCallback() {
    console.log('Custom element moved to new page.');
  }

  #onRequestContext(event: RequestContextEvent) {
    console.log('Custom element request context', event);

    const requester = event.detail?.requester;
    if (requester != null && requester !== this) {
      event.stopPropagation();
      requester.#setContextElement(this);
    }
  }

  #setContextElement(contextElement: ShadowEntsElement) {
    console.log('Custom element set context element', contextElement);
  }

  // TODO remove?
  #onElementContext(event: ElementContextEvent) {
    console.log('Custom element element context', event);
  }
}
