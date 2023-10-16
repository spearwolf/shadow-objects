import './shadow-ents-base.js';

declare global {
  interface Window {
    SHADOW_ENTS_WAS_HERE: boolean;
  }
}

// TODO remove me
window.SHADOW_ENTS_WAS_HERE = true;
