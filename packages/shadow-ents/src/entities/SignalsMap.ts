import {createSignal, destroySignal, type SignalFuncs, type SignalReader, type SignalWriter} from '@spearwolf/signalize';

export class SignalsMap {
  #signals = new Map<string, SignalFuncs<any>>();

  keys(): IterableIterator<string> {
    return this.#signals.keys();
  }

  entries(): IterableIterator<[string, SignalFuncs<any>]> {
    return this.#signals.entries();
  }

  clear() {
    for (const [sig] of this.#signals.values()) {
      destroySignal(sig);
    }
    this.#signals.clear();
  }

  getSignal<T = unknown>(key: string): SignalFuncs<T> {
    if (!this.#signals.has(key)) {
      const signal = createSignal<T>();
      this.#signals.set(key, signal);
      return signal;
    }
    return this.#signals.get(key)!;
  }

  getSignalReader<T = unknown>(key: string): SignalReader<T> {
    return this.getSignal<T>(key)[0];
  }

  getSignalWriter<T = unknown>(key: string): SignalWriter<T> {
    return this.getSignal<T>(key)[1];
  }
}
