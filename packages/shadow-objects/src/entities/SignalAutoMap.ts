import {Signal, createSignal} from '@spearwolf/signalize';

export class SignalAutoMap<KeyType = string | symbol> {
  #signals = new Map<KeyType, Signal<any>>();

  keys(): IterableIterator<KeyType> {
    return this.#signals.keys();
  }

  entries(): IterableIterator<[KeyType, Signal<any>]> {
    return this.#signals.entries();
  }

  clear() {
    for (const sig of this.#signals.values()) {
      sig.destroy();
    }
    this.#signals.clear();
  }

  has(key: KeyType): boolean {
    return this.#signals.has(key);
  }

  get<T = unknown>(key: KeyType): Signal<T> {
    if (!this.#signals.has(key)) {
      const signal = createSignal<T>();
      this.#signals.set(key, signal);
      return signal;
    }
    return this.#signals.get(key)!;
  }
}
