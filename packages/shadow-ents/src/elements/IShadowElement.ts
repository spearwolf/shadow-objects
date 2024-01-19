import type {SignalFuncs, SignalReader} from '@spearwolf/signalize';
import type {NamespaceType} from '../types.js';
import {ShadowElementType} from './constants.js';

export interface IShadowElement extends HTMLElement {
  readonly isShadowElement: true;

  readonly shadowTypes: Set<ShadowElementType>;
  readonly contextTypes: ShadowElementType[];

  readonly uuid: string;

  ns: NamespaceType;
  readonly ns$: SignalReader<NamespaceType>;

  setContextByType(element: IShadowElement, type: ShadowElementType): void;

  getContextByType$(shadowType: ShadowElementType): SignalFuncs<IShadowElement | undefined>;
  getContextByType(shadowType: ShadowElementType): IShadowElement | undefined;

  onAttachedToContext(context: IShadowElement, type: ShadowElementType): void;
  onChildRemovedFromContext(child: IShadowElement, type: ShadowElementType): void;

  addContextChild(child: IShadowElement, type: ShadowElementType): void;
  removeContextChild(child: IShadowElement, type: ShadowElementType): void;

  /**
   * Returns any children of the context type.
   *
   * The element must be of the type defined in {@link shadowTypes}.
   * If it is not, then the result will be `undefined`.
   */
  getChildrenOfContext(type: ShadowElementType): IShadowElement[] | undefined;

  /**
   * Checks to see if there are any context elements of the types that are defined in the contextTypes
   */
  hasContextElements(): boolean;

  /**
   * Checks to see if there are any children of the contexts of the types that are defined in the shadowTypes
   */
  hasContextChildren(): boolean;
}
