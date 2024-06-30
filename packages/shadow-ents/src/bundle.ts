import './shadow-entity.js';
import './shadow-env-legacy.js';
import './shadow-env.js';
import './shadow-local-env.js';
import './shadow-worker.js';
import './shae-ent.js';
import './shae-worker.js';

declare global {
  // eslint-disable-next-line no-var
  var SHADOW_ENTS_BUNDLE_LOADED: boolean;
}

globalThis.SHADOW_ENTS_BUNDLE_LOADED = true;
