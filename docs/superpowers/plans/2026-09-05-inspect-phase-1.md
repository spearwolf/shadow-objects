# Inspection Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A developer calls `ShadowEnv.get('ns').inspect()` on a local environment and gets a JSON-safe snapshot of the View's component tree and the Kernel's Entity Tree, with Shadow Objects, properties and Entity Contexts.

**Architecture:** A new `src/inspect/` module builds plain-data snapshots next to the Kernel (`createKernelSnapshot`) and next to the `ComponentContext` (`createViewSnapshot`), fed by small read-only accessors added to `Entity`, `Kernel`, `Registry`, `ShadowObjectCreationScope` and `SignalsPath`. `IShadowObjectEnvProxy` gains an optional `inspect()`, `LocalShadowObjectEnv` implements it synchronously on its Kernel, and `ShadowEnv.inspect()` / `ShadowEnv.inspectAll()` combine both sides into an `EnvSnapshot`. Nothing in this phase touches the worker protocol or WebMCP.

**Tech Stack:** TypeScript, `@spearwolf/signalize` (`beQuiet`, `isSignal`, `value`), vitest 4 with happy-dom, Biome, pnpm 11 + turbo.

**Spec:** `docs/proposals/web-mcp-shadow-envs.md`, §6 (snapshot model), §6.5 (accessors), §7 (serializer), §8.1–8.3 and §8.5 (request, proxy contract, local env, `ShadowEnv.inspect`), §9 (discovery), §11.1 (exports), §13–§16 (limits, tests, docs, phase 1).

## Global Constraints

- Every source file and doc is English. Docs use the terminology of `AGENTS.md` §4: Entity, Entity Tree, Token, Shadow Object, `ComponentContext`, "Entity Context" for `provideContext`/`useContext`; the right-hand column of that section's table is never used, and `pnpm lint:terms` checks it.
- `getEntityGraph()` stays unchanged in name, signature and behaviour.
- Dependency direction: `src/inspect/` imports from `src/in-the-dark/`, `src/view/` and `src/types.ts`; nothing under `in-the-dark/` or `view/` imports from `src/inspect/` except `LocalShadowObjectEnv.ts` and `ShadowEnv.ts`, which consume the builders.
- `src/inspect/createKernelSnapshot.ts` and `serializeValue.ts` must run in a worker: no DOM globals, no `document`; DOM nodes are detected by duck typing.
- `tsconfig.json` has `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`: an optional field is written only when it has a value, never as `undefined`; indexed reads are guarded or `!`-asserted with a reason.
- Snapshots are `JSON.stringify`-safe and structured-clone-safe: no symbols, functions, class instances or cycles leave the builder.
- Default limits (spec §8.1, §7, §18.3): `maxDepth` 4 (non-finite reads as 64, hard cap 64), `maxNodes` 250, value limits `maxDepth` 3, `maxArrayLength` 20, `maxObjectEntries` 30, `maxStringLength` 200.
- `pnpm lint:ci` exits 1 on any Biome warning; `pnpm lint:terms` scans `packages/*/docs/**/*.md` and `README.md`s.
- Every commit message ends with the two trailers below, verbatim:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA
```

- Commit subjects follow the repo's style: `<type>: <lowercase sentence describing what now holds>`, e.g. `feat: the entity answers which contexts it holds and what each of them reads`.
- Running numbers of an audit or review report never appear in code, tests, docs or commits; a rule is written out as a sentence instead.

## Deviations from the proposal, decided here

The proposal leaves a few gaps that the code has to close. Task 13 writes these into the proposal so spec and code agree.

1. `TruncationNote` is used but never defined in §6.2. Defined in Task 1 as `{reason: 'max-depth' | 'max-nodes' | 'unknown-root'; uuid?: string; message: string}`.
2. `Kernel.describeShadowObject(obj)` (§6.5) cannot answer `definedUnder`: the constructor of an instance is known only at the Kernel's entity entry. It becomes `Kernel.describeShadowObjects(uuid): ShadowObjectDescription[]`, one description per Shadow Object of the Entity, carrying `definedUnder` and `hooks`.
3. `Kernel.tokenOf(uuid): string | undefined` is added: the token lives in the private entity entry and the snapshot needs it per node.
4. `Entity.describeGlobalContext(name)` is added next to `globalContextNames()`: the global-context providers list of §6.2 needs each Entity's own contribution and the signal it contributes with.
5. `EnvSnapshot.kind` gains `'none'` for an environment that has no proxy at all; `'custom'` would misreport that state.
6. The `truncated` variant of `SerializedValue` gains `preview?: string`, so a cut string still shows its head.
7. `Map` and `Set` render as `{$type: 'object', class: 'Map' | 'Set', preview: {size, entries}}` — the union of §7 has no tag of its own for them, and this stays inside it.
8. "Holds a value" for the `source` computation of §6.2 is `value != null`, the rule `SignalsPath` resolves a chain by; a provider holding `null` is passed over there as well.
9. The `filter` field of §10.4 belongs to Phase 3 and is not part of the request in this phase.

## File structure

| File | Responsibility |
| :--- | :--- |
| `packages/shadow-objects/src/inspect/types.ts` (new) | Every snapshot, request and serialized-value type; no runtime code |
| `packages/shadow-objects/src/inspect/serializeValue.ts` (new) | `serializeValue(value, limits?)` and `SerializeDefaults` |
| `packages/shadow-objects/src/inspect/normalizeInspectRequest.ts` (new) | Request defaults and clamping, `NodeBudget` |
| `packages/shadow-objects/src/inspect/createKernelSnapshot.ts` (new) | Kernel-side walk: entities, props, Shadow Objects, Entity Contexts, global contexts, registry |
| `packages/shadow-objects/src/inspect/createViewSnapshot.ts` (new) | View-side walk: components, memory props, `<shae-ent>` selector paths |
| `packages/shadow-objects/src/in-the-dark/displayName.ts` (new) | `getDisplayName(construct)`, moved out of `Kernel.ts` so `Registry.ts` can share it |
| `packages/shadow-objects/src/types.ts` | `LifecycleHookName`, `ShadowObjectScopeDescription`, `ShadowObjectDescription`, `RegistryDescription` |
| `packages/shadow-objects/src/in-the-dark/Entity.ts` | `contextNames()`, `describeContext()`, `globalContextNames()`, `describeGlobalContext()` |
| `packages/shadow-objects/src/in-the-dark/SignalsPath.ts` | `get signals()` |
| `packages/shadow-objects/src/in-the-dark/Kernel.ts` | `tokenOf()`, `describeShadowObjects()`, `rootContextNames()`, `describeRootContext()` |
| `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts` | `describe()` |
| `packages/shadow-objects/src/in-the-dark/Registry.ts` | `describe()`, `tokensOf()`, `static isDefault()` |
| `packages/shadow-objects/src/view/IShadowObjectEnvProxy.ts` | optional `inspect()` |
| `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` | `inspect()` |
| `packages/shadow-objects/src/view/ShadowEnv.ts` | `inspect()`, `static inspectAll()` |
| `packages/shadow-objects/src/index.ts`, `src/shadow-objects.ts` | exports |
| `packages/shadow-objects/src/distContract.files.txt` | new files under `dist/` |
| `packages/shadow-objects/CHANGELOG.md`, `docs/*.md`, `README.md`, `AGENTS.md`, `docs/proposals/web-mcp-shadow-envs.md` | documentation and spec amendments |

Commands run from the repository root unless a task says otherwise. `pnpm exec vitest <file> --run` needs the package directory: `cd packages/shadow-objects && pnpm exec vitest src/... --run`.

---

### Task 1: The type module

**Files:**
- Create: `packages/shadow-objects/src/inspect/types.ts`
- Modify: `packages/shadow-objects/src/types.ts` (append after `ShadowObjectConstructorFunc`)

**Interfaces:**
- Produces: every type below. Later tasks import them by name from `./types.js` (inside `src/inspect/`) or `../inspect/types.js`.

- [ ] **Step 1: Add the shared description types to `src/types.ts`**

Append after the `ShadowObjectConstructorFunc` interface:

```typescript
/** The four lifecycle hooks a Shadow Object can implement, by the name of their symbol. */
export type LifecycleHookName = 'onCreate' | 'onDestroy' | 'onParentChanged' | 'onViewEvent';

/**
 * What a creation scope knows about its Shadow Object: the display name and the five name lists
 * the creation API filled while the constructor ran. Read-only; a torn-down scope answers empty
 * lists.
 */
export interface ShadowObjectScopeDescription {
  displayName: string;
  usesProperties: string[];
  usesContexts: (string | symbol)[];
  usesParentContexts: (string | symbol)[];
  providesContexts: (string | symbol)[];
  providesGlobalContexts: (string | symbol)[];
}

/** {@link ShadowObjectScopeDescription} plus what only the Kernel can add: the tokens and the hooks. */
export interface ShadowObjectDescription extends ShadowObjectScopeDescription {
  /** The tokens the constructor is defined under in the Kernel's Registry, in definition order. */
  definedUnder: string[];
  /** Which of the four lifecycle hooks the instance implements. */
  hooks: LifecycleHookName[];
}

/** The three maps of a Registry, with constructors reduced to display names. */
export interface RegistryDescription {
  /** token -> display names of the constructors defined under it, in definition order. */
  tokens: Record<string, string[]>;
  /** token -> tokens it routes to. */
  routes: Record<string, string[]>;
  /** `@prop` and `token@prop` keys -> tokens (property routes). */
  propRoutes: Record<string, string[]>;
}
```

- [ ] **Step 2: Create `src/inspect/types.ts`**

```typescript
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
```

- [ ] **Step 3: Typecheck**

Run: `pnpm -F @spearwolf/shadow-objects typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/shadow-objects/src/inspect/types.ts packages/shadow-objects/src/types.ts
git commit -m "feat: the snapshot model has its types, and the shared description types stand next to the constructor type" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 2: The value serializer

**Files:**
- Create: `packages/shadow-objects/src/inspect/serializeValue.ts`
- Test: `packages/shadow-objects/src/inspect/serializeValue.spec.ts`

**Interfaces:**
- Consumes: `SerializedValue`, `SerializeLimits` from Task 1.
- Produces: `serializeValue(value: unknown, limits?: Partial<SerializeLimits>): SerializedValue`, `SerializeDefaults: SerializeLimits`, `resolveSerializeLimits(limits?: Partial<SerializeLimits>): SerializeLimits`.

- [ ] **Step 1: Write the failing spec**

```typescript
import {createSignal} from '@spearwolf/signalize';
import {describe, expect, it} from 'vitest';
import {SerializeDefaults, serializeValue} from './serializeValue.js';

describe('serializeValue', () => {
  it('passes primitives through and tags what JSON drops', () => {
    expect(serializeValue(null)).toBe(null);
    expect(serializeValue(true)).toBe(true);
    expect(serializeValue(7)).toBe(7);
    expect(serializeValue('x')).toBe('x');
    expect(serializeValue(undefined)).toEqual({$type: 'undefined'});
    expect(serializeValue(10n)).toEqual({$type: 'bigint', value: '10'});
    expect(serializeValue(Symbol('s'))).toEqual({$type: 'symbol', description: 's'});
    expect(serializeValue(Symbol())).toEqual({$type: 'symbol'});
  });

  it('turns the three non-finite numbers into their names', () => {
    expect(serializeValue(NaN)).toBe('NaN');
    expect(serializeValue(Infinity)).toBe('Infinity');
    expect(serializeValue(-Infinity)).toBe('-Infinity');
  });

  it('recurses into plain objects and arrays', () => {
    expect(serializeValue({a: [1, {b: 'c'}], d: undefined})).toEqual({a: [1, {b: 'c'}], d: {$type: 'undefined'}});
    expect(serializeValue(Object.create(null))).toEqual({});
  });

  it('cuts at the depth limit', () => {
    const deep = {l1: {l2: {l3: {l4: 'x'}}}};
    expect(serializeValue(deep, {maxDepth: 2})).toEqual({l1: {l2: {l3: {$type: 'truncated', reason: 'depth'}}}});
  });

  it('cuts arrays, objects and strings at their limits and names the original size', () => {
    expect(serializeValue([1, 2, 3, 4], {maxArrayLength: 2})).toEqual([1, 2, {$type: 'truncated', reason: 'length', original: 4}]);
    expect(serializeValue({a: 1, b: 2, c: 3}, {maxObjectEntries: 2})).toEqual({
      a: 1,
      b: 2,
      $truncated: {$type: 'truncated', reason: 'entries', original: 3},
    });
    expect(serializeValue('abcdef', {maxStringLength: 3})).toEqual({$type: 'truncated', reason: 'string', original: 6, preview: 'abc'});
  });

  it('marks a cycle on the current path and lets a shared object appear twice', () => {
    const shared = {s: 1};
    const cyclic: Record<string, unknown> = {shared, again: shared};
    cyclic['self'] = cyclic;
    expect(serializeValue(cyclic)).toEqual({shared: {s: 1}, again: {s: 1}, self: {$type: 'circular'}});
  });

  it('reads a signal, and a signal reader, to its current value', () => {
    const sig = createSignal({n: 1});
    expect(serializeValue(sig)).toEqual({$type: 'signal', value: {n: 1}});
    expect(serializeValue(sig.get)).toEqual({$type: 'signal', value: {n: 1}});
  });

  it('names a function', () => {
    function named() {}
    expect(serializeValue(named)).toEqual({$type: 'function', name: 'named'});
    expect(serializeValue(() => {})).toEqual({$type: 'function', name: ''});
  });

  it('tags dates, buffers, maps, sets and errors', () => {
    expect(serializeValue(new Date('2026-09-05T00:00:00.000Z'))).toEqual({$type: 'date', iso: '2026-09-05T00:00:00.000Z'});
    expect(serializeValue(new ArrayBuffer(8))).toEqual({$type: 'array-buffer', byteLength: 8, class: 'ArrayBuffer'});
    expect(serializeValue(new Float32Array(4))).toEqual({$type: 'typed-array', byteLength: 16, class: 'Float32Array'});
    expect(serializeValue(new Map([['k', 1]]))).toEqual({$type: 'object', class: 'Map', preview: {size: 1, entries: [['k', 1]]}});
    expect(serializeValue(new Set([1, 2]))).toEqual({$type: 'object', class: 'Set', preview: {size: 2, entries: [1, 2]}});
    expect(serializeValue(new TypeError('boom'))).toEqual({$type: 'object', class: 'TypeError', preview: {name: 'TypeError', message: 'boom'}});
  });

  it('previews a class instance by its own enumerable keys', () => {
    class Vec {
      x = 1;
      y = 2;
      get len() {
        return 3;
      }
    }
    expect(serializeValue(new Vec())).toEqual({$type: 'object', class: 'Vec', preview: {x: 1, y: 2}});
  });

  it('recognises a DOM node by duck typing', () => {
    expect(serializeValue({nodeType: 1, nodeName: 'DIV', id: 'app'})).toEqual({$type: 'dom', nodeName: 'DIV', id: 'app'});
    expect(serializeValue({nodeType: 3, nodeName: '#text'})).toEqual({$type: 'dom', nodeName: '#text'});
  });

  it('survives a getter that throws', () => {
    const hostile = {
      get bad(): number {
        throw new Error('no');
      },
      good: 1,
    };
    expect(serializeValue(hostile)).toEqual({bad: {$type: 'object', class: 'Error', preview: {message: 'no'}}, good: 1});
  });

  it('ships the defaults of the proposal', () => {
    expect(SerializeDefaults).toEqual({maxDepth: 3, maxArrayLength: 20, maxObjectEntries: 30, maxStringLength: 200});
  });

  it('produces JSON-safe output', () => {
    const out = serializeValue({s: createSignal(1), f: () => {}, u: undefined, d: new Date(0)});
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect/serializeValue.spec.ts --run`
Expected: FAIL — cannot resolve `./serializeValue.js`.

- [ ] **Step 3: Write `src/inspect/serializeValue.ts`**

```typescript
import {isSignal, value as readSignal} from '@spearwolf/signalize';
import type {SerializedValue, SerializeLimits} from './types.js';

export const SerializeDefaults: SerializeLimits = Object.freeze({
  maxDepth: 3,
  maxArrayLength: 20,
  maxObjectEntries: 30,
  maxStringLength: 200,
});

export const resolveSerializeLimits = (limits?: Partial<SerializeLimits>): SerializeLimits => ({
  maxDepth: limits?.maxDepth ?? SerializeDefaults.maxDepth,
  maxArrayLength: limits?.maxArrayLength ?? SerializeDefaults.maxArrayLength,
  maxObjectEntries: limits?.maxObjectEntries ?? SerializeDefaults.maxObjectEntries,
  maxStringLength: limits?.maxStringLength ?? SerializeDefaults.maxStringLength,
});

const isDomNode = (val: object): val is {nodeType: number; nodeName: string; id?: unknown} =>
  typeof (val as {nodeType?: unknown}).nodeType === 'number' && typeof (val as {nodeName?: unknown}).nodeName === 'string';

const isPlainObject = (val: object): boolean => {
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
};

const className = (val: object): string => {
  const ctor = (val as {constructor?: unknown}).constructor;
  return typeof ctor === 'function' && ctor.name ? ctor.name : 'Object';
};

const errorEntry = (error: unknown): SerializedValue => ({
  $type: 'object',
  class: 'Error',
  preview: {message: error instanceof Error ? error.message : String(error)},
});

/**
 * Turns any value into plain, JSON-safe data under a set of limits. Never throws: a getter that
 * throws while it is read becomes an error entry in place of the value.
 *
 * The rules and their order are the ones spec §7 lists. Cycles are detected along the current
 * path, so a sub-object shared between two keys appears twice rather than as `$circular`.
 */
export function serializeValue(value: unknown, limits?: Partial<SerializeLimits>): SerializedValue {
  return new Serializer(resolveSerializeLimits(limits)).serialize(value, 0, new Set());
}

class Serializer {
  constructor(private readonly limits: SerializeLimits) {}

  serialize(val: unknown, depth: number, path: Set<object>): SerializedValue {
    switch (typeof val) {
      case 'undefined':
        return {$type: 'undefined'};
      case 'boolean':
        return val;
      case 'number':
        return Number.isFinite(val) ? val : String(val);
      case 'string':
        return this.string(val);
      case 'bigint':
        return {$type: 'bigint', value: val.toString()};
      case 'symbol':
        return val.description === undefined ? {$type: 'symbol'} : {$type: 'symbol', description: val.description};
      case 'function':
        if (isSignal(val)) return this.signal(val, depth, path);
        return {$type: 'function', name: val.name};
      case 'object':
        if (val === null) return null;
        if (isSignal(val)) return this.signal(val, depth, path);
        return this.object(val, depth, path);
    }
  }

  private string(val: string): SerializedValue {
    if (val.length <= this.limits.maxStringLength) return val;
    return {$type: 'truncated', reason: 'string', original: val.length, preview: val.slice(0, this.limits.maxStringLength)};
  }

  private signal(sig: unknown, depth: number, path: Set<object>): SerializedValue {
    let current: unknown;
    try {
      current = readSignal(sig as Parameters<typeof readSignal>[0]);
    } catch (error) {
      return errorEntry(error);
    }
    return {$type: 'signal', value: this.serialize(current, depth, path)};
  }

  private object(val: object, depth: number, path: Set<object>): SerializedValue {
    if (val instanceof Date) return {$type: 'date', iso: Number.isNaN(val.getTime()) ? 'Invalid Date' : val.toISOString()};
    if (val instanceof ArrayBuffer) return {$type: 'array-buffer', byteLength: val.byteLength, class: 'ArrayBuffer'};
    if (ArrayBuffer.isView(val)) return {$type: 'typed-array', byteLength: val.byteLength, class: className(val)};
    if (isDomNode(val)) {
      return typeof val.id === 'string' && val.id ? {$type: 'dom', nodeName: val.nodeName, id: val.id} : {$type: 'dom', nodeName: val.nodeName};
    }
    if (val instanceof Error) return {$type: 'object', class: className(val), preview: {name: val.name, message: val.message}};

    if (depth >= this.limits.maxDepth) return {$type: 'truncated', reason: 'depth'};
    if (path.has(val)) return {$type: 'circular'};

    path.add(val);
    try {
      if (Array.isArray(val)) return this.array(val, depth, path);
      if (val instanceof Map) {
        return {
          $type: 'object',
          class: 'Map',
          preview: {size: val.size, entries: this.array(Array.from(val.entries()), depth, path)},
        };
      }
      if (val instanceof Set) {
        return {$type: 'object', class: 'Set', preview: {size: val.size, entries: this.array(Array.from(val), depth, path)}};
      }
      if (isPlainObject(val)) return this.entries(val, depth, path);
      return {$type: 'object', class: className(val), preview: this.entries(val, depth, path)};
    } finally {
      path.delete(val);
    }
  }

  private array(val: unknown[], depth: number, path: Set<object>): SerializedValue[] {
    const out: SerializedValue[] = [];
    const max = this.limits.maxArrayLength;
    for (let i = 0; i < val.length && i < max; i++) {
      out.push(this.serialize(val[i], depth + 1, path));
    }
    if (val.length > max) out.push({$type: 'truncated', reason: 'length', original: val.length});
    return out;
  }

  private entries(val: object, depth: number, path: Set<object>): Record<string, SerializedValue> {
    const out: Record<string, SerializedValue> = {};
    const keys = Object.keys(val);
    const max = this.limits.maxObjectEntries;
    for (let i = 0; i < keys.length && i < max; i++) {
      const key = keys[i]!;
      let entry: unknown;
      try {
        entry = (val as Record<string, unknown>)[key];
      } catch (error) {
        out[key] = errorEntry(error);
        continue;
      }
      out[key] = this.serialize(entry, depth + 1, path);
    }
    if (keys.length > max) out['$truncated'] = {$type: 'truncated', reason: 'entries', original: keys.length};
    return out;
  }
}
```

Note the depth rule: a container at `depth >= maxDepth` is cut, so `maxDepth: 2` keeps `l1` (depth 0) and `l2` (depth 1) and cuts `l3` (depth 2), which is what the spec's example asserts. Symbols and non-tagged primitives never hit the limit.

- [ ] **Step 4: Run the spec and the lint**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect/serializeValue.spec.ts --run && cd ../.. && pnpm exec biome check packages/shadow-objects/src/inspect`
Expected: all tests PASS, Biome reports no diagnostics. One assertion to verify against the installed signalize rather than assume: `serializeValue(sig.get)` expects a reader function to satisfy `isSignal()`. `ShadowObjectCreationScope.#provideContextSignal()` already relies on that (`isSignal(sourceOrInitialValue)` followed by `link(sourceOrInitialValue as SignalReader)`), so it holds for the pinned version; if it ever stops holding, drop that one `expect` line and keep the rule. If Biome complains about `out['$truncated']` (`useLiteralKeys`), keep the bracket form: `noPropertyAccessFromIndexSignature` in `tsconfig.json` requires it for an index signature, and Biome's rule does not fire on a key that is not a valid identifier.

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/inspect/serializeValue.ts packages/shadow-objects/src/inspect/serializeValue.spec.ts
git commit -m "feat: any value becomes plain data under a limit set, and nothing it does can abort the snapshot" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 3: Entity read accessors

**Files:**
- Modify: `packages/shadow-objects/src/in-the-dark/Entity.ts` (after `hasContext()`)
- Test: `packages/shadow-objects/src/in-the-dark/Entity.spec.ts` (append a `describe` block)

**Interfaces:**
- Produces on `Entity`:
  - `contextNames(): (string | symbol)[]`
  - `describeContext(name: string | symbol): {provided: unknown; inherited: unknown; effective: unknown; hasProviders: boolean} | undefined`
  - `globalContextNames(): (string | symbol)[]`
  - `describeGlobalContext(name: string | symbol): {value: unknown; signal: Signal<unknown>; hasProviders: boolean} | undefined`
- All four read the private maps and create nothing. After `[onDestroy]()` the maps are empty, so the names come back as `[]` and the describers as `undefined`.

- [ ] **Step 1: Write the failing spec**

Append to `Entity.spec.ts`, inside the top-level `describe('Entity', …)`:

```typescript
  describe('inspection accessors', () => {
    // Two collectors sit between a provider's write and a child's `context` signal: the parent's
    // and the child's, one microtask each. Three drains cover both with one to spare.
    const settle = async () => {
      await nextMicrotask();
      await nextMicrotask();
      await nextMicrotask();
    };

    it('contextNames() lists the names the entity holds and creates none', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const e = kernel.getEntity(uuid);

      expect(e.contextNames()).toEqual([]);

      e.provideContext('a');
      e.useContext('b');

      expect(e.contextNames()).toEqual(['a', 'b']);
      expect(e.describeContext('c'), 'asking does not create').toBeUndefined();
      expect(e.contextNames()).toEqual(['a', 'b']);

      kernel.destroy();
    });

    it('describeContext() reads provided, inherited and effective off the three signals', async () => {
      const kernel = makeKernel();
      const [parentUuid, childUuid] = [generateUUID(), generateUUID()];
      kernel.createEntity(parentUuid, 'parent');
      kernel.createEntity(childUuid, 'child', parentUuid);
      const parent = kernel.getEntity(parentUuid);
      const child = kernel.getEntity(childUuid);

      const release = parent.attachContextProvider('ctx', createSignal('p'));
      child.useContext('ctx');
      await settle();

      expect(parent.describeContext('ctx')).toEqual({provided: 'p', inherited: undefined, effective: 'p', hasProviders: true});
      expect(child.describeContext('ctx')).toEqual({provided: undefined, inherited: 'p', effective: 'p', hasProviders: false});

      release();
      await settle();

      expect(parent.describeContext('ctx')?.hasProviders).toBe(false);

      kernel.destroy();
    });

    it('describeGlobalContext() reads the contribution of this entity and hands out its signal', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const e = kernel.getEntity(uuid);

      expect(e.globalContextNames()).toEqual([]);

      const sig = e.provideGlobalContext('g');
      sig.set(1);

      expect(e.globalContextNames()).toEqual(['g']);
      expect(e.describeGlobalContext('g')).toEqual({value: 1, signal: sig, hasProviders: false});
      expect(e.describeGlobalContext('h')).toBeUndefined();

      const release = e.attachGlobalContextProvider('g', createSignal(2));
      expect(e.describeGlobalContext('g')).toMatchObject({value: 2, hasProviders: true});
      release();

      kernel.destroy();
    });

    it('answers empty lists once the entity is released', () => {
      const kernel = makeKernel();
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const e = kernel.getEntity(uuid);
      e.useContext('a');
      e.provideGlobalContext('g');

      kernel.destroyEntity(uuid);

      expect(e.contextNames()).toEqual([]);
      expect(e.globalContextNames()).toEqual([]);
      expect(e.describeContext('a')).toBeUndefined();
      expect(e.describeGlobalContext('g')).toBeUndefined();

      kernel.destroy();
    });
  });
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark/Entity.spec.ts --run -t "inspection accessors"`
Expected: FAIL — `e.contextNames is not a function`.

- [ ] **Step 3: Add the accessors to `Entity.ts`**

Insert after `hasContext()`:

```typescript
  /** The names of the Entity Contexts this entity holds, used or provided. Reads only, creates none. */
  contextNames(): ContextNameType[] {
    return Array.from(this.#context.keys());
  }

  /**
   * The three values behind one Entity Context of this entity: what its own providers wrote, what it
   * inherits from the parent (or from the global chain at a root), and what `useContext(name)` reads.
   * `hasProviders` says whether a provider feed is attached -- a value written straight into the
   * signal from `provideContext()` counts as provided but not as a provider.
   *
   * `undefined` when the entity holds no context of that name; asking does not create one. The
   * reads are plain `.value` reads and track nothing, so a call from inside an effect does not
   * subscribe that effect to the context.
   */
  describeContext(name: ContextNameType): {provided: unknown; inherited: unknown; effective: unknown; hasProviders: boolean} | undefined {
    const ctx = this.#context.get(name);
    if (ctx === undefined) return undefined;
    return {
      provided: ctx.provide.value,
      inherited: ctx.inherited.value,
      effective: ctx.context.value,
      hasProviders: ctx.providerFeeds.size > 0,
    };
  }

  /** The names of the global Entity Contexts this entity contributes to. Reads only, creates none. */
  globalContextNames(): ContextNameType[] {
    return Array.from(this.#rootContexts.keys());
  }

  /**
   * What this entity contributes to the kernel-wide chain of one global Entity Context: the value
   * and the very signal that stands in the chain, so a caller holding the chain can find this entity
   * in it by identity. `undefined` when the entity contributes nothing under that name.
   */
  describeGlobalContext(name: ContextNameType): {value: unknown; signal: Signal<unknown>; hasProviders: boolean} | undefined {
    const rootCtx = this.#rootContexts.get(name);
    if (rootCtx === undefined) return undefined;
    return {value: rootCtx.signal.value, signal: rootCtx.signal, hasProviders: rootCtx.providerFeeds.size > 0};
  }
```

- [ ] **Step 4: Run the spec, then the whole Entity and Kernel suites**

Run: `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark --run`
Expected: PASS. If the `describeContext` assertion on `effective` reads `undefined`, add one more `await nextMicrotask()` to `settle()` — the number of collector hops is the only timing in this test.

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/in-the-dark/Entity.ts packages/shadow-objects/src/in-the-dark/Entity.spec.ts
git commit -m "feat: the entity answers which contexts it holds and what each of them reads, without creating any" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 4: `SignalsPath.signals`, and the Kernel's root-context and token accessors

**Files:**
- Modify: `packages/shadow-objects/src/in-the-dark/SignalsPath.ts` (after the `value$` field)
- Modify: `packages/shadow-objects/src/in-the-dark/Kernel.ts` (after `findOrCreateRootContext()`, and after `hasEntity()`)
- Test: `packages/shadow-objects/src/in-the-dark/SignalsPath.spec.ts` (append), new `packages/shadow-objects/src/in-the-dark/Kernel.inspection.spec.ts`

**Interfaces:**
- Produces:
  - `SignalsPath.signals: readonly SignalLike<any>[]` (getter, a copy of the member list in chain order)
  - `Kernel.rootContextNames(): (string | symbol)[]`
  - `Kernel.describeRootContext(name: string | symbol): {value: unknown; signals: readonly SignalLike<any>[]} | undefined`
  - `Kernel.tokenOf(uuid: string): string | undefined`

- [ ] **Step 1: Write the failing specs**

Append to `SignalsPath.spec.ts` inside `describe('SignalsPath', …)`:

```typescript
  it('hands out its members in chain order, as a copy', () => {
    const path = new SignalsPath();
    const a = createSignal();
    const b = createSignal();

    expect(path.signals).toEqual([]);

    path.add(a);
    path.unshift(b);
    expect(path.signals).toEqual([b, a]);

    path.remove(b);
    expect(path.signals).toEqual([a]);

    (path.signals as unknown[]).push(b);
    expect(path.signals, 'the list handed out is not the list kept').toEqual([a]);

    path.dispose();
  });
```

Create `Kernel.inspection.spec.ts`:

```typescript
import {afterEach, describe, expect, it} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {onCreate, onViewEvent} from './events.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

describe('Kernel inspection accessors', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('tokenOf', () => {
    it('answers the token of an entity the kernel holds, and undefined otherwise', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');

      expect(kernel.tokenOf(uuid)).toBe('node');
      expect(kernel.tokenOf('nope')).toBeUndefined();

      kernel.changeToken(uuid, 'other');
      expect(kernel.tokenOf(uuid)).toBe('other');

      kernel.destroy();
    });
  });

  describe('root contexts', () => {
    it('names the global chains it holds and describes one by value and members', () => {
      const kernel = new Kernel(new Registry());
      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');
      const e = kernel.getEntity(uuid);

      expect(kernel.rootContextNames()).toEqual([]);
      expect(kernel.describeRootContext('g')).toBeUndefined();

      const sig = e.provideGlobalContext('g');
      sig.set('v');

      expect(kernel.rootContextNames()).toEqual(['g']);
      expect(kernel.describeRootContext('g')).toEqual({value: 'v', signals: [sig]});

      kernel.destroy();
      expect(kernel.rootContextNames()).toEqual([]);
    });
  });

  describe('describeShadowObjects', () => {
    it('describes every shadow object of an entity with its tokens and hooks', () => {
      const registry = new Registry();
      const kernel = new Kernel(registry);

      @ShadowObject({registry, token: 'foo'})
      class Foo {
        constructor({useProperty, provideContext}: ShadowObjectCreationAPI) {
          useProperty('speed');
          provideContext('theme', 'dark');
        }
        [onCreate]() {}
        [onViewEvent]() {}
      }
      expect(Foo).toBeDefined();

      registry.appendRoute('node', ['foo']);

      const uuid = generateUUID();
      kernel.createEntity(uuid, 'node');

      expect(kernel.describeShadowObjects(uuid)).toEqual([
        {
          displayName: 'Foo',
          definedUnder: ['foo'],
          usesProperties: ['speed'],
          usesContexts: [],
          usesParentContexts: [],
          providesContexts: ['theme'],
          providesGlobalContexts: [],
          hooks: ['onCreate', 'onViewEvent'],
        },
      ]);
      expect(kernel.describeShadowObjects('nope')).toEqual([]);

      kernel.destroy();
    });
  });
});
```

The `describeShadowObjects` case fails until Task 5; run this file with `-t "tokenOf|root contexts"` until then.

- [ ] **Step 2: Run the specs to see them fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark/SignalsPath.spec.ts src/in-the-dark/Kernel.inspection.spec.ts --run -t "hands out|tokenOf|root contexts"`
Expected: FAIL — `path.signals` is `undefined`, `kernel.tokenOf is not a function`.

- [ ] **Step 3: Add `signals` to `SignalsPath.ts`**

After `readonly value$: Signal<any>;`:

```typescript
  /** The members of the path in chain order -- the first one holding a value is the one `value` reads. A copy. */
  get signals(): readonly SignalLike<any>[] {
    return this.#signals.slice();
  }
```

- [ ] **Step 4: Add the three accessors to `Kernel.ts`**

Add `import type {SignalLike} from '@spearwolf/signalize';` to the signalize import (`import {batch, type SignalLike} from '@spearwolf/signalize';`).

After `hasEntity()`:

```typescript
  /** The token of the entity behind `uuid`, or `undefined` when the kernel does not hold one. */
  tokenOf(uuid: string): string | undefined {
    return this.#entities.get(uuid)?.token;
  }
```

After `findOrCreateRootContext()`:

```typescript
  /** The names of the kernel-wide context chains -- every name a root entity uses or any entity provides globally. */
  rootContextNames(): (string | symbol)[] {
    return Array.from(this.#rootContexts.keys());
  }

  /**
   * One kernel-wide context chain: what it resolves to, and its members in chain order. The members
   * are the signals the entities contributed -- `Entity.describeGlobalContext()` hands out the same
   * objects, so a caller can match them by identity. `undefined` for a name the kernel holds no
   * chain for; asking does not create one.
   */
  describeRootContext(name: string | symbol): {value: unknown; signals: readonly SignalLike<any>[]} | undefined {
    const path = this.#rootContexts.get(name);
    if (path === undefined) return undefined;
    return {value: path.value, signals: path.signals};
  }
```

- [ ] **Step 5: Run the specs and typecheck**

Run: `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark/SignalsPath.spec.ts src/in-the-dark/Kernel.inspection.spec.ts --run -t "hands out|tokenOf|root contexts" && pnpm typecheck`
Expected: PASS, typecheck exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/in-the-dark/SignalsPath.ts packages/shadow-objects/src/in-the-dark/SignalsPath.spec.ts packages/shadow-objects/src/in-the-dark/Kernel.ts packages/shadow-objects/src/in-the-dark/Kernel.inspection.spec.ts
git commit -m "feat: the kernel names its global context chains and the token of an entity, and a signals path shows its members" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 5: Scope, Kernel and Registry descriptions

**Files:**
- Create: `packages/shadow-objects/src/in-the-dark/displayName.ts`
- Modify: `packages/shadow-objects/src/in-the-dark/Kernel.ts` (remove the local `getDisplayName`, import it; add `describeShadowObjects()` after `findShadowObjects()`)
- Modify: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts` (after `debugCleanupCounts`)
- Modify: `packages/shadow-objects/src/in-the-dark/Registry.ts` (after `hasRoute()`)
- Test: `packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts` (append), `Registry.spec.ts` (append), `Kernel.inspection.spec.ts` (from Task 4)

**Interfaces:**
- Consumes: `ShadowObjectScopeDescription`, `ShadowObjectDescription`, `LifecycleHookName`, `RegistryDescription` from `../types.js` (Task 1).
- Produces:
  - `getDisplayName(construct: ShadowObjectConstructor): string`
  - `ShadowObjectCreationScope.describe(): ShadowObjectScopeDescription`
  - `Kernel.describeShadowObjects(uuid: string): ShadowObjectDescription[]`
  - `Registry.describe(): RegistryDescription`, `Registry.tokensOf(construct: ShadowObjectConstructor): string[]`, `static Registry.isDefault(registry: Registry): boolean`

- [ ] **Step 1: Write the failing specs**

Append to `ShadowObjectCreationScope.spec.ts` inside its top-level `describe`:

```typescript
  describe('describe()', () => {
    it('lists the names the creation API was asked for, and empties them after the teardown', () => {
      const {kernel, scope} = boundScope();
      const api = scope.createAPI();
      const sym = Symbol('global');

      api.useProperty('x');
      api.useProperty('x');
      api.useContext('c');
      api.useParentContext('pc');
      api.provideContext('p');
      api.provideGlobalContext(sym);

      expect(scope.describe()).toEqual({
        displayName: 'TestScope',
        usesProperties: ['x'],
        usesContexts: ['c'],
        usesParentContexts: ['pc'],
        providesContexts: ['p'],
        providesGlobalContexts: [sym],
      });

      scope.tearDown();

      expect(scope.describe(), 'a torn-down scope answers, with nothing in it').toEqual({
        displayName: 'TestScope',
        usesProperties: [],
        usesContexts: [],
        usesParentContexts: [],
        providesContexts: [],
        providesGlobalContexts: [],
      });

      kernel.destroy();
    });
  });
```

Append to `Registry.spec.ts` inside `describe('Registry', …)`:

```typescript
  describe('description', () => {
    class A {}
    class B {
      static displayName = 'Bee';
    }

    it('reduces the three maps to names, in definition order', () => {
      const registry = new Registry();
      registry.define('t', A);
      registry.define('t', B);
      registry.define('u', A);
      registry.appendRoute('t', ['u', 'v']);
      registry.appendRoute('@x', ['u']);
      registry.appendRoute('t@y', ['v']);

      expect(registry.describe()).toEqual({
        tokens: {t: ['A', 'Bee'], u: ['A']},
        routes: {t: ['u', 'v']},
        propRoutes: {x: ['u'], 't@y': ['v']},
      });
    });

    it('finds the tokens a constructor is defined under', () => {
      const registry = new Registry();
      registry.define('t', A);
      registry.define('u', A);
      registry.define('u', B);

      expect(registry.tokensOf(A)).toEqual(['t', 'u']);
      expect(registry.tokensOf(B)).toEqual(['u']);
      expect(registry.tokensOf(class C {})).toEqual([]);
    });

    it('tells the default registry from every other one', () => {
      expect(Registry.isDefault(Registry.get())).toBe(true);
      expect(Registry.isDefault(new Registry())).toBe(false);
    });
  });
```

- [ ] **Step 2: Run the specs to see them fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/in-the-dark/ShadowObjectCreationScope.spec.ts src/in-the-dark/Registry.spec.ts src/in-the-dark/Kernel.inspection.spec.ts --run`
Expected: FAIL on `describe`, `tokensOf`, `isDefault`, `describeShadowObjects` — "is not a function".

- [ ] **Step 3: Create `displayName.ts` and use it in `Kernel.ts`**

`src/in-the-dark/displayName.ts`:

```typescript
import type {ShadowObjectConstructor} from '../types.js';

/** The name the Kernel reports a Shadow Object under: the constructor's `displayName`, or its `name`. */
export const getDisplayName = (construct: ShadowObjectConstructor): string => construct.displayName || construct.name;
```

In `Kernel.ts`: delete the line `const getDisplayName = (construct: ShadowObjectConstructor) => construct.displayName || construct.name;` and add `import {getDisplayName} from './displayName.js';` next to the other `./` imports. Add `LifecycleHookName` and `ShadowObjectDescription` to the `import type {...} from '../types.js'` list.

- [ ] **Step 4: Add `describe()` to `ShadowObjectCreationScope.ts`**

Add `ShadowObjectScopeDescription` to the `import type {...} from '../types.js'` list. After `debugCleanupCounts`:

```typescript
  /**
   * The names this scope handed readers and providers out for, by kind, plus the display name. Read
   * off the private maps and nothing else: no reader is created, no late call is reported, and a
   * scope past its teardown answers empty lists rather than a throw -- `tearDown()` clears the maps
   * it reads.
   */
  describe(): ShadowObjectScopeDescription {
    return {
      displayName: this.#displayName,
      usesProperties: Array.from(this.#propertyReaders.keys()),
      usesContexts: Array.from(this.#contextReaders.keys()),
      usesParentContexts: Array.from(this.#contextParentReaders.keys()),
      providesContexts: Array.from(this.#contextProviders.keys()),
      providesGlobalContexts: Array.from(this.#contextRootProviders.keys()),
    };
  }
```

- [ ] **Step 5: Add `describeShadowObjects()` to `Kernel.ts`**

After `findShadowObjects()`:

```typescript
  /**
   * One description per Shadow Object of the entity, in the order `findShadowObjects()` lists them:
   * what the creation scope knows (display name, the five name lists), the tokens the constructor is
   * defined under in this kernel's registry, and which of the four lifecycle hooks the instance
   * implements. `[]` for a uuid the kernel does not hold. Reads only; a scope that is already gone
   * contributes its display name and empty lists.
   */
  describeShadowObjects(uuid: string): ShadowObjectDescription[] {
    const entry = this.#entities.get(uuid);
    if (entry === undefined) return [];

    const seen = new Set<object>();
    const descriptions: ShadowObjectDescription[] = [];

    for (const [construct, shadowObjects] of entry.usedConstructors) {
      for (const shadowObject of shadowObjects) {
        if (seen.has(shadowObject)) continue;
        seen.add(shadowObject);

        const scope = this.#shadowObjectScopes.get(shadowObject);
        const hooks = LIFECYCLE_HOOKS.filter(([, symbol]) => typeof (shadowObject as any)[symbol] === 'function').map(
          ([name]) => name as LifecycleHookName,
        );

        descriptions.push({
          ...(scope?.describe() ?? {
            displayName: getDisplayName(construct),
            usesProperties: [],
            usesContexts: [],
            usesParentContexts: [],
            providesContexts: [],
            providesGlobalContexts: [],
          }),
          definedUnder: this.registry.tokensOf(construct),
          hooks,
        });
      }
    }

    return descriptions;
  }
```

- [ ] **Step 6: Add the three accessors to `Registry.ts`**

Add `import type {RegistryDescription, ShadowObjectConstructor} from '../types.js';` (replacing the existing type import) and `import {getDisplayName} from './displayName.js';`. After `hasRoute()`:

```typescript
  /** The three maps with constructors reduced to display names. Copies, in definition order. */
  describe(): RegistryDescription {
    const tokens: Record<string, string[]> = {};
    for (const [token, constructors] of this.#registry) {
      tokens[token] = constructors.map(getDisplayName);
    }
    const routes: Record<string, string[]> = {};
    for (const [token, targets] of this.#routes) {
      routes[token] = Array.from(targets);
    }
    const propRoutes: Record<string, string[]> = {};
    for (const [key, targets] of this.#truthyPropRoutes) {
      propRoutes[key] = Array.from(targets);
    }
    return {tokens, routes, propRoutes};
  }

  /** The tokens `construct` is defined under, in definition order. `[]` for a constructor this registry does not hold. */
  tokensOf(construct: ShadowObjectConstructor): string[] {
    const tokens: string[] = [];
    for (const [token, constructors] of this.#registry) {
      if (constructors.includes(construct)) tokens.push(token);
    }
    return tokens;
  }

  /** Whether `registry` is the default registry every environment of this thread shares. */
  static isDefault(registry: Registry): boolean {
    return registry === defaultRegistry;
  }
```

`defaultRegistry` is declared below the class; the static method reads it at call time, after the module has finished evaluating, so the reference is fine. Also replace the `#usesDefaultRegistry` computation in `LocalShadowObjectEnv.ts` with `Registry.isDefault(this.kernel.registry)` so the two checks stay one.

- [ ] **Step 7: Run the specs, the whole package suite and the lint**

Run: `cd packages/shadow-objects && pnpm exec vitest --run && pnpm typecheck && cd ../.. && pnpm lint:ci`
Expected: all PASS, exit 0. (`distContract.spec.ts` needs a `dist/`; if it complains, run `pnpm -F @spearwolf/shadow-objects build` once and rerun — no dist file changes yet in this task.)

- [ ] **Step 8: Commit**

```bash
git add packages/shadow-objects/src/in-the-dark/displayName.ts packages/shadow-objects/src/in-the-dark/Kernel.ts packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.ts packages/shadow-objects/src/in-the-dark/ShadowObjectCreationScope.spec.ts packages/shadow-objects/src/in-the-dark/Registry.ts packages/shadow-objects/src/in-the-dark/Registry.spec.ts packages/shadow-objects/src/in-the-dark/Kernel.inspection.spec.ts packages/shadow-objects/src/view/LocalShadowObjectEnv.ts
git commit -m "feat: a creation scope, a kernel and a registry each describe what they hold, in names rather than objects" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 6: The Kernel snapshot builder

**Files:**
- Create: `packages/shadow-objects/src/inspect/normalizeInspectRequest.ts`
- Create: `packages/shadow-objects/src/inspect/createKernelSnapshot.ts`
- Test: `packages/shadow-objects/src/inspect/createKernelSnapshot.spec.ts`

**Interfaces:**
- Consumes: Task 1 types; `serializeValue`, `resolveSerializeLimits` (Task 2); `Entity.contextNames/describeContext/globalContextNames/describeGlobalContext` (Task 3); `Kernel.tokenOf/rootContextNames/describeRootContext` (Task 4); `Kernel.describeShadowObjects`, `Registry.describe/isDefault` (Task 5).
- Produces:
  - `normalizeInspectRequest(request?: InspectRequest): NormalizedInspectRequest` where `NormalizedInspectRequest = {include: Set<InspectInclude>; rootUuids: string[] | undefined; maxDepth: number; maxNodes: number; limits: SerializeLimits}`
  - `InspectDefaults = {maxDepth: 4, maxDepthCap: 64, maxNodes: 250}`
  - `class NodeBudget { constructor(max: number); take(): boolean; }`
  - `createKernelSnapshot(kernel: Kernel, request?: InspectRequest): KernelSnapshot`
  - `toContextName(name: string | symbol): ContextName`, `routesOnValue(value: unknown): boolean`

- [ ] **Step 1: Write the failing spec**

```typescript
import {describe, expect, it} from 'vitest';
import {Kernel} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import {ShadowObject} from '../in-the-dark/ShadowObject.js';
import {onCreate} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {createKernelSnapshot} from './createKernelSnapshot.js';
import type {EntityNodeSnapshot} from './types.js';

const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));
const settle = async () => {
  await nextMicrotask();
  await nextMicrotask();
  await nextMicrotask();
};

/**
 * root (provider)                   provides 'theme' = 'dark', global 'clock' = 42
 * └─ child (consumer, speed=3)      uses 'theme', useParentContext 'theme', useProperty 'speed'
 *    └─ grandchild (consumer)
 * lonely (lonely)                   uses 'clock' (global) and 'missing' (nobody)
 */
const makeScene = async () => {
  const registry = new Registry();
  const kernel = new Kernel(registry);

  @ShadowObject({registry, token: 'provider'})
  class Provider {
    constructor({provideContext, provideGlobalContext}: ShadowObjectCreationAPI) {
      provideContext('theme', 'dark');
      provideGlobalContext('clock', 42);
    }
    [onCreate]() {}
  }

  @ShadowObject({registry, token: 'consumer'})
  class Consumer {
    constructor({useContext, useParentContext, useProperty}: ShadowObjectCreationAPI) {
      useContext('theme');
      useParentContext('theme');
      useProperty('speed');
    }
  }

  @ShadowObject({registry, token: 'lonely'})
  class Lonely {
    constructor({useContext}: ShadowObjectCreationAPI) {
      useContext('clock');
      useContext('missing');
    }
  }

  expect(Provider && Consumer && Lonely).toBeTruthy();

  const uuids = {root: generateUUID(), child: generateUUID(), grandchild: generateUUID(), lonely: generateUUID()};

  kernel.createEntity(uuids.root, 'provider');
  kernel.createEntity(uuids.child, 'consumer', uuids.root, 0, [['speed', 3], ['flag', false], ['bare']]);
  kernel.createEntity(uuids.grandchild, 'consumer', uuids.child, 5, undefined, true);
  kernel.createEntity(uuids.lonely, 'lonely');

  await settle();

  return {kernel, uuids};
};

const shape = (node: EntityNodeSnapshot): unknown => ({
  uuid: node.uuid,
  token: node.token,
  children: node.children?.map(shape) ?? [],
  ...(node.omittedChildren ? {omittedChildren: node.omittedChildren} : {}),
});

describe('createKernelSnapshot', () => {
  it('walks the same tree as getEntityGraph()', async () => {
    const {kernel, uuids} = await makeScene();
    // a back-edge, so the omission path is exercised
    kernel.getEntity(uuids.grandchild).addChild(kernel.getEntity(uuids.child));

    const snapshot = createKernelSnapshot(kernel, {maxDepth: 64, maxNodes: 1000});
    const graph = kernel.getEntityGraph();

    const graphShape = (node: (typeof graph)[number]): unknown => ({
      uuid: node.entity.uuid,
      token: node.token,
      children: node.children.map(graphShape),
      ...(node.omittedChildren ? {omittedChildren: node.omittedChildren} : {}),
    });

    expect(snapshot.roots.map(shape)).toEqual(graph.map(graphShape));
    expect(snapshot.truncation).toBeUndefined();

    kernel.destroy();
  });

  it('reports the node fields, the props and their routing flag', async () => {
    const {kernel, uuids} = await makeScene();
    const [root] = createKernelSnapshot(kernel).roots;
    const child = root!.children![0]!;

    expect(root).toMatchObject({uuid: uuids.root, token: 'provider', order: 0, autoDestructionOnParentRemoval: false, childCount: 1});
    expect(root!.parentUuid).toBeUndefined();
    expect(child).toMatchObject({parentUuid: uuids.root, order: 0, childCount: 1});
    expect(child.children![0]).toMatchObject({order: 5, autoDestructionOnParentRemoval: true, childCount: 0, children: []});
    expect(child.props).toEqual([
      {name: 'speed', value: 3, routes: true},
      {name: 'flag', value: false, routes: false},
      {name: 'bare', value: {$type: 'undefined'}, routes: false},
    ]);

    kernel.destroy();
  });

  it('describes the shadow objects of a node', async () => {
    const {kernel} = await makeScene();
    const [root] = createKernelSnapshot(kernel).roots;

    expect(root!.shadowObjects).toEqual([
      {
        displayName: 'Provider',
        definedUnder: ['provider'],
        usesProperties: [],
        usesContexts: [],
        usesParentContexts: [],
        providesContexts: ['theme'],
        providesGlobalContexts: ['clock'],
        hooks: ['onCreate'],
      },
    ]);
    expect(root!.children![0]!.shadowObjects![0]).toMatchObject({
      displayName: 'Consumer',
      usesProperties: ['speed'],
      usesContexts: ['theme'],
      usesParentContexts: ['theme'],
      hooks: [],
    });

    kernel.destroy();
  });

  it('describes the entity contexts with their source', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel);
    const [root, lonely] = snapshot.roots;
    const child = root!.children![0]!;
    const grandchild = child.children![0]!;

    expect(root!.contexts).toEqual([
      {name: 'theme', provided: 'dark', effective: 'dark', providedBy: ['Provider'], source: {kind: 'self'}},
    ]);
    expect(child.contexts).toEqual([
      {name: 'theme', inherited: 'dark', effective: 'dark', providedBy: [], source: {kind: 'ancestor', uuid: uuids.root}},
    ]);
    expect(grandchild.contexts![0]).toMatchObject({source: {kind: 'ancestor', uuid: uuids.root}});

    const byName = Object.fromEntries(lonely!.contexts!.map((c) => [String(c.name), c]));
    expect(byName['clock']).toEqual({name: 'clock', inherited: 42, effective: 42, providedBy: [], source: {kind: 'global'}});
    expect(byName['missing']).toEqual({name: 'missing', effective: {$type: 'undefined'}, providedBy: [], source: {kind: 'none'}});

    kernel.destroy();
  });

  it('lists the global contexts with their providers in chain order', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel);

    expect(snapshot.globalContexts).toEqual([
      {name: 'clock', value: 42, providers: [{uuid: uuids.root, providedBy: ['Provider'], value: 42}]},
    ]);

    kernel.destroy();
  });

  it('renders a symbol context name as its description', async () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);
    const uuid = generateUUID();
    kernel.createEntity(uuid, 'node');
    kernel.getEntity(uuid).provideContext(Symbol('sym')).set(1);
    await settle();

    expect(createKernelSnapshot(kernel).roots[0]!.contexts![0]!.name).toEqual({symbol: 'sym'});

    kernel.destroy();
  });

  it('describes the registry', async () => {
    const {kernel} = await makeScene();
    const {registry} = createKernelSnapshot(kernel);

    expect(registry).toEqual({
      tokens: {provider: ['Provider'], consumer: ['Consumer'], lonely: ['Lonely']},
      routes: {},
      propRoutes: {},
      isDefault: false,
    });
    expect(createKernelSnapshot(new Kernel()).registry?.isDefault).toBe(true);

    kernel.destroy();
  });

  it('counts, and stamps the realm', async () => {
    const {kernel} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {maxDepth: 0});

    expect(snapshot.counts).toEqual({entities: 4, roots: 2, shadowObjects: 4});
    expect(snapshot.thread).toBe('main');
    expect(typeof snapshot.takenAt).toBe('number');

    kernel.destroy();
  });

  it('cuts at maxDepth and says where', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {maxDepth: 1});
    const child = snapshot.roots[0]!.children![0]!;

    expect(child.children).toBeUndefined();
    expect(child.childCount).toBe(1);
    expect(snapshot.truncation).toEqual([{reason: 'max-depth', uuid: uuids.child, message: expect.stringContaining(uuids.child)}]);

    kernel.destroy();
  });

  it('cuts at maxNodes and says where', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {maxNodes: 2});

    expect(snapshot.roots).toHaveLength(1);
    expect(snapshot.roots[0]!.children).toHaveLength(1);
    expect(snapshot.roots[0]!.children![0]!.children).toEqual([]);
    expect(snapshot.truncation).toEqual([{reason: 'max-nodes', uuid: uuids.child, message: expect.stringContaining('maxNodes')}]);

    kernel.destroy();
  });

  it('descends from the given roots and names the ones it cannot find', async () => {
    const {kernel, uuids} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {rootUuids: [uuids.child, 'nope']});

    expect(snapshot.roots.map((n) => n.uuid)).toEqual([uuids.child]);
    expect(snapshot.roots[0]!.parentUuid).toBe(uuids.root);
    expect(snapshot.truncation).toEqual([{reason: 'unknown-root', uuid: 'nope', message: expect.stringContaining('nope')}]);

    kernel.destroy();
  });

  it('includes only what was asked for', async () => {
    const {kernel} = await makeScene();
    const snapshot = createKernelSnapshot(kernel, {include: ['props']});
    const [root] = snapshot.roots;

    expect(root!.props).toBeDefined();
    expect(root!.shadowObjects).toBeUndefined();
    expect(root!.contexts).toBeUndefined();
    expect(snapshot.registry).toBeUndefined();

    kernel.destroy();
  });

  it('reads a non-finite maxDepth as the cap', async () => {
    const {kernel} = await makeScene();
    expect(createKernelSnapshot(kernel, {maxDepth: Infinity}).roots[0]!.children![0]!.children).toHaveLength(1);
    kernel.destroy();
  });

  it('survives a JSON round trip unchanged', async () => {
    const {kernel} = await makeScene();
    const snapshot = createKernelSnapshot(kernel);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    kernel.destroy();
  });
});
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect/createKernelSnapshot.spec.ts --run`
Expected: FAIL — cannot resolve `./createKernelSnapshot.js`.

- [ ] **Step 3: Write `normalizeInspectRequest.ts`**

```typescript
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
```

- [ ] **Step 4: Write `createKernelSnapshot.ts`**

```typescript
import {beQuiet, type SignalLike} from '@spearwolf/signalize';
import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import type {ShadowObjectDescription} from '../types.js';
import {NodeBudget, type NormalizedInspectRequest, normalizeInspectRequest} from './normalizeInspectRequest.js';
import {serializeValue} from './serializeValue.js';
import type {
  ContextName,
  EntityContextSnapshot,
  EntityContextSource,
  EntityNodeSnapshot,
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
    const roots = this.#roots(all);

    const nodes: EntityNodeSnapshot[] = [];
    for (const root of roots) {
      if (!this.#budget.take()) {
        this.#noteBudget(root.parentUuid);
        break;
      }
      nodes.push(this.#node(root, 0));
    }

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

    return snapshot;
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
```

- [ ] **Step 5: Run the spec, typecheck and lint**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect --run && pnpm typecheck && cd ../.. && pnpm exec biome check packages/shadow-objects/src/inspect`
Expected: PASS. Two spots to watch: the `maxNodes: 2` case expects the note at `child` (the second node taken is `child`; the budget runs out at its first child, and the root list stops with a note as well only if a second root is attempted — it is, so `#noteBudget` guards against a second note by the flag). The `counts.shadowObjects` of 4 is Provider + Consumer + Consumer + Lonely.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/inspect/normalizeInspectRequest.ts packages/shadow-objects/src/inspect/createKernelSnapshot.ts packages/shadow-objects/src/inspect/createKernelSnapshot.spec.ts
git commit -m "feat: a kernel snapshot walks the entity tree under a budget and carries props, shadow objects and contexts as plain data" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 7: The View snapshot builder

**Files:**
- Create: `packages/shadow-objects/src/inspect/createViewSnapshot.ts`
- Test: `packages/shadow-objects/src/inspect/createViewSnapshot.spec.ts`

**Interfaces:**
- Consumes: `ComponentContext.traverseLevelOrderBFS()`, `getChildren(component)`, `getComponentState(uuid)`; `ViewComponent.uuid/token/order/parent`; `normalizeInspectRequest`, `NodeBudget` (Task 6); `routesOnValue` (Task 6); `serializeValue` (Task 2); `SHAE_ENT` from `../elements/constants.js`.
- Produces: `createViewSnapshot(context: ComponentContext, request?: InspectRequest): ViewSnapshot`.

- [ ] **Step 1: Write the failing spec**

```typescript
import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {createViewSnapshot} from './createViewSnapshot.js';

describe('createViewSnapshot', () => {
  afterEach(() => {
    ComponentContext.get().clear();
    document.body.innerHTML = '';
  });

  const makeScene = () => {
    const ctx = ComponentContext.get();
    const a = new ViewComponent('a', {context: ctx, order: 2});
    const b = new ViewComponent('b', {parent: a, context: ctx, autoDestructionOnParentRemoval: true});
    const c = new ViewComponent('c', {context: ctx, order: 1});
    a.setProperty('x', 1);
    a.setProperty('flag', false);
    a.setPropertyWithoutValue('bare');
    return {ctx, a, b, c};
  };

  it('walks the components from the roots and reads props from the memory', () => {
    const {ctx, a, b, c} = makeScene();

    const before = createViewSnapshot(ctx);
    expect(before.roots.map((n) => n.uuid), 'root order follows the ordered root list').toEqual([c.uuid, a.uuid]);
    expect(before.roots[1]!.props, 'nothing committed yet').toBeUndefined();

    ctx.buildChangeTrails();
    const snapshot = createViewSnapshot(ctx);

    expect(snapshot.counts).toEqual({components: 3, roots: 2});
    expect(snapshot.roots[1]).toMatchObject({uuid: a.uuid, token: 'a', order: 2, childCount: 1});
    expect(snapshot.roots[1]!.props).toEqual([
      {name: 'x', value: 1, routes: true},
      {name: 'flag', value: false, routes: false},
      {name: 'bare', value: {$type: 'undefined'}, routes: false},
    ]);
    expect(snapshot.roots[1]!.children![0]).toMatchObject({uuid: b.uuid, token: 'b', parentUuid: a.uuid, childCount: 0, children: []});
    expect(snapshot.roots[1]!.children![0]!.element).toBeUndefined();
    expect(snapshot.truncation).toBeUndefined();
  });

  it('cuts at maxDepth and maxNodes', () => {
    const {ctx, a, c} = makeScene();

    const shallow = createViewSnapshot(ctx, {maxDepth: 0});
    expect(shallow.roots[1]!.children).toBeUndefined();
    expect(shallow.truncation).toEqual([{reason: 'max-depth', uuid: a.uuid, message: expect.any(String)}]);

    const small = createViewSnapshot(ctx, {maxNodes: 1});
    expect(small.roots.map((n) => n.uuid)).toEqual([c.uuid]);
    expect(small.truncation).toEqual([{reason: 'max-nodes', message: expect.any(String)}]);
  });

  it('descends from the given roots', () => {
    const {ctx, a, b} = makeScene();
    const snapshot = createViewSnapshot(ctx, {rootUuids: [b.uuid, 'nope']});
    expect(snapshot.roots.map((n) => n.uuid)).toEqual([b.uuid]);
    expect(snapshot.roots[0]!.parentUuid).toBe(a.uuid);
    expect(snapshot.truncation).toEqual([{reason: 'unknown-root', uuid: 'nope', message: expect.any(String)}]);
  });

  it('names the <shae-ent> element behind a component by a selector path', () => {
    const {ctx, a, b} = makeScene();
    document.body.innerHTML = '<div id="app"><shae-ent></shae-ent><section><shae-ent></shae-ent></section></div>';
    const [first, second] = Array.from(document.querySelectorAll('shae-ent')) as (Element & {uuid?: string})[];
    first!.uuid = a.uuid;
    second!.uuid = b.uuid;

    const snapshot = createViewSnapshot(ctx);
    expect(snapshot.roots[1]!.element).toBe('#app > shae-ent:nth-of-type(1)');
    expect(snapshot.roots[1]!.children![0]!.element).toBe('#app > section:nth-of-type(1) > shae-ent:nth-of-type(1)');
  });

  it('survives a JSON round trip unchanged', () => {
    const {ctx} = makeScene();
    ctx.buildChangeTrails();
    const snapshot = createViewSnapshot(ctx);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect/createViewSnapshot.spec.ts --run`
Expected: FAIL — cannot resolve `./createViewSnapshot.js`.

- [ ] **Step 3: Write `createViewSnapshot.ts`**

```typescript
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

    const node: ViewComponentSnapshot = {uuid, token: component.token, order: component.order, childCount: children.length};
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
```

- [ ] **Step 4: Run the spec, typecheck and lint**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect --run && pnpm typecheck && cd ../.. && pnpm exec biome check packages/shadow-objects/src/inspect`
Expected: PASS. If the root order assertion fails, check `ComponentContext.#appendToOrdered()`: roots are ordered by `order`, so `c` (order 1) precedes `a` (order 2) — the test encodes that rule; do not sort in the builder.

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/inspect/createViewSnapshot.ts packages/shadow-objects/src/inspect/createViewSnapshot.spec.ts
git commit -m "feat: a view snapshot reads the component tree and the committed properties, and points at the element behind a component" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 8: `inspect()` on the proxy contract and the local environment

**Files:**
- Modify: `packages/shadow-objects/src/view/IShadowObjectEnvProxy.ts` (after `applyChangeTrail`)
- Modify: `packages/shadow-objects/src/view/LocalShadowObjectEnv.ts` (after `applyChangeTrail`)
- Test: `packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts` (append)

**Interfaces:**
- Consumes: `createKernelSnapshot` (Task 6), `InspectRequest`, `KernelSnapshot` (Task 1).
- Produces:
  - `IShadowObjectEnvProxy.inspect?(request: InspectRequest, signal?: AbortSignal): Promise<KernelSnapshot>`
  - `LocalShadowObjectEnv.inspect(request?: InspectRequest, signal?: AbortSignal): Promise<KernelSnapshot>`

- [ ] **Step 1: Write the failing spec**

Append to `LocalShadowObjectEnv.spec.ts` inside `describe('LocalShadowObjectEnv', …)`:

```typescript
  describe('inspect', () => {
    it('resolves with a snapshot of its kernel', async () => {
      const env = new ShadowEnv();
      const localEnv = new LocalShadowObjectEnv();
      env.view = ComponentContext.get();
      env.envProxy = localEnv;

      const vc = new ViewComponent('foo');
      vc.setProperty('bar', 42);
      await env.syncWait();

      const snapshot = await localEnv.inspect();

      expect(snapshot.roots.map((n) => n.uuid)).toEqual([vc.uuid]);
      expect(snapshot.roots[0]!.props).toEqual([{name: 'bar', value: 42, routes: true}]);
      expect(snapshot.thread).toBe('main');

      env.destroy();
    });

    it('honours the request', async () => {
      const localEnv = new LocalShadowObjectEnv();
      localEnv.kernel.createEntity('r', 'node');
      localEnv.kernel.createEntity('c', 'node', 'r');

      const snapshot = await localEnv.inspect({maxDepth: 0, include: ['props']});

      expect(snapshot.roots[0]!.children).toBeUndefined();
      expect(snapshot.roots[0]!.shadowObjects).toBeUndefined();
      expect(snapshot.truncation?.[0]?.reason).toBe('max-depth');

      localEnv.destroy();
    });

    it('rejects with the reason of a signal that is already aborted, and builds nothing', async () => {
      const localEnv = new LocalShadowObjectEnv();
      const controller = new AbortController();
      const reason = new Error('gone');
      controller.abort(reason);

      await expect(localEnv.inspect({}, controller.signal)).rejects.toBe(reason);

      localEnv.destroy();
    });
  });
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/view/LocalShadowObjectEnv.spec.ts --run -t inspect`
Expected: FAIL — `localEnv.inspect is not a function`.

- [ ] **Step 3: Extend the proxy interface**

In `IShadowObjectEnvProxy.ts`, add `import type {InspectRequest, KernelSnapshot} from '../inspect/types.js';` and, after `applyChangeTrail`:

```typescript
  /**
   * Describe the Kernel behind this proxy: a plain-data snapshot of its Entity Tree, cut by the
   * limits of the request. Optional: a proxy that does not implement it makes `ShadowEnv.inspect()`
   * report `kernel` as absent with an error naming the proxy as not inspectable, and everything
   * else keeps working. Reject with the signal's reason when `signal` is aborted before or while
   * the snapshot is built.
   */
  inspect?(request: InspectRequest, signal?: AbortSignal): Promise<KernelSnapshot>;
```

- [ ] **Step 4: Implement it on `LocalShadowObjectEnv`**

Add `import {createKernelSnapshot} from '../inspect/createKernelSnapshot.js';` and `import type {InspectRequest, KernelSnapshot} from '../inspect/types.js';`. After `applyChangeTrail()`:

```typescript
  /**
   * The snapshot of this environment's Kernel, built synchronously inside the call. Nothing is
   * cloned: the builder emits plain data and the caller owns it. A signal that is already aborted
   * rejects before anything is built; there is no later point to abort at.
   */
  inspect(request: InspectRequest = {}, signal?: AbortSignal): Promise<KernelSnapshot> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    try {
      return Promise.resolve(createKernelSnapshot(this.kernel, request));
    } catch (error) {
      return Promise.reject(error);
    }
  }
```

- [ ] **Step 5: Run the spec and typecheck**

Run: `cd packages/shadow-objects && pnpm exec vitest src/view/LocalShadowObjectEnv.spec.ts --run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/view/IShadowObjectEnvProxy.ts packages/shadow-objects/src/view/LocalShadowObjectEnv.ts packages/shadow-objects/src/view/LocalShadowObjectEnv.spec.ts
git commit -m "feat: the proxy contract can be asked for a kernel snapshot, and the local environment answers on the spot" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 9: `ShadowEnv.inspect()` and `ShadowEnv.inspectAll()`

**Files:**
- Modify: `packages/shadow-objects/src/view/ShadowEnv.ts` (imports; a static after `get()`; a method after `syncWait()`)
- Test: `packages/shadow-objects/src/view/ShadowEnv.spec.ts` (append)

**Interfaces:**
- Consumes: `createViewSnapshot` (Task 7), proxy `inspect?` (Task 8), `EnvSnapshot`, `InspectRequest` (Task 1), `GlobalNS`, `RemoteWorkerEnv`.
- Produces:
  - `ShadowEnv.prototype.inspect(request?: InspectRequest, signal?: AbortSignal): Promise<EnvSnapshot>`
  - `static ShadowEnv.inspectAll(request?: InspectRequest, signal?: AbortSignal): Promise<EnvSnapshot[]>`

- [ ] **Step 1: Write the failing spec**

Append to `ShadowEnv.spec.ts` inside `describe('ShadowEnv', …)`:

```typescript
  describe('inspect', () => {
    const fakeProxy = (extra: Partial<IShadowObjectEnvProxy> = {}): IShadowObjectEnvProxy => ({
      start: () => Promise.resolve(),
      importScript: () => Promise.resolve(),
      applyChangeTrail: () => Promise.resolve(),
      destroy: () => {},
      ...extra,
    });

    it('describes an environment that has neither half yet', async () => {
      const env = new ShadowEnv();
      const snapshot = await env.inspect();

      expect(snapshot).toEqual({
        namespace: '',
        isGlobalNamespace: false,
        kind: 'none',
        state: {viewReady: false, proxyReady: false, isReady: false, isDestroyed: false},
      });

      env.destroy();
    });

    it('carries the view and no kernel while the proxy is not ready', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      const vc = new ViewComponent('foo');

      const snapshot = await env.inspect();

      expect(snapshot.namespace).toBe('ShadowObjectsGlobalNS');
      expect(snapshot.isGlobalNamespace).toBe(true);
      expect(snapshot.kind).toBe('none');
      expect(snapshot.view?.roots.map((n) => n.uuid)).toEqual([vc.uuid]);
      expect(snapshot.kernel).toBeUndefined();
      expect(snapshot.error).toBeUndefined();

      env.destroy();
    });

    it('names a proxy that cannot be inspected', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = fakeProxy();
      await env.ready();

      const snapshot = await env.inspect();

      expect(snapshot.kind).toBe('custom');
      expect(snapshot.state.isReady).toBe(true);
      expect(snapshot.kernel).toBeUndefined();
      expect(snapshot.error).toEqual({name: 'NotInspectable', message: expect.stringContaining('inspect')});

      env.destroy();
    });

    it('joins the view and the kernel of a local environment', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = new LocalShadowObjectEnv();
      const vc = new ViewComponent('foo');
      vc.setProperty('bar', 1);
      await env.syncWait();

      const snapshot = await env.inspect();

      expect(snapshot.kind).toBe('local');
      expect(snapshot.error).toBeUndefined();
      expect(snapshot.view?.roots[0]?.uuid).toBe(vc.uuid);
      expect(snapshot.kernel?.roots[0]?.uuid).toBe(vc.uuid);
      expect(snapshot.kernel?.roots[0]?.props).toEqual(snapshot.view?.roots[0]?.props);
      expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);

      env.destroy();
    });

    it('reports a proxy whose inspection fails, instead of rejecting', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = fakeProxy({inspect: () => Promise.reject(new RangeError('too deep'))});
      await env.ready();

      const snapshot = await env.inspect();

      expect(snapshot.kernel).toBeUndefined();
      expect(snapshot.error).toEqual({name: 'RangeError', message: 'too deep'});

      env.destroy();
    });

    it('rejects for the caller: a destroyed environment, or an aborted signal', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = new LocalShadowObjectEnv();
      await env.ready();

      const controller = new AbortController();
      const reason = new Error('stop');
      controller.abort(reason);
      await expect(env.inspect({}, controller.signal)).rejects.toBe(reason);

      env.destroy();
      await expect(env.inspect()).rejects.toBeInstanceOf(ShadowEnvDestroyedError);
    });

    it('rejects when the environment is destroyed while the proxy is still answering', async () => {
      const env = new ShadowEnv();
      env.view = ComponentContext.get();
      env.envProxy = fakeProxy({inspect: () => new Promise(() => {})});
      await env.ready();

      const pending = env.inspect();
      env.destroy();

      await expect(withTimeout(pending)).rejects.toBeInstanceOf(ShadowEnvDestroyedError);
    });
  });

  describe('inspectAll', () => {
    it('describes every environment with a namespace, in registration order, one failure at a time', async () => {
      const a = new ShadowEnv();
      a.view = ComponentContext.get('inspect-a');
      a.envProxy = new LocalShadowObjectEnv();

      const b = new ShadowEnv();
      b.view = ComponentContext.get('inspect-b');
      b.envProxy = {
        start: () => Promise.resolve(),
        importScript: () => Promise.resolve(),
        applyChangeTrail: () => Promise.resolve(),
        destroy: () => {},
        inspect: () => Promise.reject(new Error('silent')),
      };

      await Promise.all([a.ready(), b.ready()]);

      const snapshots = await ShadowEnv.inspectAll();
      const byNs = Object.fromEntries(snapshots.map((s) => [s.namespace, s]));

      expect(Object.keys(byNs)).toEqual(expect.arrayContaining(['inspect-a', 'inspect-b']));
      expect(byNs['inspect-a']?.kernel).toBeDefined();
      expect(byNs['inspect-b']?.error).toEqual({name: 'Error', message: 'silent'});

      a.destroy();
      b.destroy();
      ComponentContext.get('inspect-a').dispose();
      ComponentContext.get('inspect-b').dispose();

      expect((await ShadowEnv.inspectAll()).map((s) => s.namespace)).not.toContain('inspect-a');
    });
  });
```

`withTimeout` already exists at the top of the file. If `ComponentContext.dispose()` is not what removes a named context from `getContextsMap()`, use `ComponentContext.getContextsMap().delete('inspect-a')` after `clear()`; check `ComponentContext.ts` around `dispose()` first.

- [ ] **Step 2: Run the spec to see it fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/view/ShadowEnv.spec.ts --run -t "inspect"`
Expected: FAIL — `env.inspect is not a function`.

- [ ] **Step 3: Implement in `ShadowEnv.ts`**

Imports to add:

```typescript
import {GlobalNS} from '../constants.js';
import {createViewSnapshot} from '../inspect/createViewSnapshot.js';
import type {EnvSnapshot, InspectRequest} from '../inspect/types.js';
import {RemoteWorkerEnv} from './RemoteWorkerEnv.js';
```

Module-level helpers, above the class:

```typescript
const namespaceAsString = (ns: NamespaceType | undefined): string =>
  typeof ns === 'symbol' ? (ns.description ?? String(ns)) : (ns ?? '');

const errorInfo = (error: unknown): {name: string; message: string} =>
  error instanceof Error ? {name: error.name, message: error.message} : {name: 'Error', message: String(error)};

const proxyKind = (proxy: IShadowObjectEnvProxy | undefined): EnvSnapshot['kind'] => {
  if (proxy === undefined) return 'none';
  if ((proxy as {isLocalEnv?: unknown}).isLocalEnv === true) return 'local';
  if (proxy instanceof RemoteWorkerEnv) return 'worker';
  return 'custom';
};
```

Static method, after `static get()`:

```typescript
  /**
   * Every environment that holds a namespace, in registration order, each described by
   * {@link ShadowEnv.inspect}. One environment that cannot answer costs its own entry and not the
   * list: the per-environment failures are reported under `error`. Rejects only for the caller's
   * reasons -- an aborted signal.
   */
  static inspectAll(request: InspectRequest = {}, signal?: AbortSignal): Promise<EnvSnapshot[]> {
    const envs = Array.from(globalThis.__shadowEnvs?.values() ?? []);
    return Promise.all(envs.map((env) => env.inspect(request, signal)));
  }
```

Instance method, after `syncWait()`:

```typescript
  /**
   * Describe this environment: the View's component tree and, where the proxy is ready and
   * implements `inspect`, the Kernel's Entity Tree behind it.
   *
   * Never rejects for a reason inside the environment -- a proxy that cannot answer, a Kernel that
   * threw -- and reports those under `error` with `kernel` absent. A proxy that is not ready yet is
   * not an error either: `state.proxyReady` says so, and `kernel` is simply absent. It rejects
   * only for a reason of the caller's: an aborted signal, or an environment that is destroyed
   * before or while the proxy answers.
   *
   * A caller that wants the View and the Kernel to agree after its own change awaits
   * {@link ShadowEnv.syncWait} first; the View snapshot reads the committed Component Memory,
   * not the pending changes.
   */
  async inspect(request: InspectRequest = {}, signal?: AbortSignal): Promise<EnvSnapshot> {
    if (this.#isDestroyed) throw new ShadowEnvDestroyedError();
    if (signal?.aborted) throw signal.reason;

    const ns = this.#comCtx?.ns;
    const proxy = this.#shaObjEnvProxy;

    const snapshot: EnvSnapshot = {
      namespace: namespaceAsString(ns),
      isGlobalNamespace: ns === GlobalNS,
      kind: proxyKind(proxy),
      state: {viewReady: this.viewReady, proxyReady: this.proxyReady, isReady: this.isReady, isDestroyed: this.#isDestroyed},
    };

    if (this.#comCtx) snapshot.view = createViewSnapshot(this.#comCtx, request);

    if (proxy === undefined || !this.proxyReady) return snapshot;

    if (typeof proxy.inspect !== 'function') {
      snapshot.error = {name: 'NotInspectable', message: 'the environment proxy does not implement inspect()'};
      return snapshot;
    }

    try {
      // the race is what settles a caller whose environment is destroyed while the proxy answers
      snapshot.kernel = await Promise.race([proxy.inspect(request, signal), this.#destroyedSignal()]);
    } catch (error) {
      if (this.#isDestroyed) throw new ShadowEnvDestroyedError();
      if (signal?.aborted) throw error;
      snapshot.error = errorInfo(error);
    }

    return snapshot;
  }
```

`NamespaceType` is already imported as a type in this file. `#destroyedSignal()` exists and is what `ready()` and `syncWait()` race against.

- [ ] **Step 4: Run the spec, the whole package suite, typecheck and lint**

Run: `cd packages/shadow-objects && pnpm exec vitest --run && pnpm typecheck && cd ../.. && pnpm lint:ci`
Expected: PASS, exit 0. If Biome flags the `RemoteWorkerEnv` import as a cycle, it is not one: `RemoteWorkerEnv.ts` imports nothing from `ShadowEnv.ts` (check its import list).

- [ ] **Step 5: Commit**

```bash
git add packages/shadow-objects/src/view/ShadowEnv.ts packages/shadow-objects/src/view/ShadowEnv.spec.ts
git commit -m "feat: an environment describes its view and its kernel in one snapshot, and every environment with a namespace answers at once" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 10: Exports, the dist contract and the changelog

**Files:**
- Modify: `packages/shadow-objects/src/index.ts`, `packages/shadow-objects/src/shadow-objects.ts`
- Modify: `packages/shadow-objects/src/distContract.files.txt`
- Modify: `packages/shadow-objects/CHANGELOG.md` (new `## [Unreleased]` section above `## [0.34.0] - 2026-09-02`)
- Test: `packages/shadow-objects/src/distContract.spec.ts` (existing; expectation file changes)

**Interfaces:**
- Produces: `createKernelSnapshot`, `toContextName`, `routesOnValue` and every type of `src/inspect/types.ts` from `@spearwolf/shadow-objects`; `createKernelSnapshot` and the types from `@spearwolf/shadow-objects/shadow-objects.js`. `createViewSnapshot` stays internal.

- [ ] **Step 1: Add the exports**

`src/index.ts`, alphabetically among the existing lines (after `./elements/ShaeWorkerElement.js`):

```typescript
export * from './inspect/createKernelSnapshot.js';
export type * from './inspect/types.js';
```

`src/shadow-objects.ts`, after `./in-the-dark/ShadowObject.js`:

```typescript
export * from './inspect/createKernelSnapshot.js';
export type * from './inspect/types.js';
```

- [ ] **Step 2: Build and see the dist contract fail**

Run: `pnpm -F @spearwolf/shadow-objects build && cd packages/shadow-objects && pnpm exec vitest src/distContract.spec.ts --run`
Expected: FAIL — the file list under `dist` has entries the expectation lacks: `src/inspect/{types,serializeValue,normalizeInspectRequest,createKernelSnapshot,createViewSnapshot}.{js,js.map,d.ts,d.ts.map}` and `src/in-the-dark/displayName.{js,js.map,d.ts,d.ts.map}`. The `package.json` shape assertion still passes: no new `exports` entry in this phase.

- [ ] **Step 3: Regenerate the file list**

Run from `packages/shadow-objects`: `(cd dist && find . -type f | sed 's|^\./||' | LC_ALL=C sort) > src/distContract.files.txt`

Then `git diff src/distContract.files.txt` and confirm the diff is exactly the twenty-four added lines above, nothing removed.

- [ ] **Step 4: Run the dist contract spec**

Run: `cd packages/shadow-objects && pnpm exec vitest src/distContract.spec.ts --run`
Expected: PASS.

- [ ] **Step 5: Write the changelog section**

Insert above `## [0.34.0] - 2026-09-02` in `packages/shadow-objects/CHANGELOG.md`:

```markdown
## [Unreleased]

### New

- **New (public API):** `ShadowEnv.inspect(request?, signal?)` and `ShadowEnv.inspectAll(request?, signal?)` — a plain-data, JSON-safe snapshot of an environment: the View's component tree with the committed properties and, where the proxy is ready and implements `inspect`, the Kernel's Entity Tree with properties, Shadow Objects (display name, tokens, the names each one uses and provides, the lifecycle hooks it implements) and Entity Contexts (provided, inherited and effective value, who provides it, and where the effective value comes from), the global context chains and the Registry. `inspect()` rejects only for the caller's reasons — an aborted signal, a destroyed environment — and reports every reason inside the environment under `error`. `inspectAll()` describes every environment that holds a namespace. Documented in `docs/api-reference.md`, `docs/guides.md`, `docs/concepts.md` and `docs/cheat-sheet.md`.
- **New (public API):** `createKernelSnapshot(kernel, request?)` — the in-environment half of the above, for a test or a Shadow Object module that holds a `Kernel`. Exported from `@spearwolf/shadow-objects` and from `@spearwolf/shadow-objects/shadow-objects.js`, together with `toContextName()`, `routesOnValue()` and the snapshot types (`EnvSnapshot`, `KernelSnapshot`, `ViewSnapshot`, `EntityNodeSnapshot`, `ShadowObjectSnapshot`, `EntityContextSnapshot`, `GlobalContextSnapshot`, `RegistrySnapshot`, `PropSnapshot`, `SerializedValue`, `SerializeLimits`, `InspectRequest`, `TruncationNote`, `ContextName`). Adds `dist/src/inspect/*` and `dist/src/in-the-dark/displayName.js` with their declarations to the published file list. `getEntityGraph()` is unchanged.
- **New (public API):** `IShadowObjectEnvProxy.inspect?(request, signal?)` — an optional member of the proxy contract; `LocalShadowObjectEnv` implements it synchronously on its Kernel. A proxy without it keeps compiling and keeps working; `ShadowEnv.inspect()` then reports `NotInspectable` under `error`.
- **New (public API):** read-only accessors the snapshot is built from, each small enough to use on its own: `Entity.contextNames()`, `Entity.describeContext(name)`, `Entity.globalContextNames()`, `Entity.describeGlobalContext(name)`; `Kernel.tokenOf(uuid)`, `Kernel.describeShadowObjects(uuid)`, `Kernel.rootContextNames()`, `Kernel.describeRootContext(name)`; `Registry.describe()`, `Registry.tokensOf(construct)`, `Registry.isDefault(registry)`; `SignalsPath.signals`; `ShadowObjectCreationScope.describe()`. None of them creates anything on read, and each answers empty after a teardown rather than throwing. The description types `ShadowObjectDescription`, `ShadowObjectScopeDescription`, `RegistryDescription` and `LifecycleHookName` are exported.
```

- [ ] **Step 6: Run the whole package suite once more**

Run: `cd packages/shadow-objects && pnpm exec vitest --run && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/index.ts packages/shadow-objects/src/shadow-objects.ts packages/shadow-objects/src/distContract.files.txt packages/shadow-objects/CHANGELOG.md
git commit -m "feat: the snapshot builder and its types leave through both entry points, and the published file list knows the new module" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 11: Documentation

**Files:**
- Modify: `packages/shadow-objects/docs/api-reference.md` (four insertions), `docs/guides.md` (one section), `docs/concepts.md` (one paragraph), `docs/cheat-sheet.md` (one block), `packages/shadow-objects/README.md` (one paragraph)
- Test: `pnpm lint:terms`

No code. Every snippet below is the text to insert; adjust nothing but the heading levels if a neighbour differs.

- [ ] **Step 1: `api-reference.md` — `ShadowEnv` static method and instance method**

After the `#### ShadowEnv.get(namespace)` block (under `### Static Methods` of `## ShadowEnv`), add:

````markdown
#### `ShadowEnv.inspectAll(request?, signal?)`

Describes every environment that holds a namespace, in registration order, each by [`inspect()`](#inspectrequest-signal). One environment that cannot answer costs its own entry, not the list: its reason stands under `error`. Rejects only when `signal` aborts.

- **Signature:** `static inspectAll(request?: InspectRequest, signal?: AbortSignal): Promise<EnvSnapshot[]>`

```typescript
const snapshots = await ShadowEnv.inspectAll({maxDepth: 2});
console.log(JSON.stringify(snapshots, null, 2));
```
````

After the `#### syncWait()` block (before `#### ChangeTrailRefusedError`), add:

````markdown
#### `inspect(request?, signal?)`

A plain-data picture of the environment: what the View holds for the namespace and, where the proxy is ready and implements `inspect`, what the Kernel holds behind it. Everything in it is JSON-safe -- symbols, functions, signals, class instances and cycles are replaced by tagged stand-ins, see [`SerializedValue`](#serializedvalue).

- **Signature:** `inspect(request?: InspectRequest, signal?: AbortSignal): Promise<EnvSnapshot>`

```typescript
await env.syncWait();
const snapshot = await env.inspect();

snapshot.view?.roots;    // the component tree, props as the Component Memory holds them
snapshot.kernel?.roots;  // the Entity Tree: props, Shadow Objects, Entity Contexts
snapshot.kernel?.globalContexts;
snapshot.kernel?.registry;
```

Two things the promise can do, and one it never does.

- It **rejects** only for the caller's reasons: `signal` aborted, or the environment destroyed before or while the proxy answers (`ShadowEnvDestroyedError`).
- It **reports** every reason inside the environment under `error`, with `kernel` absent: a proxy that does not implement `inspect` (`{name: 'NotInspectable'}`), a Kernel that threw. A proxy that is not ready yet is not an error -- `state.proxyReady` says so, and `kernel` is simply absent.
- It never builds the pending changes. The View snapshot reads the committed Component Memory, so a component created and not yet synced has no `props`, and a property set since the last cycle shows its previous value. A caller that wants the View and the Kernel to agree after its own change awaits [`syncWait()`](#syncwait) first.

`EnvSnapshot` carries `namespace` (the global namespace reports `'ShadowObjectsGlobalNS'`, and `isGlobalNamespace` says so), `kind` (`'local'`, `'worker'`, `'custom'` for any other proxy, `'none'` without one), `state`, and the two halves `view` and `kernel`.

##### `InspectRequest`

| Field | Default | Meaning |
| :--- | :--- | :--- |
| `include` | all four | Which of `'props'`, `'shadowObjects'`, `'contexts'`, `'registry'` to carry per Entity; `'props'` is what the View side reads |
| `rootUuids` | the roots | Descend from these uuids instead. An unknown uuid is reported under `truncation`, never thrown |
| `maxDepth` | `4` | Tree depth below each root that is walked; a non-finite number reads as the cap, `64` |
| `maxNodes` | `250` | Total nodes across the walk |
| `values` | see below | `SerializeLimits` for every property and context value |

Both halves of the snapshot are cut by the same request. Where a limit cut the walk, `truncation` names the node and the reason (`'max-depth'`, `'max-nodes'`, `'unknown-root'`); `childCount` on a node whose `children` are absent still says how many there are, and `rootUuids` is the way to descend from there.

##### `KernelSnapshot`

`takenAt`, `thread` (`'main'` or `'worker'`), `counts`, `roots` (one `EntityNodeSnapshot` per Entity, the walk of [`getEntityGraph()`](#getentitygraph) with `omittedChildren` in the same shape), `globalContexts`, `registry` (the three maps with constructors reduced to display names, and `isDefault`), and `truncation`.

An `EntityNodeSnapshot` carries `uuid`, `token`, `order`, `parentUuid`, `autoDestructionOnParentRemoval`, `childCount`, and per `include`:

- `props` -- `{name, value, routes}`, where `routes` says whether the value counts as truthy for [property routing](#2-conditional-routing).
- `shadowObjects` -- per Shadow Object the `displayName`, the tokens it is `definedUnder`, the names it uses (`usesProperties`, `usesContexts`, `usesParentContexts`) and provides (`providesContexts`, `providesGlobalContexts`), and the lifecycle `hooks` it implements.
- `contexts` -- per Entity Context the `name`, `provided` (absent unless this Entity provides), `inherited` (absent at a root with no global value), `effective` (what `useContext()` reads), `providedBy` (display names on this Entity), and `source`: `{kind: 'self'}`, `{kind: 'ancestor', uuid}`, `{kind: 'global'}` or `{kind: 'none'}`. "Holds a value" is `!= null`, the rule the context chain resolves by.

A symbol context name arrives as `{symbol: description}`. An agent or a script can read it; it cannot pass it back in, and a symbol context is findable only through the tree.

##### `SerializedValue`

Primitives pass through; `NaN` and the two infinities become their names. Everything JSON would drop or mangle is tagged: `{$type: 'undefined'}`, `bigint`, `symbol`, `function`, `date`, `signal` (with its current value), `dom` (a node, by `nodeName` and `id`), `array-buffer` / `typed-array` (by `byteLength`), `object` (any other class instance: its `class` and a `preview` of its own enumerable keys -- a `Map` or `Set` previews `size` and `entries`, an `Error` its `name` and `message`), `circular` (a cycle on the current path), and `truncated` with a `reason` of `'depth'`, `'length'`, `'entries'` or `'string'` and the `original` size. A getter that throws becomes `{$type: 'object', class: 'Error', preview: {message}}` in place of its value.

`SerializeLimits` defaults: `maxDepth` 3, `maxArrayLength` 20, `maxObjectEntries` 30, `maxStringLength` 200. They are per value, not per snapshot.
````

- [ ] **Step 2: `api-reference.md` — the proxy table**

In `## Environment Proxies`, add a row to the member table after `applyChangeTrail`:

```markdown
| `inspect` | `(request: InspectRequest, signal?: AbortSignal) => Promise<KernelSnapshot>` | no |
```

And after the paragraph that ends "a failed proxy ends it.", add:

```markdown
`inspect` is the one optional *call*: a proxy that implements it hands `ShadowEnv.inspect()` a [`KernelSnapshot`](#kernelsnapshot) of the Kernel it stands for -- `createKernelSnapshot(kernel, request)` is the builder both shipped implementations would use, and `LocalShadowObjectEnv` calls it synchronously inside the promise. A proxy that leaves it out keeps working; the environment then reports `NotInspectable`.
```

- [ ] **Step 3: `api-reference.md` — Kernel side**

After the `#### getEntityGraph()` block (before `#### upgradeEntities()`), add:

````markdown
#### `createKernelSnapshot(kernel, request?)`

The serializable counterpart of `getEntityGraph()`: the same walk over the same tree, with `omittedChildren` in the same shape, cut by the depth and node limits of the request and carrying per Entity the properties, the Shadow Objects and the Entity Contexts as plain data. What `ShadowEnv.inspect()` asks the environment for, exported so that a test or a Shadow Object module that holds a `Kernel` can take the picture itself. Synchronous, read-only and quiet: no signal read inside it subscribes anything. See [`inspect()`](#inspectrequest-signal) for the request and the snapshot.

- **Signature:** `createKernelSnapshot(kernel: Kernel, request?: InspectRequest): KernelSnapshot`

```typescript
import {createKernelSnapshot} from '@spearwolf/shadow-objects/shadow-objects.js';

const snapshot = createKernelSnapshot(kernel, {maxDepth: 2, include: ['props', 'contexts']});
```

#### Inspection accessors

The snapshot is built from read accessors that each answer one question, create nothing on read, and answer empty after a teardown rather than throwing. They are public so that a diagnosis can ask one question without taking a whole snapshot.

| Member | Answers |
| :--- | :--- |
| `kernel.tokenOf(uuid)` | The token of the Entity, or `undefined` |
| `kernel.describeShadowObjects(uuid)` | One `ShadowObjectDescription` per Shadow Object of the Entity: `displayName`, `definedUnder`, the five name lists, `hooks` |
| `kernel.rootContextNames()` | The names of the kernel-wide context chains |
| `kernel.describeRootContext(name)` | `{value, signals}` of one chain -- the members in chain order, the same signal objects the Entities contribute |
| `entity.contextNames()` | The Entity Context names this Entity holds |
| `entity.describeContext(name)` | `{provided, inherited, effective, hasProviders}` of one Entity Context |
| `entity.globalContextNames()` | The global names this Entity contributes to |
| `entity.describeGlobalContext(name)` | `{value, signal, hasProviders}` -- the contribution and the signal standing in the chain |
| `registry.describe()` | The three maps, constructors reduced to display names |
| `registry.tokensOf(construct)` | The tokens a constructor is defined under |
| `Registry.isDefault(registry)` | Whether it is the default registry of the thread |

`entity` here is the `Entity` class `kernel.getEntity()` hands out, not the `EntityApi` a Shadow Object sees through the creation API -- the four accessors are on the class only.
````

In the `## Registry` runtime section, after the `#### registry.hasRoute(route)` block and before `#### registry.clear()`, add:

```markdown
#### `registry.describe()`, `registry.tokensOf(construct)`, `Registry.isDefault(registry)`

Read-only views for inspection. `describe()` copies the token, route and property-route maps with every constructor reduced to its display name; `tokensOf()` is the reverse lookup of `define()`; `isDefault()` tells the shared default registry from any other. See [Inspection accessors](#inspection-accessors).
```

Under `#### Entity Graph Inspection` in the Console Logger section, append after the existing code block:

```markdown
For a picture that survives `JSON.stringify()` -- properties, Shadow Objects and Entity Contexts included -- take `createKernelSnapshot(kernel)` instead; from the View side, `ShadowEnv.get(ns).inspect()` joins it with the component tree.
```

- [ ] **Step 4: `guides.md`**

In `## 4. Multi-Environment Setup`, after `### Waiting for the Environment to be Ready` and before `### When the Worker Dies`, add:

````markdown
### Inspecting an Environment

`env.inspect()` takes a plain-data picture of both halves of an environment: the component tree the View holds, and the Entity Tree the Kernel holds -- with properties, Shadow Objects and Entity Contexts. It is JSON-safe end to end, so it prints, ships and diffs.

```javascript
await env.syncWait();                 // first: the picture reflects what the Kernel has applied
const snapshot = await env.inspect({maxDepth: 3});
console.log(JSON.stringify(snapshot.kernel?.roots, null, 2));
```

The `syncWait()` in front is the ordering rule. The View snapshot reads the committed Component Memory, not the pending changes, and the Kernel changes only when a change trail reaches it; a snapshot taken between a property write and the next cycle shows the previous value on both sides. Wait for the cycle, then ask.

Two places to look when a Shadow Object does not see what you expect. Each `contexts` entry names where its `effective` value comes from -- `self`, an `ancestor` by uuid, the `global` chain, or `none` when the name is used and nobody provides it. Each `shadowObjects` entry names the tokens the constructor is `definedUnder`, which is the answer to "why did that Shadow Object show up on this Entity" when a route brought it there.

`ShadowEnv.inspectAll()` does the same for every environment on the page that holds a namespace. In the console, `ShadowEnv.get('game-world').inspect().then(console.log)` is the quickest way in -- `ShadowEnv` has to be reachable there, which an application import makes it.
````

- [ ] **Step 5: `concepts.md`**

In `### The Change Trail and the Sync Tempo`, after the paragraph beginning "When you do need a guarantee, use `syncWait()`", add:

```markdown
The same clock governs what an inspection shows. `ShadowEnv.inspect()` reads the View's committed Component Memory and the Kernel's live Entity Tree, both at the moment of the call; a change made since the last cycle is in neither. A snapshot taken right after `syncWait()` resolves is the one where the two halves agree.
```

- [ ] **Step 6: `cheat-sheet.md`**

After the `## ShadowEnv Quick Setup` section's last code block and before `## FrameLoop`, add:

````markdown
## Inspecting an Environment

```typescript
await env.syncWait();
const snapshot = await env.inspect({maxDepth: 3});   // EnvSnapshot: {namespace, kind, state, view?, kernel?, error?}
const all = await ShadowEnv.inspectAll();            // every environment with a namespace

snapshot.kernel?.roots[0]?.props;          // [{name, value, routes}]
snapshot.kernel?.roots[0]?.shadowObjects;  // [{displayName, definedUnder, uses…, provides…, hooks}]
snapshot.kernel?.roots[0]?.contexts;       // [{name, provided?, inherited?, effective, providedBy, source}]
snapshot.kernel?.globalContexts;           // [{name, value, providers}]
snapshot.kernel?.registry;                 // {tokens, routes, propRoutes, isDefault}
snapshot.kernel?.truncation;               // where maxDepth / maxNodes cut the walk

// inside the environment, without a ShadowEnv:
import {createKernelSnapshot} from '@spearwolf/shadow-objects/shadow-objects.js';
const kernelSnapshot = createKernelSnapshot(kernel, {rootUuids: [uuid]});
```

Request defaults: `maxDepth` 4, `maxNodes` 250, `include` all four (`props`, `shadowObjects`, `contexts`, `registry`), values cut at depth 3 / 20 items / 30 entries / 200 characters. Everything is JSON-safe; what JSON would drop is tagged `{$type: …}`.
````

- [ ] **Step 7: `README.md` of the package**

At the end of `## The Five Domains` (after the paragraph that links to Concepts), add:

```markdown
Every environment can be asked what it holds: `ShadowEnv.get(ns).inspect()` answers with a JSON-safe snapshot of the component tree and the Entity Tree behind it, Shadow Objects and Entity Contexts included -- see [Inspecting an Environment](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/guides.md#inspecting-an-environment).
```

- [ ] **Step 8: Terminology lint and a link check by eye**

Run: `pnpm lint:terms`
Expected: exit 0. Then open `docs/api-reference.md` and confirm the three anchors used above resolve to headings that exist: `#inspectrequest-signal` (the `#### inspect(request?, signal?)` heading renders as `inspectrequest-signal` on GitHub), `#kernelsnapshot`, `#serializedvalue`, `#inspection-accessors`, `#syncwait`, `#getentitygraph`, `#2-conditional-routing`.

- [ ] **Step 9: Commit**

```bash
git add packages/shadow-objects/docs/api-reference.md packages/shadow-objects/docs/guides.md packages/shadow-objects/docs/concepts.md packages/shadow-objects/docs/cheat-sheet.md packages/shadow-objects/README.md
git commit -m "docs: an environment can be inspected, and the reference says what the snapshot carries and when it agrees with the kernel" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 12: `AGENTS.md`, the proposal amendment, and the full CI run

**Files:**
- Modify: `AGENTS.md` (§2 Data Flow list)
- Modify: `docs/proposals/web-mcp-shadow-envs.md` (§6.2, §6.5, §8.5, §16)
- Test: `pnpm run ci`

- [ ] **Step 1: `AGENTS.md` §2**

After the `- **Lateral (Context):** …` bullet under **Data Flow**, add:

```markdown
- **Inspection (read-only):** `ShadowEnv.inspect()` -> proxy `inspect()` -> `createKernelSnapshot(kernel)`. A plain-data picture of the Entity Tree, its Shadow Objects and Entity Contexts, built from read accessors on `Entity`, `Kernel`, `Registry` and the creation scope that create nothing on read. Never the live objects, never a write.
```

- [ ] **Step 2: Bring the proposal in line with the code**

In `docs/proposals/web-mcp-shadow-envs.md`:

1. In §6.2, after the `KernelSnapshot` code block, add the `TruncationNote` definition:

   ```typescript
   export interface TruncationNote {
     reason: 'max-depth' | 'max-nodes' | 'unknown-root';
     /** The node whose children were not walked, or the root uuid that was not found. */
     uuid?: string;
     message: string;
   }
   ```

2. In §6.1, change the `kind` line to `kind: 'local' | 'worker' | 'custom' | 'none';` with the comment `'none' while the environment has no proxy`.
3. In §6.5, replace the `Kernel | describeShadowObject(obj)` row with `Kernel | describeShadowObjects(uuid): ShadowObjectDescription[] | one description per Shadow Object of the Entity, with definedUnder and hooks -- the constructor is known only at the entity entry, so the lookup is per Entity`, and add the rows `Kernel | tokenOf(uuid): string | undefined | the token of the entity entry` and `Entity | describeGlobalContext(name): {value, signal, hasProviders} | undefined | this Entity's contribution to the chain and the signal standing in it`.
4. In §7, extend the `truncated` line of the union with `preview?: string` and add one sentence after rule 5: "`Map` and `Set` have no tag of their own and travel as `{$type: 'object', class: 'Map' | 'Set', preview: {size, entries}}`."
5. In §6.2's remark on `source`, replace "non-`undefined` `provided` value" with "`provided` value that is `!= null` -- the rule `SignalsPath` resolves a chain by".
6. In §16, Phase 1: append "Implemented 2026-09-05; see `docs/superpowers/plans/2026-09-05-inspect-phase-1.md`." and add `normalizeInspectRequest.ts` and `in-the-dark/displayName.ts` to the Phase 1 "New" column.

- [ ] **Step 3: The full CI sequence**

Run: `pnpm run ci`
Expected: exit 0 — terminology check, build, typecheck, every vitest suite (`shadow-objects-testing` runs the built `dist/` in Chromium; it needs `pnpm exec playwright install chromium` once on a fresh machine), merged coverage, e2e typecheck, `lint:ci`. A `distContract` failure here means Task 10's file list is stale: rebuild and regenerate.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/proposals/web-mcp-shadow-envs.md
git commit -m "docs: the agent guide names the inspection route, and the proposal reads as phase one was built" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

## Self-review against the spec

**Spec coverage (§16, Phase 1):**

| Spec item | Task |
| :--- | :--- |
| `src/inspect/` types (§6, §7, §8.1) | 1 |
| Serializer, eight rules, limits (§7) | 2 |
| Read accessors (§6.5): Entity | 3 |
| Read accessors: `SignalsPath.signals`, Kernel root contexts | 4 |
| Read accessors: scope `describe()`, Kernel Shadow Object descriptions, Registry three | 5 |
| `createKernelSnapshot()`: walk, omitted children parity, `source`, global chains, registry, limits, `rootUuids`, `include` (§6.2, §6.3, §8.1) | 6 |
| `createViewSnapshot()`: memory props, `element` path, no pending changes (§6.4) | 7 |
| `IShadowObjectEnvProxy.inspect?`, `LocalShadowObjectEnv.inspect()` (§8.2, §8.3) | 8 |
| `ShadowEnv.inspect()` / `inspectAll()`, `kind`, reject-vs-report rule (§8.5, §9) | 9 |
| Exports from both entry points (§11.1), dist contract, changelog (§15) | 10 |
| api-reference, guides, concepts, cheat-sheet, README (§15) | 11 |
| `AGENTS.md` §2, proposal amendments; green `pnpm run ci` (§15, §16) | 12 |
| Unit tests listed in §14 for this phase: serializer, snapshot, accessors, local env, `ShadowEnv` | 2–9 |

Left to later phases on purpose: the worker transport (§8.4, Phase 2), the browser-mode integration specs of §14 (they prove the wire shapes, Phase 2), the `filter` request field (§10.4, Phase 3), `best-practices.md` and the README *Security* sentence (both about exposure, §12, Phase 3), the root `CHANGELOG.md` (no build or devDependency change in this phase).

**Placeholder scan:** every step carries its code or its text; no "similar to", no "add validation". The one conditional instruction is in Task 9 Step 1 (how a named context leaves the map), resolved by reading `ComponentContext.dispose()` — which does delete the namespace from `getContextsMap()`, so the spec as written stands.

**Type consistency:** `describeContext` returns `{provided, inherited, effective, hasProviders}` in Tasks 3 and 6; `describeGlobalContext` returns `{value, signal, hasProviders}` in Tasks 3 and 6; `describeRootContext` returns `{value, signals}` in Tasks 4 and 6; `describeShadowObjects(uuid)` in Tasks 4, 5 and 6; `Registry.describe()` returns `RegistryDescription` and the snapshot spreads it with `isDefault` in Task 6; `NodeBudget.take()` and `normalizeInspectRequest()` are shared by Tasks 6 and 7; `EnvSnapshot.kind` includes `'none'` in Tasks 1 and 9; `TruncationNote` is identical in Tasks 1 and 12.
