import './shadow-entity.js';
import './shadow-env.js';
import './shadow-local-env.js';
import './shadow-worker.js';

declare global {
  interface Window {
    SHADOW_ENTS_BUNDLE_LOADED: boolean;
  }
}

window.SHADOW_ENTS_BUNDLE_LOADED = true;

export {ShadowWorker} from './elements/ShadowWorker.js';
