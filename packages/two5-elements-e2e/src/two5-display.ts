import {VfxDisplay} from '@spearwolf/two5-elements';
import '@spearwolf/two5-elements/two5-display.js';
import './style.css';
import './two5-display.css';
import './whenDefined.js';

declare global {
  interface Window {
    VfxDisplay: typeof VfxDisplay;
  }
}

window.VfxDisplay = VfxDisplay;

console.log('hello, hello');
