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

  #signals: SignalLike<any>[] = [];
  #effect?: Effect;

  @signal({name: VALUE}) accessor value: any = undefined;

  readonly value$: Signal<any>;

  constructor(signals?: SignalLike<any>[]) {
    retain(this, VALUE);

    this.value$ = findObjectSignalByName(this, VALUE);
    this.value$.onChange((val) => emit(this, VALUE, val));

    if (signals) {
      this.add(...signals);
    }
  }

  add(...signals: (Signal<any> | SignalLike<any>)[]) {
    this.#signals.push(...signals);
    this.#updateGetValueFromSignalsEffect();
    return this.#makeRemoveFunc(signals);
  }

  unshift(...signals: SignalLike<any>[]) {
    this.#signals.unshift(...signals);
    this.#updateGetValueFromSignalsEffect();
    return this.#makeRemoveFunc(signals);
  }

  remove(...signals: SignalLike<any>[]) {
    this.#makeRemoveFunc(signals)();
  }

  clear() {
    this.#signals.length = 0;
    this.#updateGetValueFromSignalsEffect();
  }

  dispose() {
    this.clear();

    this.#effect?.destroy();
    this.#effect = undefined;

    retainClear(this, VALUE);
    off(this);

    this.value$.destroy();
    destroyObjectSignals(this);
  }

  #makeRemoveFunc(signals: SignalLike<any>[]) {
    return () => {
      for (const sig of signals) {
        const idx = this.#signals.indexOf(sig);
        if (idx !== -1) {
          this.#signals.splice(idx, 1);
        }
      }
      this.#updateGetValueFromSignalsEffect();
    };
  }

  #updateGetValueFromSignalsEffect() {
    this.#effect?.destroy();
    if (this.#signals.length === 0) {
      this.#effect = undefined;
      this.value = undefined;
    } else {
      this.#effect = createEffect(() => {
        let valueFromSignals: any = undefined;
        for (const sig of this.#signals) {
          const val = value(sig);
          if (val != null) {
            valueFromSignals = val;
            break;
          }
        }
        this.value = valueFromSignals;
      }, this.#signals);
      this.#effect.run();
    }
  }
}
