import {RainbowLineElement} from './RainbowLineElement.js';

import Worker from './rainbow-line.worker.js';

class RainbowLineElementWithWorker extends RainbowLineElement {
  createWorker() {
    return Worker();
  }
}

customElements.define('rainbow-line', RainbowLineElementWithWorker);
