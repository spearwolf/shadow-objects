import {ShadowEntsBase} from './elements/ShadowEntsBase.js';

customElements.whenDefined('shadow-local-env').then(() => {
  customElements.define('shadow-ents-base', ShadowEntsBase);
});
