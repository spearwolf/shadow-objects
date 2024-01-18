import {ShadowEntsBase} from './elements/ShadowEntsBase.js';
import './shadow-local-env.js';

customElements.whenDefined('shadow-local-env').then(() => {
  customElements.define('shadow-ents-base', ShadowEntsBase);
});
