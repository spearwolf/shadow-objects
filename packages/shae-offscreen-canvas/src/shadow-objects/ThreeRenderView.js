import {Priority} from '@spearwolf/eventize';
import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
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

  logger = new ConsoleLogger(ThreeRenderView.displayName);

  constructor({entity, useContext, provideContext, createSignal, createEffect, on}) {
    this.id = ++id;

    const getMultiViewRenderer = useContext(ThreeMultiViewRendererContext);
    const getImageBitmapRenderer = useContext(ImageBitmapRenderingContext);
    const getCanvasSize = useContext(CanvasSizeContext);

    const renderView = createSignal();

    // The renderer that made the view `renderView` holds. A view belongs to one renderer: made by
    // it, drawn by it, handed back to it. The renderer in reach can be replaced by another without
    // falling to `null` in between -- a nearer provider of `ThreeMultiViewRendererContext` appearing
    // while an outer one still stands -- and a held view says nothing about which one is under it.
    let viewOwner;

    createEffect(() => {
      const canvasSize = getCanvasSize();
      if (canvasSize == null) return;

      let view = renderView.get();

      const multiViewRenderer = getMultiViewRenderer();

      if (multiViewRenderer == null) {
        if (view) {
          viewOwner = undefined;
          renderView.set(undefined);
        }
        return;
      }

      const [width, height] = canvasSize;

      if (view == null || viewOwner !== multiViewRenderer) {
        view = multiViewRenderer.createView(width, height);
        // The owner is set before the view is published, not after: `set()` runs the effect below
        // synchronously and that one reads this variable, and this effect re-enters itself on the
        // same `set()`. With the assignment the other way round it finds the renderer still foreign,
        // makes another view, and keeps doing so until the effect depth guard stops it.
        viewOwner = multiViewRenderer;
        renderView.set(view);
      } else {
        view.width = width;
        view.height = height;
      }
    });

    // The cleanup below is the only place a view is handed back. It runs when the view signal
    // changes and when the creation scope destroys the effects, and it carries both the view and
    // the renderer that made it in its closure, so it needs no context of its own. Nothing writes
    // the view signal on teardown: an `undefined` from there would run the effect above once more
    // while the renderer and size contexts are still standing, and it would take a view that is
    // destroyed in the same breath.
    //
    // The renderer comes from `viewOwner`, so this effect depends on the view signal and on nothing
    // else. A second dependency would be read at a moment of its own: the effect above writes the
    // view signal while a renderer change is still being handed out, so an effect reading both runs
    // twice for one change, and the later run tears down the pairing the earlier one registered.
    // Such a stray call does not go nowhere -- `destroyView()` deletes by view id and every renderer
    // numbers its views from one, so it takes the namesake view of the renderer it was aimed at.
    createEffect(() => {
      const view = renderView.get();
      const owner = viewOwner;

      if (view && owner) {
        return () => {
          owner.destroyView(view);
        };
      }
    });

    provideContext(ThreeRenderViewContext, renderView);

    // The frame listener is async, and eventize hands it the next frame whether or not the previous
    // one has come back. A render is over once its image has been read off the canvas the renderer
    // shares between all its views, so a frame arriving before that is dropped rather than queued:
    // the next one is one tick of the frame loop away, and dropping keeps at most one render per
    // view outstanding, while a queue would grow for as long as the renderer stays behind.
    let frameInFlight = false;

    // The failure that is already reported, and the view it belonged to. A render that keeps
    // failing the same way is one situation and not one per frame: the frames arrive at the rate
    // of the loop, and a report per frame would bury the first one, which is the one carrying
    // the news. A frame that comes back clears this, so the next failure is reported as its own.
    let reportedFailure;

    on(entity, OnFrame, Priority.Low, async () => {
      if (frameInFlight) return;

      const view = renderView.get();

      if (view) {
        const multiViewRenderer = getMultiViewRenderer();

        if (multiViewRenderer && getImageBitmapRenderer()) {
          frameInFlight = true;

          // The image holds GPU memory until it is closed, and frames arrive at the rate of the loop.
          // Freeing it in the `finally` covers both ends of a render: `close()` on a bitmap the transfer
          // already took is defined to do nothing, and a transfer that throws -- the drawing context
          // throws when its canvas has changed owner -- still gives the memory back.
          let image;

          try {
            image = await multiViewRenderer.renderView(view);

            if (image) {
              getImageBitmapRenderer()?.transferFromImageBitmap(image);
            }

            reportedFailure = undefined;
          } catch (error) {
            // eventize does not await this listener, so a rejection left uncaught here leaves
            // the realm as an unhandled one, once for every frame that fails. Reporting it is
            // all this does: whether a failure will pass is not knowable from here -- a drawing
            // context that is gone can come back, and a renderer that refuses this view can be
            // replaced -- so the next frame keeps its turn, and only the report is held to one
            // per failure.
            const message = String(/** @type {{message?: unknown}} */ (error)?.message ?? error);

            if (reportedFailure == null || reportedFailure.view !== view || reportedFailure.message !== message) {
              reportedFailure = {view, message};
              this.logger.error('rendering the view failed:', {viewId: view.viewId}, error);
            }
          } finally {
            image?.close();

            // a render that failed frees the view for the next frame just as one that succeeded
            frameInFlight = false;
          }
        }
      }
    });
  }
}
