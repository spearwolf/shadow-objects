import {VfxDisplay} from '@spearwolf/visual-fx-base-element';
import '@spearwolf/visual-fx-base-element/vfx-display.js';
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
