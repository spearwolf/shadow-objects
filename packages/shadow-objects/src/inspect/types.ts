import type {RegistryDescription} from '../types.js';

// ---------------------------------------------------------------------------
// Serialized values (spec §7)
// ---------------------------------------------------------------------------

export type SerializedValue =
  | null
  | boolean
  | number
  | string
  | SerializedValue[]
  | {[key: string]: SerializedValue}
  | {$type: 'undefined'}
  | {$type: 'bigint'; value: string}
  | {$type: 'symbol'; description?: string}
  | {$type: 'function'; name: string}
  | {$type: 'date'; iso: string}
  | {$type: 'signal'; value: SerializedValue}
  | {$type: 'object'; class: string; preview?: Record<string, SerializedValue>}
  | {$type: 'dom'; nodeName: string; id?: string}
  | {$type: 'array-buffer' | 'typed-array'; byteLength: number; class: string}
  | {$type: 'circular'}
  | {$type: 'redacted'}
  | {$type: 'truncated'; reason: 'depth' | 'length' | 'entries' | 'string'; original?: number; preview?: string};

export interface SerializeLimits {
  /** How deep nested arrays and objects are followed. Default 3. */
  maxDepth: number;
  /** How many items of an array are kept. Default 20. */
  maxArrayLength: number;
  /** How many entries of an object or preview are kept. Default 30. */
  maxObjectEntries: number;
  /** How many characters of a string are kept. Default 200. */
  maxStringLength: number;
}

// ---------------------------------------------------------------------------
// The request (spec §8.1)
// ---------------------------------------------------------------------------

export type InspectInclude = 'props' | 'shadowObjects' | 'contexts' | 'registry';

export interface InspectRequest {
  /** What to include per Entity. Default: all four. */
  include?: InspectInclude[];
  /** Descend from these uuids instead of the roots. Unknown uuids are reported under `truncation`, not thrown. */
  rootUuids?: string[];
  /** Tree depth below each root that is walked. Default 4. A non-finite number reads as the maximum, 64. */
  maxDepth?: number;
  /** Total number of nodes across the walk. Default 250. */
  maxNodes?: number;
  values?: Partial<SerializeLimits>;
}

/** Where a limit of the request cut a walk short, and how to get the rest. */
export interface TruncationNote {
  reason: 'max-depth' | 'max-nodes' | 'unknown-root';
  /** The node whose children were not walked, or the root uuid that was not found. */
  uuid?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Kernel side (spec §6.2, §6.3)
// ---------------------------------------------------------------------------

/** A string context name as it is; a symbol name as its description, marked as such. */
export type ContextName = string | {symbol: string};

export interface PropSnapshot {
  name: string;
  value: SerializedValue;
  /** Whether the value counts as truthy for property routing (`Entity.truthyProps()`). */
  routes: boolean;
}

export interface ShadowObjectSnapshot {
  /** `ShadowObjectCreationScope.displayName` -- the constructor's `displayName` or `name`. */
  displayName: string;
  /** The tokens the constructor is defined under in this Kernel's Registry. Usually one. */
  definedUnder: string[];
  usesProperties: string[];
  usesContexts: ContextName[];
  usesParentContexts: ContextName[];
  providesContexts: ContextName[];
  providesGlobalContexts: ContextName[];
  /** Which of the four lifecycle hooks the instance implements. */
  hooks: ('onCreate' | 'onDestroy' | 'onParentChanged' | 'onViewEvent')[];
}

export type EntityContextSource = {kind: 'self'} | {kind: 'ancestor'; uuid: string} | {kind: 'global'} | {kind: 'none'};

export interface EntityContextSnapshot {
  name: ContextName;
  /** The value this Entity's own providers wrote, if any. Absent when nothing is provided here. */
  provided?: SerializedValue;
  /** The value inherited from the parent, or from the global chain at a root. Absent when there is none. */
  inherited?: SerializedValue;
  /** What `useContext(name)` on this Entity reads: provided where present, inherited otherwise. */
  effective: SerializedValue;
  /** Display names of the Shadow Objects on this Entity that provide the name. */
  providedBy: string[];
  /** Where the effective value comes from: this Entity, an ancestor by uuid, the global chain, or nowhere. */
  source: EntityContextSource;
}

export interface GlobalContextSnapshot {
  name: ContextName;
  value: SerializedValue;
  /** The Entities contributing to the chain, in chain order; the first one holding a value wins. */
  providers: {uuid: string; providedBy: string[]; value: SerializedValue}[];
}

export interface EntityNodeSnapshot {
  uuid: string;
  token: string;
  order: number;
  parentUuid?: string;
  autoDestructionOnParentRemoval: boolean;
  props?: PropSnapshot[];
  shadowObjects?: ShadowObjectSnapshot[];
  contexts?: EntityContextSnapshot[];
  /** Absent when the depth limit cut the walk here; `childCount` still says how many there are. */
  children?: EntityNodeSnapshot[];
  childCount: number;
  /** Same meaning and shape as in `getEntityGraph()`. */
  omittedChildren?: {uuid: string; reason: 'already-in-graph' | 'not-in-kernel'}[];
}

export interface RegistrySnapshot extends RegistryDescription {
  /** Whether this is the default registry shared by every local environment of the thread. */
  isDefault: boolean;
}

export interface KernelSnapshot {
  /** `Date.now()` on the thread that built the snapshot. */
  takenAt: number;
  /** The realm the snapshot was built in. */
  thread: 'main' | 'worker';
  counts: {entities: number; roots: number; shadowObjects: number};
  roots: EntityNodeSnapshot[];
  globalContexts: GlobalContextSnapshot[];
  registry?: RegistrySnapshot;
  /** Set when a limit of the request cut the walk short. */
  truncation?: TruncationNote[];
}

// ---------------------------------------------------------------------------
// View side (spec §6.4)
// ---------------------------------------------------------------------------

export interface ViewComponentSnapshot {
  uuid: string;
  token?: string;
  order: number;
  parentUuid?: string;
  /** The properties as the Component Memory holds them -- the last committed state, not pending changes. */
  props?: PropSnapshot[];
  /** A CSS selector path to the `<shae-ent>` element carrying this component, where one exists. */
  element?: string;
  children?: ViewComponentSnapshot[];
  childCount: number;
  /** A child the walk had already placed elsewhere; same meaning as the Kernel side's entry of that reason. */
  omittedChildren?: {uuid: string; reason: 'already-in-graph'}[];
}

export interface ViewSnapshot {
  takenAt: number;
  counts: {components: number; roots: number};
  roots: ViewComponentSnapshot[];
  /** Set when a depth or node limit cut the walk short. */
  truncation?: TruncationNote[];
}

// ---------------------------------------------------------------------------
// Environment (spec §6.1)
// ---------------------------------------------------------------------------

export interface EnvSnapshot {
  /** The namespace as a string; the global namespace reports its symbol description. Empty while the environment has no view. */
  namespace: string;
  /** Whether the namespace is the global one. */
  isGlobalNamespace: boolean;
  /** `'local'` for a LocalShadowObjectEnv, `'worker'` for a RemoteWorkerEnv, `'custom'` for any other proxy, `'none'` without a proxy. */
  kind: 'local' | 'worker' | 'custom' | 'none';
  state: {
    viewReady: boolean;
    proxyReady: boolean;
    isReady: boolean;
    isDestroyed: boolean;
  };
  /** What the View holds for this namespace. Present while the environment has a view. */
  view?: ViewSnapshot;
  /** What the Kernel holds. Absent while the proxy is not ready, or when the inspection failed -- then `error` says why. */
  kernel?: KernelSnapshot;
  error?: {name: string; message: string};
}
