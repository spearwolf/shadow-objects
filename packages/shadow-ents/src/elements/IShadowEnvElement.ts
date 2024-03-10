import type {ComponentContext} from '../view/ComponentContext.js';
import type {BaseEnv} from '../view/env/BaseEnv.js';
import type {ShadowEntity} from './ShadowEntity.js';

export interface IShadowEnvElement extends ShadowEntity {
  getComponentContext(): ComponentContext;
  getShadowEnv(): BaseEnv | undefined;
  get hasShadowEnv(): boolean;
  syncShadowObjects(): void;
}
