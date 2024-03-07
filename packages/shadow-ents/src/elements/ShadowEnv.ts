import {value, type SignalReader} from '@spearwolf/signalize';
import {signal, signalReader} from '@spearwolf/signalize/decorators';
import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view-components/ComponentContext.js';
import {BaseEnv} from '../view-components/env/BaseEnv.js';
import type {IShadowEnvElement} from './IShadowEnvElement.js';
import {ShadowEntity} from './ShadowEntity.js';
import {ShadowElementType} from './constants.js';

export class ShadowEnv extends ShadowEntity implements IShadowEnvElement {
  override readonly contextTypes: ShadowElementType[] = [];

  override readonly shadowTypes = new Set([ShadowElementType.ShadowEnv]);

  @signal() accessor shadowEnv: BaseEnv | undefined;
  @signalReader() accessor shadowEnv$: SignalReader<BaseEnv | undefined>;

  get hasShadowEnv(): boolean {
    return value(this.shadowEnv$) != null;
  }

  constructor() {
    super();
    this.ns = GlobalNS;
    this.stopContextRequestPropagation = true;
  }

  getComponentContext(): ComponentContext {
    return this.shadowEnv!.view;
  }

  override connectedCallback(): void {
    if (!this.hasShadowEnv) {
      this.#createEnv();
    }

    super.connectedCallback();
  }

  #createEnv() {
    const env = new BaseEnv(this.ns);
    env.start();
    this.shadowEnv = env;
  }
}
