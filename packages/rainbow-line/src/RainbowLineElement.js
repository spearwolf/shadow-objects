import {OffscreenDisplay} from '@spearwolf/offscreen-display';

const toCycleDirection = (direction) => (direction === 'left' ? 1 : -1);

export class RainbowLineElement extends OffscreenDisplay {
  static observedAttributes = ['color-slice-width', 'slice-cycle-time', 'cycle-direction'];

  constructor() {
    super(`
      <style>
        :host {
          display: block;
          width: 100%;
          height: 3px;
        }
        .rainbow {
          position: relative;
          height: 100%;
          background: linear-gradient(in hsl longer hue 45deg, #f00 0 0);
        }
        canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      </style>
      <div class="rainbow">
        <canvas></canvas>
      </div>`);
  }

  createWorker() {
    return new Worker(new URL('rainbow-line.worker.js', import.meta.url), {
      type: 'module',
    });
  }

  getContextAttributes() {
    return {alpha: false};
  }

  getInitialWorkerAttributes() {
    return {
      'color-slice-width': this.asNumberValue('color-slice-width', 10),
      'slice-cycle-time': this.asNumberValue('slice-cycle-time', 7),
      'cycle-direction': toCycleDirection(this.getAttribute('cycle-direction') || 'right'),
    };
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (!this.worker) return;

    const value = name === 'cycle-direction' ? toCycleDirection(newValue) : parseFloat(newValue);

    if (typeof value !== 'number') return;
    if (isNaN(value)) return;

    // console.log("attributeChangedCallback", name, value);

    this.worker.postMessage({
      [name]: value,
    });
  }
}
