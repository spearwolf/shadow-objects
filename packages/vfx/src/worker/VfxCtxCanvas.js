export class VfxCtxCanvas {
  constructor({useContext, useProperty}) {
    this.foo = useContext('foo');
    this.bar = useProperty('bar');

    // TODO implement provideContext()
    // - provideContext('multiViewRenderer') // => context value defaults to this
    // - provideContext('multiViewRenderer', this.multiViewRenderer): SignalFuncs<T>

    this.bar((value) => {
      console.log('[VfxCtxCanvas] bar changed to', value);
    });
  }

  onCreate(...args) {
    console.log('[VfxCtxCanvas] onCreate, args=', args);
  }
}
