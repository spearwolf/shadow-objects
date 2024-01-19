import '@spearwolf/shadow-ents/shadow-entity.js';
import './style.css';

console.log('welcome to our little shadow-dom playground ;)');

class ShadowDomPlayground extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: (this.getAttribute('mode') as unknown as ShadowRootMode) || 'open'});
    const id = this.getAttribute('entity-id');
    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1rem;
          border: 1px solid #c41;
        }
      </style>
      <slot></slot>
      <shadow-entity data-testid="${id}">${id}</shadow-entity>
    `;
  }
}

customElements.whenDefined('shadow-entity').then(() => {
  customElements.define('shadow-dom-playground', ShadowDomPlayground);
});
