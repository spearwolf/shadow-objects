import {emitSafe, off, retain, retainClear} from '@spearwolf/eventize';
import {
  createEffect,
  destroyObjectSignals,
  Effect,
  findObjectSignalByName,
  type Signal,
  type SignalLike,
  value,
} from '@spearwolf/signalize';
import {signal} from '@spearwolf/signalize/decorators';

const VALUE = 'value';

export class SignalsPath {
  static readonly Value = VALUE;

  #signals: SignalLike<any>[] = [];
  #effect?: Effect | undefined;

  @signal({name: VALUE}) accessor value: any = undefined;

  readonly value$: Signal<any>;

  constructor(signals?: SignalLike<any>[]) {
    retain(this as SignalsPath, VALUE);

    // the @signal accessor above creates this signal during field initialization,
    // so the lookup by that name always resolves once the constructor body runs
    this.value$ = findObjectSignalByName(this, VALUE)!;
    // `emitSafe()`: this runs from a signal change callback, so a listener that throws would leave
    // through whichever write moved the path and reach code that has nothing to do with this value.
    // The retained value is written either way, because the event was delivered -- which matters
    // here, since `Value` is retained and a later subscriber reads exactly that.
    this.value$.onChange((val) => emitSafe(this as SignalsPath, VALUE, val));

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

    retainClear(this as SignalsPath, VALUE);
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
        let valueFromSignals: any;
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
