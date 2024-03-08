export class VfxCtxCanvas {
  constructor({useProperty}) {
    this.getBar = useProperty('bar');

    // TODO implement provideContext() --> spearwolf/shadow-ents::Kernel
    // - provideContext('multiViewRenderer') // => context value defaults to this
    // - provideContext('multiViewRenderer', createSignal(this.multiViewRenderer))
    // - provideContext<T>(name: string, signal?: SignalReader<T>|SignalFuncs<T>): SignalFuncs<T>

    this.getBar((val) => {
      console.log('[VfxCtxCanvas] bar changed to', val);
    });
  }

  onCreate(...args) {
    console.log('[VfxCtxCanvas] onCreate, args=', args);
    console.log('[VfxCtxCanvas] bar is initially set to', this.getBar());
  }
}
