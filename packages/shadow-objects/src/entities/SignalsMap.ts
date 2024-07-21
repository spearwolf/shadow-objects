import {SignalObject, createSignal, type SignalReader, type SignalWriter} from '@spearwolf/signalize';

export class SignalsMap {
  #signals = new Map<string, SignalObject<any>>();

  keys(): IterableIterator<string> {
    return this.#signals.keys();
  }

  entries(): IterableIterator<[string, SignalObject<any>]> {
    return this.#signals.entries();
  }

  clear() {
    for (const sig of this.#signals.values()) {
      sig.destroy();
    }
    this.#signals.clear();
  }

  hasSignal(key: string): boolean {
    return this.#signals.has(key);
  }

  getSignal<T = unknown>(key: string): SignalObject<T> {
    if (!this.#signals.has(key)) {
      const signal = createSignal<T>();
      this.#signals.set(key, signal);
      return signal;
    }
    return this.#signals.get(key)!;
  }

  getSignalReader<T = unknown>(key: string): SignalReader<T> {
    return this.getSignal<T>(key).get;
  }

  getSignalWriter<T = unknown>(key: string): SignalWriter<T> {
    return this.getSignal<T>(key).set;
  }
}
