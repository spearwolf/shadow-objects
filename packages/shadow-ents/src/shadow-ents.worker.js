import {WorkerRuntime} from './worker/WorkerRuntime.js';

console.debug('@spearwolf/shadow-ents/WorkerRuntime: starting..');

const shadowRuntime = new WorkerRuntime();
shadowRuntime.start();
