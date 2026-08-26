import {emit} from '@spearwolf/eventize';

let g_nextId = 0;

export class ShadowObjectBase {
  constructor(entity) {
    this.entity = entity;
    this.id = ++g_nextId;
  }

  traverseEmit(event, data) {
    this.entity.traverse((entity) => emit(entity, event, data));
  }
}
