import {consume} from '@lit/context';
import {eventize, type Eventize} from '@spearwolf/eventize';
import {createSignal, value} from '@spearwolf/signalize';
import type {Display} from '@spearwolf/twopoint5d';
import {css, html} from 'lit';
import {twopoint5dDisplayContext} from '../context/twopoint5d-display-context.js';
import {VisualFxBaseElement} from './VisualFxBaseElement.js';

export interface Twopoint5dStage2d extends Eventize {}

export class Twopoint5dStage2d extends VisualFxBaseElement {
  static override styles = css`
    :host {
      display: inline;
    }
  `;

  @consume({context: twopoint5dDisplayContext, subscribe: true})
  accessor displayCtx: Display | undefined;

  #display = createSignal<Display | undefined>();

  get display(): Display | undefined {
    return value(this.#display[0]);
  }

  get display$(): Display | undefined {
    return this.#display[0]();
  }

  set display(value: Display | undefined) {
    this.#display[1](value);
  }

  constructor() {
    super();
    eventize(this);
    this.loggerNS = 'twopoint5d-stage2d';
  }

  override render() {
    this.logger?.log('render: display:', this.displayCtx);

    this.display = this.displayCtx;

    return html`<slot></slot>`;
  }
}
