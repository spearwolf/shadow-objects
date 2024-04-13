import {ShadowRuntime} from './shadow.runtime.js';

console.log('ShadowWorker: starting');

const shadowRuntime = new ShadowRuntime();
shadowRuntime.start();
