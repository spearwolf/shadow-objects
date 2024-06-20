import {ShadowWorkerElement} from './elements/ShadowWorkerElement.js';
import {RemoteWorkerEnv} from './view/RemoteWorkerEnv.js';

import './shadow-entity.js';
import './shadow-env.js';
import './shadow-local-env.js';
import './shadow-worker.js';

// @ts-ignore
import Worker from './bundle.worker.js';

ShadowWorkerElement.createWorker = () => new Worker();
RemoteWorkerEnv.createWorker = () => new Worker();

declare global {
  // eslint-disable-next-line no-var
  var SHADOW_ENTS_BUNDLE_LOADED: boolean;
}

globalThis.SHADOW_ENTS_BUNDLE_LOADED = true;
