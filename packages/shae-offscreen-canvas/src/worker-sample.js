import {shadowObjects as ShaeOffscreenCanvas} from './shadow-objects.js';
import {CubeScene} from './shadow-objects/sample/CubeScene.js';
import {TestImage2OnCanvas2D} from './shadow-objects/sample/TestImage2OnCanvas2D.js';
import {TestImageOnCanvas2D} from './shadow-objects/sample/TestImageOnCanvas2D.js';

export const shadowObjects = {
  extends: [ShaeOffscreenCanvas],

  define: {
    TestImageOnCanvas2D,
    TestImage2OnCanvas2D,
    CubeScene,
  },

  routes: {
    'test-image-0': ['Canvas2D', 'TestImageOnCanvas2D'],
    'test-image-1': ['Canvas2D', 'TestImage2OnCanvas2D'],
    cube: ['CanvasBitmapRenderer', 'ThreeRenderView', 'CubeScene'],
  },

  initialize(...args) {
    console.log('moin moin @spearwolf/shae-offscreen-canvas/worker-sample.js', import.meta.url, {args});
  },
};
