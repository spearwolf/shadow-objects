import {provide} from '@lit/context';
import {eventize, type Eventize} from '@spearwolf/eventize';
import {Display, type DisplayParameters} from '@spearwolf/twopoint5d';
import {css, html, LitElement} from 'lit';
import {twopoint5dDisplayContext} from '../context/twopoint5d-display-context.js';
import {readBooleanAttribute} from '../utils/readBooleanAttribute.js';
import {readStringAttribute} from '../utils/readStringAttribute.js';

export interface VfxDisplay extends Eventize {}

export class VfxDisplay extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  @provide({context: twopoint5dDisplayContext})
  accessor display: Display | undefined;

  get container(): HTMLDivElement | undefined {
    return this.renderRoot?.querySelector('div') ?? undefined;
  }

  get canvas(): HTMLCanvasElement | undefined {
    return this.renderRoot?.querySelector('canvas') ?? undefined;
  }

  constructor() {
    super();
    eventize(this);
  }

  override render() {
    return html`<div></div>`;
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
      styleSheetRoot: this.renderRoot,
      resizeToElement: this,
      resizeToAttributeEl: this,
    };

    console.debug('webgl context attributes:', options);

    this.display = new Display(this.container!, options);

    this.display.on(this);
    this.display.start();

    console.debug('display created', this.display);
  }
}
