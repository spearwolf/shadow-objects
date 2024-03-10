import {eventize, type EventizeApi} from '@spearwolf/eventize';
import {createEffect, destroySignalsAndEffects, value, type SignalReader} from '@spearwolf/signalize';
import {signal, signalReader} from '@spearwolf/signalize/decorators';

export interface SignalsPath extends EventizeApi {}

export class SignalsPath {
  static Value = 'value';

  #signals: SignalReader<unknown>[] = [];
  #unsubscribeEffect?: () => void;

  @signal() accessor value: unknown;
  @signalReader() accessor value$: SignalReader<unknown>;

  constructor() {
    eventize(this);
    this.retain(SignalsPath.Value);
    this.value$((val) => this.emit(SignalsPath.Value, val));
  }

  add(signal: SignalReader<unknown>) {
    this.#signals.push(signal);
    this.#updateEffect();
  }

  clear() {
    this.#signals.length = 0;
    this.#clearEffect();
  }

  dispose() {
    this.clear();
    this.off();
    destroySignalsAndEffects(this);
    this.retainClear(SignalsPath.Value);
  }

  #clearEffect() {
    this.#unsubscribeEffect?.();
    this.#unsubscribeEffect = undefined;
  }

  #updateEffect() {
    this.#clearEffect();
    const [, unsubscribe] = createEffect(() => {
      for (const sig of this.#signals) {
        const val = value(sig);
        if (val != null) {
          this.value = val;
          return;
        }
      }
      this.value = undefined;
    }, this.#signals);
    this.#unsubscribeEffect = unsubscribe;
  }
}
