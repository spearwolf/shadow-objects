import {VfxCtxElement} from './elements/VfxCtxElement.js';

Promise.all([customElements.whenDefined('shadow-env'), customElements.whenDefined('shadow-entity')]).then(() => {
  customElements.define('vfx-ctx', VfxCtxElement);
});
