export function TestImage2OnCanvas2D({entity}) {
  const [r, g, b] = [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
  const fillStyle0 = `rgb(${r} ${g} ${b})`;
  const fillStyle1 = `rgb(${255 - r} ${255 - g} ${255 - b})`;

  let ctx = null;

  entity.on('onRenderFrame', ({canvas}) => {
    ctx ??= canvas.getContext('2d');

    const [w, h] = [canvas.width, canvas.height];
    const halfH = Math.floor(h / 2);
    const halfW = Math.floor(w / 2);

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = fillStyle0;
    ctx.fillRect(0, 0, halfW, halfH);

    ctx.fillStyle = fillStyle1;
    ctx.fillRect(0, halfH, halfW, h - halfH);
  });
}
