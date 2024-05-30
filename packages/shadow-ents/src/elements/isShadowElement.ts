import type {ShadowEntityElement} from './ShadowEntityElement.js';
import type {ShadowElementType} from './constants.js';

export const isShadowElement = (el: HTMLElement | null | undefined, type?: ShadowElementType): el is ShadowEntityElement =>
  (el as ShadowEntityElement)?.isShadowElement === true && type ? (el as ShadowEntityElement).shadowTypes.has(type) : true;
