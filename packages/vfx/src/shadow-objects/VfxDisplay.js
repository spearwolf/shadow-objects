export class VfxDisplay {
  constructor({useContext}) {
    this.getCanvas = useContext('vfx.canvas');
  }

  onCreate(...args) {
    console.log('[VfxCtxDisplay] onCreate, args=', args);
  }

  onAddToParent(...args) {
    console.log('[VfxCtxDisplay] onAddToParent, args=', args);
  }
}
