import type {ShadowEntsElement} from './ShadowEntsElement.js';
import {$isElement, $type, type ShadowEntsElementType} from './constants.js';

export const isShadowEntsElement = (el: HTMLElement, type?: ShadowEntsElementType): el is ShadowEntsElement =>
  (el as ShadowEntsElement)[$isElement] === true && type ? (el as ShadowEntsElement)[$type] === type : true;
