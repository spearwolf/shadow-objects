import {createEffect} from '@spearwolf/signalize';
import {CanvasContext, OffscreenCanvasContext} from '../shared/constants.js';

let id = 0;

export class CanvasRenderingContext {
  constructor(contextName, renderingContextType, {useContext, provideContext, onDestroy}) {
    this.id = ++id;

    const getOffscreenCanvas = useContext(OffscreenCanvasContext);
    const getCanvas = useContext(CanvasContext);

    const canvasRenderCtx = provideContext(contextName);

    const [, unsubscribe] = createEffect(() => {
      const canvas = getCanvas();

      if (canvas && canvasRenderCtx.value == null) {
        const ctx = canvas.getContext(renderingContextType);
        if (ctx) {
          canvasRenderCtx.set(ctx);
        } else {
          getOffscreenCanvas()?.requestOffscreenCanvas();
        }
      } else if (canvas == null) {
        canvasRenderCtx.set(undefined);
      }
    });

    onDestroy(() => {
      canvasRenderCtx.set(undefined);
      unsubscribe();
    });
  }
}
