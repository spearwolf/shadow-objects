import {DisplayElement} from '@spearwolf/twopoint5d-elements';
import '@spearwolf/twopoint5d-elements/two5-display.js';
import './style.css';
import './two5-display.css';
import './whenDefined.js';

declare global {
  interface Window {
    DisplayElement: typeof DisplayElement;
  }
}

window.DisplayElement = DisplayElement;

console.log('hello, hello');
