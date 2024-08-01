import {CanvasRenderingContext2D, OnFrame} from '../../shared/constants.js';

export function TestImage2OnCanvas2D({useContext}) {
  const getCanvas2D = useContext(CanvasRenderingContext2D);

  const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
  const fillStyle0 = `rgb(${r} ${g} ${b})`;
  const fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;

  return {
    [OnFrame]() {
      const ctx = getCanvas2D();
      if (ctx == null) return;

      const [w, h] = [ctx.canvas.width, ctx.canvas.height];
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
      const ctx = getCanvas2D();
      if (ctx) {
        ctx.fillStyle = 'red';
        const halfW = Math.floor(ctx.canvas.width / 2);
        ctx.fillRect(0, 0, halfW, ctx.canvas.height);
        ctx.commit?.();
      }
    },
  };
}
