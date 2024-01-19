import type {ComponentContext} from '../view-components/ComponentContext.js';
import type {ShadowEntity} from './ShadowEntity.js';

export interface IShadowEnvElement extends ShadowEntity {
  readonly componentContext: ComponentContext;
}
