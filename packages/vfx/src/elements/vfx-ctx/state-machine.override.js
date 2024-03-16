import {emit} from 'xstate';

export const actions = {
  loadWorker: emit(({context}) => ({
    type: 'loadWorker',
    src: context.src,
  })),
  destroyWorker: emit({type: 'destroyWorker'}),
  initializeWorker: emit({type: 'initializeWorker'}),
  createShadowObjects: emit({type: 'createShadowObjects'}),
};
