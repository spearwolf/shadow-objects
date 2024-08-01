import {Canvas2D} from './shadow-objects/Canvas2D.js';
import {CanvasBitmapRenderer} from './shadow-objects/CanvasBitmapRenderer.js';
import {ShaeOffscreenCanvas} from './shadow-objects/ShaeOffscreenCanvas.js';
import {ThreeMultiViewRenderer} from './shadow-objects/ThreeMultiViewRenderer.js';
import {ThreeRenderView} from './shadow-objects/ThreeRenderView.js';

export const shadowObjects = {
  define: {
    ShaeOffscreenCanvas,
    ThreeMultiViewRenderer,
    ThreeRenderView,
    Canvas2D,
    CanvasBitmapRenderer,
  },
};
