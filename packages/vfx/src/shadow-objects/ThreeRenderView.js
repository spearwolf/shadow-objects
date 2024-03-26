import {Priority} from '@spearwolf/eventize';
import {createEffect, createSignal, destroySignal} from '@spearwolf/signalize';
import {ThreeMultiViewRenderer} from './ThreeMultiViewRenderer.js';

export function ThreeRenderView({entity, useContext, provideContext}) {
  const getCanvasSize = useContext('canvasSize');
  const getMultiViewRenderer = useContext(ThreeMultiViewRenderer.ContextProvider);

  const [getRenderView, setRenderView] = createSignal();

  createEffect(() => {
    const canvasSize = getCanvasSize();
    if (canvasSize == null) return;

    // console.log('ThreeRenderView canvasSize', ...canvasSize);

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

  let canvasCtx = undefined;
  let shouldCommit = false;

  let logOnFrame = true; // TODO remove me

  const unsubscribeFromRenderFrame = entity.on('onRenderFrame', Priority.Low, async ({canvas}) => {
    const view = getRenderView();

    if (view != null) {
      const multiViewRenderer = getMultiViewRenderer();
      if (!multiViewRenderer) return;

      // TODO remove me:
      if (logOnFrame) {
        console.log('ThreeRenderView onRenderFrame:renderView', {
          renderView: view,
          canvasCtx: canvasCtx,
          multiViewRenderer,
        });
        logOnFrame = false;
      }

      const image = await multiViewRenderer.renderView(view);

      if (image) {
        // XXX somehow the context is lost when a the canvas resizes and the context is a "bitmaprenderer"
        //
        // bitmapRendererCtx ??= canvas.getContext('bitmaprenderer');
        // bitmapRendererCtx.transferFromImageBitmap(image); // TODO verify this works

        if (canvasCtx == null) {
          canvasCtx = canvas.getContext('2d');
          shouldCommit = typeof canvasCtx.commit === 'function';
          console.log('ThreeRenderView onRenderFrame:canvasCtx=', {shouldCommit, canvasCtx});
        }

        canvasCtx.drawImage(image, 0, 0);
        if (shouldCommit) {
          canvasCtx.commit();
        }
      }
    }
  });

  return {
    onDestroy() {
      unsubscribeFromRenderFrame();

      const view = getRenderView();
      if (view != null) {
        getMultiViewRenderer()?.destroyView(view);
      }

      destroySignal(getRenderView);
    },
  };
}
