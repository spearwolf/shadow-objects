import type {RequestEntParentEventName, ReRequestEntHostEventName, ReRequestEntParentEventName} from './constants.js';
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

export interface ReRequestEntHostEvent extends CustomEvent {
  detail: {
    requester: ShaeEntElement;
  };
}

export interface ShadowEntsEventMap {
  [RequestEntParentEventName]: RequestEntParentEvent;
  [ReRequestEntParentEventName]: ReRequestEntParentEvent;
  [ReRequestEntHostEventName]: ReRequestEntHostEvent;
}

declare global {
  // An event map maps event names to event types, and nothing else. Anything else declared in
  // here becomes an event name for the whole program — a method name included.
  interface HTMLElementEventMap extends ShadowEntsEventMap {}
}