import {eventize} from '@spearwolf/eventize';
import {createEffect} from '@spearwolf/signalize';

export class VfxDisplay {
  constructor({useContext, useProperty}) {
    eventize(this);

    this.getCanvas = useContext('vfx.canvas');

    this.#subscribeToCanvasSize(useProperty('canvasWidth'), useProperty('canvasHeight'));
  }

  onCreate(entity) {
    this.uuid = entity.uuid;
    console.debug(`[VfxCtxDisplay] ${this.uuid} onCreate, entity=`, entity);
  }

  onEvent(type, data) {
    console.debug(`[VfxCtxDisplay] ${this.uuid} onEvent, type=`, type, 'data=', data);
  }

  onCanvasSizeChange(w, h) {
    console.log(`[VfxDisplay] ${this.uuid} canvas size change ${w} x ${h}`);
  }

  #subscribeToCanvasSize(getCanvasWidth, getCanvasHeight) {
    const [, unsubscribe] = createEffect(() => {
      const w = getCanvasWidth();
      const h = getCanvasHeight();
      if (isNaN(w) || isNaN(h)) return;
      this.onCanvasSizeChange(w, h);
    }, [getCanvasWidth, getCanvasHeight]);
    this.once('onDestroy', () => {
      console.debug(`[VfxDisplay] ${this.uuid} unsubscribe from canvas size change`);
      unsubscribe();
    });
  }
}
