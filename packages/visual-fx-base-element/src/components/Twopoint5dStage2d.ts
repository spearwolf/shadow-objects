import {consume} from '@lit/context';
import {createEffect, createSignal, value, type SignalFuncs, type SignalReader} from '@spearwolf/signalize';
import type {Display} from '@spearwolf/twopoint5d';
import {css, html} from 'lit';
import {property} from 'lit/decorators.js';
import {twopoint5dDisplayContext} from '../context/twopoint5d-display-context.js';
import {SignalMap} from '../utils/SignalMap.js';
import {VisualFxBaseElement} from './VisualFxBaseElement.js';

export class Twopoint5dStage2d extends VisualFxBaseElement {
  static override styles = css`
    :host {
      display: inline;
    }
  `;

  @consume({context: twopoint5dDisplayContext, subscribe: true})
  accessor displayCtx: Display | undefined;

  readonly #display: SignalFuncs<Display | undefined> = createSignal();

  get display(): Display | undefined {
    return value(this.#display[0]);
  }

  get display$(): SignalReader<Display | undefined> {
    return this.#display[0];
  }

  set display(value: Display | undefined) {
    this.#display[1](value);
  }

  @property({type: String, reflect: true})
  accessor fit: 'contain' | 'cover' | 'fill' | undefined;

  @property({type: Number, reflect: true})
  accessor width: number | undefined;

  @property({type: Number, reflect: true})
  accessor height: number | undefined;

  @property({type: Number, reflect: true, attribute: 'pixel-zoom'})
  accessor pixelZoom: number | undefined;

  @property({type: Number, reflect: true, attribute: 'min-pixel-zoom'})
  accessor minPixelZoom: number | undefined;

  @property({type: Number, reflect: true, attribute: 'max-pixel-zoom'})
  accessor maxPixelZoom: number | undefined;

  @property({type: Number, reflect: true})
  accessor near: number | undefined;

  @property({type: Number, reflect: true})
  accessor far: number | undefined;

  @property({type: Number, reflect: true, attribute: 'distance-to-projection-plane'})
  accessor distanceToProjectionPlane: number | undefined;

  @property({type: String, reflect: true, attribute: 'projection-plane'})
  accessor projectionPlane: 'xy' | 'xz' | undefined;

  @property({type: String, reflect: true, attribute: 'projection-origin'})
  accessor projectionOrigin: 'bottom-left' | 'top-left' | undefined;

  @property({type: String, reflect: true, attribute: 'projection-type'})
  accessor projectionType: 'parallax' | 'ortho' | 'orthographic' | undefined;

  readonly #projSignals: SignalMap;
  readonly #viewSpecsSignals: SignalMap;

  constructor() {
    super();

    this.loggerNS = 'twopoint5d-stage2d';

    this.fit = 'contain';

    this.projectionPlane = 'xy';
    this.projectionOrigin = 'bottom-left';

    this.display$((display) => this.logger?.log('display updated:', display));

    this.#projSignals = SignalMap.fromProps(this, ['projectionPlane', 'projectionOrigin', 'projectionType']);

    this.#viewSpecsSignals = SignalMap.fromProps(this, [
      'fit',
      'width',
      'height',
      'pixelZoom',
      'minPixelZoom',
      'maxPixelZoom',
      'near',
      'far',
      'distanceToProjectionPlane',
    ]);

    createEffect(() => {
      this.onProjectionUpdate();
    }, this.#projSignals.getSignals());

    createEffect(() => {
      this.onViewSpecsUpdate();
    }, this.#viewSpecsSignals.getSignals());
  }

  override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    this.logger?.log('willUpdate', changedProperties);

    const propKeys = Array.from(changedProperties.keys()) as (keyof this)[];

    this.#projSignals.updateFromProps(this, propKeys);
    this.#viewSpecsSignals.updateFromProps(this, propKeys);
  }

  override render() {
    this.display = this.displayCtx;

    return html`<slot></slot>`;
  }

  private onProjectionUpdate(): void {
    this.logger?.log('projection update', this.#projSignals.getValueObject());
  }

  private onViewSpecsUpdate(): void {
    this.logger?.log('view-specs update', this.#viewSpecsSignals.getValueObject());
  }
}
