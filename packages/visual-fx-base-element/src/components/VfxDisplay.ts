import {provide} from '@lit/context';
import {eventize, type Eventize} from '@spearwolf/eventize';
import {Display, type DisplayParameters} from '@spearwolf/twopoint5d';
import {css, html, LitElement} from 'lit';
import {twopoint5dDisplayContext} from '../context/twopoint5d-display-context.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {readBooleanAttribute} from '../utils/readBooleanAttribute.js';
import {readStringAttribute} from '../utils/readStringAttribute.js';

export interface VfxDisplay extends Eventize {}

export class VfxDisplay extends LitElement {
  static LoggerNS = 'vfx-display';

  static override styles = css`
    :host {
      display: block;
    }
    .layout {
      position: relative;
    }
    .overlay-content {
      display: block;
      position: absolute;
      overflow: hidden;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .top-right {
      position: absolute;
      top: 0;
      right: 0;
    }
    .top-left {
      position: absolute;
      top: 0;
      left: 0;
    }
    .bottom-right {
      position: absolute;
      bottom: 0;
      right: 0;
    }
    .bottom-left {
      position: absolute;
      bottom: 0;
      left: 0;
    }
  `;

  @provide({context: twopoint5dDisplayContext})
  accessor display: Display | undefined;

  get container(): HTMLElement | undefined {
    return this.renderRoot?.querySelector('.canvas-container') ?? undefined;
  }

  get canvas(): HTMLCanvasElement | undefined {
    return this.renderRoot?.querySelector('canvas') ?? undefined;
  }

  #debug = false;

  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: boolean) {
    this.#debug = value;
    if (this.#debug && this.logger == null) {
      this.logger = new ConsoleLogger(VfxDisplay.LoggerNS);
    } else if (!this.#debug && this.logger != null) {
      this.logger = undefined;
    }
  }

  logger?: ConsoleLogger;

  constructor() {
    super();
    eventize(this);
    this.debug = this.hasAttribute('debug');
    // TODO react to attribute changes for debug
    // TODO fullscreen - go fullscreen should include overlay-content
    // TODO mobile fullscreen - go fullscreen on rotation to landscape (as attribute)
  }

  override render() {
    return html`<div class="layout">
      <div class="canvas-container"></div>
      <div class="overlay-content">
        <slot></slot>
        <div class="top-right"><slot name="top-right"></slot></div>
        <div class="top-left"><slot name="top-left"></slot></div>
        <div class="bottom-right"><slot name="bottom-right"></slot></div>
        <div class="bottom-left"><slot name="bottom-left"></slot></div>
      </div>
    </div>`;
  }

  override firstUpdated(): void {
    this.#createDisplay();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.display) {
      this.display.start();
      this.logger?.log('display started', this.display);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.display) {
      this.display.stop();
      this.logger?.log('display stopped', this.display);
    }
  }

  #createDisplay(): void {
    if (this.display) {
      this.logger?.warn('display already created');
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

    this.logger?.log('webgl context attributes:', options);

    this.display = new Display(this.container!, options);

    this.display.on(this);
    this.display.start();

    this.logger?.log('display created', this.display);
  }
}
