import {ReRequestContext} from '@spearwolf/shadow-ents';

export class VfxElement extends HTMLElement {
  reRequestContextTypes = [1];

  connectedCallback() {
    ReRequestContext.get().callToRequestContext(this.reRequestContextTypes);
  }
}
