import type {ComponentContext} from '../view-components/ComponentContext.js';
import type {BaseEnv} from '../view-components/env/BaseEnv.js';
import type {ShadowEntity} from './ShadowEntity.js';

export interface IShadowEnvElement extends ShadowEntity {
  getComponentContext(): ComponentContext;
  getShadowEnv(): BaseEnv | undefined;
  get hasShadowEnv(): boolean;
  syncShadowObjects(): void;
}
