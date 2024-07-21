import {WorkerRuntime} from './worker/WorkerRuntime.js';

console.debug('@spearwolf/shadow-objects/WorkerRuntime: hello!');

const shadowRuntime = new WorkerRuntime();
shadowRuntime.start();
