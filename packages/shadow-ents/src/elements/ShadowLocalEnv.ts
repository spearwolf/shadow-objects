import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view-components/ComponentContext.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowLocalEnv extends ShadowEntity implements IShadowEnvElement {
  static override readonly relevantParentTypes: readonly ShadowElementType[] = [];

  #cc?: ComponentContext;

  override readonly shadowTypes = new Set([ShadowElementType.ShadowLocalEnv, ShadowElementType.ShadowEnv]);

  get componentContext(): ComponentContext {
    return this.#cc!;
  }

  constructor() {
    super();
    this.ns = GlobalNS;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.#cc == null) {
      this.#createComponentContext();
    }
  }

  #createComponentContext() {
    this.#cc = ComponentContext.get(this.ns);
    console.debug(`ShadowLocalEnv#${this.ns.toString()}`, this.#cc);
  }
}
