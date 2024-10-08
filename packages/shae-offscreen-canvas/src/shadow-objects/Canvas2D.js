import {CanvasRenderingContext2D} from '../shared/constants.js';
import {CanvasRenderingContext} from './CanvasRenderingContext.js';

export class Canvas2D extends CanvasRenderingContext {
  static displayName = 'Canvas2D';

  constructor(api) {
    super(CanvasRenderingContext2D, '2d', api);
  }
}
