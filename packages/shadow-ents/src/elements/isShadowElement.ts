import type {ShadowEntity} from './ShadowEntity.js';
import type {ShadowElementType} from './constants.js';

export const isShadowElement = (el: HTMLElement | null | undefined, type?: ShadowElementType): el is ShadowEntity =>
  (el as ShadowEntity)?.isShadowElement === true && type ? (el as ShadowEntity).shadowTypes.has(type) : true;
