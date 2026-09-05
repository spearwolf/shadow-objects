import {SHAE_ENT} from '../elements/constants.js';
import type {ComponentContext} from '../view/ComponentContext.js';
import type {ViewComponent} from '../view/ViewComponent.js';
import {routesOnValue} from './createKernelSnapshot.js';
import {NodeBudget, type NormalizedInspectRequest, normalizeInspectRequest} from './normalizeInspectRequest.js';
import {serializeValue} from './serializeValue.js';
import type {InspectRequest, PropSnapshot, TruncationNote, ViewComponentSnapshot, ViewSnapshot} from './types.js';

const SIMPLE_ID = /^[A-Za-z_][\w-]*$/;

/** A selector path from the nearest ancestor with a simple id (or the document root) down to `el`. */
const selectorPath = (el: Element): string => {
  const parts: string[] = [];
  for (let node: Element | null = el; node !== null; node = node.parentElement) {
    if (node.id && SIMPLE_ID.test(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }
    const parent = node.parentElement;
    if (parent === null) {
      parts.unshift(node.localName);
      break;
    }
    const sameTag = Array.from(parent.children).filter((sibling) => sibling.localName === node!.localName);
    parts.unshift(`${node.localName}:nth-of-type(${sameTag.indexOf(node) + 1})`);
  }
  return parts.join(' > ');
};

/** uuid -> selector path of the `<shae-ent>` carrying it. Empty without a document, and for elements inside closed shadow roots. */
const indexEntElements = (): Map<string, string> => {
  const index = new Map<string, string>();
  if (typeof document === 'undefined') return index;
  for (const el of Array.from(document.querySelectorAll(SHAE_ENT))) {
    const uuid = (el as {uuid?: unknown}).uuid;
    if (typeof uuid === 'string' && !index.has(uuid)) index.set(uuid, selectorPath(el));
  }
  return index;
};

/**
 * A plain-data picture of the component tree a `ComponentContext` holds, cut by the limits of the
 * request. Structure comes from the live components; properties come from the Component Memory,
 * which holds the last committed state -- a component created and not yet synced has no `props`.
 * Reads only; the pending changes are never built.
 */
export function createViewSnapshot(context: ComponentContext, request?: InspectRequest): ViewSnapshot {
  return new ViewSnapshotBuilder(context, normalizeInspectRequest(request)).build();
}

class ViewSnapshotBuilder {
  readonly #ctx: ComponentContext;
  readonly #req: NormalizedInspectRequest;
  readonly #budget: NodeBudget;
  readonly #truncation: TruncationNote[] = [];
  readonly #elements: Map<string, string>;
  #budgetNoted = false;

  constructor(ctx: ComponentContext, req: NormalizedInspectRequest) {
    this.#ctx = ctx;
    this.#req = req;
    this.#budget = new NodeBudget(req.maxNodes);
    this.#elements = indexEntElements();
  }

  build(): ViewSnapshot {
    const all = this.#ctx.traverseLevelOrderBFS();
    const roots = this.#roots(all);

    const nodes: ViewComponentSnapshot[] = [];
    for (const root of roots) {
      if (!this.#budget.take()) {
        this.#noteBudget(root.parent?.uuid);
        break;
      }
      nodes.push(this.#node(root, 0));
    }

    const snapshot: ViewSnapshot = {
      takenAt: Date.now(),
      counts: {components: all.length, roots: all.filter((c) => c.parent === undefined).length},
      roots: nodes,
    };
    if (this.#truncation.length > 0) snapshot.truncation = this.#truncation;
    return snapshot;
  }

  #roots(all: ViewComponent[]): ViewComponent[] {
    const {rootUuids} = this.#req;
    if (rootUuids === undefined) return all.filter((c) => c.parent === undefined);

    const byUuid = new Map(all.map((c) => [c.uuid, c]));
    const roots: ViewComponent[] = [];
    for (const uuid of rootUuids) {
      const component = byUuid.get(uuid);
      if (component === undefined) {
        this.#truncation.push({reason: 'unknown-root', uuid, message: `the component context holds no component "${uuid}"`});
      } else {
        roots.push(component);
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

  #node(component: ViewComponent, depth: number): ViewComponentSnapshot {
    const {uuid} = component;
    const children = this.#ctx.getChildren(component);

    // the setter coerces a missing token to VoidToken, so the getter never actually reads back undefined --
    // TS 7's inference of the split accessor widens the read type regardless
    const node: ViewComponentSnapshot = {uuid, token: component.token!, order: component.order, childCount: children.length};
    if (component.parent !== undefined) node.parentUuid = component.parent.uuid;

    const element = this.#elements.get(uuid);
    if (element !== undefined) node.element = element;

    if (this.#req.include.has('props')) {
      const props = this.#props(uuid);
      if (props !== undefined) node.props = props;
    }

    if (depth < this.#req.maxDepth) {
      const walked: ViewComponentSnapshot[] = [];
      for (const child of children) {
        if (!this.#budget.take()) {
          this.#noteBudget(uuid);
          break;
        }
        walked.push(this.#node(child, depth + 1));
      }
      node.children = walked;
    } else if (children.length > 0) {
      this.#truncation.push({
        reason: 'max-depth',
        uuid,
        message: `the children of "${uuid}" were not walked: maxDepth ${this.#req.maxDepth} reached; ask again with rootUuids: ["${uuid}"]`,
      });
    }

    return node;
  }

  #props(uuid: string): PropSnapshot[] | undefined {
    const properties = this.#ctx.getComponentState(uuid)?.properties;
    if (properties === undefined) return undefined;
    return properties.map((entry) => {
      const val = entry.length === 2 ? entry[1] : undefined;
      return {name: entry[0], value: serializeValue(val, this.#req.limits), routes: routesOnValue(val)};
    });
  }
}
