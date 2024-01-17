import type {ComponentContext} from '../view-components/ComponentContext.js';
import type {IShadowElement} from './IShadowElement.js';

export interface IShadowEnvElement extends IShadowElement {
  readonly componentContext: ComponentContext;
}
