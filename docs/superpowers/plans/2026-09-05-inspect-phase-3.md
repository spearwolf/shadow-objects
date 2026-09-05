# Inspection Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent in a browser with WebMCP sees five read-only tools that describe every Shadow Environment on the page, after the application has called one function -- `exposeShadowEnvsToModelContext()` from the new subpath `@spearwolf/shadow-objects/model-context.js`.

**Architecture:** Layer 3 of the proposal, built on the `ShadowEnv.inspect()` / `inspectAll()` of phases 1 and 2 and on nothing below them. `src/model-context/` holds a structural adapter for the platform object (`ModelContextLike`), five tool factories that turn an `InspectRequest` into a result envelope, a redaction pass over the snapshot, and the one exported function that registers the tools under an `AbortController`. Two additions to the snapshot model of phase 1 carry what two of the tools need and the tree walk cannot give: a `filter` on the request that turns the Kernel walk into a search (`shae-find-entities` then ships matches, not the tree), and an `ancestors` chain on a node the request named in `rootUuids` (`shae-get-entity` then answers in one round trip). The subpath stays out of `index.ts` and out of the worker bundle.

**Tech Stack:** TypeScript, vitest 4 with happy-dom for the unit specs, Playwright in `shadow-objects-e2e` where the Chromium project is launched with `--enable-features=WebMCP` (Playwright 1.62.1 bundles Chromium 151, which exposes `document.modelContext` behind that flag -- verified on 2026-09-05 before this plan was written), Biome, pnpm 11 + turbo.

**Spec:** `docs/proposals/web-mcp-shadow-envs.md`, §3 (the platform), §5 (the three layers), §8.1 (the request), §9 (discovery), §10 (the tools), §11.2 and §11.3 (the entry point and the adapter), §12 (security), §13 (size), §14 (tests), §15 (docs), §16 (Phase 3), §18.1 to §18.4 (the decisions the proposal proceeds on). Phases 1 and 2 are done: `docs/superpowers/plans/2026-09-05-inspect-phase-1.md`, `docs/superpowers/plans/2026-09-05-inspect-phase-2.md`.

## Global Constraints

- Every source file and doc is English. Docs use the terminology of `AGENTS.md` §4: Entity, Entity Tree, Token, Shadow Object, `ComponentContext`, "Entity Context"; `pnpm lint:terms` checks the docs and READMEs.
- The dependency direction of the proposal's §5 holds: `src/model-context/` imports `ShadowEnv`, the snapshot types and `ConsoleLogger`, and never the Kernel, `Entity` or `Registry`. `src/inspect/` keeps importing nothing from `view/` or `model-context/`, and stays free of DOM globals -- it is in the inline worker bundle.
- `src/model-context.ts` is a subpath entry, not an `index.ts` export. `index.ts`, `shadow-objects.ts`, `bundle.ts` and `elements.ts` are not touched. The `sideEffects` lists in `package.json` and `package.override.json` are not touched: the new modules register nothing on import.
- Importing the subpath must throw nowhere -- a worker, Node, happy-dom, a browser without WebMCP. `document` and `navigator` are read only inside `findModelContext()`, and only through `globalThis`.
- Every tool carries `annotations: {readOnlyHint: true, untrustedContentHint: true}`; nothing here writes into a Kernel or a View. Every tool name is `${toolPrefix}${name}`, default prefix `'shae-'`, the five names `list-envs`, `get-entity-tree`, `get-entity`, `find-entities`, `get-registry`, registered in that order.
- Every tool result is the envelope `{content: [{type: 'text', text}], structuredContent?, isError?}`: a short human-readable summary, a blank line, then the JSON of `structuredContent`. A refusal the tool can phrase -- an unknown namespace, a missing criterion, an unknown uuid, an input of the wrong type, a failure the environment reported -- is `{content: [{type: 'text', text}], isError: true}` and never a rejection. Only an aborted `options.signal` rejects `execute()`.
- `tsconfig.json` has `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`: an optional field is written only when it has a value; indexed reads are guarded or `!`-asserted with a reason.
- The published `dist/` gains exactly the 48 files Task 4 lists and one `exports` entry; `src/distContract.files.txt` and `src/distContract.package.json` are updated in the same task, and the change is recorded in `packages/shadow-objects/CHANGELOG.md`. `dist/bundle.js` grows only by the search and the ancestors in the snapshot builder; the delta is measured (Task 6) and recorded.
- `pnpm lint:ci` exits 1 on any Biome warning.
- Every commit message has a subject in the repo's style -- `<type>: <lowercase sentence describing what now holds>` -- and a body of one to three sentences saying why, then the two trailers below, verbatim:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA
```

- Running numbers of an audit or review report never appear in code, tests, docs or commits.

## Deviations from the proposal, decided here

Task 6 writes these into the proposal so spec and code agree.

1. **`filter` is a public field of `InspectRequest`** (§10.4 keeps it internal). It crosses the wire as part of the request, it shapes the public `KernelSnapshot` (the new `search` field), and a developer in a console gets `env.inspect({filter: {token: 'enemy'}})` for free. A field that is on the wire and in the output is public whether the type admits it or not. Under a `filter` the Kernel side walks every Entity and carries `roots: []`; `maxDepth`, `maxNodes` and `rootUuids` do not apply to a search, and `include` does not restrict what the search reads. The View side ignores `filter`.
2. **`EntityNodeSnapshot.ancestors`** is new: set on every node the request named in `rootUuids`, the chain from the root down to the parent, empty for a root, absent on a natural walk. §10.3 asks `shae-get-entity` for the ancestor chain, and without this field the tool would need one round trip per level.
3. **One result shape whether one environment or all were asked.** `shae-get-entity-tree` answers `{envs: EnvSnapshot[]}`, `shae-get-entity` answers `{matches: [{namespace, entity, ancestors, view?, truncation?}], errors?}`, `shae-find-entities` answers `{results: [{namespace, matches, total, error?}]}`, `shae-get-registry` answers `{registries: [{namespace, kind, registry?, error?}]}`, `shae-list-envs` answers `{envs: EnvSummary[]}`. §10.3 and §10.4 give a flat single-environment shape and say a uuid found twice comes back "labelled" -- a list is that label, and an agent parses one shape instead of two.
4. **Refusals are `isError: true` results, not thrown errors.** §10 says nothing about failures. Chromium turns a rejected `execute()` into `UnknownError: Tool was executed but the invocation failed` and drops the message; a result with `isError` keeps the wording the agent needs. Only the caller's abort rejects.
5. **`execute(input: unknown, …)`** in `ModelContextToolLike` (§11.3 writes `input: object`). The platform hands over whatever it parsed; `null` is valid JSON. The tools read the input through a typed reader that treats anything but an object as empty.
6. **Two e2e pages instead of one** (§14 names one spec). `pages/model-context.html` drives the tools through a fake `ModelContextLike` handed in as `options.modelContext` and runs in all three engines; `pages/model-context-platform.html` registers on the real `document.modelContext` and its spec skips outside Chromium with a named reason. The platform facts the page is written against, measured on 2026-09-05 with Playwright 1.62.1 / Chromium 151: `--enable-features=WebMCP` is the launch flag; `registerTool(tool, {signal})` returns a promise and rejects a duplicate name with `InvalidStateError`; aborting the signal takes the tool back; `getTools()` returns registered tools whose `inputSchema` is a JSON string; `executeTool(tool, input)` takes a registered tool object from `getTools()` and the input as a JSON **string**, and hands the parsed object to `execute` with no options; a throw inside `execute` surfaces as `UnknownError`; reading `navigator.modelContext` logs a deprecation warning, so the adapter reads `document.modelContext` first and the other only as a fallback.

## File structure

| File | Responsibility |
| :--- | :--- |
| `packages/shadow-objects/src/inspect/types.ts` | `EntityFilter`, `EntityMatch`, `EntitySearchSnapshot`; `InspectRequest.filter`, `KernelSnapshot.search`, `EntityNodeSnapshot.ancestors` |
| `packages/shadow-objects/src/inspect/normalizeInspectRequest.ts` | `NormalizedEntityFilter`, the `filter` defaults |
| `packages/shadow-objects/src/inspect/createKernelSnapshot.ts` | the search walk and the ancestor chain |
| `packages/shadow-objects/src/model-context/ModelContextLike.ts` | the structural platform contract and `findModelContext()` |
| `packages/shadow-objects/src/model-context/redactProps.ts` | `RedactRule`, `toRedactPredicate()`, `redactSnapshot()` |
| `packages/shadow-objects/src/model-context/toolSupport.ts` | `ToolContext`, `ToolInput`, `ToolError`, `runTool()`, `buildRequest()`, `inspectEnvs()`, the result helpers, the shared descriptions |
| `packages/shadow-objects/src/model-context/tools/listEnvs.ts`, `getEntityTree.ts`, `getEntity.ts`, `findEntities.ts`, `getRegistry.ts` | one factory per tool |
| `packages/shadow-objects/src/model-context/tools/index.ts` | `createTools(ctx)` in the fixed order |
| `packages/shadow-objects/src/model-context/exposeShadowEnvsToModelContext.ts` | `ExposeOptions`, `ExposeHandle`, the function |
| `packages/shadow-objects/src/model-context.ts` | the subpath entry: the function, `findModelContext`, the types |
| `packages/shadow-objects/package.json`, `src/distContract.files.txt`, `src/distContract.package.json` | the `./model-context.js` export and the 48 new dist files |
| `packages/shadow-objects/src/inspect/createKernelSnapshot.spec.ts`, `src/model-context/redactProps.spec.ts`, `toolSupport.spec.ts`, `tools/tools.spec.ts`, `exposeShadowEnvsToModelContext.spec.ts` | unit specs |
| `packages/shadow-objects-e2e/playwright.config.ts` | the Chromium launch flag |
| `packages/shadow-objects-e2e/pages/model-context.html`, `src/model-context.js`, `tests/model-context.spec.ts` | the tools through a fake adapter, three engines |
| `packages/shadow-objects-e2e/pages/model-context-platform.html`, `src/model-context-platform.js`, `tests/model-context-platform.spec.ts` | the tools through `document.modelContext`, Chromium |
| `packages/shadow-objects-e2e/README.md`, `TEST-PLAN.md` | the two pages in the tables, the counts |
| `packages/shadow-objects/docs/api-reference.md`, `guides.md`, `cheat-sheet.md`, `best-practices.md`, `README.md`, `CHANGELOG.md`; root `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`; the proposal | documentation and records |

---

### Task 1: Search and ancestors in the snapshot model

**Files:**
- Modify: `packages/shadow-objects/src/inspect/types.ts`
- Modify: `packages/shadow-objects/src/inspect/normalizeInspectRequest.ts`
- Modify: `packages/shadow-objects/src/inspect/createKernelSnapshot.ts`
- Test: `packages/shadow-objects/src/inspect/createKernelSnapshot.spec.ts`
- Modify: `packages/shadow-objects/docs/api-reference.md` (the `InspectRequest` table and the `KernelSnapshot` paragraphs under `ShadowEnv` → `inspect()`), `docs/cheat-sheet.md` (*Inspecting an Environment*), `packages/shadow-objects/CHANGELOG.md` (*Unreleased*)

**Interfaces:**
- Consumes: `createKernelSnapshot(kernel, request?)`, `Entity.parent`, `Entity.propKeys()`, `Entity.contextNames()`, `Kernel.tokenOf(uuid)`, `Kernel.describeShadowObjects(uuid)` -- all from phase 1.
- Produces: `InspectRequest.filter?: EntityFilter`, `KernelSnapshot.search?: EntitySearchSnapshot` with `{matches: EntityMatch[], total: number}`, `EntityMatch {uuid, token, path: string[]}`, `EntityNodeSnapshot.ancestors?: {uuid: string; token: string}[]`. Tasks 3 and 5 rely on all four.

- [ ] **Step 1: The types**

In `src/inspect/types.ts`, after the `InspectRequest` interface and before `TruncationNote`, add:

```typescript
/**
 * What an Entity has to meet to be listed by a search. Every given criterion must match; a filter
 * without criteria matches every Entity. `contextName` takes a string name only -- a symbol name
 * cannot be named from outside, and a symbol context is findable through the tree alone.
 */
export interface EntityFilter {
  /** The Entity's token, exact. */
  token?: string;
  /** A property name the Entity carries. */
  propName?: string;
  /** The display name of a Shadow Object attached to the Entity. */
  shadowObject?: string;
  /** A string Entity Context name the Entity uses or provides. */
  contextName?: string;
  /** How many matches are carried. Default 50; `total` counts every match regardless. */
  limit?: number;
}

export interface EntityMatch {
  uuid: string;
  token: string;
  /** The token chain from the root down to this Entity, its own token last. */
  path: string[];
}

/** The answer to a request that carried a `filter`. */
export interface EntitySearchSnapshot {
  matches: EntityMatch[];
  /** How many Entities matched, before `limit`. */
  total: number;
}
```

In `InspectRequest`, after the `values` field, add:

```typescript
  /**
   * Search instead of walk: every Entity that meets the filter is listed under `search`, and
   * `roots` stays empty. `maxDepth`, `maxNodes` and `rootUuids` do not apply to a search, and
   * `include` does not restrict what it reads. The View side ignores it.
   */
  filter?: EntityFilter;
```

In `EntityNodeSnapshot`, after `omittedChildren`, add:

```typescript
  /**
   * Set on a node the request named in `rootUuids`: the chain from the root down to this node's
   * parent, top down, empty for a root. Absent on a walk from the natural roots.
   */
  ancestors?: {uuid: string; token: string}[];
```

In `KernelSnapshot`, after `truncation`, add:

```typescript
  /** Present when the request carried a `filter`; `roots` is empty then. */
  search?: EntitySearchSnapshot;
```

- [ ] **Step 2: The normalizer**

In `src/inspect/normalizeInspectRequest.ts`:

Change the import line to `import type {EntityFilter, InspectInclude, InspectRequest, SerializeLimits} from './types.js';`.

Add `maxMatches: 50` to `InspectDefaults`:

```typescript
export const InspectDefaults = Object.freeze({
  maxDepth: 4,
  maxDepthCap: 64,
  maxNodes: 250,
  maxMatches: 50,
});
```

After `NormalizedInspectRequest`, add the normalized filter and extend the request:

```typescript
/** A filter with every criterion present, `undefined` where the caller gave none, and the limit filled in. */
export interface NormalizedEntityFilter {
  token: string | undefined;
  propName: string | undefined;
  shadowObject: string | undefined;
  contextName: string | undefined;
  limit: number;
}
```

Add `filter: NormalizedEntityFilter | undefined;` as the last field of `NormalizedInspectRequest`.

After `clampNodes`, add:

```typescript
const clampMatches = (limit: number | undefined): number => {
  if (limit === undefined) return InspectDefaults.maxMatches;
  if (!Number.isFinite(limit)) return Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.floor(limit));
};

const normalizeFilter = (filter: EntityFilter | undefined): NormalizedEntityFilter | undefined =>
  filter === undefined
    ? undefined
    : {
        token: filter.token,
        propName: filter.propName,
        shadowObject: filter.shadowObject,
        contextName: filter.contextName,
        limit: clampMatches(filter.limit),
      };
```

And in `normalizeInspectRequest`, add `filter: normalizeFilter(request?.filter),` after `limits`.

- [ ] **Step 3: The failing tests**

Append to `src/inspect/createKernelSnapshot.spec.ts`, inside the top-level `describe('createKernelSnapshot', …)` block (the file's `makeScene()` builds `root (provider) > child (consumer, speed=3) > grandchild (consumer)` and `lonely (lonely)`; the display names are `Provider`, `Consumer`, `Lonely`):

```typescript
  describe('search', () => {
    it('lists every entity the filter matches, with its token path, and carries no tree', async () => {
      const {kernel, uuids} = await makeScene();

      const snapshot = createKernelSnapshot(kernel, {filter: {token: 'consumer'}});

      expect(snapshot.roots).toEqual([]);
      expect(snapshot.truncation).toBeUndefined();
      expect(snapshot.counts.entities, 'the counts still describe the whole kernel').toBe(4);
      expect(snapshot.search).toEqual({
        total: 2,
        matches: [
          {uuid: uuids.child, token: 'consumer', path: ['provider', 'consumer']},
          {uuid: uuids.grandchild, token: 'consumer', path: ['provider', 'consumer', 'consumer']},
        ],
      });

      kernel.destroy();
    });

    it('matches on a property name, a shadow object, a context name, and all of them at once', async () => {
      const {kernel, uuids} = await makeScene();
      const found = (filter: EntityFilter) => createKernelSnapshot(kernel, {filter}).search?.matches.map((m) => m.uuid);

      expect(found({propName: 'speed'})).toEqual([uuids.child]);
      expect(found({shadowObject: 'Lonely'})).toEqual([uuids.lonely]);
      expect(found({contextName: 'clock'}), 'a used global context counts').toEqual([uuids.lonely]);
      expect(found({contextName: 'theme'}), 'provided and used alike').toEqual([uuids.root, uuids.child, uuids.grandchild]);
      expect(found({token: 'consumer', contextName: 'theme', propName: 'speed'})).toEqual([uuids.child]);
      expect(found({token: 'nobody'})).toEqual([]);
      expect(found({}), 'an empty filter matches everything').toHaveLength(4);

      kernel.destroy();
    });

    it('keeps the total past the limit and cuts the list', async () => {
      const {kernel, uuids} = await makeScene();

      const {search} = createKernelSnapshot(kernel, {filter: {token: 'consumer', limit: 1}});

      expect(search).toEqual({total: 2, matches: [{uuid: uuids.child, token: 'consumer', path: ['provider', 'consumer']}]});

      kernel.destroy();
    });

    it('ignores the walk limits and the include list', async () => {
      const {kernel, uuids} = await makeScene();

      const snapshot = createKernelSnapshot(kernel, {
        filter: {propName: 'speed', shadowObject: 'Consumer', contextName: 'theme'},
        maxDepth: 0,
        maxNodes: 1,
        include: [],
        rootUuids: [uuids.lonely],
      });

      expect(snapshot.search).toEqual({total: 1, matches: [{uuid: uuids.child, token: 'consumer', path: ['provider', 'consumer']}]});
      expect(snapshot.truncation).toBeUndefined();
      expect(snapshot.registry).toBeUndefined();

      kernel.destroy();
    });
  });

  describe('ancestors', () => {
    it('names the chain above a requested root, top down', async () => {
      const {kernel, uuids} = await makeScene();

      const snapshot = createKernelSnapshot(kernel, {rootUuids: [uuids.grandchild]});

      expect(snapshot.roots[0]?.ancestors).toEqual([
        {uuid: uuids.root, token: 'provider'},
        {uuid: uuids.child, token: 'consumer'},
      ]);

      kernel.destroy();
    });

    it('is empty for a requested root without a parent, and absent on a natural walk', async () => {
      const {kernel, uuids} = await makeScene();

      expect(createKernelSnapshot(kernel, {rootUuids: [uuids.root]}).roots[0]?.ancestors).toEqual([]);
      expect(createKernelSnapshot(kernel).roots[0]?.ancestors).toBeUndefined();

      kernel.destroy();
    });
  });
```

`EntityFilter` joins the existing `import type {EntityNodeSnapshot} from './types.js';` line at the top of the spec.

- [ ] **Step 4: Run the tests, see them fail**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect/createKernelSnapshot.spec.ts --run`
Expected: the seven new cases fail (`search` is `undefined`, `ancestors` is `undefined`); the existing cases pass.

- [ ] **Step 5: The builder**

In `src/inspect/createKernelSnapshot.ts`:

Extend the type import from `./types.js` with `EntityMatch`, `EntitySearchSnapshot`. Change the import from `./normalizeInspectRequest.js` to `import {NodeBudget, type NormalizedEntityFilter, type NormalizedInspectRequest, normalizeInspectRequest} from './normalizeInspectRequest.js';`.

Replace the `build()` method with:

```typescript
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
    if (propName !== undefined && !entity.propKeys().includes(propName)) return false;
    if (shadowObject !== undefined && !this.#describe(entity.uuid).some((d) => d.displayName === shadowObject)) return false;
    if (contextName !== undefined && !entity.contextNames().includes(contextName)) return false;
    return true;
  }
```

The old root loop that lived inside `build()` is gone with this; `#roots()`, `#node()`, `#children()` and the rest stay as they are. If `Entity.parent` is not a public getter (it is used by `#sourceOf` in this file already, so it is), stop and report.

- [ ] **Step 6: Run the tests, see them pass**

Run: `cd packages/shadow-objects && pnpm exec vitest src/inspect/createKernelSnapshot.spec.ts src/inspect/createViewSnapshot.spec.ts src/view/ShadowEnv.spec.ts --run`
Expected: all pass. Then `pnpm typecheck` and `pnpm lint` from the repo root: clean.

- [ ] **Step 7: The docs for the two request additions**

`packages/shadow-objects/docs/api-reference.md`, in the `##### InspectRequest` table under `#### inspect(request?, signal?)`, add a last row:

```markdown
| `filter` | none | Search instead of walk: `{token?, propName?, shadowObject?, contextName?, limit?}`. Every Entity that meets every given criterion is listed under `kernel.search`, and `roots` stays empty; `maxDepth`, `maxNodes` and `rootUuids` do not apply, `include` does not restrict what the search reads, and the View side ignores it. `limit` defaults to `50`; `total` counts every match regardless. A symbol context name cannot be named here |
```

In the paragraph beginning "Both halves of the snapshot are cut by the same request." append the sentence:

```markdown
A node the request named in `rootUuids` carries `ancestors` -- the chain from the root down to its parent, top down, `[]` for a root -- so one call answers "where does this Entity sit"; a walk from the natural roots carries none.
```

In the `##### KernelSnapshot` paragraph that starts with "`takenAt`, `thread`", replace the closing "and `truncation`." with "`truncation`, and -- when the request carried a `filter` -- `search`: `{matches: [{uuid, token, path}], total}`, where `path` is the token chain from the root down to the match, its own token last."

`packages/shadow-objects/docs/cheat-sheet.md`, in *Inspecting an Environment*, after the line `snapshot.kernel?.thread; …`, add:

```typescript
const found = await env.inspect({filter: {token: 'enemy', propName: 'hp'}});
found.kernel?.search;                      // {matches: [{uuid, token, path}], total} -- roots stay empty
const one = await env.inspect({rootUuids: [uuid], maxDepth: 1});
one.kernel?.roots[0]?.ancestors;           // [{uuid, token}] from the root down to the parent
```

`packages/shadow-objects/CHANGELOG.md`, under `## [Unreleased]` → `### New`, append:

```markdown
- **New (public API):** `InspectRequest.filter` turns an inspection into a search. `{token?, propName?, shadowObject?, contextName?, limit?}`: every Entity that meets every given criterion is listed under `KernelSnapshot.search` as `{matches: [{uuid, token, path}], total}`, with `path` the token chain from the root; `roots` stays empty, the walk limits do not apply, and the View side ignores the field. `EntityNodeSnapshot.ancestors` names the chain above a node the request named in `rootUuids`. The types `EntityFilter`, `EntityMatch` and `EntitySearchSnapshot` are exported. Both are what the model-context tools of this release are built on, and both work from a console without them.
```

- [ ] **Step 8: Commit**

```bash
git add packages/shadow-objects/src/inspect packages/shadow-objects/docs/api-reference.md packages/shadow-objects/docs/cheat-sheet.md packages/shadow-objects/CHANGELOG.md
git commit -m "feat: an inspection can search the entity tree, and a requested root knows its ancestors" -m "The two are what the find-entities and get-entity tools of the model context need in one round trip: a search ships matches instead of the tree, and a node named in rootUuids carries the chain above it." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 2: The adapter, the redaction pass, and the tool support module

**Files:**
- Create: `packages/shadow-objects/src/model-context/ModelContextLike.ts`
- Create: `packages/shadow-objects/src/model-context/redactProps.ts`
- Create: `packages/shadow-objects/src/model-context/toolSupport.ts`
- Test: `packages/shadow-objects/src/model-context/redactProps.spec.ts`, `packages/shadow-objects/src/model-context/toolSupport.spec.ts`

**Interfaces:**
- Consumes: `ShadowEnv.get(ns)`, `ShadowEnv.inspectAll(request, signal)`, `env.inspect(request, signal)`, `GlobalNS` from `constants.ts`, `NamespaceType`, the snapshot types.
- Produces (Task 3 and 4 rely on these exact names): `ModelContextLike`, `ModelContextToolLike`, `ModelContextToolResult`, `ModelContextRegisterOptions`, `ModelContextToolAnnotations`, `findModelContext()`, `isModelContextLike()`; `RedactRule`, `toRedactPredicate()`, `redactSnapshot()`; `ToolContext {prefix, limits, redact}`, `ToolInput`, `ToolError`, `runTool()`, `buildRequest()`, `inspectEnvs()`, `readInclude()`, `textResult()`, `errorResult()`, `describeEnv()`, `defineTool()`, `GlobalNamespaceName`, `toNamespace()`, `NamespaceInputSchema`.

- [ ] **Step 1: `ModelContextLike.ts`**

```typescript
/**
 * What this package needs from the platform's model context, named structurally so that the
 * rest of the code never sees `document.modelContext`. WebMCP is a moving specification: the
 * registration method changed name and semantics within six months of this file being written.
 * When it moves again, this file and `findModelContext()` are where the change lands.
 */

/**
 * The envelope every tool of this package returns. `content` is the compatibility floor every
 * agent reads; `structuredContent` is the same data for an agent that reads structured results.
 * `isError` marks a refusal the tool could phrase -- an unknown namespace, a missing criterion --
 * so that the wording reaches the agent instead of being flattened into a generic failure.
 */
export interface ModelContextToolResult {
  content: {type: 'text'; text: string}[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

export interface ModelContextToolLike {
  name: string;
  title?: string;
  description: string;
  /** A JSON Schema object. */
  inputSchema: object;
  annotations?: ModelContextToolAnnotations;
  /** `input` is whatever the platform parsed -- an object for the tools here, but nothing forces that. */
  execute(input: unknown, options?: {signal?: AbortSignal}): Promise<unknown> | unknown;
}

export interface ModelContextRegisterOptions {
  /** Aborting it takes the tool back. */
  signal?: AbortSignal;
  /** Passed through as the platform defines it; absent means the platform default. */
  exposedTo?: string[];
}

export interface ModelContextLike {
  /**
   * `unknown` rather than a promise on purpose: an early Chrome preview returned nothing, the
   * specification returns a promise, and the caller awaits whatever it gets.
   */
  registerTool(tool: ModelContextToolLike, options?: ModelContextRegisterOptions): Promise<unknown> | unknown;
}

export const isModelContextLike = (value: unknown): value is ModelContextLike =>
  typeof value === 'object' && value !== null && typeof (value as {registerTool?: unknown}).registerTool === 'function';

/**
 * The platform's model context, or `undefined` where there is none: a worker, Node, a browser
 * without WebMCP, an insecure context. `document.modelContext` is the current name and is read
 * first; `navigator.modelContext` is the older one, and reading it where the document carries
 * the object logs a deprecation warning in Chromium, so it is touched only as the fallback.
 */
export function findModelContext(): ModelContextLike | undefined {
  const doc = (globalThis as {document?: {modelContext?: unknown}}).document;
  const fromDocument = doc?.modelContext;
  if (isModelContextLike(fromDocument)) return fromDocument;
  const nav = (globalThis as {navigator?: {modelContext?: unknown}}).navigator;
  const fromNavigator = nav?.modelContext;
  if (isModelContextLike(fromNavigator)) return fromNavigator;
  return undefined;
}
```

- [ ] **Step 2: `redactProps.ts`**

```typescript
import type {EnvSnapshot, PropSnapshot} from '../inspect/types.js';

/** Property names whose values are hidden: a list of names, or a predicate over name and Entity uuid. */
export type RedactRule = string[] | ((name: string, uuid: string) => boolean);

export type RedactPredicate = (name: string, uuid: string) => boolean;

export const toRedactPredicate = (rule: RedactRule | undefined): RedactPredicate | undefined => {
  if (rule === undefined) return undefined;
  if (typeof rule === 'function') return rule;
  const names = new Set(rule);
  return (name) => names.has(name);
};

interface NodeWithProps {
  uuid: string;
  props?: PropSnapshot[];
  children?: NodeWithProps[];
}

const redactNode = (node: NodeWithProps, redact: RedactPredicate): void => {
  for (const prop of node.props ?? []) {
    // `routes` stays: whether a value routes is not the value
    if (redact(prop.name, node.uuid)) prop.value = {$type: 'redacted'};
  }
  for (const child of node.children ?? []) redactNode(child, redact);
};

/**
 * Replaces the value of every property the rule names by `{$type: 'redacted'}`, on the Kernel's
 * Entities and the View's components alike, in place. Property values only: an Entity Context
 * that carries the same secret is not covered, and the docs say so. In place is safe because a
 * snapshot is built fresh for every call -- plain data from the builder, or a structured clone
 * from the worker -- and nobody else holds it.
 */
export function redactSnapshot(snapshot: EnvSnapshot, redact: RedactPredicate): EnvSnapshot {
  for (const root of snapshot.kernel?.roots ?? []) redactNode(root, redact);
  for (const root of snapshot.view?.roots ?? []) redactNode(root, redact);
  return snapshot;
}
```

- [ ] **Step 3: `toolSupport.ts`**

```typescript
import {GlobalNS} from '../constants.js';
import type {EnvSnapshot, InspectInclude, InspectRequest} from '../inspect/types.js';
import type {NamespaceType} from '../types.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import type {ModelContextToolAnnotations, ModelContextToolLike, ModelContextToolResult} from './ModelContextLike.js';
import {type RedactPredicate, redactSnapshot} from './redactProps.js';

/** What every tool shares: the name prefix, the defaults of the exposure, and the redaction rule. */
export interface ToolContext {
  prefix: string;
  /** Defaults for every call; the call's own input wins field by field. */
  limits: Partial<InspectRequest>;
  redact: RedactPredicate | undefined;
}

/** Every tool declares both: nothing here writes, and every value may be what a user typed. */
export const ReadOnlyAnnotations: Readonly<ModelContextToolAnnotations> = Object.freeze({
  readOnlyHint: true,
  untrustedContentHint: true,
});

const namespaceName = (ns: NamespaceType): string => (typeof ns === 'symbol' ? (ns.description ?? '') : ns);

/** The global namespace as a tool names it: the description of its symbol, the same string `EnvSnapshot.namespace` carries. */
export const GlobalNamespaceName: string = namespaceName(GlobalNS);

/** The namespace a tool input names, as `ShadowEnv.get()` takes it. */
export const toNamespace = (name: string): NamespaceType => (name === GlobalNamespaceName ? GlobalNS : name);

export const NamespaceInputSchema = Object.freeze({
  type: 'string',
  description: `The namespace of one Shadow Environment, as the list-envs tool reports it; the global namespace is "${GlobalNamespaceName}". Without it, every environment answers.`,
});

/** A refusal the tool can phrase. `runTool()` turns it into an error result with the bare message. */
export class ToolError extends Error {
  override name = 'ToolError';
}

/**
 * A typed reader over whatever the platform handed to `execute`: anything but an object reads as
 * empty, a missing or `null` field is `undefined`, a field of the wrong type is a `ToolError`.
 */
export class ToolInput {
  readonly #raw: Record<string, unknown>;

  constructor(input: unknown) {
    this.#raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  }

  string(key: string): string | undefined {
    const val = this.#raw[key];
    if (val === undefined || val === null) return undefined;
    if (typeof val !== 'string') throw new ToolError(`"${key}" must be a string`);
    return val;
  }

  requiredString(key: string): string {
    const val = this.string(key);
    if (val === undefined || val === '') throw new ToolError(`"${key}" is required`);
    return val;
  }

  number(key: string): number | undefined {
    const val = this.#raw[key];
    if (val === undefined || val === null) return undefined;
    if (typeof val !== 'number' || Number.isNaN(val)) throw new ToolError(`"${key}" must be a number`);
    return val;
  }

  stringList(key: string): string[] | undefined {
    const val = this.#raw[key];
    if (val === undefined || val === null) return undefined;
    if (!Array.isArray(val) || !val.every((item) => typeof item === 'string')) {
      throw new ToolError(`"${key}" must be a list of strings`);
    }
    return val as string[];
  }
}

const Includes: readonly InspectInclude[] = ['props', 'shadowObjects', 'contexts', 'registry'];

export const readInclude = (input: ToolInput): InspectInclude[] | undefined => {
  const list = input.stringList('include');
  if (list === undefined) return undefined;
  for (const item of list) {
    if (!(Includes as readonly string[]).includes(item)) {
      throw new ToolError(`"include" knows only ${Includes.join(', ')}; got "${item}"`);
    }
  }
  return list as InspectInclude[];
};

export const textResult = (summary: string, structured: Record<string, unknown>): ModelContextToolResult => ({
  content: [{type: 'text', text: `${summary}\n\n${JSON.stringify(structured)}`}],
  structuredContent: structured,
});

export const errorResult = (message: string): ModelContextToolResult => ({
  content: [{type: 'text', text: message}],
  isError: true,
});

const describeFailure = (error: unknown): string => {
  if (error instanceof ToolError) return error.message;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
};

/**
 * Wraps a tool body. The input is read through `ToolInput`; a refused input and a failure inside
 * the environment come back as an error result, so the wording reaches the agent -- a platform
 * that sees a rejection reports a generic failure and drops the message. Only the caller's own
 * abort rejects.
 */
export const runTool =
  (body: (input: ToolInput, signal: AbortSignal | undefined) => Promise<ModelContextToolResult>) =>
  async (input: unknown, options?: {signal?: AbortSignal}): Promise<ModelContextToolResult> => {
    const signal = options?.signal;
    try {
      return await body(new ToolInput(input), signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      return errorResult(describeFailure(error));
    }
  };

/** The request of one call: the exposure's defaults under the call's own fields, `values` merged one level down. */
export const buildRequest = (limits: Partial<InspectRequest>, own: InspectRequest): InspectRequest => {
  const request: InspectRequest = {...limits, ...own};
  if (limits.values !== undefined || own.values !== undefined) request.values = {...limits.values, ...own.values};
  return request;
};

/**
 * The environments a call addresses -- one by namespace, or every one that holds a namespace --
 * each described by `ShadowEnv.inspect()` and redacted where the exposure asks for it. An
 * unknown namespace is a `ToolError`; an environment that cannot answer costs its own entry,
 * with the reason under `error`, exactly as `inspectAll()` reports it.
 */
export const inspectEnvs = async (
  namespace: string | undefined,
  request: InspectRequest,
  signal: AbortSignal | undefined,
  ctx: ToolContext,
): Promise<EnvSnapshot[]> => {
  let snapshots: EnvSnapshot[];
  if (namespace === undefined) {
    snapshots = await ShadowEnv.inspectAll(request, signal);
  } else {
    const env = ShadowEnv.get(toNamespace(namespace));
    if (env === undefined) throw new ToolError(`no Shadow Environment holds the namespace "${namespace}"`);
    snapshots = [await env.inspect(request, signal)];
  }
  if (ctx.redact !== undefined) {
    for (const snapshot of snapshots) redactSnapshot(snapshot, ctx.redact);
  }
  return snapshots;
};

/** One line per environment, for the text half of a result. */
export const describeEnv = (s: EnvSnapshot): string => {
  const parts = [s.kind, s.state.isReady ? 'ready' : 'not ready'];
  if (s.kernel !== undefined) parts.push(`${s.kernel.counts.entities} entities`);
  if (s.error !== undefined) parts.push(`error: ${s.error.name}: ${s.error.message}`);
  return `${s.namespace} (${parts.join(', ')})`;
};

export const NoEnvironments = 'no Shadow Environment holds a namespace';

export const defineTool = (
  ctx: ToolContext,
  name: string,
  tool: Omit<ModelContextToolLike, 'name' | 'annotations'>,
): ModelContextToolLike => ({
  name: `${ctx.prefix}${name}`,
  annotations: {...ReadOnlyAnnotations},
  ...tool,
});
```

- [ ] **Step 4: The specs**

`src/model-context/redactProps.spec.ts`:

```typescript
import {describe, expect, it} from 'vitest';
import type {EnvSnapshot} from '../inspect/types.js';
import {redactSnapshot, toRedactPredicate} from './redactProps.js';

const snapshot = (): EnvSnapshot => ({
  namespace: 'ns',
  isGlobalNamespace: false,
  kind: 'local',
  state: {viewReady: true, proxyReady: true, isReady: true, isDestroyed: false},
  view: {
    takenAt: 1,
    counts: {components: 2, roots: 1},
    roots: [
      {
        uuid: 'a',
        token: 'a',
        order: 0,
        childCount: 1,
        props: [{name: 'secret', value: 's', routes: true}],
        children: [{uuid: 'b', token: 'b', order: 0, parentUuid: 'a', childCount: 0, props: [{name: 'secret', value: 't', routes: true}]}],
      },
    ],
  },
  kernel: {
    takenAt: 1,
    thread: 'main',
    counts: {entities: 2, roots: 1, shadowObjects: 0},
    globalContexts: [],
    roots: [
      {
        uuid: 'a',
        token: 'a',
        order: 0,
        autoDestructionOnParentRemoval: false,
        childCount: 1,
        props: [
          {name: 'secret', value: 's', routes: true},
          {name: 'open', value: 1, routes: true},
        ],
        children: [
          {uuid: 'b', token: 'b', order: 0, parentUuid: 'a', autoDestructionOnParentRemoval: false, childCount: 0, props: [{name: 'secret', value: 't', routes: true}]},
        ],
      },
    ],
  },
});

describe('redactSnapshot', () => {
  it('replaces the named values on both halves, down the tree, and keeps routes', () => {
    const s = redactSnapshot(snapshot(), toRedactPredicate(['secret'])!);

    expect(s.kernel?.roots[0]?.props).toEqual([
      {name: 'secret', value: {$type: 'redacted'}, routes: true},
      {name: 'open', value: 1, routes: true},
    ]);
    expect(s.kernel?.roots[0]?.children?.[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
    expect(s.view?.roots[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
    expect(s.view?.roots[0]?.children?.[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
  });

  it('hands a predicate the name and the uuid', () => {
    const s = redactSnapshot(snapshot(), toRedactPredicate((name, uuid) => name === 'secret' && uuid === 'b')!);

    expect(s.kernel?.roots[0]?.props?.[0]?.value).toBe('s');
    expect(s.kernel?.roots[0]?.children?.[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
  });

  it('is a no-op on an environment without halves, and undefined without a rule', () => {
    const bare: EnvSnapshot = {namespace: '', isGlobalNamespace: false, kind: 'none', state: {viewReady: false, proxyReady: false, isReady: false, isDestroyed: false}};
    expect(redactSnapshot(bare, () => true)).toEqual(bare);
    expect(toRedactPredicate(undefined)).toBeUndefined();
  });
});
```

`src/model-context/toolSupport.spec.ts`:

```typescript
import {afterEach, describe, expect, it} from 'vitest';
import {GlobalNS} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {
  buildRequest,
  describeEnv,
  errorResult,
  GlobalNamespaceName,
  inspectEnvs,
  readInclude,
  runTool,
  textResult,
  type ToolContext,
  ToolError,
  ToolInput,
  toNamespace,
} from './toolSupport.js';

const ctx = (): ToolContext => ({prefix: 'shae-', limits: {}, redact: undefined});

describe('toolSupport', () => {
  describe('ToolInput', () => {
    it('reads typed fields and treats anything but an object as empty', () => {
      const input = new ToolInput({a: 'x', n: 2, list: ['p', 'q'], nil: null});
      expect(input.string('a')).toBe('x');
      expect(input.number('n')).toBe(2);
      expect(input.stringList('list')).toEqual(['p', 'q']);
      expect(input.string('nil')).toBeUndefined();
      expect(input.string('missing')).toBeUndefined();
      expect(new ToolInput(null).string('a')).toBeUndefined();
      expect(new ToolInput('text').number('n')).toBeUndefined();
    });

    it('refuses a field of the wrong type, and a missing required one', () => {
      const input = new ToolInput({a: 1, n: 'two', list: [1], empty: ''});
      expect(() => input.string('a')).toThrow(ToolError);
      expect(() => input.number('n')).toThrow('"n" must be a number');
      expect(() => input.stringList('list')).toThrow('"list" must be a list of strings');
      expect(() => input.requiredString('empty')).toThrow('"empty" is required');
      expect(() => input.requiredString('missing')).toThrow('"missing" is required');
    });

    it('checks the include list against the four names', () => {
      expect(readInclude(new ToolInput({}))).toBeUndefined();
      expect(readInclude(new ToolInput({include: ['props', 'registry']}))).toEqual(['props', 'registry']);
      expect(() => readInclude(new ToolInput({include: ['nope']}))).toThrow('"include" knows only');
    });
  });

  describe('runTool', () => {
    it('answers a refusal and a failure as error results, and rejects only for an abort', async () => {
      const refused = runTool(async () => {
        throw new ToolError('no such thing');
      });
      expect(await refused({})).toEqual(errorResult('no such thing'));

      const failed = runTool(async () => {
        throw new RangeError('too deep');
      });
      expect(await failed({})).toEqual(errorResult('RangeError: too deep'));

      const controller = new AbortController();
      const reason = new Error('stop');
      const aborted = runTool(async (_input, signal) => {
        controller.abort(reason);
        throw signal?.reason;
      });
      await expect(aborted({}, {signal: controller.signal})).rejects.toBe(reason);
    });
  });

  describe('buildRequest', () => {
    it('lets the call win over the defaults, one level down for values', () => {
      expect(buildRequest({maxDepth: 2, values: {maxDepth: 1, maxStringLength: 10}}, {maxDepth: 5, values: {maxDepth: 3}})).toEqual({
        maxDepth: 5,
        values: {maxDepth: 3, maxStringLength: 10},
      });
      expect(buildRequest({}, {})).toEqual({});
    });
  });

  describe('namespaces', () => {
    it('names the global namespace by its symbol description, both ways', () => {
      expect(GlobalNamespaceName).toBe('ShadowObjectsGlobalNS');
      expect(toNamespace(GlobalNamespaceName)).toBe(GlobalNS);
      expect(toNamespace('game')).toBe('game');
    });
  });

  describe('inspectEnvs', () => {
    afterEach(() => {
      for (const ns of ['ts-a', 'ts-b']) {
        ShadowEnv.get(ns)?.destroy();
        ComponentContext.get(ns).dispose();
      }
    });

    it('asks one environment by namespace, or every one, and refuses an unknown name', async () => {
      const a = new ShadowEnv();
      a.view = ComponentContext.get('ts-a');
      a.envProxy = new LocalShadowObjectEnv();
      const vc = new ViewComponent('thing', {context: a.view});
      vc.setProperty('secret', 'hunter2');
      const b = new ShadowEnv();
      b.view = ComponentContext.get('ts-b');
      b.envProxy = new LocalShadowObjectEnv();
      await Promise.all([a.syncWait(), b.syncWait()]);

      const one = await inspectEnvs('ts-a', {}, undefined, ctx());
      expect(one.map((s) => s.namespace)).toEqual(['ts-a']);
      expect(one[0]?.kernel?.roots[0]?.props?.[0]?.value).toBe('hunter2');

      const all = await inspectEnvs(undefined, {}, undefined, ctx());
      expect(all.map((s) => s.namespace)).toEqual(expect.arrayContaining(['ts-a', 'ts-b']));

      const redacted = await inspectEnvs('ts-a', {}, undefined, {...ctx(), redact: (name) => name === 'secret'});
      expect(redacted[0]?.kernel?.roots[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});
      expect(redacted[0]?.view?.roots[0]?.props?.[0]?.value).toEqual({$type: 'redacted'});

      await expect(inspectEnvs('nope', {}, undefined, ctx())).rejects.toThrow('no Shadow Environment holds the namespace "nope"');
    });
  });

  describe('results', () => {
    it('carries the summary, a blank line and the JSON in the text, and the data in structuredContent', () => {
      const result = textResult('one thing', {things: [1]});
      expect(result).toEqual({content: [{type: 'text', text: 'one thing\n\n{"things":[1]}'}], structuredContent: {things: [1]}});
      expect(errorResult('nope')).toEqual({content: [{type: 'text', text: 'nope'}], isError: true});
    });

    it('describes an environment in one line', () => {
      expect(
        describeEnv({
          namespace: 'game',
          isGlobalNamespace: false,
          kind: 'worker',
          state: {viewReady: true, proxyReady: true, isReady: true, isDestroyed: false},
          kernel: {takenAt: 0, thread: 'worker', counts: {entities: 12, roots: 1, shadowObjects: 3}, roots: [], globalContexts: []},
        }),
      ).toBe('game (worker, ready, 12 entities)');
      expect(
        describeEnv({
          namespace: 'ui',
          isGlobalNamespace: false,
          kind: 'custom',
          state: {viewReady: true, proxyReady: false, isReady: false, isDestroyed: false},
          error: {name: 'NotInspectable', message: 'no'},
        }),
      ).toBe('ui (custom, not ready, error: NotInspectable: no)');
    });
  });
});
```

- [ ] **Step 5: Run the specs**

Run: `cd packages/shadow-objects && pnpm exec vitest src/model-context --run`
Expected: all pass. Then from the root `pnpm typecheck` and `pnpm lint`: clean. If `ViewComponent`'s constructor refuses `{context: a.view}` because `view` is typed `ComponentContext | undefined`, hold the context in a local (`const ctxA = ComponentContext.get('ts-a')`) and pass that.

- [ ] **Step 6: Commit**

```bash
git add packages/shadow-objects/src/model-context
git commit -m "feat: the model-context layer gets its platform adapter, its redaction pass and the tool support" -m "Everything the five tools share lives in three modules: the structural contract for document.modelContext, the pass that hides named property values on both halves of a snapshot, and the reader, result envelope and environment lookup a tool body is written against." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 3: The five tools

**Files:**
- Create: `packages/shadow-objects/src/model-context/tools/listEnvs.ts`, `getEntityTree.ts`, `getEntity.ts`, `findEntities.ts`, `getRegistry.ts`, `index.ts`
- Test: `packages/shadow-objects/src/model-context/tools/tools.spec.ts`

**Interfaces:**
- Consumes: everything Task 2 produces; `InspectRequest.filter`, `KernelSnapshot.search`, `EntityNodeSnapshot.ancestors` from Task 1.
- Produces: `createTools(ctx: ToolContext): ModelContextToolLike[]` -- five tools in the order list-envs, get-entity-tree, get-entity, find-entities, get-registry; the exported summary types `EnvSummary`, `EntityMatchEntry`, `FindEntitiesEntry`, `RegistryEntry`. Task 4 registers what `createTools()` returns; Task 5 and 6 rely on the structured shapes below.

- [ ] **Step 1: `tools/listEnvs.ts`**

```typescript
import type {EnvSnapshot} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {buildRequest, defineTool, describeEnv, inspectEnvs, NoEnvironments, runTool, textResult, type ToolContext} from '../toolSupport.js';

/** An environment reduced to what a first call needs: identity, state, counts. No tree. */
export interface EnvSummary {
  namespace: string;
  isGlobalNamespace: boolean;
  kind: EnvSnapshot['kind'];
  state: EnvSnapshot['state'];
  view?: {takenAt: number; counts: {components: number; roots: number}};
  kernel?: {takenAt: number; thread: 'main' | 'worker'; counts: {entities: number; roots: number; shadowObjects: number}};
  error?: {name: string; message: string};
}

export const toEnvSummary = (s: EnvSnapshot): EnvSummary => {
  const summary: EnvSummary = {namespace: s.namespace, isGlobalNamespace: s.isGlobalNamespace, kind: s.kind, state: s.state};
  if (s.view !== undefined) summary.view = {takenAt: s.view.takenAt, counts: s.view.counts};
  if (s.kernel !== undefined) summary.kernel = {takenAt: s.kernel.takenAt, thread: s.kernel.thread, counts: s.kernel.counts};
  if (s.error !== undefined) summary.error = s.error;
  return summary;
};

export const createListEnvsTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'list-envs', {
    title: 'List Shadow Environments',
    description:
      'Every Shadow Environment on the page: its namespace, kind (local, worker, custom, none), state, and the counts of View components and Kernel Entities. Carries no tree. The cheapest call and the one to make first; every other tool takes a namespace from this list.',
    inputSchema: {type: 'object', properties: {}, additionalProperties: false},
    execute: runTool(async (_input, signal) => {
      // the counts are computed over the whole kernel regardless of the walk, so the walk is cut to nothing
      const snapshots = await inspectEnvs(undefined, buildRequest(ctx.limits, {maxDepth: 0, maxNodes: 1, include: []}), signal, ctx);
      const envs = snapshots.map(toEnvSummary);
      const summary =
        envs.length === 0
          ? NoEnvironments
          : `${envs.length} Shadow Environment${envs.length === 1 ? '' : 's'}: ${snapshots.map(describeEnv).join('; ')}`;
      return textResult(summary, {envs});
    }),
  });
```

- [ ] **Step 2: `tools/getEntityTree.ts`**

```typescript
import type {InspectRequest} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {
  buildRequest,
  defineTool,
  describeEnv,
  inspectEnvs,
  NamespaceInputSchema,
  NoEnvironments,
  readInclude,
  runTool,
  textResult,
  type ToolContext,
} from '../toolSupport.js';

export const createGetEntityTreeTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'get-entity-tree', {
    title: 'Get Entity Tree',
    description:
      "The Entity Tree of one Shadow Environment, or of every one: per Entity its token, properties, Shadow Objects and Entity Contexts, next to the View's component tree of the same namespace. A cut walk carries truncation notes naming the uuids where it stopped; descend from there with rootUuid.",
    inputSchema: {
      type: 'object',
      properties: {
        namespace: NamespaceInputSchema,
        rootUuid: {type: 'string', description: 'Descend from this Entity instead of the roots.'},
        maxDepth: {type: 'integer', minimum: 0, description: 'Tree depth below each root that is walked. Default 4.'},
        maxNodes: {type: 'integer', minimum: 1, description: 'Total number of Entities across the walk. Default 250.'},
        include: {
          type: 'array',
          items: {type: 'string', enum: ['props', 'shadowObjects', 'contexts', 'registry']},
          description: 'What to carry per Entity. Default: all four.',
        },
        valueDepth: {type: 'integer', minimum: 0, description: 'How deep nested property and context values are followed. Default 3.'},
      },
      additionalProperties: false,
    },
    execute: runTool(async (input, signal) => {
      const own: InspectRequest = {};
      const rootUuid = input.string('rootUuid');
      if (rootUuid !== undefined) own.rootUuids = [rootUuid];
      const maxDepth = input.number('maxDepth');
      if (maxDepth !== undefined) own.maxDepth = maxDepth;
      const maxNodes = input.number('maxNodes');
      if (maxNodes !== undefined) own.maxNodes = maxNodes;
      const include = readInclude(input);
      if (include !== undefined) own.include = include;
      const valueDepth = input.number('valueDepth');
      if (valueDepth !== undefined) own.values = {maxDepth: valueDepth};

      const envs = await inspectEnvs(input.string('namespace'), buildRequest(ctx.limits, own), signal, ctx);

      const summary = envs
        .map((s) => {
          const cut = s.kernel?.truncation?.length ?? 0;
          return cut === 0 ? describeEnv(s) : `${describeEnv(s)}, ${cut} truncation note${cut === 1 ? '' : 's'}`;
        })
        .join('; ');
      return textResult(summary || NoEnvironments, {envs});
    }),
  });
```

- [ ] **Step 3: `tools/getEntity.ts`**

```typescript
import type {EntityNodeSnapshot, ViewComponentSnapshot} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {buildRequest, defineTool, describeEnv, inspectEnvs, NamespaceInputSchema, runTool, textResult, type ToolContext, ToolError} from '../toolSupport.js';

/** One Entity in one environment, with the chain above it and the View's component of the same uuid. */
export interface EntityMatchEntry {
  namespace: string;
  entity: Omit<EntityNodeSnapshot, 'ancestors'>;
  ancestors: {uuid: string; token: string}[];
  view?: ViewComponentSnapshot;
}

export const createGetEntityTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'get-entity', {
    title: 'Get Entity',
    description:
      "One Entity in full -- token, properties, Shadow Objects, Entity Contexts, its children one level down -- with the chain of ancestors above it and the View's component of the same uuid next to it, which is where a divergence between View and Kernel becomes visible. Without a namespace every environment is asked; a uuid held in more than one comes back once per environment.",
    inputSchema: {
      type: 'object',
      properties: {
        uuid: {type: 'string', description: 'The uuid of the Entity, as the tree and the search report it.'},
        namespace: NamespaceInputSchema,
      },
      required: ['uuid'],
      additionalProperties: false,
    },
    execute: runTool(async (input, signal) => {
      const uuid = input.requiredString('uuid');
      // the depth is this tool's, not the exposure's: one level of children, and the chain above
      const envs = await inspectEnvs(input.string('namespace'), buildRequest(ctx.limits, {rootUuids: [uuid], maxDepth: 1}), signal, ctx);

      const matches: EntityMatchEntry[] = [];
      for (const s of envs) {
        const node = s.kernel?.roots[0];
        if (node === undefined) continue;
        const {ancestors = [], ...entity} = node;
        const entry: EntityMatchEntry = {namespace: s.namespace, entity, ancestors};
        const view = s.view?.roots[0];
        if (view !== undefined) entry.view = view;
        matches.push(entry);
      }

      if (matches.length === 0) {
        const failed = envs.filter((s) => s.error !== undefined).map(describeEnv);
        throw new ToolError(`no Shadow Environment holds an Entity "${uuid}"${failed.length > 0 ? ` (${failed.join('; ')})` : ''}`);
      }

      const summary = matches
        .map((m) => {
          const where = m.ancestors.length === 0 ? 'a root' : `under ${m.ancestors.map((a) => a.token).join(' > ')}`;
          return `${m.namespace}: ${m.entity.token} "${m.entity.uuid}", ${where}, ${m.entity.childCount} children`;
        })
        .join('; ');
      return textResult(summary, {matches});
    }),
  });
```

- [ ] **Step 4: `tools/findEntities.ts`**

```typescript
import type {EntityFilter, EntityMatch} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {buildRequest, defineTool, inspectEnvs, NamespaceInputSchema, NoEnvironments, runTool, textResult, type ToolContext, ToolError} from '../toolSupport.js';

export interface FindEntitiesEntry {
  namespace: string;
  matches: EntityMatch[];
  /** How many matched before the limit. */
  total: number;
  error?: {name: string; message: string};
}

export const createFindEntitiesTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'find-entities', {
    title: 'Find Entities',
    description:
      'Search the Entity Tree of one Shadow Environment, or of every one, so that the answer stays small: every Entity that meets all given criteria, as uuid, token and the token path from the root. At least one criterion. The search runs where the Kernel runs and ships the matches, not the tree.',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: NamespaceInputSchema,
        token: {type: 'string', description: 'The token of the Entity, exact.'},
        propName: {type: 'string', description: 'A property name the Entity carries.'},
        shadowObject: {type: 'string', description: 'The display name of a Shadow Object attached to the Entity.'},
        contextName: {type: 'string', description: 'A string Entity Context name the Entity uses or provides.'},
        limit: {type: 'integer', minimum: 1, description: 'How many matches to carry. Default 50; total counts every match regardless.'},
      },
      additionalProperties: false,
    },
    execute: runTool(async (input, signal) => {
      const filter: EntityFilter = {};
      const token = input.string('token');
      if (token !== undefined) filter.token = token;
      const propName = input.string('propName');
      if (propName !== undefined) filter.propName = propName;
      const shadowObject = input.string('shadowObject');
      if (shadowObject !== undefined) filter.shadowObject = shadowObject;
      const contextName = input.string('contextName');
      if (contextName !== undefined) filter.contextName = contextName;
      const limit = input.number('limit');
      if (limit !== undefined) filter.limit = limit;

      if (token === undefined && propName === undefined && shadowObject === undefined && contextName === undefined) {
        throw new ToolError('at least one of token, propName, shadowObject, contextName is required');
      }

      // the Kernel side ignores the walk limits under a filter; they cut the View half, which
      // this tool does not report, to the least the request allows
      const envs = await inspectEnvs(input.string('namespace'), buildRequest(ctx.limits, {filter, maxDepth: 0, maxNodes: 1, include: []}), signal, ctx);

      const results = envs.map((s) => {
        const entry: FindEntitiesEntry = {namespace: s.namespace, matches: s.kernel?.search?.matches ?? [], total: s.kernel?.search?.total ?? 0};
        if (s.error !== undefined) entry.error = s.error;
        return entry;
      });

      const summary = results
        .map((r) => {
          const carried = r.matches.length < r.total ? `, ${r.matches.length} carried` : '';
          const failed = r.error === undefined ? '' : ` (error: ${r.error.name}: ${r.error.message})`;
          return `${r.namespace}: ${r.total} match${r.total === 1 ? '' : 'es'}${carried}${failed}`;
        })
        .join('; ');
      return textResult(summary || NoEnvironments, {results});
    }),
  });
```

- [ ] **Step 5: `tools/getRegistry.ts`**

```typescript
import type {EnvSnapshot, RegistrySnapshot} from '../../inspect/types.js';
import type {ModelContextToolLike} from '../ModelContextLike.js';
import {buildRequest, defineTool, inspectEnvs, NamespaceInputSchema, NoEnvironments, runTool, textResult, type ToolContext} from '../toolSupport.js';

export interface RegistryEntry {
  namespace: string;
  kind: EnvSnapshot['kind'];
  registry?: RegistrySnapshot;
  error?: {name: string; message: string};
}

export const createGetRegistryTool = (ctx: ToolContext): ModelContextToolLike =>
  defineTool(ctx, 'get-registry', {
    title: 'Get Registry',
    description:
      'The composition rules of one Shadow Environment, or of every one: which Shadow Objects each token defines, which tokens a token routes to, and which property routes exist. The answer to why a Shadow Object is, or is not, on an Entity.',
    inputSchema: {type: 'object', properties: {namespace: NamespaceInputSchema}, additionalProperties: false},
    execute: runTool(async (input, signal) => {
      const envs = await inspectEnvs(input.string('namespace'), buildRequest(ctx.limits, {maxDepth: 0, maxNodes: 1, include: ['registry']}), signal, ctx);

      const registries = envs.map((s) => {
        const entry: RegistryEntry = {namespace: s.namespace, kind: s.kind};
        if (s.kernel?.registry !== undefined) entry.registry = s.kernel.registry;
        if (s.error !== undefined) entry.error = s.error;
        return entry;
      });

      const summary = registries
        .map((r) => {
          if (r.registry === undefined) return `${r.namespace}: no registry${r.error === undefined ? '' : ` (error: ${r.error.name}: ${r.error.message})`}`;
          const {tokens, routes, propRoutes, isDefault} = r.registry;
          return `${r.namespace}: ${Object.keys(tokens).length} tokens, ${Object.keys(routes).length} routes, ${Object.keys(propRoutes).length} property routes${isDefault ? ', the default registry' : ''}`;
        })
        .join('; ');
      return textResult(summary || NoEnvironments, {registries});
    }),
  });
```

- [ ] **Step 6: `tools/index.ts`**

```typescript
import type {ModelContextToolLike} from '../ModelContextLike.js';
import type {ToolContext} from '../toolSupport.js';
import {createFindEntitiesTool} from './findEntities.js';
import {createGetEntityTool} from './getEntity.js';
import {createGetEntityTreeTool} from './getEntityTree.js';
import {createGetRegistryTool} from './getRegistry.js';
import {createListEnvsTool} from './listEnvs.js';

export type {EnvSummary} from './listEnvs.js';
export type {EntityMatchEntry} from './getEntity.js';
export type {FindEntitiesEntry} from './findEntities.js';
export type {RegistryEntry} from './getRegistry.js';

/** The five read-only tools, in the order they are registered. */
export const createTools = (ctx: ToolContext): ModelContextToolLike[] => [
  createListEnvsTool(ctx),
  createGetEntityTreeTool(ctx),
  createGetEntityTool(ctx),
  createFindEntitiesTool(ctx),
  createGetRegistryTool(ctx),
];
```

- [ ] **Step 7: The spec**

`src/model-context/tools/tools.spec.ts`:

```typescript
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {onCreate} from '../../in-the-dark/events.js';
import {Registry} from '../../in-the-dark/Registry.js';
import {ShadowObject} from '../../in-the-dark/ShadowObject.js';
import type {ShadowObjectCreationAPI} from '../../types.js';
import {ComponentContext} from '../../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../../view/ShadowEnv.js';
import {ViewComponent} from '../../view/ViewComponent.js';
import type {ModelContextToolLike, ModelContextToolResult} from '../ModelContextLike.js';
import type {ToolContext} from '../toolSupport.js';
import {createTools} from './index.js';

const NS = 'mc-tools';

/**
 * scene (title='hello', secret='hunter2')   provides 'theme'
 * └─ actor (speed=3)                        uses 'theme', useProperty 'speed'
 *    └─ actor
 */
const makeScene = async () => {
  const registry = new Registry();

  @ShadowObject({registry, token: 'scene'})
  class Scene {
    constructor({provideContext}: ShadowObjectCreationAPI) {
      provideContext('theme', 'dark');
    }
    [onCreate]() {}
  }

  @ShadowObject({registry, token: 'actor'})
  class Actor {
    constructor({useContext, useProperty}: ShadowObjectCreationAPI) {
      useContext('theme');
      useProperty('speed');
    }
  }

  expect(Scene && Actor).toBeTruthy();

  const ctx = ComponentContext.get(NS);
  const env = new ShadowEnv();
  env.view = ctx;
  env.envProxy = new LocalShadowObjectEnv(registry);

  const scene = new ViewComponent('scene', {context: ctx});
  scene.setProperty('title', 'hello');
  scene.setProperty('secret', 'hunter2');
  const actor = new ViewComponent('actor', {parent: scene, context: ctx});
  actor.setProperty('speed', 3);
  const child = new ViewComponent('actor', {parent: actor, context: ctx});

  await env.syncWait();
  return {env, ctx, scene, actor, child};
};

type Scene = Awaited<ReturnType<typeof makeScene>>;

const toolContext = (extra: Partial<ToolContext> = {}): ToolContext => ({prefix: 'shae-', limits: {}, redact: undefined, ...extra});

describe('the model-context tools', () => {
  let scene: Scene;
  let tools: ModelContextToolLike[];

  const tool = (name: string): ModelContextToolLike => {
    const found = tools.find((t) => t.name === `shae-${name}`);
    if (found === undefined) throw new Error(`no tool shae-${name}`);
    return found;
  };
  const run = async (name: string, input: unknown = {}, signal?: AbortSignal): Promise<ModelContextToolResult> =>
    (await tool(name).execute(input, signal === undefined ? undefined : {signal})) as ModelContextToolResult;
  const data = (result: ModelContextToolResult): any => result.structuredContent;

  beforeEach(async () => {
    scene = await makeScene();
    tools = createTools(toolContext());
  });

  afterEach(() => {
    scene.env.destroy();
    ComponentContext.get(NS).dispose();
  });

  it('are five, named with the prefix, read-only and untrusted, each with an object schema', () => {
    expect(tools.map((t) => t.name)).toEqual(['shae-list-envs', 'shae-get-entity-tree', 'shae-get-entity', 'shae-find-entities', 'shae-get-registry']);
    for (const t of tools) {
      expect(t.annotations).toEqual({readOnlyHint: true, untrustedContentHint: true});
      expect(t.description.length).toBeGreaterThan(40);
      expect((t.inputSchema as {type: string}).type).toBe('object');
    }
    expect(createTools(toolContext({prefix: 'x-'})).map((t) => t.name)[0]).toBe('x-list-envs');
  });

  describe('list-envs', () => {
    it('describes every environment with its counts and no tree', async () => {
      const result = await run('list-envs');
      const env = data(result).envs.find((e: any) => e.namespace === NS);

      expect(result.isError).toBeUndefined();
      expect(env).toMatchObject({kind: 'local', state: {isReady: true}, kernel: {thread: 'main', counts: {entities: 3, roots: 1, shadowObjects: 3}}, view: {counts: {components: 3, roots: 1}}});
      expect(env.kernel.roots).toBeUndefined();
      expect(env.view.roots).toBeUndefined();
      expect(result.content[0]?.text).toContain(`${NS} (local, ready, 3 entities)`);
    });

    it('lets an environment that cannot answer cost its own entry', async () => {
      const broken = new ShadowEnv();
      broken.view = ComponentContext.get('mc-broken');
      broken.envProxy = {
        start: () => Promise.resolve(),
        importScript: () => Promise.resolve(),
        applyChangeTrail: () => Promise.resolve(),
        destroy: () => {},
        inspect: () => Promise.reject(new Error('silent')),
      };
      await broken.ready();
      try {
        const envs = data(await run('list-envs')).envs;
        expect(envs.find((e: any) => e.namespace === 'mc-broken')).toMatchObject({kind: 'custom', error: {name: 'Error', message: 'silent'}});
        expect(envs.find((e: any) => e.namespace === NS).kernel).toBeDefined();
      } finally {
        broken.destroy();
        ComponentContext.get('mc-broken').dispose();
      }
    });
  });

  describe('get-entity-tree', () => {
    it('answers one environment by namespace with both halves, and refuses an unknown one', async () => {
      const result = await run('get-entity-tree', {namespace: NS});
      const [env] = data(result).envs;

      expect(data(result).envs).toHaveLength(1);
      expect(env.kernel.roots[0]).toMatchObject({uuid: scene.scene.uuid, token: 'scene', childCount: 1});
      expect(env.kernel.roots[0].children[0].children[0].uuid).toBe(scene.child.uuid);
      expect(env.view.roots[0].uuid).toBe(scene.scene.uuid);
      expect(env.kernel.roots[0].shadowObjects[0].displayName).toBe('Scene');

      const refused = await run('get-entity-tree', {namespace: 'nope'});
      expect(refused.isError).toBe(true);
      expect(refused.content[0]?.text).toBe('no Shadow Environment holds the namespace "nope"');
    });

    it('maps its input onto the request', async () => {
      const result = await run('get-entity-tree', {namespace: NS, rootUuid: scene.actor.uuid, maxDepth: 0, include: ['props'], valueDepth: 0});
      const [env] = data(result).envs;
      const root = env.kernel.roots[0];

      expect(root.uuid).toBe(scene.actor.uuid);
      expect(root.ancestors).toEqual([{uuid: scene.scene.uuid, token: 'scene'}]);
      expect(root.children).toBeUndefined();
      expect(root.childCount).toBe(1);
      expect(root.shadowObjects).toBeUndefined();
      expect(root.props).toEqual([{name: 'speed', value: 3, routes: true}]);
      expect(env.kernel.truncation[0]).toMatchObject({reason: 'max-depth', uuid: scene.actor.uuid});
      expect(result.content[0]?.text).toContain('1 truncation note');

      const wrong = await run('get-entity-tree', {include: ['nope']});
      expect(wrong.isError).toBe(true);
      expect(wrong.content[0]?.text).toContain('"include" knows only');
    });

    it('takes the exposure limits as defaults and the call as the last word', async () => {
      tools = createTools(toolContext({limits: {maxDepth: 0, include: ['props']}}));

      const byDefault = data(await run('get-entity-tree', {namespace: NS})).envs[0].kernel.roots[0];
      expect(byDefault.children).toBeUndefined();
      expect(byDefault.contexts).toBeUndefined();

      const overridden = data(await run('get-entity-tree', {namespace: NS, maxDepth: 2})).envs[0].kernel.roots[0];
      expect(overridden.children[0].children[0].uuid).toBe(scene.child.uuid);
      expect(overridden.contexts, 'include stays the exposure default').toBeUndefined();
    });

    it('redacts the named properties on both halves', async () => {
      tools = createTools(toolContext({redact: (name) => name === 'secret'}));
      const [env] = data(await run('get-entity-tree', {namespace: NS})).envs;
      const byName = (props: {name: string; value: unknown}[]) => Object.fromEntries(props.map((p) => [p.name, p.value]));

      expect(byName(env.kernel.roots[0].props)).toEqual({title: 'hello', secret: {$type: 'redacted'}});
      expect(byName(env.view.roots[0].props)).toEqual({title: 'hello', secret: {$type: 'redacted'}});
    });

    it('rejects for an aborted signal, and for nothing else', async () => {
      const controller = new AbortController();
      const reason = new Error('stop');
      controller.abort(reason);
      await expect(run('get-entity-tree', {}, controller.signal)).rejects.toBe(reason);
    });
  });

  describe('get-entity', () => {
    it('answers with the entity, its ancestors and the view component', async () => {
      const result = await run('get-entity', {uuid: scene.actor.uuid});
      const [match] = data(result).matches;

      expect(data(result).matches).toHaveLength(1);
      expect(match.namespace).toBe(NS);
      expect(match.entity).toMatchObject({uuid: scene.actor.uuid, token: 'actor', childCount: 1});
      expect(match.entity.ancestors, 'lifted out of the node').toBeUndefined();
      expect(match.entity.children[0].uuid).toBe(scene.child.uuid);
      expect(match.entity.children[0].children, 'one level down').toBeUndefined();
      expect(match.ancestors).toEqual([{uuid: scene.scene.uuid, token: 'scene'}]);
      expect(match.view.uuid).toBe(scene.actor.uuid);
      expect(match.entity.contexts[0]).toMatchObject({name: 'theme', effective: 'dark', source: {kind: 'ancestor', uuid: scene.scene.uuid}});
      expect(result.content[0]?.text).toContain(`actor "${scene.actor.uuid}", under scene, 1 children`);
    });

    it('refuses without a uuid, and for a uuid nobody holds', async () => {
      expect((await run('get-entity', {})).content[0]?.text).toBe('"uuid" is required');
      const missing = await run('get-entity', {uuid: 'no-such-uuid'});
      expect(missing.isError).toBe(true);
      expect(missing.content[0]?.text).toBe('no Shadow Environment holds an Entity "no-such-uuid"');
    });
  });

  describe('find-entities', () => {
    it('lists the matches with their paths and the total, per environment', async () => {
      const result = await run('find-entities', {token: 'actor'});
      const entry = data(result).results.find((r: any) => r.namespace === NS);

      expect(entry).toEqual({
        namespace: NS,
        total: 2,
        matches: [
          {uuid: scene.actor.uuid, token: 'actor', path: ['scene', 'actor']},
          {uuid: scene.child.uuid, token: 'actor', path: ['scene', 'actor', 'actor']},
        ],
      });
      expect(result.content[0]?.text).toContain(`${NS}: 2 matches`);
    });

    it('takes every criterion and the limit', async () => {
      const find = async (input: object) => data(await run('find-entities', {namespace: NS, ...input})).results[0];

      expect((await find({propName: 'speed'})).matches.map((m: any) => m.uuid)).toEqual([scene.actor.uuid]);
      expect((await find({shadowObject: 'Scene'})).matches.map((m: any) => m.uuid)).toEqual([scene.scene.uuid]);
      expect((await find({contextName: 'theme'})).total).toBe(3);
      expect((await find({token: 'actor', limit: 1}))).toMatchObject({total: 2, matches: [{uuid: scene.actor.uuid}]});
      expect((await run('find-entities', {namespace: NS, token: 'actor', limit: 1})).content[0]?.text).toContain('2 matches, 1 carried');
    });

    it('refuses a call without a criterion', async () => {
      const refused = await run('find-entities', {namespace: NS, limit: 5});
      expect(refused.isError).toBe(true);
      expect(refused.content[0]?.text).toBe('at least one of token, propName, shadowObject, contextName is required');
    });
  });

  describe('get-registry', () => {
    it('answers the registry of an environment', async () => {
      const result = await run('get-registry', {namespace: NS});
      const [entry] = data(result).registries;

      expect(entry).toMatchObject({namespace: NS, kind: 'local', registry: {tokens: {scene: ['Scene'], actor: ['Actor']}, isDefault: false}});
      expect(result.content[0]?.text).toContain(`${NS}: 2 tokens, 0 routes, 0 property routes`);
    });
  });

  it('answer with JSON-safe data and the same JSON in the text', async () => {
    for (const [name, input] of [
      ['list-envs', {}],
      ['get-entity-tree', {namespace: NS}],
      ['get-entity', {uuid: scene.child.uuid}],
      ['find-entities', {token: 'scene'}],
      ['get-registry', {}],
    ] as const) {
      const result = await run(name, input);
      const structured = result.structuredContent!;
      expect(JSON.parse(JSON.stringify(structured)), name).toEqual(structured);
      expect(result.content[0]?.text.endsWith(JSON.stringify(structured)), name).toBe(true);
    }
  });
});
```

- [ ] **Step 8: Run the spec, then the whole package**

Run: `cd packages/shadow-objects && pnpm exec vitest src/model-context --run`
Expected: all pass. Then `pnpm test` in the package (the `distContract` spec needs a built `dist`; `pnpm -F @spearwolf/shadow-objects build` first if it complains), `pnpm typecheck` and `pnpm lint` at the root: clean. The `shadowObjects: 3` count in the list-envs case assumes one Shadow Object per Entity; if the decorator registers differently, read the number from `scene.env.envProxy` and fix the expectation, not the count.

- [ ] **Step 9: Commit**

```bash
git add packages/shadow-objects/src/model-context/tools
git commit -m "feat: five read-only tools describe the shadow environments to an agent" -m "list-envs, get-entity-tree, get-entity, find-entities and get-registry each turn their input into an InspectRequest, ask ShadowEnv, and answer in one envelope: a summary line, then the JSON. A refusal is an error result; only the caller's abort rejects." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 4: `exposeShadowEnvsToModelContext()`, the subpath, and the dist contract

**Files:**
- Create: `packages/shadow-objects/src/model-context/exposeShadowEnvsToModelContext.ts`
- Create: `packages/shadow-objects/src/model-context.ts`
- Modify: `packages/shadow-objects/package.json` (`exports`)
- Modify: `packages/shadow-objects/src/distContract.files.txt`, `src/distContract.package.json`
- Test: `packages/shadow-objects/src/model-context/exposeShadowEnvsToModelContext.spec.ts`, `src/distContract.spec.ts` (existing, must stay green)

**Interfaces:**
- Consumes: `createTools()` (Task 3), `findModelContext()`, `toRedactPredicate()`, `ToolContext` (Task 2), `ConsoleLogger`.
- Produces: `exposeShadowEnvsToModelContext(options?: ExposeOptions): Promise<ExposeHandle>`, `ExposeOptions {modelContext?, toolPrefix?, signal?, exposedTo?, limits?, redactProps?}`, `ExposeHandle {available, tools, dispose()}`; the subpath `@spearwolf/shadow-objects/model-context.js`. Tasks 5 and 6 rely on all of it.

- [ ] **Step 1: The function**

`src/model-context/exposeShadowEnvsToModelContext.ts`:

```typescript
import type {InspectRequest} from '../inspect/types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {findModelContext, type ModelContextLike, type ModelContextRegisterOptions} from './ModelContextLike.js';
import {type RedactRule, toRedactPredicate} from './redactProps.js';
import {createTools} from './tools/index.js';
import type {ToolContext} from './toolSupport.js';

export interface ExposeOptions {
  /** Where to register. Default: `document.modelContext`, then `navigator.modelContext`; neither means "not available". */
  modelContext?: ModelContextLike;
  /** Prefix for every tool name. Default `'shae-'`. */
  toolPrefix?: string;
  /** Aborting it unregisters every tool. */
  signal?: AbortSignal;
  /** Passed through to `registerTool()`. Default: not set, so the platform default applies. */
  exposedTo?: string[];
  /** Default limits for every tool call; a call's own input wins field by field. */
  limits?: Partial<InspectRequest>;
  /** Property names whose values are replaced by `{$type: 'redacted'}` in every answer, on the Kernel's and the View's side alike. Property values only. */
  redactProps?: RedactRule;
}

export interface ExposeHandle {
  /** `false` when no model context was found; then `tools` is empty and nothing was registered. */
  available: boolean;
  /** The registered tool names, with the prefix. */
  tools: string[];
  /** Unregisters every tool. Idempotent. The same as aborting `options.signal`. */
  dispose(): void;
}

export const DefaultToolPrefix = 'shae-';

/**
 * Registers the five read-only inspection tools on the platform's model context, so that an
 * agent can see every Shadow Environment on the page. Nothing is exposed without this call;
 * every value in every answer is application state, and the docs say what that means before
 * they show the first line of code.
 *
 * Resolves, never rejects, where the platform has no model context -- the same application code
 * runs in every browser. Rejects with what `registerTool()` rejected with: a `NotAllowedError`
 * under a Permissions Policy that disables `tools`, an `InvalidStateError` on a name that is
 * already taken, are the caller's to handle. Registration is all-or-nothing: a rejection midway
 * takes back what was registered before it.
 */
export async function exposeShadowEnvsToModelContext(options: ExposeOptions = {}): Promise<ExposeHandle> {
  const logger = new ConsoleLogger('ModelContext');
  const modelContext = options.modelContext ?? findModelContext();

  if (modelContext === undefined) {
    logger.info('no model context on this platform, nothing registered');
    return {available: false, tools: [], dispose() {}};
  }

  // one controller for every tool: `dispose()` and the caller's signal both end here
  const controller = new AbortController();
  const {signal} = options;
  if (signal !== undefined) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), {once: true});
  }

  const ctx: ToolContext = {
    prefix: options.toolPrefix ?? DefaultToolPrefix,
    limits: options.limits ?? {},
    redact: toRedactPredicate(options.redactProps),
  };
  const registerOptions: ModelContextRegisterOptions = {signal: controller.signal};
  if (options.exposedTo !== undefined) registerOptions.exposedTo = options.exposedTo;

  const registered: string[] = [];
  try {
    for (const tool of createTools(ctx)) {
      if (controller.signal.aborted) break;
      await modelContext.registerTool(tool, registerOptions);
      registered.push(tool.name);
    }
  } catch (error) {
    // takes back what was registered before the one that failed
    controller.abort(error);
    logger.error('registering the tools failed', error);
    throw error;
  }

  const dispose = () => controller.abort();

  // aborted while registering: the platform has already taken the tools back
  if (controller.signal.aborted) return {available: true, tools: [], dispose};

  logger.info(`registered ${registered.length} tools`, registered);
  return {available: true, tools: registered, dispose};
}
```

- [ ] **Step 2: The subpath entry**

`src/model-context.ts`:

```typescript
/**
 * The model-context layer of the inspection API: one function that registers five read-only
 * tools on `document.modelContext` (WebMCP), the structural contract it talks to the platform
 * through, and the types of both. A subpath rather than an `index.ts` export: this module
 * touches `document` when called, and stays out of the worker bundle and out of every consumer
 * that does not want it. Importing it throws nowhere -- the platform is read only inside a call.
 */
export {
  DefaultToolPrefix,
  type ExposeHandle,
  type ExposeOptions,
  exposeShadowEnvsToModelContext,
} from './model-context/exposeShadowEnvsToModelContext.js';
export {
  findModelContext,
  isModelContextLike,
  type ModelContextLike,
  type ModelContextRegisterOptions,
  type ModelContextToolAnnotations,
  type ModelContextToolLike,
  type ModelContextToolResult,
} from './model-context/ModelContextLike.js';
export type {RedactRule} from './model-context/redactProps.js';
export type {EntityMatchEntry, EnvSummary, FindEntitiesEntry, RegistryEntry} from './model-context/tools/index.js';
```

- [ ] **Step 3: The spec**

`src/model-context/exposeShadowEnvsToModelContext.spec.ts`:

```typescript
import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {exposeShadowEnvsToModelContext} from './exposeShadowEnvsToModelContext.js';
import type {ModelContextLike, ModelContextRegisterOptions, ModelContextToolLike, ModelContextToolResult} from './ModelContextLike.js';

interface FakeModelContext extends ModelContextLike {
  tools: Map<string, ModelContextToolLike>;
  calls: ModelContextRegisterOptions[];
}

/** Registers by name, refuses a duplicate the way Chromium does, and takes a tool back when its signal aborts. */
const fakeModelContext = (failAt?: string): FakeModelContext => {
  const tools = new Map<string, ModelContextToolLike>();
  const calls: ModelContextRegisterOptions[] = [];
  return {
    tools,
    calls,
    async registerTool(tool, options) {
      calls.push(options ?? {});
      if (tool.name === failAt) throw new DOMException('not allowed here', 'NotAllowedError');
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
};

const FiveNames = ['shae-list-envs', 'shae-get-entity-tree', 'shae-get-entity', 'shae-find-entities', 'shae-get-registry'];

describe('exposeShadowEnvsToModelContext', () => {
  afterEach(() => {
    delete (document as {modelContext?: unknown}).modelContext;
    delete (navigator as {modelContext?: unknown}).modelContext;
  });

  it('registers the five tools, in order, with the prefix, and hands back their names', async () => {
    const mc = fakeModelContext();

    const handle = await exposeShadowEnvsToModelContext({modelContext: mc});

    expect(handle.available).toBe(true);
    expect(handle.tools).toEqual(FiveNames);
    expect(Array.from(mc.tools.keys())).toEqual(FiveNames);
    for (const tool of mc.tools.values()) {
      expect(tool.annotations).toEqual({readOnlyHint: true, untrustedContentHint: true});
    }
    expect(mc.calls[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(mc.calls[0]).not.toHaveProperty('exposedTo');

    handle.dispose();
  });

  it('resolves with available: false where there is no model context', async () => {
    const handle = await exposeShadowEnvsToModelContext();

    expect(handle).toMatchObject({available: false, tools: []});
    expect(() => handle.dispose()).not.toThrow();
  });

  it('finds document.modelContext first, and navigator.modelContext as the fallback', async () => {
    const onNavigator = fakeModelContext();
    Object.defineProperty(navigator, 'modelContext', {value: onNavigator, configurable: true, writable: true});
    const viaNavigator = await exposeShadowEnvsToModelContext({toolPrefix: 'nav-'});
    expect(Array.from(onNavigator.tools.keys())).toEqual(FiveNames.map((n) => n.replace('shae-', 'nav-')));
    viaNavigator.dispose();

    const onDocument = fakeModelContext();
    (document as {modelContext?: unknown}).modelContext = onDocument;
    const viaDocument = await exposeShadowEnvsToModelContext();
    expect(Array.from(onDocument.tools.keys())).toEqual(FiveNames);
    expect(onNavigator.tools.size, 'the document wins').toBe(0);
    viaDocument.dispose();
  });

  it('takes back what it registered when a registration fails, and rejects with that reason', async () => {
    const mc = fakeModelContext('shae-get-entity');

    await expect(exposeShadowEnvsToModelContext({modelContext: mc})).rejects.toMatchObject({name: 'NotAllowedError'});

    expect(mc.tools.size).toBe(0);
  });

  it('passes exposedTo, the prefix, the limits and the redaction through', async () => {
    const mc = fakeModelContext();
    const env = new ShadowEnv();
    const ctx = ComponentContext.get('mc-expose');
    env.view = ctx;
    env.envProxy = new LocalShadowObjectEnv();
    const vc = new ViewComponent('thing', {context: ctx});
    vc.setProperty('token', 'abc');
    vc.setProperty('name', 'x');
    new ViewComponent('thing', {parent: vc, context: ctx});
    await env.syncWait();

    try {
      const handle = await exposeShadowEnvsToModelContext({
        modelContext: mc,
        toolPrefix: 'app-',
        exposedTo: ['https://agent.example'],
        limits: {maxDepth: 0},
        redactProps: ['token'],
      });

      expect(handle.tools[0]).toBe('app-list-envs');
      expect(mc.calls[0]?.exposedTo).toEqual(['https://agent.example']);

      const tree = (await mc.tools.get('app-get-entity-tree')!.execute({namespace: 'mc-expose'})) as ModelContextToolResult;
      const root = (tree.structuredContent as any).envs[0].kernel.roots[0];
      expect(root.children, 'the limit applied').toBeUndefined();
      expect(root.childCount).toBe(1);
      expect(Object.fromEntries(root.props.map((p: any) => [p.name, p.value]))).toEqual({token: {$type: 'redacted'}, name: 'x'});

      handle.dispose();
    } finally {
      env.destroy();
      ctx.dispose();
    }
  });

  it('dispose() takes every tool back and can be called twice', async () => {
    const mc = fakeModelContext();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc});

    handle.dispose();
    expect(mc.tools.size).toBe(0);
    expect(() => handle.dispose()).not.toThrow();
  });

  it('follows the caller signal: aborting it takes the tools back, an aborted one registers nothing', async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc, signal: controller.signal});
    expect(mc.tools.size).toBe(5);

    controller.abort();
    expect(mc.tools.size).toBe(0);
    expect(handle.tools, 'the handle keeps saying what it registered').toEqual(FiveNames);

    const already = new AbortController();
    already.abort();
    const nothing = await exposeShadowEnvsToModelContext({modelContext: mc, signal: already.signal});
    expect(nothing).toMatchObject({available: true, tools: []});
    expect(mc.tools.size).toBe(0);
  });

  it('rejects a second exposure under the same prefix on the duplicate name, and leaves the first intact', async () => {
    const mc = fakeModelContext();
    const first = await exposeShadowEnvsToModelContext({modelContext: mc});

    await expect(exposeShadowEnvsToModelContext({modelContext: mc})).rejects.toMatchObject({name: 'InvalidStateError'});
    expect(Array.from(mc.tools.keys())).toEqual(FiveNames);

    const second = await exposeShadowEnvsToModelContext({modelContext: mc, toolPrefix: 'two-'});
    expect(mc.tools.size).toBe(10);

    first.dispose();
    second.dispose();
    expect(mc.tools.size).toBe(0);
  });
});
```

In the `dispose()` case, a fake that deletes on abort is what the platform does; `handle.tools` after an abort still names what was registered, on purpose -- the handle records history, the platform records state.

- [ ] **Step 4: Run the spec**

Run: `cd packages/shadow-objects && pnpm exec vitest src/model-context --run`
Expected: all pass. If `delete document.modelContext` fails under happy-dom because the property was defined non-configurable, define it with `Object.defineProperty(document, 'modelContext', {value, configurable: true, writable: true})` in the test and delete afterwards.

- [ ] **Step 5: The export and the dist contract**

In `packages/shadow-objects/package.json`, after the `"./FrameLoop.js"` entry of `exports`, add:

```json
    "./model-context.js": {
      "import": "./dist/src/model-context.js",
      "types": "./dist/src/model-context.d.ts"
    }
```

In `src/distContract.package.json`, after the `"./FrameLoop.js"` entry, add:

```json
    "./model-context.js": {
      "import": "./src/model-context.js",
      "types": "./src/model-context.d.ts"
    }
```

Build and regenerate the file list:

```bash
cd packages/shadow-objects && pnpm build
find dist -type f | sed 's#^dist/##' | LC_ALL=C sort > src/distContract.files.txt
git diff --stat src/distContract.files.txt
git diff src/distContract.files.txt | grep '^[+-]' | grep -v '^[+-][+-]' | sort
```

Expected: exactly 48 added lines and none removed -- four files (`.d.ts`, `.d.ts.map`, `.js`, `.js.map`) for each of `src/model-context`, `src/model-context/ModelContextLike`, `src/model-context/exposeShadowEnvsToModelContext`, `src/model-context/redactProps`, `src/model-context/toolSupport`, `src/model-context/tools/index`, `src/model-context/tools/findEntities`, `src/model-context/tools/getEntity`, `src/model-context/tools/getEntityTree`, `src/model-context/tools/getRegistry`, `src/model-context/tools/listEnvs`. Anything else in the diff is a build problem to fix, not to record. Check that `dist/package.json` carries the new export with the `dist/` prefix stripped (`cat dist/package.json | grep -A2 model-context`).

Verify the subpath resolves from a consumer's point of view:

```bash
cd packages/shadow-objects && node --input-type=module -e "import('./dist/src/model-context.js').then((m) => console.log(Object.keys(m).sort().join(', ')))"
```

Expected: `DefaultToolPrefix, exposeShadowEnvsToModelContext, findModelContext, isModelContextLike` -- and no throw, which is the "importing throws nowhere" constraint proven in Node.

- [ ] **Step 6: The whole package, then the workspace checks**

Run: `cd packages/shadow-objects && pnpm test` (the contract spec included), then from the root `pnpm typecheck` and `pnpm lint`.
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add packages/shadow-objects/src/model-context packages/shadow-objects/src/model-context.ts packages/shadow-objects/package.json packages/shadow-objects/src/distContract.files.txt packages/shadow-objects/src/distContract.package.json
git commit -m "feat: exposeShadowEnvsToModelContext registers the inspection tools, from a subpath of its own" -m "One function, one AbortController: the five tools go onto document.modelContext under a signal that dispose() and the caller's own signal both reach, all-or-nothing. The subpath model-context.js keeps the module out of index.ts and out of the worker bundle; the dist contract records its twelve modules." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 5: The e2e pages -- the tools through a fake adapter in three engines, and through Chromium's `document.modelContext`

**Files:**
- Modify: `packages/shadow-objects-e2e/playwright.config.ts`
- Create: `packages/shadow-objects-e2e/pages/model-context.html`, `src/model-context.js`, `tests/model-context.spec.ts`
- Create: `packages/shadow-objects-e2e/pages/model-context-platform.html`, `src/model-context-platform.js`, `tests/model-context-platform.spec.ts`
- Modify: `packages/shadow-objects-e2e/README.md`, `TEST-PLAN.md`

**Interfaces:**
- Consumes: `exposeShadowEnvsToModelContext()` and the result shapes of Tasks 3 and 4, through the workspace link (`@spearwolf/shadow-objects/model-context.js` resolves to `dist/src/model-context.js`; turbo builds `dist` before this package's test task). The page helpers `runTestSuite`, `testAsyncAction`, `testBooleanAction` and `runPageTests`, as `src/inspect-worker-env.js` and `tests/inspect-worker-env.spec.ts` use them.
- Produces: two pages and two specs; the counts Task 6 records.

- [ ] **Step 1: The Chromium launch flag**

In `playwright.config.ts`, replace the chromium project with:

```typescript
    {
      name: 'chromium',
      // WebMCP ships behind a feature flag in the Chromium Playwright bundles (151 at the time of
      // writing). With it, `document.modelContext` exists and `pages/model-context-platform.html`
      // registers the inspection tools on the real platform; without it the page reports the
      // platform as absent and its spec fails. Firefox and WebKit have no such flag, and that spec
      // skips there by name.
      use: {...devices['Desktop Chrome'], launchOptions: {args: ['--enable-features=WebMCP']}},
    },
```

- [ ] **Step 2: The fake-adapter page**

`pages/model-context.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>model-context</title>
  </head>
  <body>
    <section id="tests"></section>
    <script type="module" src="/src/model-context.js"></script>
  </body>
</html>
```

`src/model-context.js`:

```javascript
import {ComponentContext, LocalShadowObjectEnv, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

/**
 * Registers by name, refuses a duplicate the way Chromium does, and takes a tool back when its
 * signal aborts -- the platform's contract, minus the platform. That is what lets this page run
 * in all three engines; `model-context-platform.html` is where the real `document.modelContext`
 * is driven.
 */
const makeFakeModelContext = () => {
  const tools = new Map();
  return {
    tools,
    async registerTool(tool, options) {
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
};

/**
 * The five tools over one worker environment and one local environment, driven through a fake
 * model context. Every answer is asserted on the structured half; the text half is checked once
 * for the JSON it ends with.
 */
async function main() {
  const worker = new ShadowEnv();
  worker.view = ComponentContext.get('mc-worker');
  worker.envProxy = new RemoteWorkerEnv();

  const local = new ShadowEnv();
  local.view = ComponentContext.get('mc-local');
  local.envProxy = new LocalShadowObjectEnv();

  window.envs = {worker, local};

  await testAsyncAction('mc-envs-ready', () => Promise.all([worker.ready(), local.ready()]));
  await testAsyncAction('mc-envs-import-module', () =>
    Promise.all([worker.envProxy.importScript('/mod-hello.js'), local.envProxy.importScript('/mod-hello.js')]),
  );

  const build = (env) => {
    const foo = new ViewComponent('foo', {context: env.view});
    foo.setProperty('xyz', 123);
    const bar = new ViewComponent('bar', {parent: foo, context: env.view});
    bar.setProperty('plah', 666);
    return {foo, bar};
  };
  const tree = {worker: build(worker), local: build(local)};

  await testAsyncAction('mc-first-sync', () => Promise.all([worker.syncWait(), local.syncWait()]));

  const fake = makeFakeModelContext();
  let handle;
  await testAsyncAction('mc-expose-resolves', async () => {
    handle = await exposeShadowEnvsToModelContext({modelContext: fake});
  });
  window.handle = handle;

  const run = async (name, input = {}) => fake.tools.get(`shae-${name}`).execute(input);
  const data = (result) => result.structuredContent;

  testBooleanAction(
    'mc-expose-registers-five-tools',
    () =>
      handle.available === true &&
      handle.tools.join() === 'shae-list-envs,shae-get-entity-tree,shae-get-entity,shae-find-entities,shae-get-registry' &&
      fake.tools.size === 5 &&
      [...fake.tools.values()].every(
        (t) => t.annotations.readOnlyHint === true && t.annotations.untrustedContentHint === true && t.inputSchema.type === 'object',
      ),
  );

  await testAsyncAction('mc-list-envs-names-both-environments', async () => {
    const result = await run('list-envs');
    const byNs = Object.fromEntries(data(result).envs.map((e) => [e.namespace, e]));
    if (byNs['mc-worker']?.kind !== 'worker') throw new Error(`mc-worker: ${JSON.stringify(byNs['mc-worker'])}`);
    if (byNs['mc-local']?.kind !== 'local') throw new Error(`mc-local: ${JSON.stringify(byNs['mc-local'])}`);
    for (const ns of ['mc-worker', 'mc-local']) {
      const env = byNs[ns];
      if (env.kernel?.counts?.entities !== 2) throw new Error(`${ns}: expected 2 entities, got ${JSON.stringify(env.kernel)}`);
      if (env.kernel.roots !== undefined || env.view?.roots !== undefined) throw new Error(`${ns}: list-envs must carry no tree`);
    }
    if (byNs['mc-worker'].kernel.thread !== 'worker') throw new Error('the worker snapshot was not taken in the worker');
    if (!result.content[0].text.includes('mc-worker (worker, ready, 2 entities)')) throw new Error(`summary: ${result.content[0].text}`);
  });

  await testAsyncAction('mc-get-entity-tree-crosses-the-wire', async () => {
    const result = await run('get-entity-tree', {namespace: 'mc-worker'});
    const {envs} = data(result);
    const env = envs[0];
    if (envs.length !== 1 || env.namespace !== 'mc-worker') throw new Error(`envs: ${JSON.stringify(envs.map((e) => e.namespace))}`);
    if (env.kernel?.thread !== 'worker') throw new Error(`thread: ${env.kernel?.thread}`);
    const root = env.kernel.roots[0];
    if (root?.uuid !== tree.worker.foo.uuid || root.token !== 'foo') throw new Error(`root: ${JSON.stringify(root)}`);
    if (root.children?.[0]?.uuid !== tree.worker.bar.uuid) throw new Error(`child: ${JSON.stringify(root.children)}`);
    if (env.view?.roots?.[0]?.uuid !== tree.worker.foo.uuid) throw new Error(`view: ${JSON.stringify(env.view)}`);
    if (root.shadowObjects?.[0]?.displayName !== 'foo') throw new Error(`shadow objects: ${JSON.stringify(root.shadowObjects)}`);
  });

  await testAsyncAction('mc-get-entity-tree-honours-limits', async () => {
    const result = await run('get-entity-tree', {namespace: 'mc-local', maxDepth: 0, include: ['props']});
    const env = data(result).envs[0];
    const root = env.kernel.roots[0];
    if (root.children !== undefined) throw new Error('maxDepth 0 must not walk the children');
    if (root.childCount !== 1) throw new Error(`childCount: ${root.childCount}`);
    if (root.shadowObjects !== undefined) throw new Error('include without shadowObjects must not carry them');
    if (!env.kernel.truncation?.some((n) => n.reason === 'max-depth' && n.uuid === tree.local.foo.uuid)) {
      throw new Error(`truncation: ${JSON.stringify(env.kernel.truncation)}`);
    }
  });

  await testAsyncAction('mc-get-entity-answers-with-ancestors', async () => {
    const result = await run('get-entity', {uuid: tree.worker.bar.uuid});
    const {matches} = data(result);
    if (matches.length !== 1) throw new Error(`matches: ${JSON.stringify(matches)}`);
    const [m] = matches;
    if (m.namespace !== 'mc-worker') throw new Error(`namespace: ${m.namespace}`);
    if (m.entity.uuid !== tree.worker.bar.uuid || m.entity.token !== 'bar') throw new Error(`entity: ${JSON.stringify(m.entity)}`);
    if (JSON.stringify(m.ancestors) !== JSON.stringify([{uuid: tree.worker.foo.uuid, token: 'foo'}])) {
      throw new Error(`ancestors: ${JSON.stringify(m.ancestors)}`);
    }
    if (m.view?.uuid !== tree.worker.bar.uuid) throw new Error(`view: ${JSON.stringify(m.view)}`);
  });

  await testAsyncAction('mc-find-entities-by-token', async () => {
    const result = await run('find-entities', {token: 'bar'});
    const {results} = data(result);
    const byNs = Object.fromEntries(results.map((r) => [r.namespace, r]));
    for (const ns of ['mc-worker', 'mc-local']) {
      const r = byNs[ns];
      if (r?.total !== 1 || r.matches.length !== 1) throw new Error(`${ns}: ${JSON.stringify(r)}`);
      if (r.matches[0].uuid !== tree[ns === 'mc-worker' ? 'worker' : 'local'].bar.uuid) throw new Error(`${ns}: wrong uuid`);
      if (r.matches[0].path.join('>') !== 'foo>bar') throw new Error(`${ns}: path ${JSON.stringify(r.matches[0].path)}`);
    }
  });

  await testAsyncAction('mc-find-entities-needs-a-criterion', async () => {
    const result = await run('find-entities', {namespace: 'mc-worker'});
    if (result.isError !== true) throw new Error(`expected an error result, got ${JSON.stringify(result)}`);
    if (!result.content[0].text.includes('at least one of')) throw new Error(`text: ${result.content[0].text}`);
  });

  await testAsyncAction('mc-get-registry-lists-foo', async () => {
    const result = await run('get-registry', {namespace: 'mc-worker'});
    const [entry] = data(result).registries;
    if (entry?.registry?.tokens?.foo?.[0] !== 'foo') throw new Error(`registry: ${JSON.stringify(entry)}`);
  });

  await testAsyncAction('mc-unknown-namespace-is-an-error', async () => {
    const result = await run('get-entity-tree', {namespace: 'nope'});
    if (result.isError !== true || !result.content[0].text.includes('"nope"')) throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mc-redaction-hides-a-property', async () => {
    const redacting = makeFakeModelContext();
    const redacted = await exposeShadowEnvsToModelContext({modelContext: redacting, toolPrefix: 'hidden-', redactProps: ['xyz']});
    try {
      const result = await redacting.tools.get('hidden-get-entity-tree').execute({namespace: 'mc-worker'});
      const env = data(result).envs[0];
      const byName = (props) => Object.fromEntries((props ?? []).map((p) => [p.name, JSON.stringify(p.value)]));
      const kernelProps = byName(env.kernel.roots[0].props);
      const viewProps = byName(env.view.roots[0].props);
      if (kernelProps.xyz !== '{"$type":"redacted"}' || viewProps.xyz !== '{"$type":"redacted"}') {
        throw new Error(`xyz not redacted: kernel ${kernelProps.xyz}, view ${viewProps.xyz}`);
      }
      const child = byName(env.kernel.roots[0].children[0].props);
      if (child.plah !== '666') throw new Error(`plah touched: ${child.plah}`);
    } finally {
      redacted.dispose();
    }
  });

  await testAsyncAction('mc-result-is-json-safe', async () => {
    const result = await run('get-entity-tree');
    const structured = result.structuredContent;
    if (JSON.stringify(JSON.parse(JSON.stringify(structured))) !== JSON.stringify(structured)) throw new Error('not JSON-safe');
    if (!result.content[0].text.endsWith(JSON.stringify(structured))) throw new Error('the text does not end with the JSON');
  });

  testBooleanAction('mc-dispose-takes-the-tools-back', () => {
    handle.dispose();
    handle.dispose();
    return fake.tools.size === 0;
  });
}
```

`tests/model-context.spec.ts`:

```typescript
import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('model-context', () => {
  runPageTests('/pages/model-context.html', [
    'mc-envs-ready',
    'mc-envs-import-module',
    'mc-first-sync',
    'mc-expose-resolves',
    'mc-expose-registers-five-tools',
    'mc-list-envs-names-both-environments',
    'mc-get-entity-tree-crosses-the-wire',
    'mc-get-entity-tree-honours-limits',
    'mc-get-entity-answers-with-ancestors',
    'mc-find-entities-by-token',
    'mc-find-entities-needs-a-criterion',
    'mc-get-registry-lists-foo',
    'mc-unknown-namespace-is-an-error',
    'mc-redaction-hides-a-property',
    'mc-result-is-json-safe',
    'mc-dispose-takes-the-tools-back',
  ]);
});
```

- [ ] **Step 3: The platform page**

`pages/model-context-platform.html`: the same markup as above with `<title>model-context-platform</title>` and `src="/src/model-context-platform.js"`.

`src/model-context-platform.js`:

```javascript
import {ComponentContext, RemoteWorkerEnv, ShadowEnv, ViewComponent} from '@spearwolf/shadow-objects';
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

/**
 * The tools on the real `document.modelContext`. Chromium's implementation, behind
 * `--enable-features=WebMCP`: `getTools()` lists registered tools, `executeTool()` takes one of
 * those objects and the input as a JSON string, and a tool taken back by its signal is gone from
 * the list. Nothing here is asserted about how the platform renders a result to an agent -- only
 * that the round trip through the platform reaches the tools and comes back with the envelope.
 */
async function main() {
  const env = new ShadowEnv();
  env.view = ComponentContext.get('mc-platform');
  env.envProxy = new RemoteWorkerEnv();
  await env.ready();
  await env.envProxy.importScript('/mod-hello.js');
  const foo = new ViewComponent('foo', {context: env.view});
  foo.setProperty('xyz', 123);
  const bar = new ViewComponent('bar', {parent: foo, context: env.view});
  await env.syncWait();

  let handle;
  await testAsyncAction('mcp-expose-resolves', async () => {
    handle = await exposeShadowEnvsToModelContext();
  });

  testBooleanAction('mcp-model-context-is-available', () => handle.available === true && handle.tools.length === 5);

  const mc = document.modelContext;
  const registered = async (name) => (await mc.getTools()).find((t) => t.name === name);
  const execute = async (name, input) => mc.executeTool(await registered(name), JSON.stringify(input));

  await testAsyncAction('mcp-tools-are-listed-by-the-platform', async () => {
    const names = (await mc.getTools()).map((t) => t.name);
    for (const name of handle.tools) {
      if (!names.includes(name)) throw new Error(`${name} missing from ${JSON.stringify(names)}`);
      const tool = await registered(name);
      if (tool.annotations?.readOnlyHint !== true || tool.annotations?.untrustedContentHint !== true) {
        throw new Error(`${name}: annotations ${JSON.stringify(tool.annotations)}`);
      }
    }
  });

  await testAsyncAction('mcp-list-envs-executes-through-the-platform', async () => {
    const result = await execute('shae-list-envs', {});
    const env0 = result?.structuredContent?.envs?.find((e) => e.namespace === 'mc-platform');
    if (env0?.kind !== 'worker' || env0.kernel?.counts?.entities !== 2) throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mcp-get-entity-tree-executes-through-the-platform', async () => {
    const result = await execute('shae-get-entity-tree', {namespace: 'mc-platform', maxDepth: 1});
    const root = result?.structuredContent?.envs?.[0]?.kernel?.roots?.[0];
    if (root?.uuid !== foo.uuid || root.children?.[0]?.uuid !== bar.uuid) throw new Error(JSON.stringify(result));
    if (result.structuredContent.envs[0].kernel.thread !== 'worker') throw new Error('not taken in the worker');
  });

  await testAsyncAction('mcp-find-entities-executes-through-the-platform', async () => {
    const result = await execute('shae-find-entities', {token: 'bar'});
    const entry = result?.structuredContent?.results?.find((r) => r.namespace === 'mc-platform');
    if (entry?.total !== 1 || entry.matches[0]?.path.join('>') !== 'foo>bar') throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mcp-a-refusal-comes-back-as-an-error-result', async () => {
    const result = await execute('shae-get-entity-tree', {namespace: 'nope'});
    if (result?.isError !== true || !result.content?.[0]?.text.includes('"nope"')) throw new Error(JSON.stringify(result));
  });

  await testAsyncAction('mcp-dispose-takes-the-tools-back', async () => {
    handle.dispose();
    const names = (await mc.getTools()).map((t) => t.name);
    const left = names.filter((n) => n.startsWith('shae-'));
    if (left.length > 0) throw new Error(`still registered: ${left.join(', ')}`);
  });
}
```

`tests/model-context-platform.spec.ts`:

```typescript
import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('model-context-platform', () => {
  // The Chromium project is launched with `--enable-features=WebMCP` (playwright.config.ts); the
  // other two engines have no `document.modelContext`, and the page would report the platform as
  // absent. The fake-adapter page, `model-context.html`, is what proves the tools there.
  test.skip(({browserName}) => browserName !== 'chromium', 'WebMCP is a Chromium feature behind --enable-features=WebMCP');

  runPageTests('/pages/model-context-platform.html', [
    'mcp-expose-resolves',
    'mcp-model-context-is-available',
    'mcp-tools-are-listed-by-the-platform',
    'mcp-list-envs-executes-through-the-platform',
    'mcp-get-entity-tree-executes-through-the-platform',
    'mcp-find-entities-executes-through-the-platform',
    'mcp-a-refusal-comes-back-as-an-error-result',
    'mcp-dispose-takes-the-tools-back',
  ]);
});
```

- [ ] **Step 4: Run the two specs, then the whole suite**

```bash
cd packages/shadow-objects-e2e && pnpm build && pnpm exec playwright test tests/model-context.spec.ts tests/model-context-platform.spec.ts
```

Expected: `model-context` green in all three projects; `model-context-platform` green in chromium and skipped in firefox and webkit. If the platform page fails on `mcp-model-context-is-available`, run `pnpm exec playwright test --project=chromium tests/model-context-platform.spec.ts --headed` once and read `handle` in the console -- the flag is the first suspect, a Chromium update that renamed it the second; the facts in deviation 6 were measured on Chromium 151. Then the whole suite:

```bash
cd packages/shadow-objects-e2e && pnpm test
```

Expected: green. Then record the counts for Step 5:

```bash
cd packages/shadow-objects-e2e && pnpm exec playwright test --list | tail -1
pnpm exec playwright test --list --project=chromium | tail -1
```

- [ ] **Step 5: README and TEST-PLAN**

`README.md`, in the page table after the `inspect-worker-env` row:

```markdown
| `model-context` | the five inspection tools of `@spearwolf/shadow-objects/model-context.js` through a fake model context, over a worker and a local environment: registration, every tool, limits, redaction, refusals, `dispose()` |
| `model-context-platform` | the same tools registered on Chromium's `document.modelContext` (behind `--enable-features=WebMCP`) and executed through the platform's `getTools()` / `executeTool()`; skipped in Firefox and WebKit |
```

`TEST-PLAN.md`: in the *Status* paragraph and in §1 replace the counts with the measured ones from Step 4 (per project and overall; note that the platform spec's cases count as skipped, not absent, in Firefox and WebKit -- `--list` counts them in every project) and "thirteen spec files over thirteen pages" with "fifteen spec files over fifteen pages". In the §1 table, after the `inspect-worker-env.spec.ts` row, add:

```markdown
| `model-context.spec.ts` | `pages/model-context.html` | 18 | The five inspection tools through a fake model context, over one worker and one local environment: registration with names and annotations, `list-envs` with counts and no tree, `get-entity-tree` over the wire and under limits, `get-entity` with ancestors and the View component, `find-entities` by token with paths, a call without a criterion and an unknown namespace refused as error results, redaction on both halves, a JSON-safe envelope, and `dispose()`. |
| `model-context-platform.spec.ts` | `pages/model-context-platform.html` | 10 | The same tools on Chromium's real `document.modelContext`: `getTools()` lists them with their annotations, `executeTool()` reaches `list-envs`, `get-entity-tree` and `find-entities` and brings the envelope back, a refusal arrives as an error result, and `dispose()` takes them off the platform. Skipped in Firefox and WebKit. |
```

The two case numbers are the id count plus two (`test suite setup`, the errors case); adjust if the id lists changed.

- [ ] **Step 6: Lint, then commit**

Run from the root: `pnpm lint` and `pnpm -F shadow-objects-e2e typecheck`. Expected: clean.

```bash
git add packages/shadow-objects-e2e/playwright.config.ts packages/shadow-objects-e2e/pages/model-context.html packages/shadow-objects-e2e/pages/model-context-platform.html packages/shadow-objects-e2e/src/model-context.js packages/shadow-objects-e2e/src/model-context-platform.js packages/shadow-objects-e2e/tests/model-context.spec.ts packages/shadow-objects-e2e/tests/model-context-platform.spec.ts packages/shadow-objects-e2e/README.md packages/shadow-objects-e2e/TEST-PLAN.md
git commit -m "test: the inspection tools answer through a fake model context in three engines and through Chromium's real one" -m "Two pages: one drives every tool through a fake adapter over a worker and a local environment, the other registers on document.modelContext behind --enable-features=WebMCP and executes through getTools() / executeTool(), skipped where the platform has no such object." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

### Task 6: Documentation, changelogs, the agent guide, the proposal, and the full CI run

**Files:**
- Modify: `packages/shadow-objects/docs/api-reference.md` (quick navigation, a new `## Model Context` section before `## Web Components`, the *Security* section), `docs/guides.md`, `docs/cheat-sheet.md`, `docs/best-practices.md`, `packages/shadow-objects/README.md`
- Modify: `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]`), root `CHANGELOG.md` (new dated section)
- Modify: `AGENTS.md` (§2, the Inspection bullet), `CLAUDE.md` (the code layout list)
- Modify: `docs/proposals/web-mcp-shadow-envs.md` (§8.1, §10, §11.3, §14, §16)
- Test: `pnpm lint:terms`, `pnpm run ci`, the Playwright suite

No code. Every snippet is the text to insert or the exact phrase to replace.

- [ ] **Step 1: `api-reference.md` -- navigation and the new section**

In the **Quick navigation** list, after `- [FrameLoop](#frameloop)`, add `- [Model Context](#model-context)`. Under `- [Security](#security)` add `  - [Exposing Environments to an Agent](#exposing-environments-to-an-agent)`.

Before `## Web Components` (after the `---` that closes the FrameLoop section), insert:

````markdown
## Model Context

Five read-only tools that describe every Shadow Environment on the page to an AI agent, through the browser's model context ([WebMCP](https://github.com/webmachinelearning/webmcp): `document.modelContext`). One function registers them, and an `AbortSignal` or the handle takes them back. Nothing registers on import, on an element, or on its own.

```typescript
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';

const handle = await exposeShadowEnvsToModelContext();
handle.available;  // false where the platform has no model context -- then nothing was registered
handle.tools;      // ['shae-list-envs', 'shae-get-entity-tree', 'shae-get-entity', 'shae-find-entities', 'shae-get-registry']
handle.dispose();  // takes them back
```

Read [Exposing Environments to an Agent](#exposing-environments-to-an-agent) under *Security* before the first call in an application: every value in every answer is application state.

A subpath rather than an `index.ts` export, so that the module stays out of the worker bundle and out of every consumer that does not want it; `ConsoleLogger.js` and `FrameLoop.js` are the precedent. Importing it throws nowhere -- the platform is read only inside the call -- so the same application code runs in every browser.

### `exposeShadowEnvsToModelContext(options?)`

- **Signature:** `exposeShadowEnvsToModelContext(options?: ExposeOptions): Promise<ExposeHandle>`

| Option | Default | Meaning |
| :--- | :--- | :--- |
| `modelContext` | `document.modelContext`, then `navigator.modelContext` | Where to register. Anything with a `registerTool()` -- a fake in a test, an adapter of your own |
| `toolPrefix` | `'shae-'` | The start of every tool name, so the tools sit next to an application's own without colliding |
| `signal` | none | Aborting it unregisters every tool; the same as `dispose()` |
| `exposedTo` | not set | Passed through to `registerTool()` untouched; the platform's default applies without it |
| `limits` | `{}` | An `InspectRequest` of defaults for every call; a call's own input wins field by field, `values` one level down |
| `redactProps` | none | `string[]` or `(name, uuid) => boolean`: the properties whose values every answer replaces by `{$type: 'redacted'}`, on the Kernel's and the View's side alike. Property values only; an Entity Context that carries the same secret is not covered |

The promise resolves with `{available: false, tools: [], dispose}` where the platform has no model context -- a worker, Node, a browser without WebMCP, a plain `http://` origin outside `localhost` -- and logs one `info` line through a `ConsoleLogger` named `ModelContext`. It rejects with what `registerTool()` rejected with: a `NotAllowedError` under a Permissions Policy that disables `tools`, an `InvalidStateError` on a name that is already registered. Registration is all-or-nothing -- a rejection midway takes back what was registered before it. A second call while the first handle is live registers a second, independent set; under the same prefix it rejects on the duplicate name and leaves the first set intact. Keep one handle.

`ExposeHandle` carries `available`, `tools` (the registered names, with the prefix) and `dispose()`, which is idempotent.

### The tools

Every tool carries `annotations: {readOnlyHint: true, untrustedContentHint: true}` -- read-only because nothing writes, untrusted because the values are application data that may contain whatever a user typed. Every answer is one envelope:

```typescript
{
  content: [{type: 'text', text}],  // a one-line summary, a blank line, then the JSON of structuredContent
  structuredContent: object,        // the data, for an agent that reads structured results
  isError?: true,                   // a refusal the tool could phrase; content carries the reason
}
```

A refusal -- an unknown namespace, an unknown uuid, a search without a criterion, an input field of the wrong type, an environment that reported a failure -- is an `isError` result and never a rejection, so the wording reaches the agent. Only an aborted `options.signal` rejects `execute()`. A `namespace` names one environment as `shae-list-envs` reports it (the global namespace is `'ShadowObjectsGlobalNS'`); without one, every environment that holds a namespace answers, and every answer is a list with one entry per environment, whichever way it was asked.

| Tool | Input | `structuredContent` |
| :--- | :--- | :--- |
| `shae-list-envs` | none | `{envs: [{namespace, isGlobalNamespace, kind, state, view?: {takenAt, counts}, kernel?: {takenAt, thread, counts}, error?}]}` -- no tree; the cheapest call and the first to make |
| `shae-get-entity-tree` | `{namespace?, rootUuid?, maxDepth?, maxNodes?, include?, valueDepth?}` | `{envs: EnvSnapshot[]}` -- both halves, cut by the limits; `truncation` names where, `rootUuid` is the way to descend |
| `shae-get-entity` | `{uuid, namespace?}` | `{matches: [{namespace, entity, ancestors: [{uuid, token}], view?}]}` -- the Entity with its children one level down, the chain above it, and the View's component of the same uuid; a uuid held in more than one environment comes back once per environment |
| `shae-find-entities` | `{namespace?, token?, propName?, shadowObject?, contextName?, limit?}`, at least one criterion | `{results: [{namespace, matches: [{uuid, token, path}], total, error?}]}` -- the search runs where the Kernel runs (`InspectRequest.filter`) and ships matches, not the tree; `limit` defaults to 50, `total` counts every match |
| `shae-get-registry` | `{namespace?}` | `{registries: [{namespace, kind, registry?: RegistrySnapshot, error?}]}` |

The tool inputs map onto [`InspectRequest`](#inspectrequest): `rootUuid` is `rootUuids: [rootUuid]`, `valueDepth` is `values.maxDepth`, the rest keep their names. An environment that cannot answer costs its own entry with the reason under `error`, exactly as [`inspectAll()`](#shadowenvinspectallrequest-signal) reports it. Snapshots are built per call and never cached; an agent that wants View and Kernel to agree after a change the application made has to wait for the application's own `syncWait()`, and the tools cannot do that for it.

### `ModelContextLike`

The structural contract the package talks to the platform through, exported for tests and for an adapter of your own:

```typescript
interface ModelContextLike {
  registerTool(tool: ModelContextToolLike, options?: {signal?: AbortSignal; exposedTo?: string[]}): Promise<unknown> | unknown;
}
interface ModelContextToolLike {
  name: string; title?: string; description: string; inputSchema: object;
  annotations?: {readOnlyHint?: boolean; untrustedContentHint?: boolean; consequentialHint?: boolean};
  execute(input: unknown, options?: {signal?: AbortSignal}): Promise<unknown> | unknown;
}
```

`findModelContext()` is the lookup the function uses without `options.modelContext`: `document.modelContext` first, `navigator.modelContext` as the fallback, `undefined` for neither. WebMCP is a moving specification; this interface is where the package absorbs the next change, and no types package is depended on for it.

**The platform, as of September 2026.** Chromium ships `document.modelContext` behind `--enable-features=WebMCP` (Chrome 149 origin trial; `about:flags#enable-webmcp-testing` for local development). There, an in-page agent lists the tools with `getTools()` and runs one with `executeTool(tool, input)`, where `tool` is an entry of that list and `input` is the JSON **string** of the arguments; the tool's `execute` receives the parsed object. A tool whose `execute` rejects is reported to the agent as a generic failure without its message, which is why the tools here answer refusals as `isError` results.

---
````

- [ ] **Step 2: `api-reference.md` -- the Security section**

At the end of `## Security`, after the paragraph beginning "Neither the element nor the proxy validate the URL" and before the `---`, add:

```markdown
### Exposing Environments to an Agent

`exposeShadowEnvsToModelContext()` is a second way state leaves the page. Every value in every answer is application state: properties hold what the View put there, and an application that passes a session token, an e-mail address or a user's draft through a `<shae-prop>` will see it in the answer, and so will every agent the page exposes tools to.

- **Nothing is exposed without the call.** No element attribute, no auto-registration, no import side effect. The function is the only way in, and its `signal` or `dispose()` is the way out.
- **Read-only, and declared as such.** `readOnlyHint: true` on every tool; an agent cannot change a Kernel through this surface. `untrustedContentHint: true` on every tool, unconditionally, because the values can include what a user typed.
- **Exposure follows the platform.** Without `exposedTo` the platform decides which documents and agents see the tools; the option is passed through for the cases where that default is not the right one.
- **Redaction is available and not default.** `redactProps` hides the property names the application knows to be secret. A default list would be a guess, and a guess here would suggest a coverage it cannot have. Entity Context values are not covered.
- **Production is a decision.** Call the function behind the same switch that enables the `ConsoleLogger`, or behind a build flag, and never unconditionally in a shipped bundle -- see [Best Practices](./best-practices.md#10-exposing-environments-to-an-agent). The framework does not enforce this; it is the application's origin and the application's data.
- **A secure context is required.** On plain `http://` outside `localhost` the platform hands out no model context, and the function reports `available: false`.

The View half of every answer names elements by CSS selector path, never by node, and reveals nothing the agent could not read from the DOM itself.
```

- [ ] **Step 3: `guides.md`**

After the *Inspecting an Environment* subsection (before `### When the Worker Dies`), insert:

````markdown
### Exposing Environments to an Agent

Everything `inspect()` returns can be handed to an AI agent in the browser through the model context (WebMCP). Before the code: every value in every answer is application state, and an application that routes a session token or a user's draft through a `<shae-prop>` shows it to every agent the page exposes tools to. Read [Exposing Environments to an Agent](./api-reference.md#exposing-environments-to-an-agent) under *Security* first, keep the call behind a development switch, and name the properties that must not leave the page.

```javascript
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';

if (import.meta.env.DEV) {
  const handle = await exposeShadowEnvsToModelContext({
    redactProps: ['sessionToken', 'email'],   // {$type: 'redacted'} in every answer
    limits: {maxDepth: 3},                     // defaults for every call; the agent's own input wins
  });
  // handle.available is false where the browser has no model context; nothing was registered then
  // handle.dispose() takes the five tools back
}
```

An agent then sees `shae-list-envs`, `shae-get-entity-tree`, `shae-get-entity`, `shae-find-entities` and `shae-get-registry`, each read-only, each answering with a one-line summary and the JSON of the snapshot. The tools ask `ShadowEnv.inspectAll()` and `inspect()` per call and cache nothing; the `syncWait()` rule above holds for them too, and an agent cannot wait for a cycle on the application's behalf. The [API Reference](./api-reference.md#model-context) has the inputs and outputs of every tool.

In a test, or in a browser without the platform, hand the function a `modelContext` of your own -- anything with a `registerTool()` -- and call the tools' `execute()` directly.
````

- [ ] **Step 4: `cheat-sheet.md`**

After the *Inspecting an Environment* section's closing paragraph ("Request defaults: …") and before the `---`, add:

````markdown
## Exposing Environments to an Agent

```typescript
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
const handle = await exposeShadowEnvsToModelContext({redactProps: ['sessionToken']});
handle.available;   // false: no model context on this platform, nothing registered
handle.tools;       // the five names below
handle.dispose();   // takes them back (or abort options.signal)
```

| Tool | Asks for | Answers with |
| :--- | :--- | :--- |
| `shae-list-envs` | nothing | every environment: namespace, kind, state, counts |
| `shae-get-entity-tree` | `namespace?, rootUuid?, maxDepth?, maxNodes?, include?, valueDepth?` | both halves of `inspect()`, cut by the limits |
| `shae-get-entity` | `uuid, namespace?` | one Entity, its ancestors, the View component next to it |
| `shae-find-entities` | one of `token, propName, shadowObject, contextName`; `limit?` | `{uuid, token, path}` per match, and the total |
| `shae-get-registry` | `namespace?` | tokens, routes, property routes |

Read-only, every value untrusted by declaration, a refusal is `isError: true`. Development only: every answer is application state.
````

- [ ] **Step 5: `best-practices.md`**

Append a tenth section before the file's final `---` (or at the end if there is none):

```markdown
---

## 10. Exposing Environments to an Agent

`exposeShadowEnvsToModelContext()` hands every Shadow Environment on the page to an AI agent, read-only, through the browser's model context. It is the inspection API of `ShadowEnv.inspect()` with an agent on the other end -- and every value it returns is application state.

**Call it behind a switch, never unconditionally in a shipped bundle.** The same gate that enables the `ConsoleLogger` is the natural one; a build flag such as `import.meta.env.DEV` is the other. The function is the only way the tools appear -- no element attribute, no import side effect -- so the switch is the whole decision.

```javascript
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';

if (import.meta.env.DEV) {
  await exposeShadowEnvsToModelContext({redactProps: ['sessionToken', 'email']});
}
```

**Name the properties that must not leave the page.** `redactProps` replaces their values by `{$type: 'redacted'}` in every answer, on the Kernel's and the View's side. It takes a list of names or a predicate over name and Entity uuid. There is no default list on purpose: a guess would suggest a coverage it cannot have, and a property that carries a secret in one application is harmless in the next. Entity Context values are not covered; a secret that travels as a context is a secret the agent sees.

**Keep one handle.** A second call under the same prefix rejects on the duplicate name; a second call under another prefix registers a second, independent set. `dispose()` or the `signal` you passed takes a set back, and a page that opens the tools on a route should close them on leaving it.

**Set `limits` for the agent, not for yourself.** An agent's context window is the budget. The defaults -- depth 4, 250 nodes, values cut at depth 3 -- are conservative; `shae-find-entities` exists so that a search does not ship the tree, and `shae-list-envs` carries counts only. Loosen them for a small scene, tighten them for a large one; the agent's own input wins over them field by field.
```

- [ ] **Step 6: `README.md` of the package**

In `## Security`, after the sentence that ends "…for every other one — is in the [API Reference](…#security).", add a paragraph:

```markdown
`exposeShadowEnvsToModelContext()` from `@spearwolf/shadow-objects/model-context.js` is a second way state leaves the page: it hands every Shadow Environment to an AI agent through the browser's model context (WebMCP), read-only, and every value in every answer is application state. Nothing is exposed without the call; keep it behind a development switch and name the properties to redact. Details under [Exposing Environments to an Agent](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/api-reference.md#exposing-environments-to-an-agent).
```

- [ ] **Step 7: The changelogs**

`packages/shadow-objects/CHANGELOG.md`, under `## [Unreleased]` → `### New`, append after the Task 1 bullet:

```markdown
- **New (public API, subpath):** `@spearwolf/shadow-objects/model-context.js` — `exposeShadowEnvsToModelContext(options?)` registers five read-only tools on the browser's model context (WebMCP, `document.modelContext`): `shae-list-envs`, `shae-get-entity-tree`, `shae-get-entity`, `shae-find-entities`, `shae-get-registry`, every one with `readOnlyHint` and `untrustedContentHint`, every answer `{content, structuredContent, isError?}` — a one-line summary, then the JSON. Options: `modelContext`, `toolPrefix` (`'shae-'`), `signal`, `exposedTo`, `limits`, `redactProps`. Resolves with `available: false` where the platform has no model context, rejects with what `registerTool()` rejected with, registers all-or-nothing, and the handle's `dispose()` takes the tools back. Nothing registers on import or on an element. Exported with it: `findModelContext()`, `isModelContextLike()`, `DefaultToolPrefix`, and the types `ExposeOptions`, `ExposeHandle`, `ModelContextLike`, `ModelContextToolLike`, `ModelContextToolResult`, `ModelContextRegisterOptions`, `ModelContextToolAnnotations`, `RedactRule`, `EnvSummary`, `EntityMatchEntry`, `FindEntitiesEntry`, `RegistryEntry`. Documented in `docs/api-reference.md` (*Model Context*, and *Exposing Environments to an Agent* under *Security*), `docs/guides.md`, `docs/cheat-sheet.md`, `docs/best-practices.md` §10 and the README.
- **Changed (dist contract):** `dist/package.json` gains the `./model-context.js` export, and the published file list gains `dist/src/model-context.*` and the twelve modules under `dist/src/model-context/` with their declarations (48 files). `index.ts`, `bundle.js` and the worker bundle are unchanged by the subpath; `dist/bundle.js` grows by the search and the ancestors of the snapshot builder: <old> kB → <new> kB minified, <old> kB → <new> kB gzipped.
```

Fill the four numbers from this measurement, run on the commit before Task 1 and on `HEAD`:

```bash
cd packages/shadow-objects && pnpm build >/dev/null && wc -c dist/bundle.js && gzip -c dist/bundle.js | wc -c
```

Root `CHANGELOG.md`, a new section at the top:

```markdown
## 2026-09-05 — the e2e suite drives the inspection tools through a fake model context and through Chromium's real one

Phase 3 of the inspection proposal (`docs/proposals/web-mcp-shadow-envs.md`, §16) lands in `@spearwolf/shadow-objects`; what it changes for the package is in [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md). The e2e package grows with it, and its Chromium project gains a launch flag.

- **`packages/shadow-objects-e2e/playwright.config.ts`:** the chromium project is launched with `--enable-features=WebMCP`. Playwright 1.62.1 bundles Chromium 151, which exposes `document.modelContext` behind that flag; without it the platform page reports the model context as absent.
- **`packages/shadow-objects-e2e`:** `pages/model-context.html` drives the five tools of `@spearwolf/shadow-objects/model-context.js` through a fake model context over a worker and a local environment in Chromium, Firefox and WebKit; `pages/model-context-platform.html` registers on the real `document.modelContext` and executes through `getTools()` / `executeTool()`, skipped by name outside Chromium. `TEST-PLAN.md` and `README.md`: the case counts stand at <per project> per project, <overall> overall.
```

Fill the two counts from Task 5's `--list` output.

- [ ] **Step 8: `AGENTS.md` and `CLAUDE.md`**

`AGENTS.md` §2, extend the *Inspection (read-only)* bullet: replace its last sentence "Never the live objects, never a write." with:

```markdown
Never the live objects, never a write. One layer further out, `src/model-context/` (subpath `model-context.js`) hands the same snapshots to an AI agent through the browser's model context (WebMCP) as five read-only tools; it imports `ShadowEnv` and the snapshot types and never the Kernel, registers nothing on import, and stays out of the worker bundle.
```

`CLAUDE.md`, in the "Code layout" list after the `elements/` bullet, add:

```markdown
- `model-context/` — the WebMCP layer behind the `@spearwolf/shadow-objects/model-context.js` subpath: the structural `ModelContextLike` adapter, the five read-only tools and `exposeShadowEnvsToModelContext()`. Imports `ShadowEnv` and the snapshot types, never the Kernel; nothing here is in `index.ts` or the worker bundle.
```

- [ ] **Step 9: The proposal**

`docs/proposals/web-mcp-shadow-envs.md`:

In §8.1, after the code block of `InspectRequest`, add a paragraph:

```markdown
*Amended 2026-09-05 (phase 3).* `InspectRequest` carries a public `filter?: EntityFilter` -- `{token?, propName?, shadowObject?, contextName?, limit?}` -- and `KernelSnapshot` answers it under `search: {matches: [{uuid, token, path}], total}` with `roots` empty; the walk limits and `include` do not apply to a search, and the View side ignores it. `EntityNodeSnapshot.ancestors` is set on a node the request named in `rootUuids`. Both are what §10.3 and §10.4 need in one round trip, and both are public: a field on the wire and in the output is public whether the type admits it or not.
```

In §10, replace the paragraph of §10.4 that begins "The search runs as part of `createKernelSnapshot()`" with:

```markdown
The search runs as part of `createKernelSnapshot()` with a `filter` in the request, so the worker sends back only the matches. *Amended 2026-09-05:* the field is public (§8.1), not internal. The output of §10.3 and §10.4 is a list with one entry per environment whether one or all were asked -- `{matches: [{namespace, entity, ancestors, view?}]}` and `{results: [{namespace, matches, total, error?}]}` -- and so are the outputs of §10.2 (`{envs}`), §10.5 (`{registries}`) and §10.1 (`{envs}`); an agent parses one shape. A refusal the tool can phrase -- an unknown namespace or uuid, a search without a criterion, a field of the wrong type, a failure the environment reported -- is an `isError: true` result and never a rejection: Chromium reports a rejected `execute()` as a generic failure and drops the message. Only an aborted `options.signal` rejects.
```

In §11.3, after the code block, add: "*Amended 2026-09-05:* `execute(input: unknown, …)` -- the platform hands over whatever it parsed, and the tools read it through a typed reader. `ModelContextToolResult`, `ModelContextRegisterOptions` and `ModelContextToolAnnotations` are the named halves of the shapes above; `findModelContext()` is the lookup, `document.modelContext` first."

In §14, replace the `tests/model-context.spec.ts` bullet with:

```markdown
- `tests/model-context.spec.ts` with `pages/model-context.html` -- the five tools through a fake `ModelContextLike` handed in as `options.modelContext`, over one worker and one local environment, in three engines. `tests/model-context-platform.spec.ts` with `pages/model-context-platform.html` -- the tools registered on the real `document.modelContext` and driven through the platform's `getTools()` / `executeTool()`; the Chromium project is launched with `--enable-features=WebMCP`, and the spec skips by name in Firefox and WebKit. *Verified 2026-09-05 on Playwright 1.62.1 / Chromium 151:* the flag is the one above; `registerTool()` returns a promise and rejects a duplicate name with `InvalidStateError`; `executeTool(tool, input)` takes an entry of `getTools()` and the input as a JSON string; a throw inside `execute` surfaces as `UnknownError` without its message.
```

In §16, at the end of the **Phase 3** paragraph, add: "Implemented 2026-09-05; see `docs/superpowers/plans/2026-09-05-inspect-phase-3.md`."

- [ ] **Step 10: The checks**

```bash
pnpm lint:terms
pnpm run ci
cd packages/shadow-objects-e2e && pnpm test
```

Expected: all three green. `pnpm run ci` runs the terminology check, build, typecheck, every vitest suite, the merged coverage, the e2e typecheck and Biome with `--error-on-warnings`. Then check the docs once for every count and name that changed: `grep -rn 'four\b' packages/shadow-objects/docs/api-reference.md | grep -i 'tool\|subpath'` should find nothing new, and `grep -rn 'model-context' packages/shadow-objects/docs packages/shadow-objects/README.md AGENTS.md CLAUDE.md | wc -l` should be well above zero.

- [ ] **Step 11: Commit**

```bash
git add packages/shadow-objects/docs packages/shadow-objects/README.md packages/shadow-objects/CHANGELOG.md CHANGELOG.md AGENTS.md CLAUDE.md docs/proposals/web-mcp-shadow-envs.md
git commit -m "docs: the model context is documented from the security paragraph down to the tool table" -m "API reference, guides, cheat sheet, best practices and the README say what the five tools answer and what leaves the page with them; the changelogs record the subpath, the dist files and the bundle delta; the proposal carries the phase-3 amendments." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01DbBQAaqSivrnAXKL2TF3TA"
```

---

## Self-review against the spec

**Spec coverage (§16, Phase 3):**

| Spec item | Task |
| :--- | :--- |
| `src/model-context/ModelContextLike.ts`, structural, no `webmcp-types` dependency (§11.3) | 2 |
| `redactProps` as list or predicate, `{$type: 'redacted'}` (§11.2, §12) | 2 (pass), 4 (option) |
| The five tools with prefix, annotations, envelope, `namespace` resolution incl. the global one (§9, §10) | 3 |
| `shae-find-entities` searches inside the Kernel walk and ships matches (§10.4) | 1 (`filter`), 3 (tool) |
| `shae-get-entity` answers depth 1 with ancestors and the View component (§10.3) | 1 (`ancestors`), 3 (tool) |
| `exposeShadowEnvsToModelContext()`: resolves without a platform, rejects with the platform's reason, all-or-nothing, one controller chained to `options.signal`, `dispose()`, duplicate prefix (§11.2) | 4 |
| The subpath `@spearwolf/shadow-objects/model-context.js` → `dist/src/model-context.js`, out of the worker bundle (§11.2) | 4 |
| Dist contract: the new export and the new files (§15) | 4 |
| No `<shae-worker>` attribute (§11.4) | none, by design |
| Unit tests of §14 against a fake adapter: names and annotations, `available: false`, all-or-nothing, `dispose()` and signal chaining, every tool's `execute` against a local environment, `redactProps` | 2, 3, 4 |
| The e2e spec of §14, with the platform flag verified | 5 |
| Docs of §15: api-reference *Model Context* section, guides, cheat-sheet, best-practices, README *Security*, changelog, `AGENTS.md`, root changelog for the browser flag | 1 (the request additions), 6 |
| Proposal amendments, green `pnpm run ci` and Playwright (§16) | 6 |
| §18.1 to §18.4: names kept, `structuredContent` included, defaults shipped, `untrustedContentHint` unconditional | 3, 4 |

Left to later phases on purpose (§17): the View/Kernel diff tool, mutation tools, an element-level opt-in, a DevTools panel.

**Placeholder scan:** every step carries its code or its exact text. The numbers Task 6 asks for -- the bundle sizes and the Playwright counts -- are measured by the commands given in Steps 7 and Task 5 Step 4, not guessed; the `<old>` / `<new>` / `<per project>` / `<overall>` markers in the changelog snippets are the four places they go, and they are the only markers in this plan.

**Type consistency:** `EntityFilter {token?, propName?, shadowObject?, contextName?, limit?}` is the same in Task 1's types, Task 3's `findEntities.ts` and the docs; `EntityMatch {uuid, token, path}` and `EntitySearchSnapshot {matches, total}` likewise. `ToolContext {prefix, limits, redact}` is built by Task 4 exactly as Task 2 declares it and Task 3 consumes it. `ModelContextToolResult {content, structuredContent?, isError?}` is the envelope Tasks 2, 3, 5 and 6 all name. The five tool names, their order and the default prefix `'shae-'` match between `createTools()` (Task 3), the expose spec's `FiveNames` (Task 4), both e2e pages (Task 5) and every doc table (Task 6). `ExposeOptions` and `ExposeHandle` fields are identical in Task 4's code and Task 6's option table. The structured shapes `{envs}`, `{matches}`, `{results}`, `{registries}` are the same in Task 3's code, Task 5's pages, deviation 3 and the api-reference table. The refusal wordings asserted in Task 3's spec -- `no Shadow Environment holds the namespace "nope"`, `"uuid" is required`, `no Shadow Environment holds an Entity "no-such-uuid"`, `at least one of token, propName, shadowObject, contextName is required`, `"include" knows only` -- are the strings Task 2 and Task 3 throw. The test ids of Task 5's two pages and their two specs are the same sixteen and eight strings.
