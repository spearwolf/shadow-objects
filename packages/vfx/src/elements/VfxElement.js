import {ReRequestContext} from '@spearwolf/shadow-ents';

export class VfxElement extends HTMLElement {
  reRequestContextTypes = [1];

  #reRequestContext = new ReRequestContext();

  connectedCallback() {
    this.#reRequestContext.callToRequestContext(this.reRequestContextTypes);
  }
}
