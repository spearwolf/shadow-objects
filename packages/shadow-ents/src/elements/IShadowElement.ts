import type {NamespaceType} from '../types.js';
import {ShadowElementType} from './constants.js';

export interface IShadowElement extends HTMLElement {
  readonly isShadowElement: boolean;

  readonly shadowTypes: Set<ShadowElementType>;

  readonly uuid: string;

  ns: NamespaceType;

  setParentByType(element: IShadowElement, type: ShadowElementType): void;
  getParentByType(shadowType: ShadowElementType): IShadowElement | undefined;

  onAttachedToParent(parent: IShadowElement, type: ShadowElementType): void;
  onChildRemoved(child: IShadowElement, type: ShadowElementType): void;
}
