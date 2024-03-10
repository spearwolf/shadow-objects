import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalEnv} from '../view/env/LocalEnv.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowLocalEnv extends ShadowEntity implements IShadowEnvElement {
  #needsUpdate = false;

  override readonly contextTypes: ShadowElementType[] = [];

  override readonly shadowTypes = new Set([ShadowElementType.ShadowLocalEnv, ShadowElementType.ShadowEnv]);

  #env?: LocalEnv;

  get hasShadowEnv(): boolean {
    return this.#env != null;
  }

  getShadowEnv(): LocalEnv {
    return this.#env;
  }

  constructor() {
    super();
    this.ns = GlobalNS;
    this.stopContextRequestPropagation = true;
  }

  getComponentContext(): ComponentContext {
    return this.#env!.view;
  }

  /**
   * sync shadow-env on microtask
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
   */
  override syncShadowObjects() {
    if (!this.#needsUpdate && this.hasShadowEnv) {
      queueMicrotask(() => {
        if (this.#needsUpdate) {
          this.#needsUpdate = false;
          this.#env?.sync();
        }
      });
      this.#needsUpdate = true;
    }
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
    const useStructuredClone = !this.hasAttribute('no-structured-clone');
    this.#env = new LocalEnv({namespace: this.ns, useStructuredClone});
    this.#env.start();
  }
}
