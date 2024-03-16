import {value, type SignalReader} from '@spearwolf/signalize';
import {signal, signalReader} from '@spearwolf/signalize/decorators';
import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {BaseEnv} from '../view/env/BaseEnv.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowEnv extends ShadowEntity implements IShadowEnvElement {
  #needsUpdate = false;

  override readonly contextTypes: ShadowElementType[] = [];

  override readonly shadowTypes = new Set([ShadowElementType.ShadowEnv]);

  @signal() accessor shadowEnv: BaseEnv | undefined;
  @signalReader() accessor shadowEnv$: SignalReader<BaseEnv | undefined>;

  get hasShadowEnv(): boolean {
    return this.getShadowEnv() != null;
  }

  getShadowEnv(): BaseEnv {
    return value(this.shadowEnv$);
  }

  constructor() {
    super();
    this.ns = GlobalNS;
    this.stopContextRequestPropagation = true;
  }

  getComponentContext(): ComponentContext {
    return this.shadowEnv!.view;
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
          this.shadowEnv?.sync();
        }
      });
      this.#needsUpdate = true;
    }
  }

  override connectedCallback(): void {
    if (!this.hasShadowEnv) {
      this.#createEnv();
    }

    super.connectedCallback();
  }

  resetEnv() {
    console.log('[shadow-env] TODO resetEnv');
    // TODO we need to reset the env - view-components must be re-created
    this.#createEnv();
  }

  #createEnv() {
    const env = new BaseEnv(this.ns);
    env.start();
    this.shadowEnv = env;
  }
}
