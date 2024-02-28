import {parseMessageData} from './RainbowLineWorkerDisplay.js';

self.addEventListener('message', (evt) => {
  parseMessageData(evt.data);
});
