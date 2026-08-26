import type {NamespaceType} from '../types.js';
import {RequestEntParentEventName} from './constants.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

/**
 * The request an element sends out to find the entity above it.
 *
 * It travels as the `detail` of a bubbling, composed `shaeRequestEntParent` event. The first
 * ancestor that matches calls {@link EntAncestorRequest.answer} and stops the event there, so the
 * answer always comes from the closest match and never from more than one.
 */
export interface EntAncestorRequest {
  /** the element asking */
  requester: HTMLElement;

  /** the namespace the answer has to match — `undefined` lets any ancestor answer */
  ns?: NamespaceType;

  /** called by the first ancestor that matches; it stops the event right afterwards */
  answer(entNode: ShaeEntElement): void;
}

/**
 * Ask the closest entity above `requester` to identify itself.
 *
 * The path of a composed event *is* the ascent through the flattened tree, and it is the only one
 * that sees all of it: `assignedSlot` reports `null` at a closed boundary, so an ascent along node
 * pointers steps from a projected node straight to the host and skips the entire closed tree —
 * the event travels through it.
 *
 * Both `<shae-ent>` and `<shae-prop>` therefore send this one request, and there is exactly one
 * place that answers it.
 *
 * @see https://pm.dartus.fr/blog/a-complete-guide-on-shadow-dom-and-event-propagation/
 */
export const requestEntAncestor = (requester: HTMLElement, request: Omit<EntAncestorRequest, 'requester'>): void => {
  requester.dispatchEvent(
    new CustomEvent<EntAncestorRequest>(RequestEntParentEventName, {
      bubbles: true,
      composed: true,
      // `requester` last: the element sending the request is the one fact about it that no
      // caller gets to overwrite, and a caller not going through TypeScript could try
      detail: {...request, requester},
    }),
  );
};
