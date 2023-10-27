import {eventize, type Eventize} from '@spearwolf/eventize';
import {Display, type DisplayParameters} from '@spearwolf/twopoint5d';
import {css, html, LitElement} from 'lit';

export interface VisualFxBase extends Eventize {}

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

    const options: DisplayParameters = {
      precision: this.#readStringAttribute('precision', ['highp', 'mediump', 'lowp'], 'highp'),
      powerPreference: this.#readStringAttribute('power-preference', ['default', 'high-performance', 'low-power'], 'default'),
      preserveDrawingBuffer: this.#readBooleanAttribute('preserve-drawing-buffer'),
      premultipliedAlpha: this.#readBooleanAttribute('premultiplied-alpha', true),
      stencil: this.#readBooleanAttribute('stencil'),
      alpha: this.#readBooleanAttribute('alpha', true),
      depth: this.#readBooleanAttribute('depth', true),
      antialias: this.#readBooleanAttribute('antialias', true),
      desynchronized: this.#readBooleanAttribute('desynchronized'),
      failIfMajorPerformanceCaveat: this.#readBooleanAttribute('fail-if-major-performance-caveat'),
    };

    console.debug('webgl context attributes:', options);

    this.display = new Display(this.container!, options);

    this.display.on(this);
    this.display.start();

    console.debug('display created', this.display);
  }

  #readBooleanAttribute(name: string, defValue = false): boolean {
    let val: boolean | undefined = undefined;
    if (this.hasAttribute(name)) {
      const strVal = this.getAttribute(name).trim().toLowerCase();
      if (strVal === '' || strVal === 'true' || strVal === 'yes' || strVal === '1') {
        val = true;
      } else {
        val = false;
      }
    }
    if (this.hasAttribute(`no-${name}`)) {
      val = false;
    }
    return val ?? defValue;
  }

  #readStringAttribute(name: string, validValues: string[], defValue = ''): string {
    if (this.hasAttribute(name)) {
      const strVal = this.getAttribute(name).trim().toLowerCase();
      if (validValues.includes(strVal)) {
        return strVal;
      } else {
        console.warn(`invalid value for "${name}":`, strVal, 'valid values:', validValues, 'defaulting to:', defValue);
      }
    }
    return defValue;
  }
}
