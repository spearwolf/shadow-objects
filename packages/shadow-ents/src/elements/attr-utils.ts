import {toNamespace} from '../toNamespace.js';

export const readNamespaceAttribute = (el: HTMLElement) => toNamespace(el.getAttribute('ns'));

const TRUTHY_VALUES = new Set(['on', 'true', 'yes', 'local', '1']);

export const readBooleanAttribute = (el: HTMLElement, name: string) => {
  if (el.hasAttribute(name)) {
    const val = el.getAttribute(name)?.trim()?.toLowerCase() || 'on';
    return TRUTHY_VALUES.has(val);
  }
  return false;
};
