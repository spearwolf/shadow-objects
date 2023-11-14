import {whenDefined} from '@spearwolf/two5-elements';

declare global {
  interface Window {
    whenDefined: typeof whenDefined;
  }
}

window.whenDefined = whenDefined;
