import type {IShadowElement} from './IShadowElement.js';
import type {ShadowElementType} from './constants.js';

export const isShadowElement = (el: HTMLElement | null | undefined, type?: ShadowElementType): el is IShadowElement =>
  (el as IShadowElement)?.isShadowElement === true && type ? (el as IShadowElement).shadowTypes.has(type) : true;
