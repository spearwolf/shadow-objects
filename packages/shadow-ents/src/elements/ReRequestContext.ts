import {eventize, type EventizeApi} from '@spearwolf/eventize';
import {type ShadowElementType} from './constants.js';

let gSingelton: ReRequestContext | null = null;

const OnReRequestContext = 'onReRequestContext';

export interface ReRequestContext extends EventizeApi {}

export class ReRequestContext {
  static get(): ReRequestContext {
    return gSingelton ?? new ReRequestContext();
  }

  constructor() {
    if (gSingelton) {
      return gSingelton;
    }
    gSingelton = eventize(this);
  }

  callToRequestContext(types: ShadowElementType[]) {
    this.emit(OnReRequestContext, types);
  }

  onReRequestContext(listenToTypes: ShadowElementType[], callback: () => void): () => void {
    return this.on(OnReRequestContext, (requestTypes: ShadowElementType[]) => {
      if (listenToTypes.some((type) => requestTypes.includes(type))) {
        callback();
      }
    });
  }
}
