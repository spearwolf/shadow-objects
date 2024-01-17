import type {ShadowEntsBase} from './ShadowEntsBase.js';
import type {ElementContextEventName, RequestContextEventName, ShadowElementType} from './constants.js';

export interface RequestContextEvent extends CustomEvent {
  detail: {
    requester: ShadowEntsBase;
    types: ShadowElementType[];
  };
}

// TODO remove?
export interface ElementContextEvent extends CustomEvent {
  detail: {
    requester: ShadowEntsBase;
    contextElement: ShadowEntsBase;
  };
}

export interface ShadowEntsEventMap {
  [RequestContextEventName]: RequestContextEvent;

  // TODO remove?
  [ElementContextEventName]: ElementContextEvent;
}

declare global {
  interface HTMLElementEventMap extends ShadowEntsEventMap {
    addEventListener<K extends keyof ShadowEntsEventMap>(
      type: K,
      listener: (this: Document, ev: ShadowEntsEventMap[K]) => void,
    ): void;
    dispatchEvent<K extends keyof ShadowEntsEventMap>(ev: ShadowEntsEventMap[K]): void;
  }
}
