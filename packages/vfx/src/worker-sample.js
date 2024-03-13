import {TestImageOnCanvas2D} from './shadow-objects/TestImageOnCanvas2D.js';
import {VfxCtxCanvas} from './shadow-objects/VfxCtxCanvas.js';
import {VfxDisplay} from './shadow-objects/VfxDisplay.js';

console.log('moin moin @spearwolf/vfx/worker-sample.js');

// TODO create and export types for onload function

export const onload = ({shadowObjects, kernel, registry}) => {
  console.log('worker.onload', {shadowObjects, kernel, registry});

  shadowObjects.define('vfx-ctx', VfxCtxCanvas);
  shadowObjects.define('vfx-display', VfxDisplay);
  shadowObjects.define('TestImageOnCanvas2D', TestImageOnCanvas2D);
};
