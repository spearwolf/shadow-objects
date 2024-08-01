import {ImageBitmapRenderingContext} from '../shared/constants.js';
import {CanvasRenderingContext} from './CanvasRenderingContext.js';

export class CanvasBitmapRenderer extends CanvasRenderingContext {
  static displayName = 'CanvasBitmapRenderer';

  constructor({useContext, provideContext, onDestroy}) {
    super(ImageBitmapRenderingContext, 'bitmaprenderer', {useContext, provideContext, onDestroy});
  }
}