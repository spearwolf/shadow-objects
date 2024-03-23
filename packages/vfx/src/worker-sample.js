import {TestImage2OnCanvas2D} from './shadow-objects/TestImage2OnCanvas2D.js';
import {TestImageOnCanvas2D} from './shadow-objects/TestImageOnCanvas2D.js';
import {ThreeMultiViewRenderer} from './shadow-objects/ThreeMultiViewRenderer.js';
import {VfxCtxCanvas} from './shadow-objects/VfxCtxCanvas.js';
import {VfxDisplay} from './shadow-objects/VfxDisplay.js';

console.log('moin moin @spearwolf/vfx/worker-sample.js');

// TODO create and export types for onload function

export const onload = ({shadowObjects, kernel, registry}) => {
  console.debug('worker.onload', {shadowObjects, kernel, registry});

  shadowObjects.define('vfx-ctx', VfxCtxCanvas);
  shadowObjects.define('vfx-ctx', ThreeMultiViewRenderer);
  shadowObjects.define('vfx-display', VfxDisplay);
  shadowObjects.define('TestImageOnCanvas2D', TestImageOnCanvas2D);
  shadowObjects.define('TestImage2OnCanvas2D', TestImage2OnCanvas2D);
};
