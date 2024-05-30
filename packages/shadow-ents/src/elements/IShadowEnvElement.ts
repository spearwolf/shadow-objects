import type {ComponentContext} from '../view/ComponentContext.js';
import type {BaseEnv} from '../view/env/BaseEnv.js';
import type {ShadowEntityElement} from './ShadowEntityElement.js';

export interface IShadowEnvElement extends ShadowEntityElement {
  getComponentContext(): ComponentContext;
  getShadowEnv(): BaseEnv | undefined;
  get hasShadowEnv(): boolean;
  syncShadowObjects(): void;
}
