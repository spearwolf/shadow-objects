import {eventize, type Eventize} from '@spearwolf/eventize';
import {Display, type DisplayParameters} from '@spearwolf/twopoint5d';
import {css, html, LitElement} from 'lit';
import {readBooleanAttribute} from '../utils/readBooleanAttribute.js';
import {readStringAttribute} from '../utils/readStringAttribute.js';

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
      precision: readStringAttribute(this, 'precision', ['highp', 'mediump', 'lowp'], 'highp'),
      powerPreference: readStringAttribute(this, 'power-preference', ['default', 'high-performance', 'low-power'], 'default'),
      preserveDrawingBuffer: readBooleanAttribute(this, 'preserve-drawing-buffer'),
      premultipliedAlpha: readBooleanAttribute(this, 'premultiplied-alpha', true),
      stencil: readBooleanAttribute(this, 'stencil'),
      alpha: readBooleanAttribute(this, 'alpha', true),
      depth: readBooleanAttribute(this, 'depth', true),
      antialias: readBooleanAttribute(this, 'antialias', true),
      desynchronized: readBooleanAttribute(this, 'desynchronized'),
      failIfMajorPerformanceCaveat: readBooleanAttribute(this, 'fail-if-major-performance-caveat'),
    };

    console.debug('webgl context attributes:', options);

    this.display = new Display(this.container!, options);

    this.display.on(this);
    this.display.start();

    console.debug('display created', this.display);
  }
}
