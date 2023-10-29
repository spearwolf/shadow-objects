import {whenDefined} from '@spearwolf/visual-fx-base-element';

declare global {
  interface Window {
    whenDefined: typeof whenDefined;
  }
}

window.whenDefined = whenDefined;
