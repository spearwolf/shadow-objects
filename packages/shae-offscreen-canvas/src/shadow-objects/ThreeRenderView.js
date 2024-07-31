import {Priority, on} from '@spearwolf/eventize';
import {createEffect, createSignal, destroySignal} from '@spearwolf/signalize';
import {
  CanvasSizeContext,
  OnFrame,
  ShaeOffscreenCanvasContext,
  ThreeMultiViewRendererContext,
  ThreeRenderViewContext,
} from '../shared/constants.js';

export class ThreeRenderView {
  constructor({entity, useContext, provideContext, onDestroy}) {
    const getCanvasSize = useContext(CanvasSizeContext);
    const getMultiViewRenderer = useContext(ThreeMultiViewRendererContext);
    const getShaeOffscreenCanvas = useContext(ShaeOffscreenCanvasContext);

    const [getRenderView, setRenderView] = createSignal();

    createEffect(() => {
      const canvasSize = getCanvasSize();
      if (canvasSize == null) return;

      let view = getRenderView();

      const multiViewRenderer = getMultiViewRenderer();

      if (multiViewRenderer == null) {
        if (view != null) {
          setRenderView(undefined);
        }
        return;
      }

      if (view == null) {
        view = multiViewRenderer.createView(canvasSize[0], canvasSize[1]);
        setRenderView(view);
      } else {
        view.width = canvasSize[0];
        view.height = canvasSize[1];
      }
    }, [getCanvasSize, getMultiViewRenderer]);

    provideContext(ThreeRenderViewContext, getRenderView);

    let canvasCtx = undefined;

    const unsubscribe = on(entity, OnFrame, Priority.Low, async ({canvas}) => {
      const view = getRenderView();

      if (view) {
        const multiViewRenderer = getMultiViewRenderer();

        if (multiViewRenderer) {
          const image = await multiViewRenderer.renderView(view);

          if (image) {
            canvasCtx ??= canvas.getContext('bitmaprenderer');
            if (canvasCtx) {
              canvasCtx.transferFromImageBitmap(image);
            } else {
              getShaeOffscreenCanvas()?.requestOffscreenCanvas();
            }
          }
        }
      }
    });

    onDestroy(() => {
      unsubscribe();

      const view = getRenderView();
      if (view != null) {
        getMultiViewRenderer()?.destroyView(view);
      }

      destroySignal(getRenderView);
    });
  }
}
