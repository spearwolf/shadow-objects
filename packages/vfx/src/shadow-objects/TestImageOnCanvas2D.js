import {eventize} from '@spearwolf/eventize';

export class TestImageOnCanvas2D {
  ctx = null;

  fillStyle0 = 'rgb(255 0 0)';
  fillStyle1 = 'rgb(0 0 255)';

  constructor({entity, useContext}) {
    eventize(this);

    this.getCanvasSize = useContext('canvasSize');

    this.getCanvasSize((val) => {
      console.log(`[TestImageOnCanvas2D] ${entity.uuid} canvas size changed to`, val);
    });

    const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
    this.fillStyle0 = `rgb(${r} ${g} ${b})`;
    this.fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;
  }

  onRenderFrame({canvas}) {
    this.ctx ??= canvas.getContext('2d');

    const [w, h] = [canvas.width, canvas.height];
    const halfH = Math.floor(h / 2);

    this.ctx.fillStyle = this.fillStyle0;
    this.ctx.fillRect(0, 0, w, halfH);

    this.ctx.fillStyle = this.fillStyle1;
    this.ctx.fillRect(0, halfH, w, h - halfH);
  }
}
