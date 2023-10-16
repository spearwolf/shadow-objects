import type {ShadowEntsElement} from './ShadowEntsElement.js';
import type {ElementContextEventName, RequestContextEventName} from './constants.js';

export interface RequestContextEvent extends CustomEvent {
  detail: {
    requester: ShadowEntsElement;
  };
}

export interface ElementContextEvent extends CustomEvent {
  detail: {
    requester: ShadowEntsElement;
    contextElement: ShadowEntsElement;
  };
}

export interface ShadowEntsEventMap {
  [RequestContextEventName]: RequestContextEvent;
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
