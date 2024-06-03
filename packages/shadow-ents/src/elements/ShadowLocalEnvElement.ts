import {LocalEnv} from '../view/env/LocalEnv.js';
import {ShadowEnvElement} from './ShadowEnvElement.js';
import {ShadowElementType} from './constants.js';

// TODO remove class - add :local attribute to <shadow-env>
export class ShadowLocalEnvElement extends ShadowEnvElement {
  override readonly shadowTypes = new Set([ShadowElementType.ShadowLocalEnv, ShadowElementType.ShadowEnv]);

  #env?: LocalEnv;

  override getShadowEnv(): LocalEnv {
    return this.#env;
  }

  protected override createShadowEnv() {
    const useStructuredClone = !this.hasAttribute('no-structured-clone');
    this.#env = new LocalEnv({namespace: this.ns, useStructuredClone});
    this.#env.start();
  }
}
