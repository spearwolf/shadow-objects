import {DisplayElement} from '@spearwolf/two5-elements';
import '@spearwolf/two5-elements/two5-display.js';
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
