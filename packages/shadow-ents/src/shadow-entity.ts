import {ShadowEntity} from './elements/ShadowEntity.js';
import {SHADOW_ELEMENT_ENTITY, SHADOW_ELEMENT_LOCAL_ENV} from './elements/constants.js';
import './shadow-local-env.js';

customElements.whenDefined(SHADOW_ELEMENT_LOCAL_ENV).then(() => {
  customElements.define(SHADOW_ELEMENT_ENTITY, ShadowEntity);
});
