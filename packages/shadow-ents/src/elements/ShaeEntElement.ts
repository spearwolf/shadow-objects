import {createSignal} from '@spearwolf/signalize';
import {ComponentContext, ViewComponent} from '../core.js';
import {generateUUID} from '../generateUUID.js';
import {ShaeElement} from './ShaeElement.js';

export class ShaeEntElement extends ShaeElement {
  static override observedAttributes = [...ShaeElement.observedAttributes, 'token'];

  readonly isShaeEntElement = true;

  readonly uuid = generateUUID();

  readonly #componentContext = createSignal<ComponentContext | undefined>();
  readonly #viewComponent = createSignal<ViewComponent | undefined>();

  get componentContext(): ComponentContext | undefined {
    return this.#componentContext.value;
  }

  get viewComponent(): ViewComponent | undefined {
    return this.#viewComponent.value;
  }

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      this.#componentContext.set(ComponentContext.get(ns));
    });

    this.#componentContext.onChange((compCtx) => {
      const curViewComp = this.viewComponent;
      if (compCtx == null) {
        if (curViewComp != null) {
          curViewComp.context = undefined;
        }
      } else {
        if (curViewComp == null) {
          this.#viewComponent.set(new ViewComponent(this.uuid, {context: compCtx}));
        } else {
          curViewComp.context = compCtx;
        }
      }
    });

    this.#viewComponent.onChange((viewComp) => {
      if (viewComp != null) {
        return () => {
          viewComp.destroy();
        };
      }
    });
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.componentContext == null) {
      this.#componentContext.set(ComponentContext.get(this.ns));
    }
  }

  disconnectedCallback() {
    this.#componentContext.set(undefined);
  }
}
