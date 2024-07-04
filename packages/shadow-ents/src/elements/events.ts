import type {ShadowEntityElement} from './ShadowEntityElement.js';
import type {ShaeEntElement} from './ShaeEntElement.js';
import type {RequestContextEventName, RequestEntParentEventName, ShadowElementType} from './constants.js';

export interface RequestEntParentEvent extends CustomEvent {
  detail: {
    requester: ShaeEntElement;
  };
}

// TODO remove RequestContextEvent
export interface RequestContextEvent extends CustomEvent {
  detail: {
    requester: ShadowEntityElement;
    types: ShadowElementType[];
  };
}

export interface ShadowEntsEventMap {
  [RequestEntParentEventName]: RequestEntParentEvent;
  [RequestContextEventName]: RequestContextEvent;
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
