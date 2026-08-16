import type {RequestEntParentEventName, ReRequestEntParentEventName} from './constants.js';
import type {EntAncestorRequest} from './requestEntAncestor.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

export interface RequestEntParentEvent extends CustomEvent {
  detail: EntAncestorRequest;
}

export interface ReRequestEntParentEvent extends CustomEvent {
  detail: {
    requester: ShaeEntElement;
    shadowRootHost: HTMLElement;
  };
}

export interface ShadowEntsEventMap {
  [RequestEntParentEventName]: RequestEntParentEvent;
  [ReRequestEntParentEventName]: ReRequestEntParentEvent;
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