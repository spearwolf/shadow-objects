import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {BaseEnv} from '../view/env/BaseEnv.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowEnv extends ShadowEntity implements IShadowEnvElement {
  override readonly contextTypes: ShadowElementType[] = [];

  override readonly shadowTypes = new Set([ShadowElementType.ShadowEnv]);

  #env?: BaseEnv;
  #needsUpdate = false;

  constructor() {
    super();
    this.ns = GlobalNS;
    this.stopContextRequestPropagation = true;
  }

  getShadowEnv(): BaseEnv {
    return this.#env;
  }

  get hasShadowEnv(): boolean {
    return this.getShadowEnv() != null;
  }

  getComponentContext(): ComponentContext {
    return this.getShadowEnv()?.view;
  }

  override syncShadowObjects() {
    if (!this.#needsUpdate && this.hasShadowEnv) {
      // @link https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
      queueMicrotask(() => {
        if (this.#needsUpdate) {
          this.#needsUpdate = false;
          this.getShadowEnv()?.sync();
        }
      });
      this.#needsUpdate = true;
    }
  }

  override connectedCallback(): void {
    if (!this.hasShadowEnv) {
      this.createShadowEnv();
    }

    super.connectedCallback();
  }

  resetEnv() {
    const env = this.getShadowEnv();
    if (env) {
      console.log('[shadow-env] TODO resetEnv');

      env.view.resetChangesFromMemory();
      this.syncShadowObjects();
      // TODO inform the viewComponent that the env has been reset !!
      // maybe this should be a custom event (dom)
    } else {
      this.createShadowEnv();
    }
  }

  protected createShadowEnv() {
    // TODO change namespace ?
    const env = new BaseEnv(this.ns);
    env.start();
    this.#env = env;
  }
}
