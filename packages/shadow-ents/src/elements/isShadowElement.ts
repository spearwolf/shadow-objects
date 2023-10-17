import type {ShadowEntsBase} from './ShadowEntsBase.js';
import type {ShadowElementType} from './constants.js';

export const isShadowElement = (el: HTMLElement | null | undefined, type?: ShadowElementType): el is ShadowEntsBase =>
  (el as ShadowEntsBase)?.isShadowElement === true && type ? (el as ShadowEntsBase).shadowType === type : true;
