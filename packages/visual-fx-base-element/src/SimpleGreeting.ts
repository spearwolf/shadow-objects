import {createEffect, signal} from '@spearwolf/signalize';
import {LitElement, css, html} from 'lit';

export class SimpleGreeting extends LitElement {
  static override properties: {
    name: {type: String};
  };

  declare name: string;

  static override styles = css`
    p {
      color: blue;
    }
  `;

  @signal() accessor foo = 'bar';

  constructor() {
    super();

    this.name = 'Somebody';

    createEffect(() => {
      console.log('foo changed to', this.foo);
    });
  }

  override render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}
