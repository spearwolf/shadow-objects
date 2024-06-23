import {WorkerRuntime} from './worker/WorkerRuntime.js';

console.debug('@spearwolf/shadow-ents/WorkerRuntime: hello!');

const shadowRuntime = new WorkerRuntime();
shadowRuntime.start();
