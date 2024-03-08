import {VfxDisplayElement} from './elements/VfxDisplayElement.js';
import './vfx-ctx.js';

customElements.whenDefined('vfx-ctx').then(() => {
  customElements.define('vfx-display', VfxDisplayElement);
});
