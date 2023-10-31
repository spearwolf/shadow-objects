import {consume} from '@lit/context';
import {createSignal, value, type SignalFuncs, type SignalReader} from '@spearwolf/signalize';
import type {Display} from '@spearwolf/twopoint5d';
import {css, html} from 'lit';
import {twopoint5dDisplayContext} from '../context/twopoint5d-display-context.js';
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

  constructor() {
    super();

    this.loggerNS = 'twopoint5d-stage2d';

    this.display$((display) => this.logger?.log('display updated:', display));
  }

  override render() {
    this.display = this.displayCtx;

    return html`<slot></slot>`;
  }
}
