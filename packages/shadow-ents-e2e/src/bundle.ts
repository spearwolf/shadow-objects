import {ShadowWorker} from '@spearwolf/shadow-ents/bundle.js';
import BundleWorker from './bundle.worker.js?worker';
import './style.css';

console.log('hello, hello');

ShadowWorker.createWorker = () => new BundleWorker();
