import {Priority, on} from '@spearwolf/eventize';
import {createEffect, createSignal, destroySignal} from '@spearwolf/signalize';
import {
  CanvasSizeContext,
  ImageBitmapRenderingContext,
  OnFrame,
  ThreeMultiViewRendererContext,
  ThreeRenderViewContext,
} from '../shared/constants.js';

let id = 0;

export class ThreeRenderView {
  static displayName = 'ThreeRenderView';

  constructor({entity, useContext, provideContext, onDestroy}) {
    this.id = ++id;

    const getMultiViewRenderer = useContext(ThreeMultiViewRendererContext);
    const getImageBitmapRenderer = useContext(ImageBitmapRenderingContext);
    const getCanvasSize = useContext(CanvasSizeContext);

    const [getRenderView, setRenderView] = createSignal();

    const [, unsubscribeCreateView] = createEffect(() => {
      const canvasSize = getCanvasSize();
      if (canvasSize == null) return;

      let view = getRenderView();

      const multiViewRenderer = getMultiViewRenderer();

      if (multiViewRenderer == null) {
        if (view) {
          setRenderView(undefined);
        }
        return;
      }

      const [width, height] = canvasSize;

      if (view == null) {
        view = multiViewRenderer.createView(width, height);
        setRenderView(view);
      } else {
        view.width = width;
        view.height = height;
      }
    });

    const [, unsubscribeDestroyView] = createEffect(() => {
      const view = getRenderView();
      const multiViewRenderer = getMultiViewRenderer();

      if (view && multiViewRenderer) {
        return () => {
          multiViewRenderer.destroyView(view);
        };
      }
    });

    provideContext(ThreeRenderViewContext, getRenderView);

    const unsubscribeOnFrame = on(entity, OnFrame, Priority.Low, async () => {
      const view = getRenderView();

      if (view) {
        const multiViewRenderer = getMultiViewRenderer();

        if (multiViewRenderer && getImageBitmapRenderer()) {
          const image = await multiViewRenderer.renderView(view);

          if (image) {
            getImageBitmapRenderer()?.transferFromImageBitmap(image);
            image.close();
          }
        }
      }
    });

    onDestroy(() => {
      unsubscribeOnFrame();

      setRenderView(undefined);

      destroySignal(getRenderView);

      unsubscribeCreateView();
      unsubscribeDestroyView();
    });
  }
}
