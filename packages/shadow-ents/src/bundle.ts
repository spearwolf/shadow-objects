import './index.js';

declare global {
  interface Window {
    SHADOW_ENTS_WAS_HERE: boolean;
  }
}

window.SHADOW_ENTS_WAS_HERE = true;
