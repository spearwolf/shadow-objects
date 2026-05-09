import {SHAE_ENT, SHAE_PROP} from './elements/constants.js';
import {ShaePropElement} from './elements/ShaePropElement.js';

customElements.whenDefined(SHAE_ENT).then(() => customElements.define(SHAE_PROP, ShaePropElement));