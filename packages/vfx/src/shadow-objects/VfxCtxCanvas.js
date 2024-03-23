export class VfxCtxCanvas {
  constructor({useProperty, useContext}) {
    const getBar = useProperty('bar');

    getBar((val) => {
      console.debug('[VfxCtxCanvas] bar changed to', val);
    });

    console.debug('[VfxCtxCanvas] bar is initially set to', getBar());

    useContext('multiViewRenderer')((val) => {
      console.log('[VfxCtxCanvas] multiViewRenderer context set to', val);
    });
  }
}
