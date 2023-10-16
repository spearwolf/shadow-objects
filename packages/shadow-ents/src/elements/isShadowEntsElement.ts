import type {ShadowEntsElement} from './ShadowEntsElement.js';
import {$isElement, $type, type ElementType} from './constants.js';

export const isShadowEntsElement = (el: HTMLElement, type?: ElementType): el is ShadowEntsElement =>
  (el as ShadowEntsElement)[$isElement] === true && type ? (el as ShadowEntsElement)[$type] === type : true;
