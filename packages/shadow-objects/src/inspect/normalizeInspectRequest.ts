import {resolveSerializeLimits} from './serializeValue.js';
import type {InspectInclude, InspectRequest, SerializeLimits} from './types.js';

export const InspectDefaults = Object.freeze({
  maxDepth: 4,
  maxDepthCap: 64,
  maxNodes: 250,
});

const AllIncludes: readonly InspectInclude[] = ['props', 'shadowObjects', 'contexts', 'registry'];

export interface NormalizedInspectRequest {
  include: Set<InspectInclude>;
  rootUuids: string[] | undefined;
  maxDepth: number;
  maxNodes: number;
  limits: SerializeLimits;
}

const clampDepth = (depth: number | undefined): number => {
  if (depth === undefined) return InspectDefaults.maxDepth;
  if (!Number.isFinite(depth)) return InspectDefaults.maxDepthCap;
  return Math.min(InspectDefaults.maxDepthCap, Math.max(0, Math.floor(depth)));
};

const clampNodes = (nodes: number | undefined): number => {
  if (nodes === undefined) return InspectDefaults.maxNodes;
  if (!Number.isFinite(nodes)) return Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.floor(nodes));
};

/** Fills the defaults of spec §8.1 in and clamps what the caller gave. */
export const normalizeInspectRequest = (request?: InspectRequest): NormalizedInspectRequest => ({
  include: new Set(request?.include ?? AllIncludes),
  rootUuids: request?.rootUuids,
  maxDepth: clampDepth(request?.maxDepth),
  maxNodes: clampNodes(request?.maxNodes),
  limits: resolveSerializeLimits(request?.values),
});

/** Counts the nodes a walk may still emit. `take()` answers `false` once the budget is spent. */
export class NodeBudget {
  #left: number;

  constructor(max: number) {
    this.#left = max;
  }

  take(): boolean {
    if (this.#left <= 0) return false;
    this.#left--;
    return true;
  }
}
