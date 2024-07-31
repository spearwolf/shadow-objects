import {OnFrame, ShaeOffscreenCanvasContext} from '../../shared/constants.js';

export function TestImage2OnCanvas2D({useContext}) {
  const getShaeOffscreenCanvas = useContext(ShaeOffscreenCanvasContext);

  const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
  const fillStyle0 = `rgb(${r} ${g} ${b})`;
  const fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;

  let canvas;
  let ctx;

  return {
    [OnFrame](params) {
      canvas ??= params.canvas;
      ctx ??= canvas.getContext('2d');

      if (ctx == null) {
        getShaeOffscreenCanvas()?.requestOffscreenCanvas();
        return;
      }

      const [w, h] = [canvas.width, canvas.height];
      const halfH = Math.floor(h / 2);
      const halfW = Math.floor(w / 2);

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = fillStyle0;
      ctx.fillRect(0, 0, halfW, halfH);

      ctx.fillStyle = fillStyle1;
      ctx.fillRect(0, halfH, halfW, h - halfH);

      ctx.commit?.();
    },

    onDestroy() {
      if (canvas && ctx) {
        ctx.fillStyle = 'red';
        const halfW = Math.floor(canvas.width / 2);
        ctx.fillRect(0, 0, halfW, canvas.height);
        ctx.commit?.();
      }
    },
  };
}
