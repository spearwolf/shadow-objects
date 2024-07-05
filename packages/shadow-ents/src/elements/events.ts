import type {ShadowEntityElement} from './ShadowEntityElement.js';
import type {ShaeEntElement} from './ShaeEntElement.js';
import type {
  RequestContextEventName,
  RequestEntParentEventName,
  ReRequestEntParentEventName,
  ShadowElementType,
} from './constants.js';

export interface RequestEntParentEvent extends CustomEvent {
  detail: {
    requester: ShaeEntElement;
  };
}

export interface ReRequestEntParentEvent extends CustomEvent {
  detail: {
    requester: ShaeEntElement;
    shadowRootHost: HTMLElement;
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
  [ReRequestEntParentEventName]: ReRequestEntParentEvent;
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
