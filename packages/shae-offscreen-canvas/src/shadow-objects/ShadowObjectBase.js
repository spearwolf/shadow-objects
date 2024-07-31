import {emit} from '@spearwolf/eventize';

export class ShadowObjectBase {
  constructor(entity) {
    this.entity = entity;
  }

  traverseEmit(event, data) {
    this.entity.traverse((entity) => emit(entity, event, data));
  }
}
