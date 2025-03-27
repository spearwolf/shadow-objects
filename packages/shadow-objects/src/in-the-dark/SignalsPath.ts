import {emit, off, retain, retainClear} from '@spearwolf/eventize';
import {
  createEffect,
  destroyObjectSignals,
  Effect,
  findObjectSignalByName,
  value,
  type Signal,
  type SignalLike,
} from '@spearwolf/signalize';
import {signal} from '@spearwolf/signalize/decorators';

const VALUE = 'value';

export class SignalsPath {
  static readonly Value = VALUE;

  #signals: SignalLike<unknown>[] = [];
  #effect?: Effect;

  @signal({name: VALUE}) accessor value: unknown;

  readonly value$: Signal<unknown>;

  constructor(signals?: SignalLike<unknown>[]) {
    retain(this, VALUE);

    this.value$ = findObjectSignalByName(this, VALUE);
    this.value$.onChange((val) => emit(this, VALUE, val));

    if (signals) {
      this.add(...signals);
    }
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
    this.value$.destroy();
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
