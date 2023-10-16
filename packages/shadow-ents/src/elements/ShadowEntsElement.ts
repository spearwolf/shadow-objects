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
  }

  connectedCallback() {
    console.log('Custom element added to page', this[$uuid]);

    this.dispatchEvent(new CustomEvent(RequestContextEventName, {bubbles: true, detail: {requester: this}}));

    this.addEventListener(RequestContextEventName, this.#onRequestContext, {capture: false, passive: false});
    this.addEventListener(ElementContextEventName, this.#onElementContext, {capture: false, passive: false});
  }

  disconnectedCallback() {
    console.log('Custom element removed from page', this[$uuid]);

    this.removeEventListener(ElementContextEventName, this.#onElementContext, {capture: false});
    this.removeEventListener(RequestContextEventName, this.#onRequestContext, {capture: false});
  }

  adoptedCallback() {
    console.log('Custom element moved to new page', this[$uuid]);
  }

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;

    console.log('Custom element request context', {requester: requester?.[$uuid], self: this[$uuid]});

    if (requester != null && requester !== this) {
      console.log('Custom element stop propagation', requester);
      event.stopPropagation();
      requester.#setContextElement(this);
    }
  };

  #setContextElement(contextElement: ShadowEntsElement) {
    console.log('Custom element set context element', contextElement);
  }

  // TODO remove?
  #onElementContext = (event: ElementContextEvent) => {
    console.log('Custom element element context', event);
  };
}
