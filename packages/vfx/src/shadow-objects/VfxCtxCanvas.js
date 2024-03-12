export class VfxCtxCanvas {
  constructor({useProperty, provideContext}) {
    this.getBar = useProperty('bar');

    const [, setMultiViewRenderer] = provideContext('multiViewRenderer');
    setMultiViewRenderer(this);

    this.getBar((val) => {
      console.log('[VfxCtxCanvas] bar changed to', val);
    });
  }

  onCreate() {
    // console.debug('[VfxCtxCanvas] onCreate, args=', args);
    console.debug('[VfxCtxCanvas] bar is initially set to', this.getBar());
  }
}
