import {createSignal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {toNamespace} from '../toNamespace.js';
import {readNamespaceAttribute} from './attr-utils.js';
import {ATTR_NS} from './constants.js';

export class ShaeElement extends HTMLElement {
  static observedAttributes = [ATTR_NS];

  readonly isShaeElement = true;

  readonly ns$ = createSignal<string | symbol>(GlobalNS);

  get ns(): string | symbol {
    return this.ns$.value;
  }

  set ns(ns: string | symbol) {
    if (typeof ns === 'symbol') {
      this.ns$.set(ns);
    } else {
      this.ns$.set(toNamespace(ns));
    }
  }

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      if (typeof ns === 'string' && ns.length > 0) {
        if (this.getAttribute(ATTR_NS) !== ns) {
          this.setAttribute(ATTR_NS, ns);
        }
      } else {
        this.removeAttribute(ATTR_NS);
      }
    });
  }

  connectedCallback() {
    this.#updateNs();
  }

  attributeChangedCallback(name: string) {
    if (name === ATTR_NS) {
      this.#updateNs();
    }
  }

  #updateNs() {
    this.ns$.set(readNamespaceAttribute(this));
  }
}
