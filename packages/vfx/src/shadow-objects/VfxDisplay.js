export class VfxDisplay {
  constructor({useContext}) {
    this.getCanvas = useContext('vfx.canvas');
  }

  onCreate(entity) {
    this.uuid = entity.uuid;
    console.log(`[VfxCtxDisplay] ${this.uuid} onCreate, entity=`, entity);
  }

  // TODO implement onAddToParent
  // onAddToParent(...args) {
  //   console.log(`[VfxCtxDisplay] ${this.uuid} onAddToParent, args=`, args);
  // }

  onEvent(type, data) {
    console.log(`[VfxCtxDisplay] ${this.uuid} onEvent, type=`, type, 'data=', data);
  }
}
