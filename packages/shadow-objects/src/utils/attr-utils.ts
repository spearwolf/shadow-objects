import {ATTR_NS} from '../elements/constants.js';
import {TRUTHY_VALUES} from './constants.js';
import {toNamespace} from './toNamespace.js';

export const readNamespaceAttribute = (el: HTMLElement) => toNamespace(el.getAttribute(ATTR_NS) ?? undefined);

export const readBooleanAttribute = (el: HTMLElement, name: string) => {
  if (el.hasAttribute(name)) {
    const val = el.getAttribute(name)?.trim()?.toLowerCase() || '1';
    return TRUTHY_VALUES.has(val);
  }
  return false;
};

/**
 * The attribute read as a number, or `undefined` where the element does not carry it.
 * `Number()` does the reading, so a value that is not a number reads as `NaN` while an empty
 * or blank one reads as `0` — whoever asks decides what either of those means.
 */
export const readNumberAttribute = (el: HTMLElement, name: string): number | undefined =>
  el.hasAttribute(name) ? Number(el.getAttribute(name)) : undefined;
