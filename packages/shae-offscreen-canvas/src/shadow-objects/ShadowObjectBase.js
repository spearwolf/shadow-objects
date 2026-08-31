import {emitSafe} from '@spearwolf/eventize';

let g_nextId = 0;

export class ShadowObjectBase {
  constructor(entity) {
    this.entity = entity;
    this.id = ++g_nextId;
  }

  /**
   * Sends one event to this entity and every entity below it.
   *
   * `emitSafe()` rather than `emit()`: the traversal is a fan-out over a whole subtree, and the
   * plain dispatch ends at the first listener that throws -- every entity behind it would be left
   * out, and the error would leave through whatever set the traversal going. A listener that
   * throws is reported through `console.warn` and costs only itself.
   */
  traverseEmit(event, data) {
    this.entity.traverse((entity) => emitSafe(entity, event, data));
  }
}
