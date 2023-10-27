import {eventize, type EventizeApi} from '@spearwolf/eventize';
import {Display} from '@spearwolf/twopoint5d';
import {css, html, LitElement} from 'lit';

export interface VisualFxBase extends EventizeApi {}

export class VisualFxBase extends LitElement {
  static override styles = css`
    :host,
    div {
      display: block;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      line-height: 0;
      font-size: 0;
    }
  `;

  constructor() {
    super();
    eventize(this);
  }

  override render() {
    return html`<div></div>`;
  }

  display?: Display;

  get container(): HTMLDivElement | undefined {
    return this.renderRoot?.querySelector('div') ?? undefined;
  }

  get canvas(): HTMLCanvasElement | undefined {
    return this.renderRoot?.querySelector('canvas') ?? undefined;
  }

  override firstUpdated(): void {
    this.#createDisplay();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.display) {
      this.display.start();
      console.debug('display started', this.display);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.display) {
      this.display.stop();
      console.debug('display stopped', this.display);
    }
  }

  #createDisplay(): void {
    if (this.display) {
      console.warn('display already created');
      return;
    }

    // TODO read options from attributes

    this.display = new Display(this.container!);
    this.display.on(this);
    this.display.start();

    console.debug('display created', this.display);
  }
}
