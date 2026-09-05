# Proposal: Inspecting Shadow Environments through WebMCP

- **Status:** draft, not yet approved
- **Date:** 2026-09-05
- **Scope:** `@spearwolf/shadow-objects`
- **Reads before:** `AGENTS.md` §2 and §4, `packages/shadow-objects/docs/concepts.md` §2 and §4

## 1. Summary

Every Shadow Environment on a page becomes inspectable by an AI agent through [WebMCP](https://github.com/webmachinelearning/webmcp): a fixed set of read-only tools registered on `document.modelContext` answers questions about the environments, the Entity Tree of each Kernel, the Shadow Objects attached to every Entity, the properties an Entity carries, and the Entity Contexts it provides and consumes -- whether the Kernel runs on the main thread or inside a web worker.

The proposal is built in three layers, and only the outermost one knows WebMCP:

1. **Snapshot** -- a serializable description of a Kernel, built where the Kernel runs. `getEntityGraph()` stays what it is; the snapshot is a new, plain-data sibling of it that also names Shadow Objects and Entity Contexts.
2. **Transport** -- an `inspect` request on `IShadowObjectEnvProxy`, answered synchronously by `LocalShadowObjectEnv` and through a new message pair by `RemoteWorkerEnv` / `MessageRouter`. `ShadowEnv.inspect()` is the public entrance.
3. **Model context** -- an opt-in function that registers the tools and formats snapshots for an agent. WebMCP is one consumer of the snapshot API; a DevTools panel or a test would be the next.

Nothing in this proposal registers a tool on its own. An application that wants agents to see its environments calls one function, and can take the tools back with an `AbortSignal`.

## 2. Motivation

An agent that helps with a shadow-objects application today reads the DOM. The DOM shows `<shae-ent>` and `<shae-prop>` elements and their attributes, which is the View's *intention*. It shows nothing of what the Kernel made of it: which Shadow Objects actually came into being on an Entity, which Entity Context value a consumer really reads, whether the worker holds the same tree the View believes it sent. That gap is exactly where the hard bugs of this framework live -- the framework's own documentation says as much about the change trail being "batched and clocked, not immediate".

`kernel.getEntityGraph()` closes half of that gap for a developer with a console open on a local environment. It reaches no worker, it carries live `Entity` references that serialize to `{}`, and it says nothing about Shadow Objects or Entity Contexts. This proposal closes the rest of it, for developers and agents alike.

### Goals

- One inspection surface for every environment on the page, local and worker, without the caller knowing which is which.
- Complete per-Entity picture: token, properties with values, Shadow Objects by display name and by the tokens that produced them, Entity Contexts with the provided, inherited and effective value, and where a consumer's value comes from.
- Serializable, bounded output: an agent's context window is the budget, and a tree of ten thousand entities has to come back as a summary plus a way to descend.
- Read-only. Every tool carries `readOnlyHint: true`, and nothing here writes into a Kernel.
- Usable without WebMCP: the snapshot API is public and works from a test, a console, or a devtools extension.

### Non-goals (for this proposal)

- Mutation tools -- setting a property, dispatching a view event, moving an Entity. §17 sketches them as a later phase; the design here leaves room, nothing more.
- Streaming or subscriptions. WebMCP tools are request/response, and the spec's progress reporting is an open question on their side.
- Inspecting an environment that has no namespace. `ShadowEnv.get(ns)` is the registry this proposal enumerates; an environment without a `view` is invisible to it, and this stays so.
- A visual DevTools panel. The snapshot model is designed so that one can be built on it later.

## 3. WebMCP as it stands (September 2026)

What this proposal builds against, read from the explainer and specification of the Web Machine Learning Community Group in the first week of September 2026:

| Aspect | Current state |
| :--- | :--- |
| Entry point | `document.modelContext` (the explainer's older drafts and most secondary sources still write `navigator.modelContext`) |
| Registration | `registerTool(tool, {signal?, exposedTo?})` returns a promise; the tool is taken back by aborting the signal. `provideContext()` / `clearContext()` are gone from the current text |
| Tool shape | `{name, title?, description, inputSchema, execute, annotations?}` -- `execute(input, {signal})` returns a promise of anything; the examples return `{content: [{type: 'text', text}]}` |
| Annotations | `readOnlyHint`, `untrustedContentHint`, `consequentialHint` |
| In-page agents | `getTools({fromOrigins?})`, `executeTool(tool, input, {signal?})`, `toolchange` event |
| Exposure | `[Exposed=Window, SecureContext]`. Not in dedicated workers. A separate explainer proposes service workers as providers, which does not cover the dedicated worker a `RemoteWorkerEnv` spawns |
| Permission | Permissions Policy feature `tools`; `NotAllowedError` when disabled |
| Implementations | Chrome 149 origin trial, Edge 150 origin trial, Brave Leo experimental, ChatGPT Desktop. For local development, `about:flags#enable-webmcp-testing` in Chrome |
| Types | `webmcp-types` on npm, `0.1.6` as of 2026-09-03 |

Two consequences shape everything below.

**The API surface is moving.** The registration method changed name and semantics within the last six months. The framework therefore talks to WebMCP through one small adapter (§11.3) with a structural `ModelContextLike` interface of its own; the rest of the code never sees `document.modelContext`. Swapping the adapter when the spec moves again is a one-file change.

**Workers cannot register tools.** The Kernel of a `RemoteWorkerEnv` lives in a dedicated worker, and there is no `modelContext` there. Every tool is registered on the main thread, and the main thread has to *ask* the worker for what it knows. That is the transport layer of §8, and it is the same route a local environment takes -- just without the wire.

## 4. What the runtime knows today

An inventory of the pieces an inspection can stand on, and what is missing. Everything named here exists in `packages/shadow-objects/src/`.

### 4.1 Reachable today

| Question | Where the answer is |
| :--- | :--- |
| Which environments exist? | `globalThis.__shadowEnvs`, a `Map<NamespaceType, ShadowEnv>` filled by the `view` setter of `ShadowEnv`; `ShadowEnv.get(ns)` reads it |
| Which View contexts exist? | `ComponentContext.getContextsMap()` |
| Is an environment up? | `ShadowEnv.isReady`, `viewReady`, `proxyReady`, `isDestroyed`, `ns$` |
| Local or worker? | `LocalShadowObjectEnv.isLocalEnv`; `RemoteWorkerEnv` has no marker and is told apart by `instanceof` |
| The Entity Tree | `Kernel.getEntityGraph()` -- token, `Entity` reference, props, children, `omittedChildren`; `Kernel.traverseLevelOrderBFS()` for the flat order |
| One Entity | `Kernel.findEntity(uuid)`; `Entity.uuid`, `order`, `parentUuid`, `children`, `autoDestructionOnParentRemoval`, `propKeys()`, `propEntries()`, `hasContext(name)` |
| Shadow Objects of an Entity | `Kernel.findShadowObjects(uuid)` -- instances only |
| The name of a Shadow Object | `ShadowObjectCreationScope.displayName`, reachable only through the Kernel's private `#shadowObjectScopes` |
| Registry | `Registry.hasToken()`, `hasRoute()`, `findTokensByRoute()`, `findConstructors()` -- lookups, no enumeration |
| What the View believes | `ComponentContext.traverseLevelOrderBFS()`, `getComponentState(uuid)` from the `ComponentMemory` (token, parent, order, properties as last committed) |
| A request/reply to the worker with a deadline | `waitForMessageOfType(worker, type, timeout, guard, signal)` |

### 4.2 Missing

- **Enumeration of Entity Contexts.** `Entity` keeps `#context` and `#rootContexts` private; `hasContext(name)` answers for one name, and `useContext(name)` *creates* an entry on read. The snapshot needs a read that creates nothing.
- **Description of a Shadow Object.** The scope knows which properties, contexts and parent contexts a Shadow Object reads and which contexts it provides -- `#propertyReaders`, `#contextReaders`, `#contextParentReaders`, `#contextProviders`, `#contextRootProviders` -- and shows none of it.
- **Reverse lookup from constructor to token.** The Kernel keys `usedConstructors` by constructor; the Registry maps token to constructors. Nothing answers "under which tokens was this constructor defined".
- **Enumeration of the Registry.** Tokens, routes and property routes are private maps.
- **Global contexts of a Kernel.** `#rootContexts` is private, and `SignalsPath` exposes `value$` but not its members.
- **A request other than a change trail on the proxy.** `IShadowObjectEnvProxy` knows `start`, `importScript`, `applyChangeTrail`, `destroy`. `MessageRouter` routes three message types.
- **A serializer for arbitrary values.** Props and contexts hold whatever the application put there -- with `disableStructuredClone` even DOM nodes. A snapshot that crosses a worker boundary or lands in a JSON string has to bound and tag them.

Each gap is closed by a small, additive read accessor (§6.5). None of them changes an existing behaviour.

## 5. Architecture

```
main thread                                          environment (main thread or worker)
──────────────────────────────────────────────       ───────────────────────────────────────
document.modelContext
   ▲ registerTool(…)  { signal }
   │
exposeShadowEnvsToModelContext()          (layer 3: model context adapter)
   │  execute(input) → walks __shadowEnvs
   ▼
ShadowEnv.inspect(request)                (layer 2: transport)
   │  view snapshot (ComponentContext)          ┌────────────────────────────────┐
   │  + envProxy.inspect(request) ──── local ──▶│ LocalShadowObjectEnv           │
   │                                            │   createKernelSnapshot(kernel) │
   │                              ── worker ──▶ │ RemoteWorkerEnv ─ postMessage ─┼─▶ MessageRouter
   │                                            │   waitForMessageOfType         │     createKernelSnapshot(kernel)
   ▼                                            └────────────────────────────────┘     postMessage(Inspected)
EnvSnapshot                               (layer 1: snapshot model, src/inspect/)
```

The three layers, and what each may know:

| Layer | Lives in | Knows | Must not know |
| :--- | :--- | :--- | :--- |
| Snapshot | `src/inspect/` -- runs in the worker bundle too | `Kernel`, `Entity`, `Registry`, `ShadowObjectCreationScope` read accessors | `document`, `ShadowEnv`, WebMCP |
| Transport | `IShadowObjectEnvProxy`, both proxies, `MessageRouter`, `ShadowEnv` | the snapshot request and reply shapes | how a snapshot is rendered for an agent |
| Model context | `src/model-context/`, subpath export | `ShadowEnv.inspect()`, the tool catalogue, the WebMCP adapter | the Kernel |

The dependency direction is strictly outward-in: layer 3 imports layer 2 imports layer 1. Layer 1 is the one that goes into the inline worker bundle, because `MessageRouter` calls it; it must therefore stay free of DOM references and stay small.

## 6. The snapshot model

All types live in `src/inspect/types.ts` and are exported as types from `index.ts`. Everything is plain data: structured-clone-safe and `JSON.stringify`-safe. Symbols, functions, class instances and cycles never appear raw; §7 says what they become.

### 6.1 Environment

```typescript
export interface EnvSnapshot {
  /** The namespace as a string; the global namespace reports its symbol description. */
  namespace: string;
  /** Whether the namespace is the global one. `String(GlobalNS)` alone does not say so. */
  isGlobalNamespace: boolean;
  /** `'local'` for a LocalShadowObjectEnv, `'worker'` for a RemoteWorkerEnv, `'custom'` for any other proxy. */
  kind: 'local' | 'worker' | 'custom';
  state: {
    viewReady: boolean;
    proxyReady: boolean;
    isReady: boolean;
    isDestroyed: boolean;
  };
  /** What the View holds for this namespace. Always present while the environment has a view. */
  view?: ViewSnapshot;
  /** What the Kernel holds. Absent while the proxy is not ready, or when the inspection failed -- then `error` says why. */
  kernel?: KernelSnapshot;
  error?: {name: string; message: string};
}
```

### 6.2 Kernel

```typescript
export interface KernelSnapshot {
  /** `Date.now()` on the thread that built the snapshot. */
  takenAt: number;
  /** The realm the snapshot was built in. */
  thread: 'main' | 'worker';
  counts: {entities: number; roots: number; shadowObjects: number};
  roots: EntityNodeSnapshot[];
  globalContexts: GlobalContextSnapshot[];
  registry?: RegistrySnapshot;
  /** Set when a limit of the request cut the walk short. Names what was cut and how to get the rest. */
  truncation?: TruncationNote[];
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

export interface EntityContextSnapshot {
  name: ContextName;
  /** The value this Entity's own providers wrote, if any provider is attached. */
  provided?: SerializedValue;
  /** The value inherited from the parent, or from the global chain at a root. */
  inherited?: SerializedValue;
  /** What `useContext(name)` on this Entity reads: provided where present, inherited otherwise. */
  effective: SerializedValue;
  /** Display names of the Shadow Objects on this Entity that provide the name. */
  providedBy: string[];
  /**
   * Where the effective value comes from: this Entity, an ancestor by uuid, the global chain, or
   * nowhere -- the name is used but nobody provides it.
   */
  source: {kind: 'self'} | {kind: 'ancestor'; uuid: string} | {kind: 'global'} | {kind: 'none'};
}

export interface GlobalContextSnapshot {
  name: ContextName;
  value: SerializedValue;
  /** The Entities contributing to the chain, in chain order; the first one holding a value wins. */
  providers: {uuid: string; providedBy: string[]; value: SerializedValue}[];
}

/** A string context name as it is; a symbol name as its description, marked as such. */
export type ContextName = string | {symbol: string};
```

Two remarks on the contexts.

*`source` is computed, not stored.* The Entity holds a `provide`, an `inherited` and a `context` signal per name and a `SignalsPath` over the first two. The snapshot reads their `.value` fields -- a read outside any effect tracks nothing -- and derives `source` by walking the parent chain until an Entity with a non-`undefined` `provided` value for the name is found, falling back to `'global'` when the Kernel's root chain holds a value, and `'none'` otherwise. That walk reuses the ancestor visits the tree walk makes anyway; it is O(depth) per context name and fine at the sizes §13 bounds.

*Symbol names cannot be addressed from outside.* An agent can read `{symbol: 'my-context'}` and understand it; it cannot pass a symbol back in. Every tool that takes a context name takes a string, and a symbol context is findable only through the tree. That is the honest limit of a JSON boundary, and the docs say so.

### 6.3 Registry

```typescript
export interface RegistrySnapshot {
  /** token -> display names of the constructors defined under it, in definition order. */
  tokens: Record<string, string[]>;
  /** token -> tokens it routes to (`routes` in a module manifest). */
  routes: Record<string, string[]>;
  /** `@prop` and `token@prop` keys -> tokens (property routes). */
  propRoutes: Record<string, string[]>;
  /** Whether this is the default registry shared by every local environment of the thread. */
  isDefault: boolean;
}
```

### 6.4 View

```typescript
export interface ViewSnapshot {
  takenAt: number;
  counts: {components: number; roots: number};
  roots: ViewComponentSnapshot[];
  /** Set when a depth or node limit cut the walk short. */
  truncation?: TruncationNote[];
}

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
}
```

The View snapshot deliberately reads the `ComponentMemory` and not the pending `ComponentChanges`. `buildChangeTrails(false)` is what `#syncNow()` calls to fix a cycle's trail, and calling it from an inspection would interleave with the sync tempo. Pending changes are therefore not part of this proposal; a `pendingChanges: boolean` flag is a candidate for a later phase once `ComponentChanges` gets a side-effect-free `hasChanges()` read.

The `element` path is built on the main thread by scanning `document.querySelectorAll('shae-ent')` once per snapshot and matching `viewComponent.uuid`; elements inside closed shadow roots are missed, as they are for every DOM query, and the field is simply absent for them.

### 6.5 Read accessors the snapshot needs

Additive, read-only, and each small enough to test in isolation. None of them changes `getEntityGraph()`.

| Class | New member | Returns |
| :--- | :--- | :--- |
| `Entity` | `contextNames(): ContextNameType[]` | keys of `#context`, without creating any |
| `Entity` | `describeContext(name): {provided, inherited, effective, hasProviders} \| undefined` | raw values read from the three signals; `undefined` when the name is not on this Entity |
| `Entity` | `globalContextNames(): ContextNameType[]` | keys of `#rootContexts` |
| `ShadowObjectCreationScope` | `describe(): ShadowObjectDescription` | display name and the five name lists, read from the private maps |
| `Kernel` | `describeShadowObject(obj): ShadowObjectDescription \| undefined` | delegates to the scope behind `#shadowObjectScopes` |
| `Kernel` | `rootContextNames(): ContextNameType[]` | keys of `#rootContexts` |
| `Kernel` | `describeRootContext(name): {value, signals: Signal[]} \| undefined` | needs `SignalsPath.signals` (a read-only view of its members) |
| `Registry` | `describe(): RegistrySnapshot` (without `isDefault`) | copies of the three maps with constructors reduced to display names |
| `Registry` | `tokensOf(construct): string[]` | reverse lookup over `#registry` |
| `Registry` | `static isDefault(registry): boolean` | identity check against the module-level default |
| `SignalsPath` | `get signals(): readonly SignalLike[]` | the current member list |

`Kernel.describeShadowObject()` also answers `hooks` by checking the four symbol keys the `LIFECYCLE_HOOKS` table in `Kernel.ts` already names. The mapping from the provider signals of a scope to the Entity's providers of a name (`providedBy`) is done in the snapshot builder by asking every Shadow Object of the Entity for its `providesContexts` and grouping by name -- no new bookkeeping.

## 7. Value serialization

`src/inspect/serializeValue.ts` turns any value into a `SerializedValue` under a limit set, with no exceptions thrown to the caller. It is the one place that decides what a property or context value looks like on the far side of a JSON boundary.

```typescript
export type SerializedValue =
  | null | boolean | number | string
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
  | {$type: 'truncated'; reason: 'depth' | 'length' | 'entries' | 'string'; original?: number};

export interface SerializeLimits {
  maxDepth: number;         // default 3
  maxArrayLength: number;   // default 20
  maxObjectEntries: number; // default 30
  maxStringLength: number;  // default 200
}
```

Rules, in the order they are applied:

1. Primitives pass through; `undefined` becomes `{$type: 'undefined'}` because JSON drops it, and a property that is set without a value (`[key]` in a change trail) is exactly the case that must stay visible.
2. `NaN` and `±Infinity` become strings `'NaN'`, `'Infinity'`, `'-Infinity'` -- JSON has no representation for them.
3. Plain objects and arrays recurse under `maxDepth`; a cycle is detected with a `Set` of visited objects along the current path, not globally, so a shared sub-object appears twice rather than as `$circular` the second time.
4. A signalize signal (`isSignal()`) becomes `{$type: 'signal', value}` with its current value serialized -- a Shadow Object that puts a signal into a context is common, and the agent wants the value.
5. `Date`, `Map`, `Set`, typed arrays and buffers get their own tags; `Map`/`Set` are rendered as entry arrays under the array limit.
6. Anything else with a prototype other than `Object.prototype` or `null` becomes `{$type: 'object', class}` with a `preview` of its own enumerable string keys under the entry limit. A `three` `Object3D` therefore shows its class and its first thirty fields, not its whole scene graph.
7. A DOM `Node` (checked by duck typing on `nodeType` and `nodeName`, so the module needs no DOM globals) becomes `{$type: 'dom'}`. This case only occurs in a local environment with `disableStructuredClone`.
8. Any getter that throws while being read makes the field `{$type: 'object', class: 'Error', preview: {message}}` rather than aborting the snapshot.

The limits come from the request (§8.1) and default to the values above. They are per value, not per snapshot; §13 has the per-snapshot budget.

## 8. Transport

### 8.1 The request

```typescript
export interface InspectRequest {
  /** What to include per Entity. Default: all four. */
  include?: ('props' | 'shadowObjects' | 'contexts' | 'registry')[];
  /** Descend from these uuids instead of the roots. Unknown uuids are reported under `truncation`, not thrown. */
  rootUuids?: string[];
  /** Tree depth below each root that is walked. Default 4. `Infinity` is refused and read as the maximum, 64. */
  maxDepth?: number;
  /** Total number of Entity nodes across the walk. Default 250. */
  maxNodes?: number;
  values?: Partial<SerializeLimits>;
}
```

The same request type serves the View snapshot on the main thread and the Kernel snapshot in the environment, so a caller asks once and gets both sides cut by the same rules.

### 8.2 The proxy contract

`IShadowObjectEnvProxy` gains one optional member:

```typescript
/**
 * Describe the Kernel behind this proxy. Optional: a proxy that does not implement it makes
 * `ShadowEnv.inspect()` report `kernel` as absent with an error naming the proxy as not
 * inspectable, and everything else keeps working.
 */
inspect?(request: InspectRequest, signal?: AbortSignal): Promise<KernelSnapshot>;
```

Optional rather than required, for the same reason `onMessageToView` and `onProxyFailed` are: an outside implementation of the interface written against the current contract keeps compiling and keeps working.

### 8.3 Local environment

`LocalShadowObjectEnv.inspect()` calls `createKernelSnapshot(this.kernel, request)` and resolves with the result. The snapshot builder runs synchronously on the Kernel; a `signal` already aborted rejects before it runs. No cloning is involved: the builder emits plain data, and the caller owns it.

### 8.4 Worker environment

Two message types join `constants.ts`, and `WorkerReplyType` grows to five members -- the comment on it promises an exhaustive `switch`, so every such `switch` gets a fifth case:

```typescript
export const Inspect = 'inspect';
export const Inspected = 'inspected';
export const WorkerInspectTimeout = 5000;
```

Wire shapes:

```typescript
interface InspectMessage   { type: typeof Inspect;   serial: number; request: InspectRequest }
interface InspectedMessage { type: typeof Inspected; serial: number; snapshot?: KernelSnapshot; error?: string; errorName?: string }
```

`RemoteWorkerEnv.inspect()` follows `applyChangeTrail(trail, true)` line for line: reject on an aborted `#workerFailure` signal or a missing worker, take a serial from `#changeTrailSerial`'s neighbour `#inspectSerial`, post, and `waitForMessageOfType(worker, Inspected, this.timeouts.inspectTimeout, guard, signal)` where the guard matches the serial and turns an `error` field into a `WorkerReportedError`. The caller's `AbortSignal` is combined with the worker-failure signal through `AbortSignal.any()`; a caller that gives up stops waiting, and the worker's answer, when it arrives, is discarded like any other unmatched message.

`WorkerTimeouts` gains `inspectTimeout`, `RemoteWorkerEnvOptions` inherits it, `resolveTimeouts()` vets it through the same `isTimeout()` rule, and `<shae-worker>` reads it from an `inspect-timeout` attribute next to the four existing ones in `WorkerTimeoutAttributes`.

`MessageRouter.route()` gets a fourth case. Behind the `isDestroyed` barrier, which already discards every message after a teardown:

```typescript
case Inspect:
  this.#onInspect(data);
  break;
```

```typescript
#onInspect(data: InspectMessage) {
  try {
    const snapshot = createKernelSnapshot(this.kernel, data.request);
    this.postMessage({type: Inspected, serial: data.serial, snapshot});
  } catch (error) {
    this.logger.error('failed to inspect the kernel', error);
    this.postMessage({type: Inspected, serial: data.serial, ...describeError(error)});
  }
}
```

The message runs through the same queue as the change trails. A snapshot therefore reflects every trail posted before the request and none posted after it. That ordering is the guarantee `ShadowEnv.inspect()` documents: "call `syncWait()` first if the snapshot must include what you just changed".

### 8.5 `ShadowEnv.inspect()`

```typescript
/**
 * Describe this environment: the View's component tree and, where the proxy is ready and
 * implements `inspect`, the Kernel's Entity Tree behind it.
 *
 * Never rejects for a reason inside the environment -- a proxy that cannot answer, a worker
 * that stays silent, a Kernel that threw -- and reports those under `error` with `kernel`
 * absent. It rejects only for a reason of the caller's: an aborted signal, or an environment
 * that is destroyed.
 */
inspect(request?: InspectRequest, signal?: AbortSignal): Promise<EnvSnapshot>;

/** Every environment that holds a namespace, in registration order. */
static inspectAll(request?: InspectRequest, signal?: AbortSignal): Promise<EnvSnapshot[]>;
```

The `kind` field is decided here: `isLocalEnv` marks a local proxy, `instanceof RemoteWorkerEnv` a worker, anything else `'custom'`. That keeps `RemoteWorkerEnv` free of a marker field it has no other use for.

`inspectAll()` runs the environments in parallel with `Promise.all` over `inspect()` calls that do not reject for environment reasons -- one silent worker costs its own entry, not the page's answer.

## 9. Discovery of environments

The environments an agent sees are the ones in `globalThis.__shadowEnvs`. That map is fed by the `view` setter, so an environment counts from the moment it has a `ComponentContext` -- whether or not its proxy is up. An environment in that state reports `state.proxyReady: false` and no `kernel`; an agent that sees it knows to wait or to ask again.

The map is keyed by namespace, and a namespace carries one environment at a time. A `<shae-worker ns="game">` and a `<shae-worker ns="ui" local>` on the same page are two entries; two elements with the same `ns` are one entry and a logged warning, exactly as today. The tools take a `namespace` string; the global namespace is addressed by its description, `ShadowObjectsGlobalNS`, which the tool resolves back to the symbol.

There is no `toolchange` to fire when an environment comes or goes: the tool catalogue is fixed, and environments are enumerated at call time.

## 10. The tools

All tools share a name prefix, `shae-` by default, so that they sit next to an application's own tools without colliding. Every tool carries `annotations: {readOnlyHint: true, untrustedContentHint: true}` -- read-only because nothing writes, untrusted because property and context values are application data that may contain whatever a user typed. Every `execute` honours `options.signal`.

Every result is returned in the same envelope:

```typescript
{
  content: [{type: 'text', text: string}],   // a short human-readable summary, then the JSON
  structuredContent: object                  // the snapshot itself, for agents that read it
}
```

`structuredContent` is the Model Context Protocol's field for structured results. WebMCP's `execute` may return anything, and the explainer's examples return `{content}`; carrying both costs nothing and lets an agent that understands either form work. If the spec settles on one, the adapter (§11.3) is where the envelope changes.

### 10.1 `shae-list-envs`

Every environment on the page, with its state and counts, and no tree.

- **Input:** none.
- **Output:** `EnvSnapshot[]` with `view` and `kernel` reduced to their `counts` and `takenAt`. This is the cheapest call and the one an agent makes first.

### 10.2 `shae-get-entity-tree`

The Entity Tree of one environment, or of all of them.

- **Input:** `{namespace?: string, rootUuid?: string, maxDepth?: number, maxNodes?: number, include?: string[], valueDepth?: number}`. Defaults from §8.1.
- **Output:** `EnvSnapshot` per environment with the full `kernel` and `view` sections, honouring the limits. A cut walk carries `truncation` notes that name the uuids at which it stopped, so the agent can descend with `rootUuid`.

### 10.3 `shae-get-entity`

One Entity in full, with everything §6.2 defines and, on top, the ancestor chain.

- **Input:** `{uuid: string, namespace?: string}`. Without a namespace, every environment is asked and the first that holds the uuid answers; uuids are unique per `ComponentContext`, and a page that reuses one across namespaces gets both, labelled.
- **Output:** `{namespace, entity: EntityNodeSnapshot (depth 1), ancestors: {uuid, token}[], view?: ViewComponentSnapshot}` -- the View component of the same uuid next to the Kernel's Entity, which is where a divergence between the two sides becomes visible without a diff tool.

### 10.4 `shae-find-entities`

Search inside the environment, so that the answer is small.

- **Input:** `{namespace?: string, token?: string, propName?: string, shadowObject?: string, contextName?: string, limit?: number}`; at least one criterion, all given criteria must match, `limit` defaults to 50.
- **Output:** `{namespace, matches: {uuid, token, path: string[]}[], total}` where `path` is the token chain from the root, and `total` says how many matched before the limit.

The search runs as part of `createKernelSnapshot()` with a `filter` in the request -- an internal field the tools set and the public `InspectRequest` does not carry -- so the worker sends back only the matches. It is the one tool whose request shape reaches beyond §8.1, and it is what keeps a search over a large tree from shipping the tree.

### 10.5 `shae-get-registry`

The composition rules of an environment: tokens, routes and property routes.

- **Input:** `{namespace?: string}`.
- **Output:** `RegistrySnapshot` per environment. An agent that reads a token on an Entity and wants to know why a Shadow Object is or is not there looks here.

### 10.6 Deliberately not in this set

- A `shae-diff-view-kernel` tool that lines up the View's component tree against the Kernel's Entity Tree and reports what differs. It is the single most useful debugging tool this design enables, and it is a phase of its own (§17), because a good diff needs the pending-changes read that §6.4 defers.
- A watch or subscription. WebMCP has no push channel for data.
- Anything that writes.

## 11. Public API and packaging

### 11.1 The inspection API (no WebMCP involved)

Exported from `index.ts`:

- `ShadowEnv.prototype.inspect(request?, signal?)` and `ShadowEnv.inspectAll(request?, signal?)` (§8.5)
- the types of §6, §7 and §8.1
- `createKernelSnapshot(kernel, request?)` -- exported from `shadow-objects.js` as well, the in-environment entry point, so a Shadow Object module or a test that holds a `Kernel` can snapshot it without a `ShadowEnv`

### 11.2 The model context entry point

A new subpath, `@spearwolf/shadow-objects/model-context.js`, resolving to `dist/src/model-context.js`. A subpath rather than an `index.ts` export because this module touches `document` and must stay out of the worker bundle and out of every consumer that does not want it; `ConsoleLogger.js` and `FrameLoop.js` set the precedent.

```typescript
export interface ExposeOptions {
  /** Where to register. Default: `document.modelContext`, then `navigator.modelContext`; absent means "not available". */
  modelContext?: ModelContextLike;
  /** Prefix for every tool name. Default `'shae-'`. */
  toolPrefix?: string;
  /** Aborting it unregisters every tool. */
  signal?: AbortSignal;
  /** Passed through to `registerTool()`. Default: not set, so the platform default applies. */
  exposedTo?: string[];
  /** Default limits for every tool call; a call's own input wins. */
  limits?: Partial<InspectRequest>;
  /** Property names whose values are replaced by `{$type: 'redacted'}` in every snapshot. */
  redactProps?: string[] | ((name: string, uuid: string) => boolean);
}

export interface ExposeHandle {
  /** `false` when no model context was found; then `tools` is empty and nothing was registered. */
  available: boolean;
  /** The registered tool names, with the prefix. */
  tools: string[];
  /** Unregisters every tool. Idempotent. The same as aborting `options.signal`. */
  dispose(): void;
}

export function exposeShadowEnvsToModelContext(options?: ExposeOptions): Promise<ExposeHandle>;
```

Behaviour:

- Resolves, never rejects, when the platform has no model context: `available: false`, one `info` line through a `ConsoleLogger('ModelContext')`. The same application code runs in every browser.
- Rejects with what `registerTool()` rejected with -- a `NotAllowedError` under a Permissions Policy that disables `tools` is the caller's business to handle, and swallowing it would hide a deployment mistake.
- Registers every tool with one internal `AbortController` whose signal is chained to `options.signal`; `dispose()` aborts it. Registration is all-or-nothing: a rejection midway aborts the controller so that the tools already registered are taken back.
- A second call while the first handle is live registers a second, independent set; with the same prefix `registerTool()` rejects on the duplicate name, and the rejection is passed through. The docs say to keep one handle.

`redactProps` is the one knob this proposal adds for privacy; §12 explains why it is an option and not a default.

### 11.3 The adapter

`src/model-context/ModelContextLike.ts` names what the framework needs from the platform, structurally:

```typescript
export interface ModelContextLike {
  registerTool(tool: ModelContextToolLike, options?: {signal?: AbortSignal; exposedTo?: string[]}): Promise<unknown> | unknown;
}

export interface ModelContextToolLike {
  name: string;
  title?: string;
  description: string;
  inputSchema: object;
  annotations?: {readOnlyHint?: boolean; untrustedContentHint?: boolean; consequentialHint?: boolean};
  execute(input: object, options?: {signal?: AbortSignal}): Promise<unknown> | unknown;
}
```

`registerTool` returning `unknown` rather than a promise is on purpose: the Chrome early preview returned nothing, the spec returns a promise, and the adapter awaits whatever it gets. No dependency on `webmcp-types`: a `0.1.x` package that tracks a moving spec would pin this package to its release cadence. If the types package stabilises, it can be adopted as a devDependency for the tests through the catalog, without touching the public interface here.

### 11.4 `<shae-worker>`

No new registration attribute in this proposal. Registering agent-visible tools is a page-level decision with security consequences (§12), and an attribute would make it a per-element side effect that a copied snippet carries along. The one element change is the `inspect-timeout` attribute of §8.4.

If usage shows that the function call is a hurdle, a follow-up can add an opt-in attribute; the function stays the primitive either way.

## 12. Security and privacy

Every value in a snapshot is application state. Properties hold what the View put there, and an application that passes a session token, an e-mail address or a user's draft through a `<shae-prop>` will see it in the snapshot, and so will every agent the page exposes tools to.

The proposal's stance, and how the design carries it:

- **Nothing is exposed without a call.** No element attribute, no auto-registration, no import side effect. `exposeShadowEnvsToModelContext()` is the only way in, and it takes an `AbortSignal` to get back out.
- **Read-only, and declared as such.** `readOnlyHint: true` on every tool tells the agent and the browser the same thing. An agent cannot change a Kernel through this surface.
- **Exposure follows the platform.** Without `exposedTo`, the spec exposes tools to the document, same-origin documents in the frame tree, and the built-in agent. The option is passed through untouched for the cases where an author-provided agent in a cross-origin frame should see them.
- **`untrustedContentHint: true`** on every tool, because the values the tools return can include content a user typed. That is the spec's mechanism for telling an agent to treat a result as data, and it is set unconditionally rather than left to the application.
- **Redaction is available and not default.** `redactProps` exists for applications that know which property names carry secrets. A default list would be a guess, and a guess here is worse than none: it would suggest coverage it cannot have. The documentation carries the warning in the section that introduces the function, before the first code sample.
- **Production is a decision.** The docs recommend calling the function behind the same switch that enables the `ConsoleLogger`, or behind a build flag, and never unconditionally in a shipped bundle. The framework does not enforce this; it is the application's origin and the application's data.
- **The model context is a secure-context API.** On plain `http://` outside `localhost` the platform hands out no `modelContext`, and the function reports `available: false`.

The View snapshot's `element` field is a CSS selector, not a node, and reveals nothing the agent could not get from the DOM itself.

## 13. Performance and size

Building a snapshot walks the Entity Tree once, and for every visited node reads its properties, its Shadow Objects and its contexts. With `n` visited nodes, `p` properties, `s` Shadow Objects and `c` context names per node the cost is O(n × (p + s + c)) signal reads plus the value serialization, which is bounded per value by §7. The default limits of §8.1 -- depth 4, 250 nodes -- keep a call in the low milliseconds on a typical scene. The build blocks the Kernel's thread for exactly that long; in a worker it delays the next change trail by the same amount, which the `auto-sync` cadence of one frame absorbs.

Size is the tighter budget. A node with four properties, two Shadow Objects and three contexts serializes to roughly one kilobyte of JSON; 250 of them are 250 kilobytes, which is already a large tool result for an agent. The defaults are therefore conservative, `truncation` notes tell the agent where to descend, and `shae-find-entities` exists so that a search does not ship a tree. `shae-list-envs` carries counts only.

No caching. The Kernel changes with every frame that carries a change trail, and a stale snapshot is worse than a slow one. A caller that wants a consistent picture of the View and the Kernel after its own change awaits `syncWait()` first; the docs say so next to `inspect()`.

## 14. Testing

Per package, following the existing layout.

**`packages/shadow-objects` (vitest, happy-dom):**

- `src/inspect/serializeValue.spec.ts` -- every branch of §7 with limits, cycles, throwing getters, signals, DOM duck-typing.
- `src/inspect/createKernelSnapshot.spec.ts` -- a `Kernel` built in the test with a Registry of test Shadow Objects: tree shape against `getEntityGraph()`, `omittedChildren` parity, `definedUnder`, `usesProperties` / `providesContexts` from a Shadow Object that calls the creation API, `source` for self, ancestor, global and none, depth and node limits, `rootUuids`, the search filter.
- `src/in-the-dark/Entity.spec.ts` and `ShadowObjectCreationScope.spec.ts` -- the new accessors create nothing on read and survive a teardown (`describe()` on a torn-down scope answers empty lists, not a throw).
- `src/worker/MessageRouter.spec.ts` -- the `Inspect` round trip with the existing fake `postMessage`, an error inside the builder answered as `Inspected` with `error`, a request after the teardown discarded.
- `src/view/RemoteWorkerEnv.spec.ts` -- serial matching, `inspectTimeout` expiry as `WorkerTimeoutError`, rejection after `destroy()`, abort through the caller's signal.
- `src/view/ShadowEnv.spec.ts` -- `inspect()` on an environment without a proxy, with a proxy that lacks `inspect`, with a local proxy; `inspectAll()` across two namespaces where one fails.
- `src/model-context/exposeShadowEnvsToModelContext.spec.ts` -- against a fake `ModelContextLike` that records registrations: tool names and annotations, `available: false` without a context, all-or-nothing on a rejected registration, `dispose()` and signal chaining, each tool's `execute` against a local environment, `redactProps`.
- `src/distContract.spec.ts` -- updated expectation files for the new subpath and the new files under `dist/`.

**`packages/shadow-objects-testing` (vitest browser mode, Chromium):**

- `test/inspect-local-env.test.js` and `test/inspect-worker-env.test.js` -- `<shae-worker>` with and without `local`, a small `<shae-ent>` tree with `<shae-prop>` values, `env.inspect()` after `syncWait()`: View and Kernel agree on uuids, tokens and props; the worker case proves the wire shapes survive structured cloning.

**`packages/shadow-objects-e2e` (Playwright):**

- `tests/model-context.spec.ts` -- a page that calls `exposeShadowEnvsToModelContext()`; the test drives the tools through `document.modelContext.getTools()` / `executeTool()` from `page.evaluate()`. Runs only where the browser exposes the API: the Chromium project is launched with the WebMCP testing flag, and the spec skips with a named reason where `document.modelContext` is absent, so Firefox and WebKit stay green. Which flag Playwright's bundled Chromium accepts, and whether that build carries the origin-trial implementation at all, is the first thing to verify when this phase starts; a fallback is to run the same spec against the fake adapter injected through `modelContext`, which proves the tools but not the platform.

## 15. Documentation and contract obligations

Following `AGENTS.md` §4 and `CLAUDE.md`, in the same change as the code:

- `packages/shadow-objects/docs/api-reference.md` -- a section *Inspection* under `ShadowEnv` (`inspect`, `inspectAll`, the request and snapshot types), `createKernelSnapshot()` under the Kernel, the new `Entity`, `Kernel`, `Registry` and `SignalsPath` accessors, the `inspectTimeout` option and attribute, the `Inspect` / `Inspected` messages under the worker protocol, and a section *Model Context* for the subpath.
- `packages/shadow-objects/docs/guides.md` -- *Inspecting an environment* with the `syncWait()` ordering rule, and *Exposing environments to an agent* with the security paragraph first.
- `packages/shadow-objects/docs/concepts.md` -- one paragraph under *The Change Trail and the Sync Tempo* on what a snapshot reflects.
- `packages/shadow-objects/docs/cheat-sheet.md` -- the tool table and the one-liner.
- `packages/shadow-objects/docs/best-practices.md` -- the development-only recommendation of §12.
- `packages/shadow-objects/README.md` -- one sentence and a link under *Security*, since the function is a new way state leaves the page.
- `packages/shadow-objects/CHANGELOG.md` -- under *Unreleased*: the API, the subpath, the protocol, the timeout.
- `src/distContract.files.txt` and `src/distContract.package.json` -- the new files and the new `exports` entry.
- `AGENTS.md` -- §2 gains the inspection route next to the three data-flow directions; the terminology table is unchanged, and this document already uses only its left column. `scripts/checkTerminology.mjs` does not scan `docs/proposals/`, and nothing here would fail it.
- Root `CHANGELOG.md` -- only if the e2e project gains a browser flag or a devDependency.

`pnpm make:todo` runs if any `TODO` is left in the code, which this plan does not intend.

## 16. Implementation plan

Four phases, each shippable on its own and each ending with green `pnpm run ci`.

**Phase 1 -- snapshot model and local environments.**
`src/inspect/` with types, serializer and `createKernelSnapshot()`; the read accessors of §6.5; `IShadowObjectEnvProxy.inspect?`; `LocalShadowObjectEnv.inspect()`; `ShadowEnv.inspect()` / `inspectAll()` with the View snapshot; unit tests; docs for all of it. After this phase a developer can call `ShadowEnv.get('ns').inspect()` in the console of a local environment and get JSON.

**Phase 2 -- worker transport.**
`Inspect` / `Inspected`, `WorkerInspectTimeout`, `RemoteWorkerEnv.inspect()`, `MessageRouter.#onInspect()`, `inspectTimeout` option and `inspect-timeout` attribute, the fifth `switch` cases, unit and browser-mode tests, docs. After this phase the same console call works for a worker environment.

**Phase 3 -- model context.**
`src/model-context/` with the adapter, the five tools, `exposeShadowEnvsToModelContext()`, the subpath export, dist contract update, unit tests against the fake adapter, the e2e spec, docs. After this phase an agent in a browser with WebMCP sees the tools.

**Phase 4 -- follow-ups, each its own proposal or change:** §17.

Files touched, by phase:

| Phase | New | Changed |
| :--- | :--- | :--- |
| 1 | `src/inspect/types.ts`, `serializeValue.ts`, `createKernelSnapshot.ts`, `createViewSnapshot.ts`, specs | `Entity.ts`, `ShadowObjectCreationScope.ts`, `Kernel.ts`, `Registry.ts`, `SignalsPath.ts`, `IShadowObjectEnvProxy.ts`, `LocalShadowObjectEnv.ts`, `ShadowEnv.ts`, `shadow-objects.ts`, `index.ts`, docs, changelog |
| 2 | -- | `constants.ts`, `RemoteWorkerEnv.ts`, `MessageRouter.ts`, `ShaeWorkerElement.ts`, `types.ts` (wire shapes), specs, docs, changelog |
| 3 | `src/model-context.ts`, `src/model-context/ModelContextLike.ts`, `exposeShadowEnvsToModelContext.ts`, `tools/*.ts`, specs, `shadow-objects-e2e/tests/model-context.spec.ts` and page | `package.json` (`exports`), `distContract.files.txt`, `distContract.package.json`, `AGENTS.md`, `README.md`, docs, changelogs |

## 17. Later phases, out of this proposal

- **View/Kernel diff.** A `shae-diff-view-kernel` tool over a side-effect-free `ComponentChanges.hasChanges()` read: components without an Entity, Entities without a component, tokens and props that differ, and the pending trail that explains it.
- **Mutation tools.** `shae-set-property`, `shae-dispatch-view-event`, `shae-sync`, each with `consequentialHint: true` and `readOnlyHint: false`, each routed through the View (`ComponentContext.setProperty()`, `dispatchShadowObjectsEvent()`, `ShadowEnv.syncWait()`) and never through the Kernel directly -- the View owns structure, and an agent is a View-side actor like any other. A separate opt-in flag, so that a read-only exposure stays read-only.
- **Element-level opt-in.** A `<shae-worker>` attribute that calls the function, once the function has proven itself.
- **A DevTools panel** consuming `ShadowEnv.inspectAll()` on a timer; the snapshot model already carries what it needs, including `element` paths for highlighting.
- **Progress and streaming**, once WebMCP settles them.

## 18. Open decisions

Each with a recommendation; the proposal proceeds on the recommendation unless told otherwise.

1. **Name of the subpath and function.** `model-context.js` and `exposeShadowEnvsToModelContext()` name the platform object rather than the marketing term. Recommendation: keep them; `webmcp` may be renamed by the working group, `modelContext` is the identifier in the IDL.
2. **`structuredContent` in the result.** Costs a duplicate of the JSON in every response. Recommendation: include it; the text form is the compatibility floor, the structured form is what a capable agent reads, and the duplication is bounded by the same limits.
3. **Default limits.** Depth 4, 250 nodes, value depth 3, 20 array items, 30 object entries, 200 characters. Recommendation: ship these and revisit after the first real agent session; they are options, not constants.
4. **`untrustedContentHint` unconditional.** An application with no user-typed data pays a hint it does not need. Recommendation: unconditional; the framework cannot know, and the cost is an agent being careful.
5. **Optional vs required `inspect` on the proxy interface.** Required would let TypeScript find a proxy that forgot it. Recommendation: optional, for the same compatibility reason the two callbacks are optional today; a custom proxy is rare and the reported error is explicit.
6. **`createKernelSnapshot` in the worker bundle.** Adds the serializer and the builder to `dist/bundle.js`; a few kilobytes. Recommendation: accept; a lazy `import()` inside the worker would add a second module URL to the inline-worker build for no gain.
7. **`isDefault` on the Registry snapshot.** Exposes whether an environment shares the default registry. Recommendation: include; it is the answer to "why did that token show up here", and it is one boolean.

## 19. References

- WebMCP explainer: <https://github.com/webmachinelearning/webmcp> -- imperative registration, `getTools()` / `executeTool()`, annotations, permissions policy, open questions
- WebMCP specification: <https://webmachinelearning.github.io/webmcp/> -- `ModelContext` IDL, `[Exposed=Window, SecureContext]`
- Implementation status: <https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md>
- Service workers supplement: <https://github.com/webmachinelearning/webmcp/blob/main/docs/service-workers.md>
- `webmcp-types` on npm: <https://www.npmjs.com/package/webmcp-types>
- This repository: `packages/shadow-objects/docs/api-reference.md`, sections *`getEntityGraph()`* and *Entity Graph Inspection*; `packages/shadow-objects/docs/concepts.md`, *Multi-Environment Setup* and *Shared Registries*
