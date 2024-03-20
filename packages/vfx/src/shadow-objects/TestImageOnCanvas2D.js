export function TestImageOnCanvas2D({entity, useContext, onDestroy}) {
  const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
  const fillStyle0 = `rgb(${r} ${g} ${b})`;
  const fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;

  let ctx = null;

  let consoleCount = 0;

  useContext('canvasSize')((size) => {
    if (consoleCount++ < 3) {
      console.debug(`[TestImageOnCanvas2D] ${entity.uuid} canvas size changed to`, size);
    }
  });

  console.log(`[TestImageOnCanvas2D] ${entity.uuid} Ready.`);

  onDestroy(() => {
    console.log(`[TestImageOnCanvas2D] ${entity.uuid} Thank you for the fish.`);
  });

  return {
    onRenderFrame({canvas}) {
      ctx ??= canvas.getContext('2d');

      const [w, h] = [canvas.width, canvas.height];
      const halfH = Math.floor(h / 2);

      ctx.fillStyle = fillStyle0;
      ctx.fillRect(0, 0, w, halfH);

      ctx.fillStyle = fillStyle1;
      ctx.fillRect(0, halfH, w, h - halfH);
    },
  };
}
