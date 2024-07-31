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
    'test-image-0': ['TestImageOnCanvas2D'],
    'test-image-1': ['TestImage2OnCanvas2D'],
    // 'test-image-0': ['ThreeRenderView', 'CubeScene'],
    cube: ['ThreeRenderView', 'CubeScene'],
  },

  initialize(...args) {
    console.log('moin moin @spearwolf/shae-offscreen-canvas/worker-sample.js', import.meta.url, {args});
  },
};
