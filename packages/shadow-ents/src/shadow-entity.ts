import {ShadowEntityElement} from './elements/ShadowEntityElement.js';
import {SHADOW_ELEMENT_ENTITY, SHADOW_ELEMENT_ENV_LEGACY, SHADOW_ELEMENT_LOCAL_ENV} from './elements/constants.js';
import './shadow-env-legacy.js';
import './shadow-local-env.js';

Promise.all([customElements.whenDefined(SHADOW_ELEMENT_ENV_LEGACY), customElements.whenDefined(SHADOW_ELEMENT_LOCAL_ENV)]).then(
  () => {
    customElements.define(SHADOW_ELEMENT_ENTITY, ShadowEntityElement);
  },
);
