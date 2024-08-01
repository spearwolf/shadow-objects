import {CanvasRenderingContext2D, OnFrame} from '../../shared/constants.js';

export function TestImageOnCanvas2D({entity, useContext, onDestroy}) {
  const getCanvas2D = useContext(CanvasRenderingContext2D);

  const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
  const fillStyle0 = `rgb(${r} ${g} ${b})`;
  const fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;

  console.log(`[TestImageOnCanvas2D] ${entity.uuid} Ready.`);

  onDestroy(() => {
    console.log(`[TestImageOnCanvas2D] ${entity.uuid} Thank you for the fish.`);
  });

  return {
    [OnFrame]() {
      const ctx = getCanvas2D();
      if (ctx == null) return;

      const [w, h] = [ctx.canvas.width, ctx.canvas.height];
      const halfH = Math.floor(h / 2);

      ctx.fillStyle = fillStyle0;
      ctx.fillRect(0, 0, w, halfH);

      ctx.fillStyle = fillStyle1;
      ctx.fillRect(0, halfH, w, h - halfH);

      ctx.commit?.();
    },
  };
}
