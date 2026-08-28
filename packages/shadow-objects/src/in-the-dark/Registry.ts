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
    for (const c of entry.constructors) {
      constructors.add(c);
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
  readonly #truthyPropRoutes = new Map<string, {routes: Set<string>; token?: string | undefined}>();

  // The set of property names that any routing rule mentions. It only decides how finely the
  // resolution key is cut, never what a resolution yields -- so it may be too large, but never too
  // small. A key that is too fine splits entries that belong together; a key that is too coarse
  // answers two different questions with one answer. clearRoute() therefore takes nothing back out:
  // a name that stops routing costs at most an extra entry, while removing it could drop a name that
  // another rule still routes on.
  readonly #routingProps = new Set<string>();

  // The store of resolved tokens: outer key is the route, inner key is built from the properties.
  // Two levels so that the route name works as a key unchanged and needs no escaping anywhere.
  //
  // It has no upper bound and evicts nothing, and it lives exactly as long as the registry that owns
  // it -- for the default registry, that is the lifetime of the process. What holds it small is its
  // key space: the routes times the permutations of the routing property names, because the key
  // follows the caller's property order. Both counts are fixed by the module manifests a registry is
  // built from, and a manifest declares a handful of routes and one or two routing properties.
  readonly #resolvedTokens = new Map<string, Map<string, Set<string>>>();

  define(token: string, constructa: ShadowObjectConstructor) {
    const entry = this.#registry.get(token);
    if (entry) {
      appendTo(entry.constructors, constructa);
    } else {
      this.#registry.set(token, {token, constructors: [constructa]});
    }
    this.#dropResolvedTokens();
  }

  appendRoute(token: string, routes: string[]) {
    const propRoute = toPropRoute(token);
    if (propRoute) {
      this.#routingProps.add(propRoute.prop);
      const knownPropRoutes = this.#truthyPropRoutes.get(propRoute.key);
      if (knownPropRoutes) {
        addRoutes(knownPropRoutes.routes, routes);
      } else {
        this.#truthyPropRoutes.set(propRoute.key, {routes: new Set(routes), token: propRoute.token});
      }
    } else {
      const knownRoutes = this.#routes.get(token);
      if (knownRoutes) {
        addRoutes(knownRoutes, routes);
      } else {
        this.#routes.set(token, new Set(routes));
      }
    }
    // Behind both branches: a prop route and a plain route both change what a resolution finds.
    this.#dropResolvedTokens();
  }

  clearRoute(route: string) {
    const propRoute = toPropRoute(route);
    if (propRoute) {
      this.#truthyPropRoutes.delete(propRoute.key);
    } else {
      this.#routes.delete(route);
    }
    this.#dropResolvedTokens();
  }

  // Every write drops the store, define() included, even though define() does not move the token
  // resolution itself. No write path then has to know which half of a resolution it touches, and a
  // registry is written while a module is imported, where rebuilding costs nothing.
  //
  // Dropping is re-entrancy safe: Map.clear() lets go of the sets, it does not empty them. A set that
  // a resolution has already handed out therefore stays valid and complete, no matter how long its
  // caller keeps walking it and no matter what is written to the registry meanwhile.
  #dropResolvedTokens() {
    this.#resolvedTokens.clear();
  }

  // The key is built in the caller's property order, not sorted. The order of the properties decides
  // the order of the tokens in the result, and that in turn the order in which the kernel builds the
  // shadow objects. A sorted key would map two differently ordered questions onto one answer and so
  // change the build order for one of them. Caller order costs at most a second entry and keeps the
  // behaviour character for character.
  //
  // Each name follows its own length, which makes the key unambiguous: no property name can imitate
  // the boundary between two others. A separator could, as soon as a name contains it.
  #resolutionKey(truthyProps: Set<string> | undefined): string {
    // The empty key covers both cases in which no property has a say -- no truthyProps, and no prop
    // route in the registry at all. The second is the common case and so costs no pass over the
    // properties.
    if (truthyProps === undefined || this.#routingProps.size === 0) return '';
    let key = '';
    for (const prop of truthyProps) {
      if (this.#routingProps.has(prop)) {
        key += `${prop.length}:${prop}`;
      }
    }
    return key;
  }

  #resolveTokens(route: string, truthyProps?: Set<string>): Set<string> {
    const key = this.#resolutionKey(truthyProps);
    let byProps = this.#resolvedTokens.get(route);
    const known = byProps?.get(key);
    if (known !== undefined) return known;

    const tokens = new Set<string>([route]);

    const next = Array.from(this.#routes.get(route) ?? []);

    for (let cur = next.shift(); cur !== undefined; cur = next.shift()) {
      if (tokens.has(cur)) {
        continue;
      }

      tokens.add(cur);

      const nextRoutes = this.#routes.get(cur);
      if (nextRoutes) {
        next.push(...Array.from(nextRoutes).filter((route) => !tokens.has(route)));
      }
    }

    if (truthyProps) {
      for (const prop of truthyProps) {
        const propRoutes = this.#truthyPropRoutes.get(prop);
        if (propRoutes) {
          addRoutes(tokens, propRoutes.routes);
        }
      }

      let tokenCountBefore: number;
      do {
        tokenCountBefore = tokens.size;
        for (const token of new Set(tokens)) {
          for (const prop of truthyProps) {
            const keyedRoutes = this.#truthyPropRoutes.get(`${token}@${prop}`);
            if (keyedRoutes) {
              addRoutes(tokens, keyedRoutes.routes);
            }
          }
        }
      } while (tokenCountBefore !== tokens.size);
    }

    if (byProps === undefined) {
      byProps = new Map();
      this.#resolvedTokens.set(route, byProps);
    }
    byProps.set(key, tokens);

    return tokens;
  }

  // The store holds exactly one set per question, and what a caller does with what it got stays its
  // own business -- so a copy goes out.
  findTokensByRoute(route: string, truthyProps?: Set<string>): Set<string> {
    return new Set(this.#resolveTokens(route, truthyProps));
  }

  findConstructors(route: string, truthyProps?: Set<string>): ShadowObjectConstructor[] | undefined {
    // Reads the stored set without a copy: this only iterates over it, and it belongs to the same
    // class. The constructor list itself is assembled per call and belongs to the caller.
    const tokens = this.#resolveTokens(route, truthyProps);
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
    this.#truthyPropRoutes.clear();
    this.#routingProps.clear();
    this.#dropResolvedTokens();
  }
}

const defaultRegistry = new Registry();
