import './shae-ent.js';
import './shae-prop.js';
import './shae-worker.js';

declare global {
  var SHADOW_OBJECTS_BUNDLE_LOADED: boolean;
}

globalThis.SHADOW_OBJECTS_BUNDLE_LOADED = true;
