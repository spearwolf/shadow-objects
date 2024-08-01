import {CanvasRenderingContext2D} from '../shared/constants.js';
import {CanvasRenderingContext} from './CanvasRenderingContext.js';

export class Canvas2D extends CanvasRenderingContext {
  static displayName = 'Canvas2D';

  constructor({useContext, provideContext, onDestroy}) {
    super(CanvasRenderingContext2D, '2d', {useContext, provideContext, onDestroy});
  }
}
