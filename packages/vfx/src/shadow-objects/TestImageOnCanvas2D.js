export function TestImageOnCanvas2D({entity, useContext}) {
  const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
  const fillStyle0 = `rgb(${r} ${g} ${b})`;
  const fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;

  let ctx = null;

  useContext('canvasSize')((size) => {
    console.debug(`[TestImageOnCanvas2D] ${entity.uuid} canvas size changed to`, size);
  });

  entity.on('onRenderFrame', ({canvas}) => {
    ctx ??= canvas.getContext('2d');

    const [w, h] = [canvas.width, canvas.height];
    const halfH = Math.floor(h / 2);

    ctx.fillStyle = fillStyle0;
    ctx.fillRect(0, 0, w, halfH);

    ctx.fillStyle = fillStyle1;
    ctx.fillRect(0, halfH, w, h - halfH);
  });

  console.debug(`[TestImageOnCanvas2D] ${entity.uuid} ready`);
}
