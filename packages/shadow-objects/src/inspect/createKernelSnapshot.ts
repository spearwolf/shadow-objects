import {beQuiet, type SignalLike} from '@spearwolf/signalize';
import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import type {ShadowObjectDescription} from '../types.js';
import {
  NodeBudget,
  type NormalizedEntityFilter,
  type NormalizedInspectRequest,
  normalizeInspectRequest,
} from './normalizeInspectRequest.js';
import {serializeValue} from './serializeValue.js';
import type {
  ContextName,
  EntityContextSnapshot,
  EntityContextSource,
  EntityMatch,
  EntityNodeSnapshot,
  EntitySearchSnapshot,
  GlobalContextSnapshot,
  InspectRequest,
  KernelSnapshot,
  PropSnapshot,
  SerializedValue,
  ShadowObjectSnapshot,
  TruncationNote,
} from './types.js';

/** A string name as it is; a symbol as its description, marked as such. */
export const toContextName = (name: string | symbol): ContextName =>
  typeof name === 'symbol' ? {symbol: name.description ?? ''} : name;

/** The rule `Entity.truthyProps()` routes by. */
export const routesOnValue = (val: unknown): boolean => val != null && val !== false && val !== '';

/** The rule `SignalsPath` resolves a chain by: a provider holding `null` is passed over. */
const holdsValue = (val: unknown): boolean => val != null;

const isWorkerRealm = (): boolean => typeof (globalThis as {WorkerGlobalScope?: unknown}).WorkerGlobalScope !== 'undefined';

/**
 * A plain-data picture of the Entity Tree behind a Kernel, cut by the limits of the request: every
 * visited Entity with its properties, Shadow Objects and Entity Contexts, the global context chains,
 * and the Registry. Synchronous, read-only, and quiet -- no signal read here subscribes anything.
 *
 * The walk follows the rules of `getEntityGraph()`: every Entity appears once, a child the Kernel no
 * longer holds or the walk has already placed is named under `omittedChildren`. What this adds is
 * the depth and node budget, and the `truncation` notes that say where a budget cut the walk.
 */
export function createKernelSnapshot(kernel: Kernel, request?: InspectRequest): KernelSnapshot {
  return beQuiet(() => new KernelSnapshotBuilder(kernel, normalizeInspectRequest(request)).build());
}

class KernelSnapshotBuilder {
  readonly #kernel: Kernel;
  readonly #req: NormalizedInspectRequest;
  readonly #budget: NodeBudget;
  readonly #visited = new Set<string>();
  readonly #truncation: TruncationNote[] = [];
  readonly #descriptions = new Map<string, ShadowObjectDescription[]>();
  #budgetNoted = false;

  constructor(kernel: Kernel, req: NormalizedInspectRequest) {
    this.#kernel = kernel;
    this.#req = req;
    this.#budget = new NodeBudget(req.maxNodes);
  }

  build(): KernelSnapshot {
    const all = this.#kernel.traverseLevelOrderBFS();
    const {filter} = this.#req;

    // a search reads every entity and ships none of the tree: the matches are the answer
    const nodes = filter === undefined ? this.#walk(all) : [];

    const snapshot: KernelSnapshot = {
      takenAt: Date.now(),
      thread: isWorkerRealm() ? 'worker' : 'main',
      counts: {
        entities: all.length,
        roots: all.filter((e) => !e.hasParent).length,
        shadowObjects: all.reduce((sum, e) => sum + this.#describe(e.uuid).length, 0),
      },
      roots: nodes,
      globalContexts: this.#globalContexts(all),
    };

    if (this.#req.include.has('registry')) {
      snapshot.registry = {...this.#kernel.registry.describe(), isDefault: Registry.isDefault(this.#kernel.registry)};
    }
    if (this.#truncation.length > 0) snapshot.truncation = this.#truncation;
    if (filter !== undefined) snapshot.search = this.#search(all, filter);

    return snapshot;
  }

  #walk(all: Entity[]): EntityNodeSnapshot[] {
    const roots = this.#roots(all);
    const named = this.#req.rootUuids !== undefined;

    const nodes: EntityNodeSnapshot[] = [];
    for (const root of roots) {
      // a root reached through an earlier root's subtree (a back-edge into the root set) drops
      // from the top level without a note, same as `getEntityGraph()`'s top-level `visited` check
      if (this.#visited.has(root.uuid)) continue;
      if (!this.#budget.take()) {
        this.#noteBudget(undefined);
        break;
      }
      const node = this.#node(root, 0);
      // only a caller that named the root wants to know what is above it
      if (named) node.ancestors = this.#ancestors(root);
      nodes.push(node);
    }
    return nodes;
  }

  /** The chain above an entity, top down, without the entity itself. */
  #ancestors(entity: Entity): {uuid: string; token: string}[] {
    const chain: {uuid: string; token: string}[] = [];
    // the parent chain is a chain: Entity.assertAttachableTo() refuses a parent that is a descendant
    for (let ancestor = entity.parent; ancestor !== undefined; ancestor = ancestor.parent) {
      chain.unshift({uuid: ancestor.uuid, token: this.#kernel.tokenOf(ancestor.uuid) ?? ''});
    }
    return chain;
  }

  #search(all: Entity[], filter: NormalizedEntityFilter): EntitySearchSnapshot {
    const matches: EntityMatch[] = [];
    let total = 0;
    for (const entity of all) {
      if (!this.#matches(entity, filter)) continue;
      total++;
      if (matches.length < filter.limit) {
        const token = this.#kernel.tokenOf(entity.uuid) ?? '';
        matches.push({uuid: entity.uuid, token, path: [...this.#ancestors(entity).map((a) => a.token), token]});
      }
    }
    return {matches, total};
  }

  #matches(entity: Entity, filter: NormalizedEntityFilter): boolean {
    const {token, propName, shadowObject, contextName} = filter;
    if (token !== undefined && this.#kernel.tokenOf(entity.uuid) !== token) return false;
    // a bare `useProperty()` call vivifies the signal without giving it a value -- that reader does
    // not make the entity "carry" the property, so only a defined value counts as a match
    if (propName !== undefined && !entity.propEntries().some(([key, val]) => key === propName && val !== undefined)) return false;
    if (shadowObject !== undefined && !this.#describe(entity.uuid).some((d) => d.displayName === shadowObject)) return false;
    if (contextName !== undefined && !entity.contextNames().includes(contextName)) return false;
    return true;
  }

  #roots(all: Entity[]): Entity[] {
    const {rootUuids} = this.#req;
    if (rootUuids === undefined) return all.filter((e) => !e.hasParent);

    const roots: Entity[] = [];
    for (const uuid of rootUuids) {
      const entity = this.#kernel.findEntity(uuid);
      if (entity === undefined) {
        this.#truncation.push({reason: 'unknown-root', uuid, message: `the kernel holds no entity "${uuid}"`});
      } else {
        roots.push(entity);
      }
    }
    return roots;
  }

  #noteBudget(uuid: string | undefined): void {
    if (this.#budgetNoted) return;
    this.#budgetNoted = true;
    const note: TruncationNote = {
      reason: 'max-nodes',
      message: `maxNodes ${this.#req.maxNodes} reached; ask again with rootUuids below the last node written`,
    };
    if (uuid !== undefined) note.uuid = uuid;
    this.#truncation.push(note);
  }

  #describe(uuid: string): ShadowObjectDescription[] {
    let descriptions = this.#descriptions.get(uuid);
    if (descriptions === undefined) {
      descriptions = this.#kernel.describeShadowObjects(uuid);
      this.#descriptions.set(uuid, descriptions);
    }
    return descriptions;
  }

  #serialize(val: unknown): SerializedValue {
    return serializeValue(val, this.#req.limits);
  }

  #node(entity: Entity, depth: number): EntityNodeSnapshot {
    const {uuid} = entity;
    this.#visited.add(uuid);

    const node: EntityNodeSnapshot = {
      uuid,
      token: this.#kernel.tokenOf(uuid) ?? '',
      order: entity.order,
      autoDestructionOnParentRemoval: entity.autoDestructionOnParentRemoval,
      childCount: entity.children.length,
    };
    if (entity.parentUuid !== undefined) node.parentUuid = entity.parentUuid;

    const {include} = this.#req;
    if (include.has('props')) node.props = this.#props(entity);
    if (include.has('shadowObjects')) node.shadowObjects = this.#describe(uuid).map(toShadowObjectSnapshot);
    if (include.has('contexts')) node.contexts = this.#contexts(entity);

    if (depth < this.#req.maxDepth) {
      this.#children(entity, node, depth);
    } else if (entity.children.length > 0) {
      this.#truncation.push({
        reason: 'max-depth',
        uuid,
        message: `the children of "${uuid}" were not walked: maxDepth ${this.#req.maxDepth} reached; ask again with rootUuids: ["${uuid}"]`,
      });
    }

    return node;
  }

  #children(entity: Entity, node: EntityNodeSnapshot, depth: number): void {
    const children: EntityNodeSnapshot[] = [];
    const omitted: NonNullable<EntityNodeSnapshot['omittedChildren']> = [];

    for (const child of entity.children) {
      // the kernel lookup first, so a uuid the kernel does not hold is named at every parent that
      // lists it -- the same order `getEntityGraph()` keeps
      if (this.#kernel.findEntity(child.uuid) === undefined) {
        omitted.push({uuid: child.uuid, reason: 'not-in-kernel'});
        continue;
      }
      if (this.#visited.has(child.uuid)) {
        omitted.push({uuid: child.uuid, reason: 'already-in-graph'});
        continue;
      }
      if (!this.#budget.take()) {
        this.#noteBudget(entity.uuid);
        break;
      }
      children.push(this.#node(child, depth + 1));
    }

    node.children = children;
    if (omitted.length > 0) node.omittedChildren = omitted;
  }

  #props(entity: Entity): PropSnapshot[] {
    return entity.propEntries().map(([name, val]) => ({name, value: this.#serialize(val), routes: routesOnValue(val)}));
  }

  #contexts(entity: Entity): EntityContextSnapshot[] {
    const descriptions = this.#describe(entity.uuid);

    return entity.contextNames().map((name) => {
      // the entity holds the name, `contextNames()` just said so
      const ctx = entity.describeContext(name)!;
      const snapshot: EntityContextSnapshot = {
        name: toContextName(name),
        effective: this.#serialize(ctx.effective),
        providedBy: descriptions.filter((d) => d.providesContexts.includes(name)).map((d) => d.displayName),
        source: this.#sourceOf(entity, name, ctx.provided),
      };
      if (ctx.provided !== undefined) snapshot.provided = this.#serialize(ctx.provided);
      if (ctx.inherited !== undefined) snapshot.inherited = this.#serialize(ctx.inherited);
      return snapshot;
    });
  }

  #sourceOf(entity: Entity, name: string | symbol, provided: unknown): EntityContextSource {
    if (holdsValue(provided)) return {kind: 'self'};
    // the parent chain is a chain: Entity.assertAttachableTo() refuses a parent that is a descendant
    for (let ancestor = entity.parent; ancestor !== undefined; ancestor = ancestor.parent) {
      if (holdsValue(ancestor.describeContext(name)?.provided)) return {kind: 'ancestor', uuid: ancestor.uuid};
    }
    if (holdsValue(this.#kernel.describeRootContext(name)?.value)) return {kind: 'global'};
    return {kind: 'none'};
  }

  #globalContexts(all: Entity[]): GlobalContextSnapshot[] {
    // signal -> contributing entity, per name; the chain hands out the same signal objects
    const contributors = new Map<string | symbol, Map<SignalLike<any>, Entity>>();
    for (const entity of all) {
      for (const name of entity.globalContextNames()) {
        let byEntity = contributors.get(name);
        if (byEntity === undefined) contributors.set(name, (byEntity = new Map()));
        byEntity.set(entity.describeGlobalContext(name)!.signal, entity);
      }
    }

    const snapshots: GlobalContextSnapshot[] = [];
    for (const name of this.#kernel.rootContextNames()) {
      const chain = this.#kernel.describeRootContext(name)!;
      // a chain without members is the lookup stub a root entity's `useContext()` leaves behind
      if (chain.signals.length === 0) continue;

      const byEntity = contributors.get(name);
      const providers: GlobalContextSnapshot['providers'] = [];
      for (const signal of chain.signals) {
        const entity = byEntity?.get(signal);
        if (entity === undefined) continue;
        providers.push({
          uuid: entity.uuid,
          providedBy: this.#describe(entity.uuid)
            .filter((d) => d.providesGlobalContexts.includes(name))
            .map((d) => d.displayName),
          value: this.#serialize(entity.describeGlobalContext(name)!.value),
        });
      }
      snapshots.push({name: toContextName(name), value: this.#serialize(chain.value), providers});
    }
    return snapshots;
  }
}

const toShadowObjectSnapshot = (d: ShadowObjectDescription): ShadowObjectSnapshot => ({
  displayName: d.displayName,
  definedUnder: d.definedUnder,
  usesProperties: d.usesProperties,
  usesContexts: d.usesContexts.map(toContextName),
  usesParentContexts: d.usesParentContexts.map(toContextName),
  providesContexts: d.providesContexts.map(toContextName),
  providesGlobalContexts: d.providesGlobalContexts.map(toContextName),
  hooks: d.hooks,
});
