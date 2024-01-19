import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view-components/ComponentContext.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowLocalEnv extends ShadowEntity implements IShadowEnvElement {
  override readonly contextTypes: ShadowElementType[] = [];

  override readonly shadowTypes = new Set([ShadowElementType.ShadowLocalEnv, ShadowElementType.ShadowEnv]);

  #cc?: ComponentContext;

  constructor() {
    super();
    this.ns = GlobalNS;
  }

  get componentContext(): ComponentContext {
    return this.#cc!;
  }

  override connectedCallback(): void {
    if (this.#cc == null) {
      this.#createComponentContext();
    }

    super.connectedCallback();
  }

  #createComponentContext() {
    this.#cc = ComponentContext.get(this.ns);
    console.debug(`ShadowLocalEnv#${this.ns.toString()}`, this.#cc);
  }
}
