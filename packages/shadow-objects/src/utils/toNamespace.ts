import {GlobalNS} from '../constants.js';
import type {NamespaceType} from '../types.js';

export const toNamespace = (namespace?: NamespaceType): NamespaceType =>
  typeof namespace === 'string' ? namespace.trim() || GlobalNS : typeof namespace === 'symbol' ? namespace : GlobalNS;
