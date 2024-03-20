export class VfxCtxCanvas {
  constructor({useProperty, provideContext}) {
    const getBar = useProperty('bar');

    getBar((val) => {
      console.log('[VfxCtxCanvas] bar changed to', val);
    });

    console.debug('[VfxCtxCanvas] bar is initially set to', getBar());

    // ----

    provideContext('multiViewRenderer', this);
  }
}
