import {Priority} from '@spearwolf/eventize';
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

  constructor({entity, useContext, provideContext, onDestroy, createSignal, createEffect, on}) {
    this.id = ++id;

    const getMultiViewRenderer = useContext(ThreeMultiViewRendererContext);
    const getImageBitmapRenderer = useContext(ImageBitmapRenderingContext);
    const getCanvasSize = useContext(CanvasSizeContext);

    const [getRenderView, setRenderView] = createSignal();

    createEffect(() => {
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

    createEffect(() => {
      const view = getRenderView();
      const multiViewRenderer = getMultiViewRenderer();

      if (view && multiViewRenderer) {
        return () => {
          multiViewRenderer.destroyView(view);
        };
      }
    });

    provideContext(ThreeRenderViewContext, getRenderView);

    on(entity, OnFrame, Priority.Low, async () => {
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
      setRenderView(undefined);
    });
  }
}
