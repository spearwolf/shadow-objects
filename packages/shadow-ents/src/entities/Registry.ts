import type {ShadowObjectConstructor} from '../types.js';
import {appendTo} from '../utils/array-utils.js';

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
  readonly #routes = new Map<string, Set<string>>();

  define(token: string, constructor: ShadowObjectConstructor) {
    if (this.#registry.has(token)) {
      appendTo(this.#registry.get(token)!.constructors, constructor);
    } else {
      this.#registry.set(token, {token, constructors: [constructor]});
    }
  }

  appendRoute(token: string, routes: string[]) {
    if (this.#routes.has(token)) {
      const existingRoutes = this.#routes.get(token);
      for (const route of routes) {
        existingRoutes.add(route);
      }
    } else {
      this.#routes.set(token, new Set(routes));
    }
  }

  clearRoute(route: string) {
    this.#routes.delete(route);
  }

  findTokensByRoute(route: string): string[] {
    const tokens = new Set<string>([route]);

    const next = this.#routes.has(route) ? [...this.#routes.get(route)] : [];

    while (next.length) {
      const cur = next.shift();

      if (tokens.has(cur)) {
        continue;
      }

      tokens.add(cur);

      if (this.#routes.has(cur)) {
        next.push(...Array.from(this.#routes.get(cur)).filter((route) => !tokens.has(route)));
      }
    }

    return Array.from(tokens);
  }

  findConstructors(route: string): ShadowObjectConstructor[] | undefined {
    const tokens = this.findTokensByRoute(route);
    const constructors = new Set<ShadowObjectConstructor>();

    for (const token of tokens) {
      const entry = this.#registry.get(token);
      if (entry) {
        for (const constructor of entry.constructors) {
          constructors.add(constructor);
        }
      }
    }

    return constructors.size > 0 ? Array.from(constructors) : undefined;
  }

  hasToken(token: string): boolean {
    return this.#registry.has(token);
  }

  hasRoute(route: string): boolean {
    return this.#routes.has(route);
  }

  clear() {
    this.#registry.clear();
    this.#routes.clear();
  }
}

const defaultRegistry = new Registry();
