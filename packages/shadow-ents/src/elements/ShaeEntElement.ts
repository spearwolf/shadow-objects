import {createSignal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {ComponentContext, ViewComponent} from '../core.js';
import {generateUUID} from '../generateUUID.js';
import {toNamespace} from '../toNamespace.js';

export class ShaeEntElement extends HTMLElement {
  static observedAttributes = ['ns', 'token'];

  readonly isShaeElement = true;
  readonly isShaeEntElement = true;

  readonly uuid = generateUUID();

  readonly #namespace = createSignal<string | symbol | undefined>();
  readonly #componentContext = createSignal<ComponentContext | undefined>();
  readonly #viewComponent = createSignal<ViewComponent | undefined>();

  get ns() {
    return this.#namespace.value;
  }

  set ns(ns: string | symbol) {
    this.#namespace.set(toNamespace(ns));
  }

  constructor() {
    super();

    this.#namespace.onChange((ns) => {
      this.#componentContext.set(ComponentContext.get(ns));

      if (typeof ns === 'symbol') {
        if (this.hasAttribute('ns')) {
          this.removeAttribute('ns');
        }
      } else {
        this.setAttribute('ns', ns);
      }
    });

    this.#componentContext.onChange((context) => {
      const vc = this.#viewComponent.value;

      if (context == null) {
        if (vc != null) {
          vc.destroy();
        }
        this.#viewComponent.set(undefined);
        return;
      }

      if (vc == null) {
        this.#viewComponent.set(new ViewComponent(this.uuid, {context}));
      } else {
        vc.context = context;
      }
    });

    this.#namespace.set(GlobalNS);
  }

  connectedCallback() {}
}
