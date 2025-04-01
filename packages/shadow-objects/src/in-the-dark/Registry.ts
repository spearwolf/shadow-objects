import type {ShadowObjectConstructor} from '../types.js';
import {appendTo} from '../utils/array-utils.js';

interface RegistryEntry {
  token: string;
  constructors: ShadowObjectConstructor[];
}

const toPropRoute = (route: string): undefined | {key: string; prop: string; token?: string} => {
  const parts = route.split('@').map((part) => part.trim());
  if (parts.length === 2 && parts[1]) {
    return parts[0] ? {key: `${parts[0]}@${parts[1]}`, prop: parts[1], token: parts[0]} : {key: parts[1], prop: parts[1]};
  } else {
    return undefined;
  }
};

const addRoutes = (set: Set<string>, routes: string[] | Set<string>) => {
  for (const route of routes) {
    set.add(route);
  }
};

const addConstructors = (entry: RegistryEntry | null | undefined, constructors: Set<ShadowObjectConstructor>) => {
  if (entry != null) {
    for (const constructor of entry.constructors) {
      constructors.add(constructor);
    }
  }
};

/** The shadow-object class registry */
export class Registry {
  /** return the specified registry or, if not defined, the default registry */
  static get(registry?: Registry) {
    return registry ?? defaultRegistry;
  }

  readonly #registry = new Map<string, RegistryEntry>();
  readonly #routes = new Map<string, Set<string>>();
  readonly #truthyPropRoutes = new Map<string, {routes: Set<string>; token?: string}>();

  define(token: string, constructor: ShadowObjectConstructor) {
    if (this.#registry.has(token)) {
      appendTo(this.#registry.get(token)!.constructors, constructor);
    } else {
      this.#registry.set(token, {token, constructors: [constructor]});
    }
  }

  appendRoute(token: string, routes: string[]) {
    const propRoute = toPropRoute(token);
    if (propRoute) {
      if (this.#truthyPropRoutes.has(propRoute.key)) {
        addRoutes(this.#truthyPropRoutes.get(propRoute.key)!.routes, routes);
      } else {
        this.#truthyPropRoutes.set(propRoute.key, {routes: new Set(routes), token: propRoute.token});
      }
    } else {
      if (this.#routes.has(token)) {
        addRoutes(this.#routes.get(token), routes);
      } else {
        this.#routes.set(token, new Set(routes));
      }
    }
  }

  clearRoute(route: string) {
    const propRoute = toPropRoute(route);
    if (propRoute) {
      this.#truthyPropRoutes.delete(propRoute.key);
    } else {
      this.#routes.delete(route);
    }
  }

  findTokensByRoute(route: string, truthyProps?: Set<string>): Set<string> {
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

    if (truthyProps) {
      for (const prop of truthyProps) {
        if (this.#truthyPropRoutes.has(prop)) {
          addRoutes(tokens, this.#truthyPropRoutes.get(prop)!.routes);
        }
      }

      let tokenCountBefore: number;
      do {
        tokenCountBefore = tokens.size;
        for (const token of new Set(tokens)) {
          for (const prop of truthyProps) {
            const key = `${token}@${prop}`;
            if (this.#truthyPropRoutes.has(key)) {
              addRoutes(tokens, this.#truthyPropRoutes.get(key)!.routes);
            }
          }
        }
      } while (tokenCountBefore !== tokens.size);
    }

    return tokens;
  }

  findConstructors(route: string, truthyProps?: Set<string>): ShadowObjectConstructor[] | undefined {
    const tokens = this.findTokensByRoute(route, truthyProps);
    const constructors = new Set<ShadowObjectConstructor>();

    for (const token of tokens) {
      addConstructors(this.#registry.get(token), constructors);
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
