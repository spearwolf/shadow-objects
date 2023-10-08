import {LitElement, css, html} from 'lit';
import {property} from 'lit/decorators.js';

export class VisualFxBase extends LitElement {
  static override styles = css`
    p {
      color: #f06;
    }
  `;

  @property() accessor name = 'visual-fx base';

  override render() {
    return html`<p>hej, ${this.name}!</p>`;
  }
}
