export class VfxCtxCanvas {
  constructor({useProperty, provideContext}) {
    this.getBar = useProperty('bar');

    const [, setMultiViewRenderer] = provideContext('multiViewRenderer');
    setMultiViewRenderer(this);

    // TODO implement provideContext() --> spearwolf/shadow-ents::Kernel
    // - provideContext('multiViewRenderer') // => context value defaults to this
    // - provideContext('multiViewRenderer', createSignal(this.multiViewRenderer))
    // - provideContext<T>(name: string, signal?: SignalReader<T>|SignalFuncs<T>): SignalFuncs<T>

    this.getBar((val) => {
      console.log('[VfxCtxCanvas] bar changed to', val);
    });
  }

  onCreate() {
    // console.debug('[VfxCtxCanvas] onCreate, args=', args);
    console.debug('[VfxCtxCanvas] bar is initially set to', this.getBar());
  }
}
