console.log('moin moin @spearwolf/vfx/worker-sample.js');

class VfxCtxCanvas {
  constructor(...args) {
    console.log('VfxCtxCanvas.constructor, args=', args);
  }

  onCreate(...args) {
    console.log('VfxCtxCanvas.onCreate, args=', args);
  }

  onAddToParent(...args) {
    console.log('VfxCtxCanvas.onAddToParent, args=', args);
  }
}

class VfxDisplay {
  onCreate(...args) {
    console.log('VfxCtxDisplay.onCreate, args=', args);
  }

  onAddToParent(...args) {
    console.log('VfxCtxDisplay.onAddToParent, args=', args);
  }
}

// TODO create and export type for makeShadowObjects fuunction

export const onload = ({shadowObjects, kernel, registry}) => {
  console.log('makeShadowObjects', {shadowObjects, kernel, registry});

  // TODO create some shadow-objects and register them with the kernel

  shadowObjects.define('vfx-ctx', VfxCtxCanvas);
  shadowObjects.define('vfx-display', VfxDisplay);
};
