import '@spearwolf/shadow-ents/bundle.js';
import './style.css';

console.log('hello, hello');

// the worker is now integrated in bundle.js, so we no longer need it here:

// import {ShadowWorker} from '@spearwolf/shadow-ents/bundle.js';
// import BundleWorker from './bundle.worker.js?worker';

// ShadowWorker.createWorker = () => new BundleWorker();
