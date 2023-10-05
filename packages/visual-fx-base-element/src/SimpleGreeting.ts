import {LitElement, css, html} from 'lit';
import {property} from 'lit/decorators';

export class SimpleGreeting extends LitElement {
  static override styles = css`
    p {
      color: blue;
    }
  `;

  @property() accessor name = 'Somebody';

  override render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}
