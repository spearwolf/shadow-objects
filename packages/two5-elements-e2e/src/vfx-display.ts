import {VfxDisplay} from '@spearwolf/two5-elements';
import '@spearwolf/two5-elements/vfx-display.js';
import './style.css';
import './vfx-display.css';
import './whenDefined.js';

declare global {
  interface Window {
    VfxDisplay: typeof VfxDisplay;
  }
}

window.VfxDisplay = VfxDisplay;

console.log('hello, hello');
