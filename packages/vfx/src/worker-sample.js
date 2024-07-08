import {CubeScene} from './shadow-objects/CubeScene.js';
import {TestImage2OnCanvas2D} from './shadow-objects/TestImage2OnCanvas2D.js';
import {TestImageOnCanvas2D} from './shadow-objects/TestImageOnCanvas2D.js';
import {ThreeMultiViewRenderer} from './shadow-objects/ThreeMultiViewRenderer.js';
import {ThreeRenderView} from './shadow-objects/ThreeRenderView.js';
import {VfxCtxCanvas} from './shadow-objects/VfxCtxCanvas.js';
import {VfxDisplay} from './shadow-objects/VfxDisplay.js';

export const shadowObjects = {
  define: {
    VfxCtxCanvas,
    ThreeMultiViewRenderer,
    'vfx-display': VfxDisplay,
    TestImageOnCanvas2D,
    TestImage2OnCanvas2D,
    ThreeRenderView,
    CubeScene,
  },

  routes: {
    'vfx-ctx': ['VfxCtxCanvas', 'ThreeMultiViewRenderer'],
    'demo.renderView': ['ThreeRenderView', 'CubeScene'],
  },

  initialize(...args) {
    console.log('moin moin @spearwolf/vfx/worker-sample.js', import.meta.url, {args});
  },
};
