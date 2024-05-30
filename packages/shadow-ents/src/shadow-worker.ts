import {ShadowWorkerElement} from './elements/ShadowWorkerElement.js';
import {SHADOW_ELEMENT_ENTITY, SHADOW_ELEMENT_WORKER} from './elements/constants.js';
import './shadow-entity.js';

customElements.whenDefined(SHADOW_ELEMENT_ENTITY).then(() => {
  customElements.define(SHADOW_ELEMENT_WORKER, ShadowWorkerElement);
});
