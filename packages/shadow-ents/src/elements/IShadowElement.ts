import type {SignalFuncs, SignalReader} from '@spearwolf/signalize';
import type {NamespaceType} from '../types.js';
import {ShadowElementType} from './constants.js';

export interface IShadowElement extends HTMLElement {
  readonly isShadowElement: true;

  readonly contextTypes: ShadowElementType[];
  readonly shadowTypes: Set<ShadowElementType>;

  readonly uuid: string;

  ns: NamespaceType;
  readonly ns$: SignalReader<NamespaceType>;

  setContextByType(element: IShadowElement, type: ShadowElementType): void;

  getContextByType$(shadowType: ShadowElementType): SignalFuncs<IShadowElement | undefined>;
  getContextByType(shadowType: ShadowElementType): IShadowElement | undefined;

  onAttachedToContext(context: IShadowElement, type: ShadowElementType): void;
  onChildRemovedFromContext(child: IShadowElement, type: ShadowElementType): void;

  // TODO getChildrenOfContext(shadowType) -> IShadowElement[]

  hasContextElements(): boolean;
}
