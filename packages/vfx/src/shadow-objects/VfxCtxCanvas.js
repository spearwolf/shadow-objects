export class VfxCtxCanvas {
  constructor({useProperty, provideContext}) {
    this.getBar = useProperty('bar');

    this.getBar((val) => {
      console.log('[VfxCtxCanvas] bar changed to', val);
    });

    provideContext('multiViewRenderer', this);
  }

  onCreate() {
    console.debug('[VfxCtxCanvas] bar is initially set to', this.getBar());
  }
}
