import {Signal, createSignal, type SignalReader, type SignalWriter} from '@spearwolf/signalize';

// TODO replace SignalsMap with @spearwolf/signalize:SignalGroup

export class SignalsMap {
  #signals = new Map<string, Signal<any>>();

  keys(): IterableIterator<string> {
    return this.#signals.keys();
  }

  entries(): IterableIterator<[string, Signal<any>]> {
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

  getSignal<T = unknown>(key: string): Signal<T> {
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
