import {$isElement, $type, ShadowEntsElementType} from './constants';

export class ShadowEntsElement extends HTMLElement {
  readonly [$isElement] = true;
  readonly [$type]: ShadowEntsElementType = ShadowEntsElementType.Base;

  constructor() {
    super();
  }
}
