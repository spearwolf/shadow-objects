import {VfxCtxCanvas} from './worker/VfxCtxCanvas.js';
import {VfxDisplay} from './worker/VfxDisplay.js';

console.log('moin moin @spearwolf/vfx/worker-sample.js');

// TODO create and export types for onload function

export const onload = ({shadowObjects, kernel, registry}) => {
  console.log('worker.onload', {shadowObjects, kernel, registry});

  shadowObjects.define('vfx-ctx', VfxCtxCanvas);
  shadowObjects.define('vfx-display', VfxDisplay);
};
