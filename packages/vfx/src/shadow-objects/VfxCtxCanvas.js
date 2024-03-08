export class VfxCtxCanvas {
  constructor({useContext, useProperty}) {
    this.getFoo = useContext('foo');
    this.getBar = useProperty('bar');

    // TODO implement provideContext() --> spearwolf/shadow-ents::Kernel
    // - provideContext('multiViewRenderer') // => context value defaults to this
    // - provideContext('multiViewRenderer', this.multiViewRenderer)
    // - provideContext<T>(name: string, initialValue?: T): SignalFuncs<T>

    this.getBar((val) => {
      console.log('[VfxCtxCanvas] bar changed to', val);
    });
  }

  onCreate(...args) {
    console.log('[VfxCtxCanvas] onCreate, args=', args);
  }
}
