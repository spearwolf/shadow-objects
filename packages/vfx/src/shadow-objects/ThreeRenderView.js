import {Priority} from '@spearwolf/eventize';
import {createEffect, createSignal, destroySignal} from '@spearwolf/signalize';
import {ThreeMultiViewRenderer} from './ThreeMultiViewRenderer.js';

export function ThreeRenderView({entity, useContext, provideContext}) {
  // TODO implement ThreeRenderView

  const getCanvasSize = useContext('canvasSize');

  // - [x] useContext('multiViewRenderer');
  //   - [x] create render-view with multiViewRenderer.createView()
  // - [x] onRenderFrame()
  // - [x] call multiViewRenderer.renderView(view)
  // - [ ] copy webgl-canvas-content to our canvas(bitmapdrawingcontext2d)

  const getMultiViewRenderer = useContext(ThreeMultiViewRenderer.ContextProvider);

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
      console.log('ThreeRenderView renderView created', view);
    } else {
      view.width = canvasSize[0];
      view.height = canvasSize[1];
    }
  }, [getCanvasSize, getMultiViewRenderer]);

  provideContext('three.renderView', getRenderView);

  //
  // maybe not here but in another shadow-object:
  //
  // - provideContext('three.renderView') ?
  // - provideContext('three.scene');
  // - provideContext('three.camera');
  // - setCamera(...)

  let bitmapRendererCtx = undefined;

  let logOnFrame = true; // TODO remove me

  const unsubscribe = entity.on('onRenderFrame', Priority.Low, async ({canvas}) => {
    const view = getRenderView();

    if (view != null) {
      const multiViewRenderer = getMultiViewRenderer();
      if (!multiViewRenderer) return;

      // TODO remove me:
      if (logOnFrame) {
        console.log('ThreeRenderView onRenderFrame:renderView', {
          renderView: view,
          canvasCtx: bitmapRendererCtx,
          multiViewRenderer,
        });
        logOnFrame = false;
      }

      const image = await multiViewRenderer.renderView(view);

      if (image) {
        bitmapRendererCtx ??= canvas.getContext('bitmaprenderer');
        bitmapRendererCtx.transferFromImageBitmap(image); // TODO verify this works
      }
    }
  });

  return {
    onDestroy() {
      unsubscribe();

      const view = getRenderView();
      if (view != null) {
        getMultiViewRenderer()?.destroyView(view);
      }

      destroySignal(getRenderView);
    },
  };
}
