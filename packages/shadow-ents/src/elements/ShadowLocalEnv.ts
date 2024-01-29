import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view-components/ComponentContext.js';
import {LocalEnv} from '../view-components/env/LocalEnv.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowLocalEnv extends ShadowEntity implements IShadowEnvElement {
  override readonly contextTypes: ShadowElementType[] = [];

  override readonly shadowTypes = new Set([ShadowElementType.ShadowLocalEnv, ShadowElementType.ShadowEnv]);

  #env?: LocalEnv;

  constructor() {
    super();
    this.ns = GlobalNS;
    this.stopContextRequestPropagation = true;
  }

  getComponentContext(): ComponentContext {
    return this.#env!.view;
  }

  getLocalEnv(): LocalEnv {
    return this.#env!;
  }

  override connectedCallback(): void {
    if (this.#env == null) {
      this.#createEnv();
    }

    super.connectedCallback();
  }

  #createEnv() {
    this.#env = new LocalEnv({namespace: this.ns, useStructuredClone: true});
    this.#env.start();
  }
}
