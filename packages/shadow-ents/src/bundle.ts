import {ShadowWorker} from './elements/ShadowWorker.js';

import './shadow-entity.js';
import './shadow-env.js';
import './shadow-local-env.js';
import './shadow-worker.js';

// @ts-ignore
import Worker from './bundle.worker.js';

ShadowWorker.createWorker = () => new Worker();

declare global {
  interface Window {
    SHADOW_ENTS_BUNDLE_LOADED: boolean;
  }
}

window.SHADOW_ENTS_BUNDLE_LOADED = true;
