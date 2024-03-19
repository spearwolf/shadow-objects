import {LocalEnv} from '../view/env/LocalEnv.js';
import {ShadowEnv} from './ShadowEnv.js';
import {ShadowElementType} from './constants.js';

export class ShadowLocalEnv extends ShadowEnv {
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
