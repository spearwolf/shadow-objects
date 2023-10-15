import {appendTo} from '../array-utils';
import type {EntityConstructor} from '../types.js';

interface RegistryEntry {
  token: string;
  constructors: EntityConstructor[];
}

/** The entity registry */
export class Registry {
  /** return the specified registry or, if not defined, the default registry */
  static get(registry?: Registry) {
    return registry ?? defaultRegistry;
  }

  readonly #registry = new Map<string, RegistryEntry>();

  registerEntity(token: string, constructor: EntityConstructor) {
    if (this.#registry.has(token)) {
      appendTo(this.#registry.get(token)!.constructors, constructor);
    } else {
      this.#registry.set(token, {token, constructors: [constructor]});
    }
  }

  findConstructors(token: string): EntityConstructor[] | undefined {
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
