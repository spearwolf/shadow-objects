import {emit, off, retain, retainClear} from '@spearwolf/eventize';
import {createEffect, destroyObjectSignals, Effect, findObjectSignalByName, value, type SignalLike} from '@spearwolf/signalize';
import {signal} from '@spearwolf/signalize/decorators';

const VALUE = 'value';

export class SignalsPath {
  static readonly Value = VALUE;

  #signals: SignalLike<unknown>[] = [];
  #effect?: Effect;

  @signal({name: VALUE}) accessor value: unknown;

  constructor() {
    retain(this, VALUE);
    findObjectSignalByName(this, VALUE).onChange((val) => emit(this, VALUE, val));
  }

  add(...signals: SignalLike<unknown>[]) {
    for (const sig of signals) {
      this.#signals.push(sig);
    }
    this.#updateEffect();
  }

  pop() {
    this.#signals.pop();
    this.#updateEffect();
  }

  clear() {
    this.#signals.length = 0;
    this.#clearEffect();
  }

  dispose() {
    this.clear();
    retainClear(this, VALUE);
    off(this);
    destroyObjectSignals(this);
  }

  #clearEffect() {
    this.#effect?.destroy();
    this.#effect = undefined;
  }

  #updateEffect() {
    this.#clearEffect();
    this.#effect = createEffect(() => {
      for (const sig of this.#signals) {
        const val = value(sig);
        if (val != null) {
          this.value = val;
          return;
        }
      }
      this.value = undefined;
    }, this.#signals);
    this.#effect.run();
  }
}
