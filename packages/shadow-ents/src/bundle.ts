import './shae-ent.js';
import './shae-worker.js';

declare global {
  // eslint-disable-next-line no-var
  var SHADOW_ENTS_BUNDLE_LOADED: boolean;
}

globalThis.SHADOW_ENTS_BUNDLE_LOADED = true;
