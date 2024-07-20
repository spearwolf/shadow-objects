import {connect, createSignal} from '@spearwolf/signalize';
import type {ViewComponent} from '../view/ViewComponent.js';
import {ATTR_NAME, ATTR_NO_TRIM, ATTR_TYPE, ATTR_VALUE} from './constants.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

const findEntNode = (start: HTMLElement): ShaeEntElement | undefined => {
  let el: HTMLElement | null = start.parentElement;
  while (el) {
    if ((el as ShaeEntElement).isShaeEntElement) {
      return el as ShaeEntElement;
    }
    el = el.parentElement;
  }
  return undefined;
};

export class ShaePropElement extends HTMLElement {
  static observedAttributes = [ATTR_NAME, ATTR_VALUE, ATTR_TYPE, ATTR_NO_TRIM];

  readonly isShaeEntElement = true;

  protected readonly entNode$ = createSignal<ShaeEntElement | undefined>();
  protected readonly viewComponent$ = createSignal<ViewComponent | undefined>();

  get entNode(): ShaeEntElement | undefined {
    return this.entNode$.value;
  }

  set entNode(el: ShaeEntElement | undefined) {
    this.entNode$.set(el);
  }

  get viewComponent(): ViewComponent | undefined {
    return this.viewComponent$.value;
  }

  constructor() {
    super();

    this.entNode$.onChange((entNode) => {
      if (entNode) {
        const con = connect(entNode.viewComponent$, this.viewComponent$);
        return () => {
          con.destroy();
        };
      } else {
        this.viewComponent$.set(undefined);
      }
    });

    this.viewComponent$.onChange((vc) => {
      // TODO set prop value on vc
      if (vc) {
        console.log(`[shae-prop:"${this.getAttribute('name')}"] view-component changed to`, vc?.uuid, {
          viewComponent: vc,
          shaeProp: this,
        });
      } else {
        console.log(`[shae-prop:"${this.getAttribute('name')}"] lost connection to view-component :/`, {
          shaeProp: this,
        });
      }
    });
  }

  connectedCallback() {
    this.#findEntNode();
  }

  // attributeChangedCallback(name: string) {
  // }

  disconnectedCallback() {
    this.#disconnectFromEntNode();
  }

  #findEntNode = () => {
    this.entNode$.set(findEntNode(this));
  };

  #disconnectFromEntNode = () => {
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.entNode$.set(undefined);
      }
    });
  };
}
