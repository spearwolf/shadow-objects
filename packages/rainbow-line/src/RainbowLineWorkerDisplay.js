import {OffscreenWorkerDisplay} from '@spearwolf/offscreen-display/worker.js';

const display = new OffscreenWorkerDisplay();

let colorSliceWidth = 10;
let sliceCycleTime = 7;
let cycleDirection = -1; // right:-1 or left:1

let ctx = null;

display.on({
  onCanvas({canvas}, contextAttributes) {
    ctx = canvas.getContext('2d', contextAttributes);
  },

  onFrame({now, canvasWidth: w, canvasHeight: h}) {
    let x = 0;
    while (x < w) {
      let t = ((now % sliceCycleTime) * cycleDirection * 360) / sliceCycleTime;
      ctx.fillStyle = `hsl(${(x / w) * 360 + t}, 100%, 50%)`;
      ctx.fillRect(x, 0, colorSliceWidth, h);
      x += colorSliceWidth;
    }
  },
});

export function parseMessageData(data) {
  display.parseMessageData(data);

  if ('color-slice-width' in data) {
    colorSliceWidth = data['color-slice-width'];
  }
  if ('slice-cycle-time' in data) {
    sliceCycleTime = data['slice-cycle-time'];
  }
  if ('cycle-direction' in data) {
    cycleDirection = data['cycle-direction'];
  }
}
