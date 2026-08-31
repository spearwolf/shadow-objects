import {ComponentContext} from '../view/ComponentContext.js';
import type {ViewComponent} from '../view/ViewComponent.js';

/** An allow-list without entries forwards nothing — the same thing `false` says. */
export const isEmptyFilter = (val: Set<string> | boolean): boolean => val instanceof Set && val.size === 0;

/**
 * Whether two filter values are the same value — a `Set` by its entries rather than by identity.
 *
 * This is not the question {@link isEmptyFilter} answers. An empty `Set` and `false` forward the
 * same nothing, and they are still two different values: only a write that replaces the one with
 * the other reaches the subscribers of the signal, and the read-back on connect depends on it.
 */
export const isSameFilter = (a: Set<string> | boolean, b: Set<string> | boolean): boolean => {
  if (a === b) return true;
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const type of a) {
      if (!b.has(type)) return false;
    }
    return true;
  }
  return false;
};

/**
 * Carry the events a component dispatches out to `target` as DOM events, as far as `filter` allows.
 *
 * Answers with the call that takes the forwarding back, or with `undefined` where `filter` forwards
 * nothing and no patch was set.
 */
export const forwardCustomEventsFrom = (
  vc: ViewComponent,
  target: EventTarget,
  filter: Set<string> | boolean,
): (() => void) | undefined => {
  // Make sure we are patching the instance method, not the prototype
  const originalDispatchEvent = Object.hasOwn(vc, 'dispatchEvent') ? Object.getPrototypeOf(vc).dispatchEvent : vc.dispatchEvent;

  if (!filter || isEmptyFilter(filter)) return;

  const allowedTypes = filter instanceof Set ? filter : undefined;

  const newDispatch = (type: string, data: unknown, traverseChildren: boolean) => {
    originalDispatchEvent.call(vc, type, data, traverseChildren);

    // the internal signals of the parent resolution never leave the view side as a DOM event,
    // not even under `forward-custom-events` without a filter list
    if (
      type === ComponentContext.ReRequestParentRoots ||
      type === ComponentContext.ReRequestParent ||
      type === ComponentContext.ReRequestEntHost
    )
      return;

    if (allowedTypes && !allowedTypes.has(type)) return;

    target.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: data,
      }),
    );
  };

  // We use defineProperty to ensure it is writable and configurable
  Object.defineProperty(vc, 'dispatchEvent', {
    value: newDispatch,
    writable: true,
    configurable: true,
  });

  return () => {
    if (Object.hasOwn(vc, 'dispatchEvent') && vc.dispatchEvent === newDispatch) {
      // the property lives on the instance (defineProperty above), the method it shadows lives on
      // the prototype: deleting the own property restores the original, it does not remove the method
      delete (vc as {dispatchEvent?: ViewComponent['dispatchEvent']}).dispatchEvent;
    }
  };
};
