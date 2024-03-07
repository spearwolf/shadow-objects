import {Ready} from './constants.js';
import {MessageRouter} from './worker/MessageRouter.js';

const router = new MessageRouter();

console.log('hej @spearwolf/vfx/worker.js 🚀', router);

onmessage = (event) => {
  router.parseMessage(event);
};

self.postMessage({type: Ready});
