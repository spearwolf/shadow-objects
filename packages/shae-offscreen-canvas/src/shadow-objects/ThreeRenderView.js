import {Priority, on} from '@spearwolf/eventize';
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

  let logOn1stFrame = true; // TODO remove me

  const unsubscribeFromRenderFrame = on(entity, 'onRenderFrame', Priority.Low, async ({canvas}) => {
    const view = getRenderView();

    if (view != null) {
      const multiViewRenderer = getMultiViewRenderer();
      if (!multiViewRenderer) return;

      // TODO remove me:
      if (logOn1stFrame) {
        console.log('ThreeRenderView onRenderFrame:renderView', {
          renderView: view,
          canvasCtx: canvasCtx,
          multiViewRenderer,
        });
        logOn1stFrame = false;
      }

      const image = await multiViewRenderer.renderView(view);

      if (image) {
        // FIXME OffscreenCanvas ImageBitmapRenderingContext stops rendering when canvas resized
        // - it works with firefox, but
        // - with chrome it no longer works as soon as the size changes after the context has been created
        //   - this is a bug in chrome: https://issues.chromium.org/issues/41493549
        //   - so we need to wait until the bug is mainlined
        //
        // https://html.spec.whatwg.org/multipage/canvas.html#the-imagebitmaprenderingcontext-interface
        //
        // UPDATE(2024-05-24): the bug seems to be fixed in chrome
        //
        if (canvasCtx == null) {
          canvasCtx = canvas.getContext('bitmaprenderer');
        }
        canvasCtx.transferFromImageBitmap(image);

        // XXX the fallback is to drawImage
        //
        // if (canvasCtx == null) {
        //   canvasCtx = canvas.getContext('2d');
        //   shouldCommit = typeof canvasCtx.commit === 'function';
        //   console.log('ThreeRenderView onRenderFrame:canvasCtx=', {shouldCommit, canvasCtx});
        // }

        // canvasCtx.drawImage(image, 0, 0);
        // if (shouldCommit) {
        //   canvasCtx.commit();
        // }
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
