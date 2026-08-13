import '@spearwolf/shadow-objects/bundle.js';
import './bundle-tests.js';
import './style.css';

// the worker is now integrated in bundle.js, so we no longer need it here:

// import {ShadowWorker} from '@spearwolf/shadow-objects/bundle.js';
// import BundleWorker from './bundle.worker.js?worker';

// ShadowWorker.createWorker = () => new BundleWorker();