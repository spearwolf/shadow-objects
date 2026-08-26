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

  constructor({entity, useContext, provideContext, createSignal, createEffect, on}) {
    this.id = ++id;

    const getMultiViewRenderer = useContext(ThreeMultiViewRendererContext);
    const getImageBitmapRenderer = useContext(ImageBitmapRenderingContext);
    const getCanvasSize = useContext(CanvasSizeContext);

    const renderView = createSignal();

    createEffect(() => {
      const canvasSize = getCanvasSize();
      if (canvasSize == null) return;

      let view = renderView.get();

      const multiViewRenderer = getMultiViewRenderer();

      if (multiViewRenderer == null) {
        if (view) {
          renderView.set(undefined);
        }
        return;
      }

      const [width, height] = canvasSize;

      if (view == null) {
        view = multiViewRenderer.createView(width, height);
        renderView.set(view);
      } else {
        view.width = width;
        view.height = height;
      }
    });

    // The cleanup below is the only place a view is handed back. It runs when the
    // view signal changes and when the creation scope destroys the effects, and it
    // carries both the view and the renderer in its closure, so it needs no
    // context of its own. Nothing writes the view signal on teardown: an
    // `undefined` from there would run the effect above once more while the
    // renderer and size contexts are still standing, and it would take a view that
    // is destroyed in the same breath.
    createEffect(() => {
      const view = renderView.get();
      const multiViewRenderer = getMultiViewRenderer();

      if (view && multiViewRenderer) {
        return () => {
          multiViewRenderer.destroyView(view);
        };
      }
    });

    provideContext(ThreeRenderViewContext, renderView);

    on(entity, OnFrame, Priority.Low, async () => {
      const view = renderView.get();

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
  }
}
