import {appendTo} from '../array-utils.js';
import type {ShadowObjectConstructor} from '../types.js';

interface RegistryEntry {
  token: string;
  constructors: ShadowObjectConstructor[];
}

/** The shadow-object class registry */
export class Registry {
  /** return the specified registry or, if not defined, the default registry */
  static get(registry?: Registry) {
    return registry ?? defaultRegistry;
  }

  readonly #registry = new Map<string, RegistryEntry>();

  define(token: string, constructor: ShadowObjectConstructor) {
    if (this.#registry.has(token)) {
      appendTo(this.#registry.get(token)!.constructors, constructor);
    } else {
      this.#registry.set(token, {token, constructors: [constructor]});
    }
  }

  findConstructors(token: string): ShadowObjectConstructor[] | undefined {
    return this.#registry.get(token)?.constructors;
  }

  hasToken(token: string): boolean {
    return this.#registry.has(token);
  }

  clear() {
    this.#registry.clear();
  }
}

const defaultRegistry = new Registry();
