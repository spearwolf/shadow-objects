import {emit, eventize, off, retain, retainClear} from '@spearwolf/eventize';
import {createEffect, destroySignalsAndEffects, value, type SignalReader} from '@spearwolf/signalize';
import {signal, signalReader} from '@spearwolf/signalize/decorators';

export class SignalsPath {
  static Value = 'value';

  #signals: SignalReader<unknown>[] = [];
  #unsubscribeEffect?: () => void;

  @signal() accessor value: unknown;
  @signalReader() accessor value$: SignalReader<unknown>;

  constructor() {
    eventize(this);
    retain(this, SignalsPath.Value);
    this.value$((val) => emit(this, SignalsPath.Value, val));
  }

  add(...signals: SignalReader<unknown>[]) {
    for (const sig of signals) {
      this.#signals.push(sig);
    }
    this.#updateEffect();
  }

  clear() {
    this.#signals.length = 0;
    this.#clearEffect();
  }

  dispose() {
    this.clear();
    off(this);
    destroySignalsAndEffects(this);
    retainClear(this, SignalsPath.Value);
  }

  #clearEffect() {
    this.#unsubscribeEffect?.();
    this.#unsubscribeEffect = undefined;
  }

  #updateEffect() {
    this.#clearEffect();
    const [run, unsubscribe] = createEffect(() => {
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
    run();
  }
}
