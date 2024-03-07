export class VfxCtxCanvas {
  constructor({useContext, useProperty}) {
    this.foo = useContext('foo');
    this.bar = useProperty('bar');

    this.bar((value) => {
      console.log('[VfxCtxCanvas] bar changed to', value);
    });
  }

  onCreate(...args) {
    console.log('[VfxCtxCanvas] onCreate, args=', args);
  }
}
