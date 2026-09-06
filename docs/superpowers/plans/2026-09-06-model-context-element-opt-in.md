# Model Context Element Opt-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `<shae-worker expose-to-model-context redact-props="…">` hands its own Shadow Environment to an AI agent through the five model-context tools, without a line of JavaScript; the function `exposeShadowEnvsToModelContext()` and any number of such elements share one registration per page, and what the agent sees is the union of what every one of them exposes and redacts.

**Architecture:** One registration per pair of model context and tool prefix, held in a module-level registry (`src/model-context/sharedExposure.ts`). Every call of `exposeShadowEnvsToModelContext()` and every element with the attribute is a *member* of that registration and brings two rules: which namespaces it exposes (a call without `namespaces` exposes every environment) and which properties it redacts. The five tools ask the member set at the start of every call, so a member joining or leaving never re-registers: the first member opens the registration, the last one closes it. `ShaeWorkerElement` joins through the public function, loaded with a dynamic `import()` when the attribute is on and the element connected, so the element's static import graph stays free of the layer and `index.ts` and the worker bundle are untouched.

**Tech Stack:** TypeScript, `@spearwolf/signalize`, vitest 4 (happy-dom for `packages/shadow-objects`, `@vitest/browser` + Playwright for `packages/shadow-objects-testing`), `@playwright/test` for `packages/shadow-objects-e2e`, Biome.

**Spec:** `docs/proposals/web-mcp-shadow-envs.md` §11.4 and §17 ("Element-level opt-in"), plus the decisions taken on 2026-09-06 and recorded below under *Design*. The last task writes them into the proposal.

## Global Constraints

- Terminology of `AGENTS.md` §4 in every doc and comment: Entity, Entity Tree, Token, `ComponentContext` / Namespace, "Entity Context" for `provideContext`/`useContext`; never "shadow theater", "puppet", "puppeteer", "light world", "screen" as analogy. `pnpm lint:terms` runs first in `pnpm run ci`.
- Docs and code comments in English, Markdown for docs. Prose style of the existing docs: `--` for a dash, no em-dash.
- A public API change updates `packages/shadow-objects/docs/`, `packages/shadow-objects/README.md` and `packages/shadow-objects/CHANGELOG.md` (under `## [Unreleased]`) in the same commit.
- A file added under `dist/` updates `src/distContract.files.txt` and gets a changelog entry in the same commit; `src/distContract.spec.ts` needs a built `dist/` (`pnpm -F @spearwolf/shadow-objects build`).
- Lint and format are Biome only: `pnpm lint:fix` before every commit, `pnpm lint:ci` must pass (warnings fail).
- `src/model-context/` imports `ShadowEnv` and the snapshot types, never the Kernel, and stays out of `index.ts` and the worker bundle. Nothing registers on import.
- No dependency changes. No `TODO` comments (they would require `pnpm make:todo`).
- Run tests through the package scripts: `pnpm -F @spearwolf/shadow-objects exec vitest <path> --run` for one spec, `pnpm -F @spearwolf/shadow-objects test` for the suite with coverage, `pnpm -F shadow-objects-testing test` for the Chromium integration suite, `pnpm -F shadow-objects-e2e test` for Playwright (needs `pnpm exec playwright install chromium firefox webkit` once).
- Commits go on `main` directly, one per task, message in the repository's `feat:` / `test:` / `docs:` style, and every message ends with:

  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XvC93oEYCMYEpz4DsudQ6K
  ```

## Design

Decisions taken on 2026-09-06, after the three phases of the proposal shipped:

1. **One registration per page, shared by calls and elements.** The five tools carry fixed names and the platform refuses a duplicate, so the library holds one registration per pair of model context and prefix, and everything that wants the tools joins it as a member. A second `exposeShadowEnvsToModelContext()` call under the same prefix is no longer an `InvalidStateError` but a join. The first member opens the registration, the last member out closes it: `dispose()` and the caller's `signal` take one member's share back, the tools leave with the last share.
2. **Per environment, not per page.** The attribute exposes the environment of the element that carries it. The agent sees the union over the members: an element exposes its own namespace, a call without `namespaces` exposes every environment. Function first, element second: the element's environment is already covered, its join changes the namespaces nothing. Element first, function second: every environment is visible from that call on. The function disposes: its share goes, the element's environment stays visible. An environment no member exposes is not listed by `shae-list-envs`, and a tool asked for its namespace answers with the same refusal as for an unknown namespace -- an agent cannot tell "hidden" from "absent".
3. **Redaction cumulates.** Every member's `redactProps` -- a list or a predicate -- is one rule; a value is redacted when any member's rule says so, in every exposed environment. A rule leaves with its member, and a name stays hidden while another member still names it. Both unions are read from the member set at the start of every tool call, so a `redact-props` attribute edited at runtime applies to the next call.
4. **What does not merge, the opener sets.** `limits` and `exposedTo` belong to the registration: the member that opens it hands them over, a later member with different values is reported through the `ModelContext` logger and joins under the opener's. Elements bring neither. `toolPrefix` and `modelContext` are the key: different values are different registrations, as today.
5. **The function stays the primitive.** `exposeShadowEnvsToModelContext()` gains `namespaces`; the element calls the function with a namespace predicate and a redaction predicate that read the element live. An environment built in JavaScript without an element is exposed by the function, with `namespaces` where a subset is wanted.
6. **The attribute is a truthy attribute**, read like `local` and `no-autostart` (`readBooleanAttribute`), and it is observed: setting it joins, removing it leaves. `redact-props` is read at every tool call and needs no observation.
7. **Dynamic import.** `ShaeWorkerElement` loads the function with `import()` on the first join. `dist/bundle.js` (esbuild, `bundle: true`, no `splitting`) inlines that import and grows by the model-context modules; the lib layout under `dist/src/` keeps them separate files.

What this plan does not do: no `modelContext` option on the element (a test installs a fake on `document.modelContext` before the element connects), no DOM event for the registration (`el.modelContextExposure` is the promise to await).

## File Structure

| File | Responsibility |
| :--- | :--- |
| `packages/shadow-objects/src/view/ShadowEnv.ts` | `inspectAll()` takes a third parameter `only?: (ns) => boolean` and describes only the namespaces it accepts |
| `packages/shadow-objects/src/model-context/toolSupport.ts` | `NamespaceRule`, `toNamespacePredicate()`, `ToolContext.isExposed`, `inspectEnvs()` reads both rules once per call |
| `packages/shadow-objects/src/model-context/sharedExposure.ts` (new) | the registry of registrations, join and leave, the two unions, the registration loop |
| `packages/shadow-objects/src/model-context/exposeShadowEnvsToModelContext.ts` | the public function: finds the model context, joins, wires `signal` and `dispose()` |
| `packages/shadow-objects/src/model-context.ts` | exports `NamespaceRule` |
| `packages/shadow-objects/src/utils/attr-utils.ts` | `readListAttribute()` |
| `packages/shadow-objects/src/elements/constants.ts` | `ATTR_EXPOSE_TO_MODEL_CONTEXT`, `ATTR_REDACT_PROPS` |
| `packages/shadow-objects/src/elements/ShaeWorkerElement.ts` | the two attributes, `redactProps`, `modelContextExposure`, join and leave |
| `packages/shadow-objects/src/distContract.files.txt` | four new files under `dist/src/model-context/` |
| `packages/shadow-objects-testing/test/worker-element-model-context.test.js` (new) | the markup path in real Chromium |
| `packages/shadow-objects-e2e/pages/model-context-element.html`, `src/model-context-element.js`, `tests/model-context-element.spec.ts` (new); `pages/model-context-platform.html`, `src/model-context-platform.js`, `tests/model-context-platform.spec.ts` (extended) | two elements and a fake in three engines; an element next to the function call on Chromium's real platform |
| Docs: `api-reference.md`, `guides.md`, `cheat-sheet.md`, `best-practices.md`, package `README.md`, package `CHANGELOG.md`, root `CHANGELOG.md`, `AGENTS.md`, `docs/proposals/web-mcp-shadow-envs.md`, e2e `TEST-PLAN.md` | in the task that changes the thing they describe |

---

### Task 1: `ShadowEnv.inspectAll()` describes only the namespaces a filter accepts

**Files:**
- Modify: `packages/shadow-objects/src/view/ShadowEnv.ts:91-110` (the `inspectAll` static)
- Test: `packages/shadow-objects/src/view/ShadowEnv.spec.ts` (the `describe('inspectAll', …)` block at ~1810)
- Modify: `packages/shadow-objects/docs/api-reference.md:1276-1285` (`ShadowEnv.inspectAll` section)
- Modify: `packages/shadow-objects/CHANGELOG.md` (`## [Unreleased]` → `### New`)

**Interfaces:**
- Produces: `static inspectAll(request?: InspectRequest, signal?: AbortSignal, only?: (ns: NamespaceType) => boolean): Promise<EnvSnapshot[]>` -- `only` is asked with the namespace an environment is registered under; an environment it refuses is neither inspected nor listed.

- [ ] **Step 1: Write the failing test**

Add inside `describe('inspectAll', …)` in `src/view/ShadowEnv.spec.ts`, after the existing cases:

```typescript
    it('asks only the environments whose namespace the filter accepts, and never touches the others', async () => {
      const a = new ShadowEnv();
      a.view = ComponentContext.get('inspect-only-a');
      a.envProxy = new LocalShadowObjectEnv();

      let asked = 0;
      const b = new ShadowEnv();
      b.view = ComponentContext.get('inspect-only-b');
      b.envProxy = {
        start: () => Promise.resolve(),
        importScript: () => Promise.resolve(),
        applyChangeTrail: () => Promise.resolve(),
        destroy: () => {},
        inspect: () => {
          asked += 1;
          return Promise.reject(new Error('should not be asked'));
        },
      };

      await Promise.all([a.ready(), b.ready()]);

      try {
        const snapshots = await ShadowEnv.inspectAll({}, undefined, (ns) => ns === 'inspect-only-a');

        expect(snapshots.map((s) => s.namespace)).toEqual(['inspect-only-a']);
        expect(asked, 'the refused environment was not inspected').toBe(0);
        expect((await ShadowEnv.inspectAll({}, undefined, () => false)).length).toBe(0);
      } finally {
        a.destroy();
        b.destroy();
        ComponentContext.get('inspect-only-a').dispose();
        ComponentContext.get('inspect-only-b').dispose();
      }
    });
```

Use the same imports and the same cleanup the neighbouring `inspectAll` cases use (check the first case of the block and mirror its `finally`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/view/ShadowEnv.spec.ts --run -t "filter accepts"`
Expected: FAIL -- `snapshots` holds both namespaces and `asked` is `1` (the third argument is ignored today).

- [ ] **Step 3: Implement the filter**

In `src/view/ShadowEnv.ts`, replace the `inspectAll` static:

```typescript
  /**
   * Every environment that holds a namespace, in registration order, each described by
   * {@link ShadowEnv.inspect}. One environment that cannot answer costs its own entry and not the
   * list: the per-environment failures are reported under `error`, and an environment destroyed
   * while it answers drops out of the list. Rejects only for the caller's reasons -- an aborted
   * signal.
   *
   * `only` narrows the list before anything is asked: it is called with the namespace an
   * environment is registered under, and an environment it refuses is neither inspected nor
   * listed. That is what lets a caller keep an environment out of a picture without touching it.
   */
  static async inspectAll(
    request: InspectRequest = {},
    signal?: AbortSignal,
    only?: (ns: NamespaceType) => boolean,
  ): Promise<EnvSnapshot[]> {
    const envs: ShadowEnv[] = [];
    for (const [ns, env] of globalThis.__shadowEnvs?.entries() ?? []) {
      if (only === undefined || only(ns)) envs.push(env);
    }
    const settled = await Promise.all(
      envs.map((env) =>
        env.inspect(request, signal).catch((error) => {
          if (signal?.aborted) throw signal.reason;
          if (error instanceof ShadowEnvDestroyedError) return undefined;
          throw error;
        }),
      ),
    );
    return settled.filter((snapshot): snapshot is EnvSnapshot => snapshot !== undefined);
  }
```

`NamespaceType` is already imported in that file (it types `__shadowEnvs`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/view/ShadowEnv.spec.ts --run`
Expected: PASS, the whole file.

- [ ] **Step 5: Document it**

In `docs/api-reference.md`, section `#### ShadowEnv.inspectAll(request?, signal?)`: change the heading to `#### \`ShadowEnv.inspectAll(request?, signal?, only?)\``, the signature line to

```
- **Signature:** `static inspectAll(request?: InspectRequest, signal?: AbortSignal, only?: (ns: NamespaceType) => boolean): Promise<EnvSnapshot[]>`
```

and append one sentence to the first paragraph: `\`only\` narrows the list before anything is asked: it is called with the namespace an environment is registered under, and an environment it refuses is neither inspected nor listed.` Then search the file for `#shadowenvinspectallrequest-signal` (one link, in *The tools*) and change the anchor to `#shadowenvinspectallrequest-signal-only`.

In `packages/shadow-objects/CHANGELOG.md`, under `## [Unreleased]` → `### New`, add after the `InspectRequest.filter` bullet:

```
- **New (public API):** `ShadowEnv.inspectAll(request?, signal?, only?)` -- the third parameter is asked with the namespace an environment is registered under, and an environment it refuses is neither inspected nor listed. The model-context tools use it to keep an environment out of every answer without touching it.
```

- [ ] **Step 6: Lint and commit**

```bash
pnpm lint:fix
pnpm lint:terms
git add packages/shadow-objects/src/view/ShadowEnv.ts packages/shadow-objects/src/view/ShadowEnv.spec.ts packages/shadow-objects/docs/api-reference.md packages/shadow-objects/CHANGELOG.md
git commit -m "feat: ShadowEnv.inspectAll takes a namespace filter and leaves the refused environments untouched"
```

---

### Task 2: the tools honour a namespace rule, read once per call

**Files:**
- Modify: `packages/shadow-objects/src/model-context/toolSupport.ts` (`ToolContext`, new `NamespaceRule`, `inspectEnvs`)
- Modify: `packages/shadow-objects/src/model-context.ts` (export the type)
- Test: `packages/shadow-objects/src/model-context/tools/tools.spec.ts`

**Interfaces:**
- Consumes: `ShadowEnv.inspectAll(request, signal, only)` from Task 1.
- Produces: `type NamespaceRule = NamespaceType[] | ((ns: NamespaceType) => boolean)`; `toNamespacePredicate(rule: NamespaceRule | undefined): ((ns: NamespaceType) => boolean) | undefined`; `ToolContext.isExposed: ((ns: NamespaceType) => boolean) | undefined`. `inspectEnvs()` reads `ctx.isExposed` and `ctx.redact` exactly once per call, which is what lets Task 3 define them as getters over a live member set. A hidden namespace named in a tool input is refused with the exact wording of an unknown one: `` `no Shadow Environment holds the namespace "${namespace}"` ``.

- [ ] **Step 1: Write the failing tests**

In `src/model-context/tools/tools.spec.ts`, extend the `toolContext()` helper so the new field is explicit:

```typescript
const toolContext = (extra: Partial<ToolContext> = {}): ToolContext => ({
  prefix: 'shae-',
  limits: {},
  redact: undefined,
  isExposed: undefined,
  ...extra,
});
```

and add a new `describe` at the end of the file, inside the outer `describe('the model-context tools', …)`:

```typescript
  describe('with isExposed', () => {
    const HIDDEN = 'mc-tools-hidden';
    let hidden: ShadowEnv;

    beforeEach(async () => {
      hidden = new ShadowEnv();
      hidden.view = ComponentContext.get(HIDDEN);
      hidden.envProxy = new LocalShadowObjectEnv();
      new ViewComponent('thing', {context: ComponentContext.get(HIDDEN)});
      await hidden.syncWait();
      tools = createTools(toolContext({isExposed: (ns) => ns === NS}));
    });

    afterEach(() => {
      hidden.destroy();
      ComponentContext.get(HIDDEN).dispose();
    });

    it('list-envs names only the exposed environments', async () => {
      const names = data(await run('list-envs')).envs.map((e: any) => e.namespace);
      expect(names).toContain(NS);
      expect(names).not.toContain(HIDDEN);
    });

    it('a hidden namespace is refused with the wording of an unknown one, on every tool that takes one', async () => {
      for (const name of ['get-entity-tree', 'get-registry']) {
        const result = await run(name, {namespace: HIDDEN});
        expect(result.isError, name).toBe(true);
        expect(result.content[0]?.text, name).toBe(`no Shadow Environment holds the namespace "${HIDDEN}"`);
      }
      const entity = await run('get-entity', {uuid: 'whatever', namespace: HIDDEN});
      expect(entity.content[0]?.text).toBe(`no Shadow Environment holds the namespace "${HIDDEN}"`);
      const search = await run('find-entities', {token: 'thing', namespace: HIDDEN});
      expect(search.content[0]?.text).toBe(`no Shadow Environment holds the namespace "${HIDDEN}"`);
    });

    it('a search without a namespace never reaches a hidden environment', async () => {
      const results = data(await run('find-entities', {token: 'thing'})).results.map((r: any) => r.namespace);
      expect(results).not.toContain(HIDDEN);
    });

    it('reads isExposed and redact once per call, so a getter can answer from live state', async () => {
      let exposedReads = 0;
      let redactReads = 0;
      const ctx: ToolContext = {
        prefix: 'shae-',
        limits: {},
        get isExposed() {
          exposedReads += 1;
          return undefined;
        },
        get redact() {
          redactReads += 1;
          return undefined;
        },
      };
      tools = createTools(ctx);
      await run('get-entity-tree');
      expect(exposedReads).toBe(1);
      expect(redactReads).toBe(1);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/model-context/tools --run`
Expected: FAIL -- a type error on `isExposed` (vitest reports it as a failure of the file), or the hidden namespace is listed.

- [ ] **Step 3: Implement it**

In `src/model-context/toolSupport.ts`:

Add after `ToolContext`'s `redact` field:

```typescript
  /** Which environments the tools see, by the namespace each is registered under; `undefined` means every one. */
  isExposed: ((ns: NamespaceType) => boolean) | undefined;
```

Add after `toNamespace`:

```typescript
/** Which environments an exposure covers: a list of namespaces, or a predicate over the namespace an environment is registered under. */
export type NamespaceRule = NamespaceType[] | ((ns: NamespaceType) => boolean);

export const toNamespacePredicate = (rule: NamespaceRule | undefined): ((ns: NamespaceType) => boolean) | undefined => {
  if (rule === undefined) return undefined;
  if (typeof rule === 'function') return rule;
  const names = new Set<NamespaceType>(rule);
  return (ns) => names.has(ns);
};
```

Replace the body of `inspectEnvs` (keep its doc comment; add the sentences *A namespace the exposure does not cover is refused with the same words as an unknown one, so an agent cannot tell the two apart. Both rules are read once, at the top: an exposure whose members change answers every call from the set it had when the call began.*):

```typescript
  const only = ctx.isExposed;
  const redact = ctx.redact;

  let snapshots: EnvSnapshot[];
  if (namespace === undefined) {
    snapshots = await ShadowEnv.inspectAll(request, signal, only);
  } else {
    const ns = toNamespace(namespace);
    const env = only === undefined || only(ns) ? ShadowEnv.get(ns) : undefined;
    if (env === undefined) throw new ToolError(`no Shadow Environment holds the namespace "${namespace}"`);
    snapshots = [await env.inspect(request, signal)];
  }
  if (redact !== undefined) {
    for (const snapshot of snapshots) redactSnapshot(snapshot, redact);
  }
  return snapshots;
```

In `src/model-context.ts`, add to the exports: `export type {NamespaceRule} from './model-context/toolSupport.js';`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/model-context --run`
Expected: `tools.spec.ts` PASS. `exposeShadowEnvsToModelContext.spec.ts` fails on the type of `ctx` (the field `isExposed` is missing there) -- Task 3 rewrites that file. If the type error blocks the run, add `isExposed: undefined,` to the `ctx` literal in `exposeShadowEnvsToModelContext.ts` for now.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add packages/shadow-objects/src/model-context
git commit -m "feat: the model-context tools honour a namespace rule, and a hidden namespace reads as an unknown one"
```

---

### Task 3: one shared registration per model context and prefix

**Files:**
- Create: `packages/shadow-objects/src/model-context/sharedExposure.ts`
- Modify: `packages/shadow-objects/src/model-context/exposeShadowEnvsToModelContext.ts` (rewrite)
- Test: `packages/shadow-objects/src/model-context/exposeShadowEnvsToModelContext.spec.ts`
- Modify: `packages/shadow-objects/docs/api-reference.md` (options table at ~1928, the paragraph after it, *The tools* paragraph at ~1955), `docs/best-practices.md` §10 (*Keep one handle*), `docs/cheat-sheet.md:540-552`, `packages/shadow-objects/CHANGELOG.md`, `packages/shadow-objects/src/distContract.files.txt`

**Interfaces:**
- Consumes: `NamespaceRule`, `toNamespacePredicate`, `ToolContext` from Task 2; `RedactRule`, `toRedactPredicate`, `RedactPredicate` from `redactProps.ts`; `createTools` from `tools/index.js`.
- Produces, in `sharedExposure.ts` (internal, not exported from the subpath):

```typescript
export interface ExposureMember {
  namespaces: NamespaceRule | undefined;   // undefined: every environment
  redactProps: RedactRule | undefined;
}
export interface ExposureSettings {
  limits: Partial<InspectRequest>;
  exposedTo?: string[];
}
export interface ExposureMembership {
  /** The names the registration ended with; rejects with what registerTool() rejected with. */
  readonly tools: Promise<string[]>;
  /** Takes this member's share back. The last member out closes the registration. Idempotent. */
  leave(): void;
}
export function joinSharedExposure(modelContext: ModelContextLike, prefix: string, member: ExposureMember, settings: ExposureSettings): ExposureMembership;
```

- Produces, on the public function: `ExposeOptions.namespaces?: NamespaceRule`; a second call under the same model context and prefix joins; `ExposeHandle.dispose()` takes that call's share back; `handle.tools` names the tools of the shared registration.

- [ ] **Step 1: Rewrite the spec**

Replace `src/model-context/exposeShadowEnvsToModelContext.spec.ts` with:

```typescript
import {afterEach, describe, expect, it} from 'vitest';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {exposeShadowEnvsToModelContext} from './exposeShadowEnvsToModelContext.js';
import type {
  ModelContextLike,
  ModelContextRegisterOptions,
  ModelContextToolLike,
  ModelContextToolResult,
} from './ModelContextLike.js';

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

/** A local environment with one root that carries the given properties. */
const makeEnv = async (ns: string, props: Record<string, unknown> = {}) => {
  const env = new ShadowEnv();
  const ctx = ComponentContext.get(ns);
  env.view = ctx;
  env.envProxy = new LocalShadowObjectEnv();
  const root = new ViewComponent('thing', {context: ctx});
  for (const [name, value] of Object.entries(props)) root.setProperty(name, value);
  await env.syncWait();
  return {
    env,
    root,
    dispose() {
      env.destroy();
      ctx.dispose();
    },
  };
};

const execute = async (mc: FakeModelContext, name: string, input: object = {}): Promise<any> =>
  ((await mc.tools.get(name)!.execute(input)) as ModelContextToolResult).structuredContent;

const listed = async (mc: FakeModelContext, prefix = 'shae-'): Promise<string[]> =>
  (await execute(mc, `${prefix}list-envs`)).envs.map((e: any) => e.namespace);

const propsOf = async (mc: FakeModelContext, namespace: string): Promise<Record<string, unknown>> => {
  const root = (await execute(mc, 'shae-get-entity-tree', {namespace})).envs[0].kernel.roots[0];
  return Object.fromEntries(root.props.map((p: any) => [p.name, p.value]));
};

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

  it('takes back what it registered when a registration fails, rejects with that reason, and tries again on the next call', async () => {
    const mc = fakeModelContext('shae-get-entity');

    await expect(exposeShadowEnvsToModelContext({modelContext: mc})).rejects.toMatchObject({name: 'NotAllowedError'});
    expect(mc.tools.size).toBe(0);

    const working = fakeModelContext();
    const handle = await exposeShadowEnvsToModelContext({modelContext: working});
    expect(handle.tools).toEqual(FiveNames);
    handle.dispose();
  });

  it('passes exposedTo, the prefix, the limits and the redaction through', async () => {
    const mc = fakeModelContext();
    const scene = await makeEnv('mc-expose', {token: 'abc', name: 'x'});
    new ViewComponent('thing', {parent: scene.root, context: ComponentContext.get('mc-expose')});
    await scene.env.syncWait();

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

      const root = (await execute(mc, 'app-get-entity-tree', {namespace: 'mc-expose'})).envs[0].kernel.roots[0];
      expect(root.children, 'the limit applied').toBeUndefined();
      expect(root.childCount).toBe(1);
      expect(Object.fromEntries(root.props.map((p: any) => [p.name, p.value]))).toEqual({token: {$type: 'redacted'}, name: 'x'});

      handle.dispose();
    } finally {
      scene.dispose();
    }
  });

  it('dispose() takes the tools back when it is the only share, and can be called twice', async () => {
    const mc = fakeModelContext();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc});

    handle.dispose();
    expect(mc.tools.size).toBe(0);
    expect(() => handle.dispose()).not.toThrow();
  });

  it('follows the caller signal: aborting it takes the share back, an aborted one registers nothing', async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    const handle = await exposeShadowEnvsToModelContext({modelContext: mc, signal: controller.signal});
    expect(mc.tools.size).toBe(5);

    controller.abort();
    expect(mc.tools.size).toBe(0);
    expect(handle.tools, 'the handle keeps saying what was registered').toEqual(FiveNames);

    const already = new AbortController();
    already.abort();
    const nothing = await exposeShadowEnvsToModelContext({modelContext: mc, signal: already.signal});
    expect(nothing).toMatchObject({available: true, tools: []});
    expect(mc.tools.size).toBe(0);
  });

  it('stops registering when the only member leaves midway, and reports no tools', async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    const registerTool = mc.registerTool.bind(mc);
    mc.registerTool = async (tool, options) => {
      await registerTool(tool, options);
      if (tool.name === 'shae-get-entity-tree') controller.abort();
    };

    const handle = await exposeShadowEnvsToModelContext({modelContext: mc, signal: controller.signal});

    expect(handle).toMatchObject({available: true, tools: []});
    expect(mc.tools.size).toBe(0);
  });

  describe('shares one registration per model context and prefix', () => {
    it('a second call under the same prefix joins: one set of tools, and it leaves with the last share', async () => {
      const mc = fakeModelContext();
      const first = await exposeShadowEnvsToModelContext({modelContext: mc});
      const second = await exposeShadowEnvsToModelContext({modelContext: mc});

      expect(second.tools).toEqual(FiveNames);
      expect(mc.tools.size, 'one set').toBe(5);
      expect(mc.calls.length, 'registered once').toBe(5);

      first.dispose();
      expect(mc.tools.size, 'one share left, the tools stay').toBe(5);
      second.dispose();
      expect(mc.tools.size, 'the last share out takes them back').toBe(0);
    });

    it('another prefix or another model context is another registration', async () => {
      const mc = fakeModelContext();
      const other = fakeModelContext();
      const a = await exposeShadowEnvsToModelContext({modelContext: mc});
      const b = await exposeShadowEnvsToModelContext({modelContext: mc, toolPrefix: 'two-'});
      const c = await exposeShadowEnvsToModelContext({modelContext: other});

      expect(mc.tools.size).toBe(10);
      expect(other.tools.size).toBe(5);

      a.dispose();
      expect(mc.tools.size).toBe(5);
      b.dispose();
      c.dispose();
      expect(mc.tools.size + other.tools.size).toBe(0);
    });

    it('a closed registration opens fresh on the next call', async () => {
      const mc = fakeModelContext();
      const first = await exposeShadowEnvsToModelContext({modelContext: mc});
      first.dispose();
      const second = await exposeShadowEnvsToModelContext({modelContext: mc});
      expect(mc.tools.size).toBe(5);
      expect(mc.calls.length).toBe(10);
      second.dispose();
    });

    it('a member that joins while the registration is on its way shares its outcome', async () => {
      const mc = fakeModelContext();
      const first = exposeShadowEnvsToModelContext({modelContext: mc});
      const second = exposeShadowEnvsToModelContext({modelContext: mc});
      const [a, b] = await Promise.all([first, second]);
      expect(a.tools).toEqual(FiveNames);
      expect(b.tools).toEqual(FiveNames);
      expect(mc.calls.length).toBe(5);
      a.dispose();
      b.dispose();
    });
  });

  describe('namespaces', () => {
    it('limits what the tools see, as a list and as a predicate', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-ns-a');
      const b = await makeEnv('mc-ns-b');

      try {
        const asList = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: ['mc-ns-a']});
        expect(await listed(mc)).toEqual(['mc-ns-a']);
        asList.dispose();

        const asPredicate = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: (ns) => ns === 'mc-ns-b'});
        expect(await listed(mc)).toEqual(['mc-ns-b']);
        asPredicate.dispose();
      } finally {
        a.dispose();
        b.dispose();
      }
    });

    it('is the union over the shares, and a call without the option exposes everything whichever came first', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-union-a');
      const b = await makeEnv('mc-union-b');
      const c = await makeEnv('mc-union-c');

      try {
        const onlyA = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: ['mc-union-a']});
        expect(await listed(mc)).toEqual(['mc-union-a']);

        const onlyB = await exposeShadowEnvsToModelContext({modelContext: mc, namespaces: ['mc-union-b']});
        expect(await listed(mc), 'the union of two shares').toEqual(['mc-union-a', 'mc-union-b']);

        const all = await exposeShadowEnvsToModelContext({modelContext: mc});
        expect(await listed(mc), 'a share without the option covers every environment').toEqual(['mc-union-a', 'mc-union-b', 'mc-union-c']);

        all.dispose();
        expect(await listed(mc), 'the others keep theirs').toEqual(['mc-union-a', 'mc-union-b']);
        onlyA.dispose();
        expect(await listed(mc)).toEqual(['mc-union-b']);
        onlyB.dispose();
        expect(mc.tools.size).toBe(0);
      } finally {
        a.dispose();
        b.dispose();
        c.dispose();
      }
    });
  });

  describe('redaction', () => {
    it('cumulates over the shares -- lists and predicates alike -- and a rule leaves with its share', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-redact-a', {token: 't', email: 'e', draft: 'd', open: 1});
      const b = await makeEnv('mc-redact-b', {token: 't', email: 'e', draft: 'd', open: 1});
      const R = {$type: 'redacted'};

      try {
        const byList = await exposeShadowEnvsToModelContext({modelContext: mc, redactProps: ['token']});
        const byOtherList = await exposeShadowEnvsToModelContext({modelContext: mc, redactProps: ['email', 'token']});
        const byPredicate = await exposeShadowEnvsToModelContext({
          modelContext: mc,
          redactProps: (name, uuid) => name === 'draft' && uuid === a.root.uuid,
        });

        expect(await propsOf(mc, 'mc-redact-a'), 'every rule applies, in every environment').toEqual({token: R, email: R, draft: R, open: 1});
        expect(await propsOf(mc, 'mc-redact-b'), 'the predicate asked for one uuid only').toEqual({token: R, email: R, draft: 'd', open: 1});

        byOtherList.dispose();
        expect(await propsOf(mc, 'mc-redact-a'), 'email left with its share; token is still named by another').toEqual({
          token: R,
          email: 'e',
          draft: R,
          open: 1,
        });

        byPredicate.dispose();
        expect(await propsOf(mc, 'mc-redact-a')).toEqual({token: R, email: 'e', draft: 'd', open: 1});

        byList.dispose();
        expect(mc.tools.size).toBe(0);
      } finally {
        a.dispose();
        b.dispose();
      }
    });

    it('a share without a rule redacts nothing and takes nothing away from the others', async () => {
      const mc = fakeModelContext();
      const a = await makeEnv('mc-redact-none', {token: 't'});
      try {
        const plain = await exposeShadowEnvsToModelContext({modelContext: mc});
        expect(await propsOf(mc, 'mc-redact-none')).toEqual({token: 't'});
        const hiding = await exposeShadowEnvsToModelContext({modelContext: mc, redactProps: ['token']});
        expect(await propsOf(mc, 'mc-redact-none')).toEqual({token: {$type: 'redacted'}});
        plain.dispose();
        expect(await propsOf(mc, 'mc-redact-none'), 'the plain share leaving changes nothing').toEqual({token: {$type: 'redacted'}});
        hiding.dispose();
      } finally {
        a.dispose();
      }
    });
  });

  it('the opener sets limits and exposedTo; a later share with other values is reported and joins under them', async () => {
    const mc = fakeModelContext();
    const scene = await makeEnv('mc-settings');
    new ViewComponent('thing', {parent: scene.root, context: ComponentContext.get('mc-settings')});
    await scene.env.syncWait();

    const warnings: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      const opener = await exposeShadowEnvsToModelContext({modelContext: mc, limits: {maxDepth: 0}, exposedTo: ['https://a.example']});
      const later = await exposeShadowEnvsToModelContext({modelContext: mc, limits: {maxDepth: 3}, exposedTo: ['https://b.example']});

      expect(mc.calls[0]?.exposedTo).toEqual(['https://a.example']);
      const root = (await execute(mc, 'shae-get-entity-tree', {namespace: 'mc-settings'})).envs[0].kernel.roots[0];
      expect(root.children, "the opener's limits apply").toBeUndefined();
      expect(warnings.some((w) => w.some((a) => typeof a === 'string' && a.includes('limits'))), 'reported').toBe(true);

      later.dispose();
      opener.dispose();
    } finally {
      console.warn = originalWarn;
      scene.dispose();
    }
  });
});
```

The `ConsoleLogger` prints `warn` only while `ConsoleLogger.sharedConfig.enable` and `.warn` are on; under happy-dom `location.hostname` is `localhost`, so they are. If the warning case finds `warnings` empty, set both flags in a `beforeAll` and restore them in an `afterAll`, the way `packages/shadow-objects-testing/test/worker-element-attributes.test.js` does.

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/model-context/exposeShadowEnvsToModelContext.spec.ts --run`
Expected: FAIL -- the join cases reject with `InvalidStateError`, the union cases list every namespace.

- [ ] **Step 3: Write `sharedExposure.ts`**

```typescript
import type {InspectRequest} from '../inspect/types.js';
import type {NamespaceType} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import type {ModelContextLike, ModelContextRegisterOptions} from './ModelContextLike.js';
import {type RedactPredicate, type RedactRule, toRedactPredicate} from './redactProps.js';
import {type NamespaceRule, type ToolContext, toNamespacePredicate} from './toolSupport.js';
import {createTools} from './tools/index.js';

/** What one share of a registration brings: the environments it exposes and the properties it hides. */
export interface ExposureMember {
  /** `undefined` exposes every environment that holds a namespace. */
  namespaces: NamespaceRule | undefined;
  redactProps: RedactRule | undefined;
}

/** What the registration takes from the member that opens it, and from nobody after that. */
export interface ExposureSettings {
  limits: Partial<InspectRequest>;
  exposedTo?: string[];
}

export interface ExposureMembership {
  /**
   * The names the registration ended with -- empty when it was closed while it was still
   * registering. Rejects with what `registerTool()` rejected with; the registration is gone then.
   */
  readonly tools: Promise<string[]>;
  /** Takes this share back. The last share out closes the registration. Idempotent. */
  leave(): void;
}

interface Exposure {
  readonly members: Set<ExposureMember>;
  readonly controller: AbortController;
  readonly settings: ExposureSettings;
  tools: Promise<string[]>;
  closed: boolean;
}

/*
 * One registration per model context and prefix, per copy of the package: the tools carry
 * fixed names and the platform refuses a duplicate, so whoever wants them joins the one that
 * exists. Keyed weakly on the model context, so a fake built in a test goes when the test does.
 */
const registry = new WeakMap<ModelContextLike, Map<string, Exposure>>();

const logger = new ConsoleLogger('ModelContext');

/**
 * The namespaces a registration exposes right now: `undefined` -- every environment -- as soon
 * as one member has no rule, otherwise "any member's rule accepts it".
 */
const unionNamespaces = (members: Iterable<ExposureMember>): ((ns: NamespaceType) => boolean) | undefined => {
  const predicates: ((ns: NamespaceType) => boolean)[] = [];
  for (const member of members) {
    const predicate = toNamespacePredicate(member.namespaces);
    if (predicate === undefined) return undefined;
    predicates.push(predicate);
  }
  return (ns) => predicates.some((accepts) => accepts(ns));
};

/**
 * The redaction a registration applies right now: a value is hidden when any member's rule
 * says so. `undefined` while no member brings a rule, so the walk over the snapshot is skipped.
 */
const unionRedaction = (members: Iterable<ExposureMember>): RedactPredicate | undefined => {
  const predicates: RedactPredicate[] = [];
  for (const member of members) {
    const predicate = toRedactPredicate(member.redactProps);
    if (predicate !== undefined) predicates.push(predicate);
  }
  if (predicates.length === 0) return undefined;
  return (name, uuid) => predicates.some((hides) => hides(name, uuid));
};

/**
 * The registration loop, all-or-nothing: a rejection midway aborts the controller, which takes
 * back what was registered before it, and is rethrown for every member to see.
 */
const registerAll = async (modelContext: ModelContextLike, ctx: ToolContext, exposure: Exposure): Promise<string[]> => {
  const {controller, settings} = exposure;
  const registerOptions: ModelContextRegisterOptions = {signal: controller.signal};
  if (settings.exposedTo !== undefined) registerOptions.exposedTo = settings.exposedTo;

  const registered: string[] = [];
  try {
    for (const tool of createTools(ctx)) {
      if (controller.signal.aborted) break;
      await modelContext.registerTool(tool, registerOptions);
      registered.push(tool.name);
    }
  } catch (error) {
    controller.abort(error);
    logger.error('registering the tools failed', error);
    throw error;
  }

  // closed while registering: the platform has already taken the tools back
  if (controller.signal.aborted) return [];

  logger.info(`registered ${registered.length} tools`, registered);
  return registered;
};

const open = (modelContext: ModelContextLike, prefix: string, settings: ExposureSettings): Exposure => {
  const members = new Set<ExposureMember>();
  const exposure: Exposure = {
    members,
    controller: new AbortController(),
    settings,
    tools: Promise.resolve([]),
    closed: false,
  };
  // getters, not values: the tools read both at the start of every call (`inspectEnvs`), so a
  // member joining or leaving is seen by the next call and nothing has to be re-registered
  const ctx: ToolContext = {
    prefix,
    limits: settings.limits,
    get isExposed() {
      return unionNamespaces(members);
    },
    get redact() {
      return unionRedaction(members);
    },
  };
  exposure.tools = registerAll(modelContext, ctx, exposure);
  // a registration that failed is not kept: the next member to arrive first opens a new one
  exposure.tools.catch(() => close(modelContext, prefix, exposure));
  return exposure;
};

const close = (modelContext: ModelContextLike, prefix: string, exposure: Exposure): void => {
  if (exposure.closed) return;
  exposure.closed = true;
  exposure.controller.abort();
  const byPrefix = registry.get(modelContext);
  if (byPrefix?.get(prefix) === exposure) byPrefix.delete(prefix);
};

const sameSettings = (a: ExposureSettings, b: ExposureSettings): boolean =>
  JSON.stringify(a.limits) === JSON.stringify(b.limits) && JSON.stringify(a.exposedTo) === JSON.stringify(b.exposedTo);

/**
 * Joins the registration under `prefix` on `modelContext`, opening it when there is none. The
 * member's rules count from the next tool call on; `settings` count only for the member that
 * opens -- a later member with other values is reported and joins under the opener's, because
 * `exposedTo` has gone to the platform by then and one set of `limits` is all a tool has.
 */
export function joinSharedExposure(
  modelContext: ModelContextLike,
  prefix: string,
  member: ExposureMember,
  settings: ExposureSettings,
): ExposureMembership {
  let byPrefix = registry.get(modelContext);
  if (byPrefix === undefined) {
    byPrefix = new Map();
    registry.set(modelContext, byPrefix);
  }

  let exposure = byPrefix.get(prefix);
  if (exposure === undefined) {
    exposure = open(modelContext, prefix, settings);
    byPrefix.set(prefix, exposure);
  } else if (!sameSettings(exposure.settings, settings)) {
    logger.warn(
      `the tools under "${prefix}" are already registered with other limits or exposedTo; the values of the first call apply`,
      {inEffect: exposure.settings, ignored: settings},
    );
  }

  const joined = exposure;
  joined.members.add(member);
  let left = false;
  return {
    tools: joined.tools,
    leave() {
      if (left) return;
      left = true;
      joined.members.delete(member);
      if (joined.members.size === 0) close(modelContext, prefix, joined);
    },
  };
}
```

- [ ] **Step 4: Rewrite the public function**

Replace `src/model-context/exposeShadowEnvsToModelContext.ts`:

```typescript
import type {InspectRequest} from '../inspect/types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {findModelContext, type ModelContextLike} from './ModelContextLike.js';
import type {RedactRule} from './redactProps.js';
import {joinSharedExposure} from './sharedExposure.js';
import type {NamespaceRule} from './toolSupport.js';

export interface ExposeOptions {
  /** Where to register. Default: `document.modelContext`, then `navigator.modelContext`; neither means "not available". */
  modelContext?: ModelContextLike;
  /** Prefix for every tool name. Default `'shae-'`. Together with `modelContext` it names the registration this call shares. */
  toolPrefix?: string;
  /** Aborting it takes this call's share back; the tools leave with the last share. */
  signal?: AbortSignal;
  /** Passed through to `registerTool()` by the call that opens the registration. Default: not set, so the platform default applies. */
  exposedTo?: string[];
  /** Default limits for every tool call, set by the call that opens the registration; a call's own input wins field by field. */
  limits?: Partial<InspectRequest>;
  /** Property names whose values are replaced by `{$type: 'redacted'}` in every answer, on the Kernel's and the View's side alike. Property values only. Cumulates with every other share of the registration. */
  redactProps?: RedactRule;
  /** Which environments this share exposes: a list of namespaces or a predicate over the namespace an environment is registered under. Default: every environment that holds a namespace. The registration exposes the union over its shares; a namespace outside it is refused like an unknown one. */
  namespaces?: NamespaceRule;
}

export interface ExposeHandle {
  /** `false` when no model context was found; then `tools` is empty and nothing was registered. */
  available: boolean;
  /** The tool names of the shared registration, with the prefix. */
  tools: string[];
  /** Takes this call's share back; the tools leave with the last share. Idempotent. The same as aborting `options.signal`. */
  dispose(): void;
}

export const DefaultToolPrefix = 'shae-';

/**
 * Registers the five read-only inspection tools on the platform's model context, so that an
 * agent can see the Shadow Environments on the page. Nothing is exposed without this call or
 * the `expose-to-model-context` attribute of `<shae-worker>`, which goes through it; every value
 * in every answer is application state, and the docs say what that means before they show the
 * first line of code.
 *
 * One registration per model context and prefix, shared: every call and every element is a
 * share of it, the first opens it, the last to go closes it, and the tools answer from the union
 * of what the shares expose and redact. A second call under the same prefix therefore joins
 * rather than fails.
 *
 * Resolves, never rejects, where the platform has no model context -- the same application code
 * runs in every browser. Rejects with what `registerTool()` rejected with -- a `NotAllowedError`
 * under a Permissions Policy that disables `tools` -- and those are the caller's to handle.
 * Registration is all-or-nothing: a rejection midway takes back what was registered before it.
 */
export async function exposeShadowEnvsToModelContext(options: ExposeOptions = {}): Promise<ExposeHandle> {
  const modelContext = options.modelContext ?? findModelContext();

  if (modelContext === undefined) {
    new ConsoleLogger('ModelContext').info('no model context on this platform, nothing registered');
    return {available: false, tools: [], dispose() {}};
  }

  const {signal} = options;
  if (signal?.aborted) return {available: true, tools: [], dispose() {}};

  const settings = {limits: options.limits ?? {}, ...(options.exposedTo !== undefined ? {exposedTo: options.exposedTo} : {})};
  const membership = joinSharedExposure(
    modelContext,
    options.toolPrefix ?? DefaultToolPrefix,
    {namespaces: options.namespaces, redactProps: options.redactProps},
    settings,
  );

  const dispose = () => {
    membership.leave();
    signal?.removeEventListener('abort', dispose);
  };
  signal?.addEventListener('abort', dispose, {once: true});

  try {
    const tools = await membership.tools;
    return {available: true, tools, dispose};
  } catch (error) {
    dispose();
    throw error;
  }
}
```

`src/model-context.ts` keeps its exports; nothing from `sharedExposure.ts` is exported.

- [ ] **Step 5: Run the specs to verify they pass**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/model-context --run && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: PASS, every file under `src/model-context`, and no type errors.

- [ ] **Step 6: The dist contract**

```bash
pnpm -F @spearwolf/shadow-objects build
pnpm -F @spearwolf/shadow-objects exec vitest src/distContract.spec.ts --run
```

The spec names four missing files. Insert them into `src/distContract.files.txt` in byte order, between `src/model-context/redactProps.js.map` and `src/model-context/toolSupport.d.ts`:

```
src/model-context/sharedExposure.d.ts
src/model-context/sharedExposure.d.ts.map
src/model-context/sharedExposure.js
src/model-context/sharedExposure.js.map
```

Run the contract spec again: PASS.

- [ ] **Step 7: Document it**

`docs/api-reference.md`, `### exposeShadowEnvsToModelContext(options?)`:

1. Options table: change the `signal` row's meaning to `Aborting it takes this call's share back; the same as \`dispose()\`; a signal that is already aborted registers nothing and resolves with \`available: true, tools: []\``; the `exposedTo` row to `Passed through to \`registerTool()\` by the call that opens the registration; the platform's default applies without it`; the `limits` row to `An \`InspectRequest\` of defaults for every tool call, set by the call that opens the registration; a call's own input wins field by field, \`values\` one level down`; append to the `redactProps` row: `. Cumulates: every share of the registration adds its rule, a value is hidden when any rule says so, and a rule leaves with its share`. Add a last row:

```
| `namespaces` | every environment that holds a namespace | `NamespaceType[]` or `(ns) => boolean` over the namespace an environment is registered under: which environments this share exposes. The registration exposes the union over its shares, so a share without the option makes every environment visible whichever came first. An environment outside the union is not listed, and a tool asked for its namespace answers as for an unknown one |
```

2. Replace the paragraph that starts `The promise resolves with \`{available: false, …\`` with:

```
The promise resolves with `{available: false, tools: [], dispose}` where the platform has no model context -- a worker, Node, a browser without WebMCP, a plain `http://` origin outside `localhost` -- and logs one `info` line through a `ConsoleLogger` named `ModelContext`. It rejects with what `registerTool()` rejected with, a `NotAllowedError` under a Permissions Policy that disables `tools` among them. Registration is all-or-nothing -- a rejection midway takes back what was registered before it, and the next call opens afresh.

**One registration per model context and prefix, shared.** Every call of this function and every [`<shae-worker expose-to-model-context>`](#shae-worker) is a *share* of it: the first share opens the registration, a later one joins without registering anything, and the tools leave with the last share. The tools answer from the union over the shares -- the namespaces every share exposes, the properties every share hides -- read at the start of every call, so a share joining or leaving is seen by the next call. `limits` and `exposedTo` are the opener's: a later share with other values is reported through the `ModelContext` logger and joins under the opener's. Another prefix or another model context is another registration.

`ExposeHandle` carries `available`, `tools` (the names of the shared registration, with the prefix) and `dispose()`, which takes this share back and is idempotent.
```

3. In *The tools*, the sentence starting `A \`namespace\` names one environment as \`shae-list-envs\` reports it` -- append: `, and only an environment the registration's shares expose answers at all`.

`docs/best-practices.md` §10: replace the paragraph `**Keep one handle.** …` with:

```
**Shares add up.** A second call under the same prefix joins the registration of the first: one set of tools, the union of both calls' `namespaces` and `redactProps`, and the tools stay until the last share -- a call's `dispose()`, or the last `<shae-worker expose-to-model-context>` leaving -- is gone. `limits` and `exposedTo` are the opener's; a later call with other values is reported and joins under them. A page that opens the tools on a route should still close its share on leaving it.
```

`docs/cheat-sheet.md`, section *Exposing Environments to an Agent*: change the sample's call to `exposeShadowEnvsToModelContext({redactProps: ['sessionToken'], namespaces: ['game']})`, add a comment on that line `// namespaces: only these; default every environment`, and change the `handle.dispose()` comment to `// takes this share back; the tools leave with the last share (or abort options.signal)`.

`packages/shadow-objects/CHANGELOG.md`, `### New`: in the bullet that starts `**New (public API, subpath):** \`@spearwolf/shadow-objects/model-context.js\``, replace the sentence `Resolves with \`available: false\` where the platform has no model context, rejects with what \`registerTool()\` rejected with, registers all-or-nothing, and the handle's \`dispose()\` takes the tools back.` with `One registration per model context and prefix, shared by every call and by every \`<shae-worker expose-to-model-context>\`: the first share opens it, a later one joins, the tools answer from the union of what the shares expose (\`namespaces\`, \`NamespaceType[]\` or a predicate, exported as \`NamespaceRule\`; a share without it exposes every environment) and hide (\`redactProps\` cumulates, a rule leaves with its share), and the tools leave with the last share. \`limits\` and \`exposedTo\` are the opener's. Resolves with \`available: false\` where the platform has no model context, rejects with what \`registerTool()\` rejected with, registers all-or-nothing, and the handle's \`dispose()\` takes that share back.` Add `NamespaceRule` to the list of exported types in the same bullet. In the `**Changed (dist contract):**` bullet, change `the ten modules under \`dist/src/model-context/\`` to `the eleven modules under \`dist/src/model-context/\`` and `(44 files in all, the entry included)` to `(48 files in all, the entry included)`.

- [ ] **Step 8: Lint and commit**

```bash
pnpm lint:fix
pnpm lint:terms
git add packages/shadow-objects/src packages/shadow-objects/docs packages/shadow-objects/CHANGELOG.md
git commit -m "feat: one shared model-context registration per prefix, joined by every call, exposing and redacting the union"
```

---

### Task 4: `<shae-worker expose-to-model-context redact-props>`

**Files:**
- Modify: `packages/shadow-objects/src/elements/constants.ts` (the `<shae-worker>` block)
- Modify: `packages/shadow-objects/src/utils/attr-utils.ts`
- Modify: `packages/shadow-objects/src/elements/ShaeWorkerElement.ts` (imports, `observedAttributes`, new members, `connectedCallback`, `attributeChangedCallback`, `teardown`)
- Test: `packages/shadow-objects/src/elements/ShaeWorkerElement.modelContext.spec.ts` (new), `packages/shadow-objects/src/utils/attr-utils.spec.ts` (new)
- Modify: `packages/shadow-objects/docs/api-reference.md` (*Model Context* intro at ~1909, `<shae-worker>` attributes table at ~1997, the truthy-attributes paragraph, properties table at ~2120, `observedAttributes` row at ~2127, *Security* bullets at ~3189), `docs/guides.md` (attribute table at ~316, *Exposing Environments to an Agent* at ~549), `docs/cheat-sheet.md` (table at ~222, the truthy paragraph, section at ~540), `docs/best-practices.md:431`, `packages/shadow-objects/README.md:116`, `packages/shadow-objects/CHANGELOG.md`

**Interfaces:**
- Consumes: `exposeShadowEnvsToModelContext({signal, namespaces, redactProps})` from Task 3, through `import()`; `ExposeHandle` as a type.
- Produces: `ATTR_EXPOSE_TO_MODEL_CONTEXT = 'expose-to-model-context'`, `ATTR_REDACT_PROPS = 'redact-props'` (exported from `@spearwolf/shadow-objects` through `elements/constants.ts`); `readListAttribute(el, name): string[]`; on `ShaeWorkerElement`: `get redactProps(): string[]`, `get modelContextExposure(): Promise<ExposeHandle> | undefined`.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/attr-utils.spec.ts`:

```typescript
import {describe, expect, it} from 'vitest';
import {readListAttribute} from './attr-utils.js';

describe('readListAttribute', () => {
  const el = (value?: string) => {
    const div = document.createElement('div');
    if (value !== undefined) div.setAttribute('list', value);
    return div;
  };

  it('splits on commas and whitespace, trims, and drops empty entries', () => {
    expect(readListAttribute(el('a, b  c,,d\n e'), 'list')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is empty for a missing, an empty and a blank attribute', () => {
    expect(readListAttribute(el(), 'list')).toEqual([]);
    expect(readListAttribute(el(''), 'list')).toEqual([]);
    expect(readListAttribute(el('  , '), 'list')).toEqual([]);
  });
});
```

Create `src/elements/ShaeWorkerElement.modelContext.spec.ts`:

```typescript
import {afterEach, describe, expect, it} from 'vitest';
import '../shae-ent.js';
import '../shae-prop.js';
import '../shae-worker.js';
import {exposeShadowEnvsToModelContext} from '../model-context/exposeShadowEnvsToModelContext.js';
import type {ModelContextLike, ModelContextToolLike, ModelContextToolResult} from '../model-context/ModelContextLike.js';
import {ATTR_EXPOSE_TO_MODEL_CONTEXT, ATTR_REDACT_PROPS, SHAE_WORKER} from './constants.js';
import type {ShaeWorkerElement} from './ShaeWorkerElement.js';

interface FakeModelContext extends ModelContextLike {
  tools: Map<string, ModelContextToolLike>;
  registrations: number;
}

const installFakeModelContext = (): FakeModelContext => {
  const tools = new Map<string, ModelContextToolLike>();
  const fake: FakeModelContext = {
    tools,
    registrations: 0,
    async registerTool(tool, options) {
      fake.registrations += 1;
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
  Object.defineProperty(document, 'modelContext', {value: fake, configurable: true, writable: true});
  return fake;
};

let counter = 0;
const nextNs = () => `worker-mc-${counter++}`;

const mounted: ShaeWorkerElement[] = [];

/** A local, non-syncing element that is started by hand: the exposure is what is under test. */
const mount = (attributes: string): ShaeWorkerElement => {
  const host = document.createElement('div');
  host.innerHTML = `<${SHAE_WORKER} local auto-sync="no" no-autostart ${attributes}></${SHAE_WORKER}>`;
  document.body.append(host);
  const el = host.querySelector(SHAE_WORKER) as ShaeWorkerElement;
  mounted.push(el);
  return el;
};

const execute = async (fake: FakeModelContext, name: string, input: object = {}): Promise<any> =>
  ((await fake.tools.get(name)!.execute(input)) as ModelContextToolResult).structuredContent;

const listed = async (fake: FakeModelContext): Promise<string[]> =>
  (await execute(fake, 'shae-list-envs')).envs.map((e: any) => e.namespace);

describe('<shae-worker expose-to-model-context>', () => {
  afterEach(() => {
    for (const el of mounted.splice(0)) {
      el.destroy();
      el.parentElement?.remove();
    }
    delete (document as {modelContext?: unknown}).modelContext;
  });

  it('joins on connect and hands the handle out; redact-props reads as a list', async () => {
    const fake = installFakeModelContext();
    const el = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT} ${ATTR_REDACT_PROPS}="token, email"`);

    const handle = await el.modelContextExposure;
    expect(handle).toMatchObject({available: true});
    expect(handle?.tools).toHaveLength(5);
    expect(fake.tools.size).toBe(5);
    expect(el.redactProps).toEqual(['token', 'email']);
  });

  it('exposes nothing without the attribute, and reads a falsy value as its absence', async () => {
    const fake = installFakeModelContext();
    const plain = mount(`ns="${nextNs()}"`);
    const off = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}="false"`);

    expect(plain.modelContextExposure).toBeUndefined();
    expect(off.modelContextExposure).toBeUndefined();
    expect(fake.tools.size).toBe(0);
    expect(plain.redactProps).toEqual([]);
  });

  it('setting the attribute later joins, removing it leaves and takes the tools back', async () => {
    const fake = installFakeModelContext();
    const el = mount(`ns="${nextNs()}"`);
    expect(el.modelContextExposure).toBeUndefined();

    el.setAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT, '');
    await el.modelContextExposure;
    expect(fake.tools.size).toBe(5);

    el.removeAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT);
    expect(el.modelContextExposure).toBeUndefined();
    expect(fake.tools.size, 'the last share out takes the tools back at once').toBe(0);
  });

  it('exposes its own environment only; two elements share one registration; a destroyed one leaves', async () => {
    const fake = installFakeModelContext();
    const nsA = nextNs();
    const nsB = nextNs();
    const nsC = nextNs();
    const a = mount(`ns="${nsA}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    const b = mount(`ns="${nsB}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    const c = mount(`ns="${nsC}"`);
    await Promise.all([a.start(), b.start(), c.start()]);
    await Promise.all([a.modelContextExposure, b.modelContextExposure]);

    expect(fake.registrations, 'registered once').toBe(5);
    expect(await listed(fake)).toEqual([nsA, nsB]);

    a.destroy();
    expect(await listed(fake)).toEqual([nsB]);
    expect(fake.tools.size).toBe(5);

    b.destroy();
    expect(fake.tools.size).toBe(0);
  });

  it('plays together with the function: whichever comes first, the union is what the agent sees', async () => {
    const fake = installFakeModelContext();
    const nsA = nextNs();
    const nsB = nextNs();
    const a = mount(`ns="${nsA}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT} ${ATTR_REDACT_PROPS}="token"`);
    const b = mount(`ns="${nsB}"`);
    await Promise.all([a.start(), b.start()]);
    await a.modelContextExposure;
    expect(await listed(fake), 'the element alone').toEqual([nsA]);

    const all = await exposeShadowEnvsToModelContext({redactProps: ['email']});
    expect(fake.registrations, 'the function joined').toBe(5);
    expect(await listed(fake), 'the function exposes everything').toEqual([nsA, nsB]);

    all.dispose();
    expect(await listed(fake), 'the element keeps its share').toEqual([nsA]);
    expect(fake.tools.size).toBe(5);

    a.removeAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT);
    expect(fake.tools.size).toBe(0);
  });

  it('redact-props cumulates with the other shares and is read live', async () => {
    const fake = installFakeModelContext();
    const ns = nextNs();
    const el = mount(`ns="${ns}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT} ${ATTR_REDACT_PROPS}="token"`);
    await el.start();
    const {ViewComponent} = await import('../view/ViewComponent.js');
    const {ComponentContext} = await import('../view/ComponentContext.js');
    const root = new ViewComponent('thing', {context: ComponentContext.get(ns)});
    root.setProperty('token', 't');
    root.setProperty('email', 'e');
    root.setProperty('open', 1);
    await el.shadowEnv.syncWait();
    await el.modelContextExposure;
    const R = {$type: 'redacted'};
    const props = async () => {
      const node = (await execute(fake, 'shae-get-entity-tree', {namespace: ns})).envs[0].kernel.roots[0];
      return Object.fromEntries(node.props.map((p: any) => [p.name, p.value]));
    };

    expect(await props()).toEqual({token: R, email: 'e', open: 1});

    const other = await exposeShadowEnvsToModelContext({namespaces: [], redactProps: ['email']});
    expect(await props(), 'a share that exposes nothing still adds its rule').toEqual({token: R, email: R, open: 1});

    el.setAttribute(ATTR_REDACT_PROPS, 'open');
    expect(await props(), 'the attribute is read live; token left with the edit').toEqual({token: 't', email: R, open: R});

    other.dispose();
    expect(await props()).toEqual({token: 't', email: 'e', open: R});
  });

  it('an element that leaves before the import came back registers nothing that stays', async () => {
    const fake = installFakeModelContext();
    const el = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    const pending = el.modelContextExposure;
    el.removeAttribute(ATTR_EXPOSE_TO_MODEL_CONTEXT);

    expect(await pending).toMatchObject({available: true, tools: []});
    expect(fake.tools.size).toBe(0);
  });

  it('resolves with available: false where the page has no model context', async () => {
    const el = mount(`ns="${nextNs()}" ${ATTR_EXPOSE_TO_MODEL_CONTEXT}`);
    expect(await el.modelContextExposure).toMatchObject({available: false, tools: []});
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/utils/attr-utils.spec.ts src/elements/ShaeWorkerElement.modelContext.spec.ts --run`
Expected: FAIL -- `readListAttribute` is not exported; `ATTR_EXPOSE_TO_MODEL_CONTEXT` is not exported.

- [ ] **Step 3: Constants and the list reader**

`src/elements/constants.ts`, at the end of the `// <shae-worker> attributes` block:

```typescript
export const ATTR_EXPOSE_TO_MODEL_CONTEXT = 'expose-to-model-context';
export const ATTR_REDACT_PROPS = 'redact-props';
```

`src/utils/attr-utils.ts`, append:

```typescript
/**
 * The attribute read as a list of words: split on commas and whitespace, blanks dropped. A
 * missing attribute is an empty list, and so is an empty or a blank one.
 */
export const readListAttribute = (el: HTMLElement, name: string): string[] =>
  (el.getAttribute(name) ?? '')
    .split(/[\s,]+/)
    .filter((entry) => entry.length > 0);
```

- [ ] **Step 4: The element**

In `src/elements/ShaeWorkerElement.ts`:

Imports -- extend the existing `attr-utils` line and add one type import:

```typescript
import {readBooleanAttribute, readListAttribute, readNumberAttribute} from '../utils/attr-utils.js';
import type {ExposeHandle} from '../model-context/exposeShadowEnvsToModelContext.js';
```

and add `ATTR_EXPOSE_TO_MODEL_CONTEXT, ATTR_REDACT_PROPS` to the `./constants.js` import list (Biome sorts it).

`observedAttributes` -- add `ATTR_EXPOSE_TO_MODEL_CONTEXT` after `ATTR_AUTO_SYNC`.

Add a module-level interface above the class:

```typescript
/** One element's share of the page's model-context registration: the signal that ends it, the handle it resolves to. */
interface ModelContextExposure {
  controller: AbortController;
  handle: Promise<ExposeHandle>;
}
```

Add the members after `#importScript?: Effect;`:

```typescript
  #modelContextExposure?: ModelContextExposure | undefined;

  /** The `redact-props` attribute as a list of property names, read as it stands right now. */
  get redactProps(): string[] {
    return readListAttribute(this, ATTR_REDACT_PROPS);
  }

  /**
   * This element's share of the page's model-context registration, while it has one: a promise
   * of the `ExposeHandle`, resolving once the tools are on the platform (`available: false` where
   * there is none) and rejecting with what `registerTool()` rejected with. `undefined` without
   * the `expose-to-model-context` attribute, before the first connect, and after a teardown.
   */
  get modelContextExposure(): Promise<ExposeHandle> | undefined {
    return this.#modelContextExposure?.handle;
  }
```

Add three private methods at the end of the class, after `#refuseLocalChange()`:

```typescript
  /**
   * Joins or leaves the page's model-context registration, whichever the attribute and the
   * element's state ask for. The attribute is a truthy attribute like `local`; the join waits
   * for a connect, because an element that is never connected has no environment to expose, and
   * it ends with the teardown. `redact-props` is not watched: the share reads it at every call.
   */
  #syncModelContextExposure(): void {
    const wanted = !this.isDestroyed && this.isConnected && readBooleanAttribute(this, ATTR_EXPOSE_TO_MODEL_CONTEXT);
    if (wanted) {
      this.#joinModelContextExposure();
    } else {
      this.#leaveModelContextExposure();
    }
  }

  /**
   * The share is an ordinary call of `exposeShadowEnvsToModelContext()` with two live rules:
   * this element's namespace, and the names its `redact-props` attribute carries at the moment
   * a tool asks. The function comes in through a dynamic import, and that is the whole reason
   * this element can carry the attribute at all -- a static import would pull the model-context
   * layer into every consumer of `<shae-worker>`, and the layer is meant to stay out of
   * `index.ts` and the worker bundle. The single-file bundle inlines the import; the lib layout
   * keeps the modules apart. A leave before the import is back aborts the signal the call is
   * made with, and the function registers nothing for an aborted signal.
   */
  #joinModelContextExposure(): void {
    if (this.#modelContextExposure !== undefined) return;

    const controller = new AbortController();
    const handle = import('../model-context/exposeShadowEnvsToModelContext.js').then(({exposeShadowEnvsToModelContext}) =>
      exposeShadowEnvsToModelContext({
        signal: controller.signal,
        namespaces: (ns) => ns === this.ns,
        redactProps: (name) => this.redactProps.includes(name),
      }),
    );
    this.#modelContextExposure = {controller, handle};

    // the rejection reaches whoever awaits `modelContextExposure` as well; this makes sure it is heard when nobody does
    handle.catch((error) => this.logger.error('expose-to-model-context: registering the tools failed', error));
  }

  #leaveModelContextExposure(): void {
    const exposure = this.#modelContextExposure;
    if (exposure === undefined) return;
    this.#modelContextExposure = undefined;
    exposure.controller.abort();
  }
```

Wire them in:

- `connectedCallback`, inside the `hibernate` callback, after the `if (this.shouldAutostart) {…}` block: `this.#syncModelContextExposure();`
- `attributeChangedCallback`, after the `ATTR_SRC` block:

```typescript
    if (name === ATTR_EXPOSE_TO_MODEL_CONTEXT) {
      this.#syncModelContextExposure();
    }
```

- `teardown()`, as the first line: `this.#leaveModelContextExposure();`

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm -F @spearwolf/shadow-objects exec vitest src/utils/attr-utils.spec.ts src/elements --run && pnpm -F @spearwolf/shadow-objects typecheck`
Expected: PASS. If the case *setting the attribute later joins, removing it leaves* finds `fake.tools.size` at `5` after the removal, the abort listener in `exposeShadowEnvsToModelContext()` was attached after the await -- check that `signal?.addEventListener('abort', dispose, …)` in Task 3 stands before `await membership.tools`, as written.

- [ ] **Step 6: The dist contract and the bundle size**

```bash
pnpm -F @spearwolf/shadow-objects build
wc -c packages/shadow-objects/dist/bundle.js; gzip -c packages/shadow-objects/dist/bundle.js | wc -c
pnpm -F @spearwolf/shadow-objects exec vitest src/distContract.spec.ts --run
```

The file list is unchanged by this task (Task 3 added the module; the element adds no file), so the contract spec passes. For the size line of the changelog, compare the numbers above with the last recorded pair in `CHANGELOG.md` (`254.7 kB` minified, `78.0 kB` gzipped after phase 3); the entry names both.

- [ ] **Step 7: Document it**

`docs/api-reference.md`:

1. *Model Context* intro (~1909): replace `Nothing registers on import, on an element, or on its own.` with `Nothing registers on import or on its own; a \`<shae-worker\` [\`expose-to-model-context\`](#shae-worker)\`>\` registers them for its own environment through the same function, as a share of the same registration.`
2. `<shae-worker>` attributes table, after the `destroy-timeout` row:

```
| `expose-to-model-context` | Hands this element's environment to an AI agent through the browser's model context, as one share of the page's registration of the five read-only tools of [Model Context](#model-context): the tools are registered once per page, and an agent sees the union of what every share exposes -- this element's environment, another element's, everything where `exposeShadowEnvsToModelContext()` was called without `namespaces`. An environment no share exposes is not listed, and a tool asked for its namespace answers as for an unknown one. Read as a truthy value, not as a presence -- see below. Observed: setting it joins, removing it leaves, and the tools leave with the last share. Read [Exposing Environments to an Agent](#exposing-environments-to-an-agent) under *Security* first -- a copied snippet copies the exposure. |
| `redact-props` | Property names whose values every tool answer replaces by `{$type: 'redacted'}`, separated by commas or whitespace. Cumulates with every other share -- another element's list, a call's `redactProps` -- so a name any share hides is hidden in every exposed environment, and a name leaves with the last share that carried it. Read at every tool call, so an edit applies to the next one; no effect without `expose-to-model-context`. |
```

3. The paragraph `**Truthy attributes are not presence attributes.** \`local\` and \`no-autostart\` read their value:` -- change to `\`local\`, \`no-autostart\` and \`expose-to-model-context\` read their value:`.
4. Properties table, after `shouldAutostart`:

```
| `redactProps` | Read-only: the `redact-props` attribute as a list of names, split on commas and whitespace. Empty without the attribute. |
| `modelContextExposure` | Read-only: `Promise<ExposeHandle> \| undefined`. This element's share of the page's model-context registration while it has one -- resolves once the tools are on the platform (`available: false` where there is none), rejects with what `registerTool()` rejected with, which the element's logger reports as well. `undefined` without `expose-to-model-context`, before the first connect, and after a teardown. `dispose()` on the handle takes this element's share back until the attribute is set again; removing the attribute is the intended way. |
```

5. `ShaeWorkerElement.observedAttributes` row: `Static: \`ns\`, \`local\`, \`src\`, \`no-structured-clone\`, \`auto-sync\`, \`expose-to-model-context\`. \`no-autostart\`, \`redact-props\` and the five timeout attributes … are deliberately not among them.` (keep the rest of the sentence).
6. *Security* → *Exposing Environments to an Agent*, first bullet becomes:

```
- **Nothing is exposed without a decision.** No auto-registration, no import side effect. `exposeShadowEnvsToModelContext()` is one way in; the `expose-to-model-context` attribute on a `<shae-worker>` is the other, and it is a decision the markup carries -- a snippet copied with the attribute copies the exposure, so strip it from shipped markup the way the function call stays behind a switch. A share's `dispose()` or `signal`, or the attribute leaving, is that share's way out; the tools go with the last share.
```

and add after the *Redaction* bullet:

```
- **The attribute exposes one environment; shares add up.** `expose-to-model-context` covers the element's own environment and nothing else. Every share of the registration -- elements and calls alike -- adds what it exposes and what it hides, so a call without `namespaces` next to an element exposes everything, and a `redact-props` on one element hides that name everywhere. Redaction only ever grows with a share and shrinks when it leaves.
```

`docs/guides.md`:

1. `<shae-worker>` attribute table (~316), two rows after the timeouts row:

```
| `expose-to-model-context` | Hand this element's environment to an AI agent through the browser's model context -- the declarative form of [Exposing Environments to an Agent](#exposing-environments-to-an-agent) |
| `redact-props` | Property names whose values the agent never sees, separated by commas or whitespace; cumulates with every other share |
```

2. *Exposing Environments to an Agent* (~549), after the paragraph `In a test, or in a browser without the platform, …`, add:

```markdown
The same, declared on the element:

```html
<shae-worker ns="game" src="./game.js" expose-to-model-context redact-props="sessionToken email">
```

The attribute exposes this environment and no other. The function and every such element are shares of one registration per page: the tools exist once, the agent sees the union -- a page with three `<shae-worker>` elements and one attribute shows one environment, a second attribute adds its own, a call of the function without `namespaces` adds every one, whichever came first -- and the tools stay until the last share is gone, whether that is a `dispose()` or an attribute removed. `redact-props` cumulates the same way: a name any share hides is hidden in every exposed environment, and it comes back only when the last share that named it leaves. `el.modelContextExposure` is the promise to await in a test. What the sample above keeps behind `import.meta.env.DEV`, markup cannot: an attribute in shipped HTML exposes every visitor's state, so the production build strips it or the page uses the function.
```

`docs/cheat-sheet.md`:

1. `<shae-worker>` table (~222), after the timeouts row:

```
| `expose-to-model-context` | truthy value | Hand this environment to an AI agent through the model context (WebMCP); one registration per page, shared with every other element and call, the union of what they expose. Observed: set joins, remove leaves |
| `redact-props` | `"a, b c"` | Property names the agent never sees; cumulates across shares. Read at every call |
```

2. The paragraph `**Truthy value ≠ presence.** \`local\` and \`no-autostart\` count as set` → `\`local\`, \`no-autostart\` and \`expose-to-model-context\` count as set`.
3. Section *Exposing Environments to an Agent* (~540), after the code block add one line: `` Declarative: `<shae-worker expose-to-model-context redact-props="sessionToken">` -- this environment only, a share of the same registration; `el.modelContextExposure` is its handle. ``

`docs/best-practices.md` §10, replace the sentence `The function is the only way the tools appear -- no element attribute, no import side effect -- so the switch is the whole decision.` with: `The function and the \`expose-to-model-context\` attribute are the two ways the tools appear -- no import side effect -- so the switch is the whole decision, and an attribute in shipped markup is that decision made for every visitor: strip it in the production build, or keep the agent surface to the function behind the switch.`

`packages/shadow-objects/README.md:116`, append to the model-context paragraph: `` The declarative form, `<shae-worker expose-to-model-context>`, exposes that element's environment alone as a share of the same registration, and belongs in development markup for the same reason the call belongs behind a switch. ``

`packages/shadow-objects/CHANGELOG.md`, `### New`, two bullets after the `**Changed (dist contract):**` bullet:

```
- **New (public API):** `<shae-worker expose-to-model-context>` and `<shae-worker redact-props="a, b">` (`ATTR_EXPOSE_TO_MODEL_CONTEXT`, `ATTR_REDACT_PROPS`) -- the declarative form of `exposeShadowEnvsToModelContext()`, and a share of the same registration: the attribute exposes the element's own environment and no other, every exposing element and every call on a page share one set of the five tools, the agent sees the union of what the shares expose, and `redact-props` cumulates with every other share's rule. Truthy like `local`, observed: setting it joins, removing it leaves, and the tools leave with the last share. `ShaeWorkerElement.redactProps` reads the list, `ShaeWorkerElement.modelContextExposure` is the promise of this element's `ExposeHandle` (`undefined` without the attribute, before the first connect and after a teardown). The element loads the function through a dynamic `import()` on the first join, so `index.ts` and the worker bundle stay as they were. `readListAttribute()` joins the attribute readers. Documented in `docs/api-reference.md` (`<shae-worker>`, *Model Context*, *Security*), `docs/guides.md`, `docs/cheat-sheet.md`, `docs/best-practices.md` §10 and the README.
- **Changed (bundle):** `dist/bundle.js` inlines the element's dynamic import and grows by the model-context modules: <before> kB → <after> kB minified, <before> kB → <after> kB gzipped. The `dist/` file list and `dist/package.json` are unchanged by the element.
```

Fill in the four numbers from Step 6.

- [ ] **Step 8: Lint, terminology, the whole package suite, commit**

```bash
pnpm lint:fix
pnpm lint:terms
pnpm -F @spearwolf/shadow-objects test
git add packages/shadow-objects/src packages/shadow-objects/docs packages/shadow-objects/README.md packages/shadow-objects/CHANGELOG.md
git commit -m "feat: <shae-worker expose-to-model-context> shares the page's registration and exposes its own environment"
```

---

### Task 5: the markup path in real Chromium

**Files:**
- Create: `packages/shadow-objects-testing/test/worker-element-model-context.test.js`

**Interfaces:**
- Consumes: the attributes and `modelContextExposure` from Task 4; `exposeShadowEnvsToModelContext` from `@spearwolf/shadow-objects/model-context.js`; `mount()` / `unmountAll()` from `packages/shadow-objects-testing/src/mount.js`.

- [ ] **Step 1: Write the test**

```javascript
import {expect} from '@esm-bundle/chai';
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * `<shae-worker expose-to-model-context>` built from markup, in real Chromium: the parser
 * upgrades the element with the attribute already there, the environment it exposes is the one
 * its `<shae-ent>` children join, and the `<shae-prop>` values reach the agent -- redacted
 * where `redact-props` says so. A fake `document.modelContext` stands in for the platform; the
 * function that sits under the attribute is proven against Chromium's real one in the e2e
 * package.
 */
const installFakeModelContext = () => {
  const tools = new Map();
  const fake = {
    tools,
    registrations: 0,
    async registerTool(tool, options) {
      fake.registrations += 1;
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
  Object.defineProperty(document, 'modelContext', {value: fake, configurable: true, writable: true});
  return fake;
};

const run = async (fake, name, input = {}) => (await fake.tools.get(`shae-${name}`).execute(input)).structuredContent;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const R = {$type: 'redacted'};

describe('<shae-worker expose-to-model-context> from markup', () => {
  let fake;

  beforeEach(() => {
    fake = installFakeModelContext();
  });

  afterEach(async () => {
    unmountAll();
    // the teardown of a removed element -- and with it its leave -- is one microtask away
    await settle();
    delete document.modelContext;
  });

  const mountPage = async () => {
    const container = mount(`
      <shae-worker id="shown" ns="mc-shown" local auto-sync="off" expose-to-model-context redact-props="secret"></shae-worker>
      <shae-worker id="hidden" ns="mc-hidden" local auto-sync="off"></shae-worker>
      <shae-ent ns="mc-shown" token="root">
        <shae-prop name="title" value="hello"></shae-prop>
        <shae-prop name="secret" value="hunter2"></shae-prop>
      </shae-ent>
      <shae-ent ns="mc-hidden" token="root">
        <shae-prop name="secret" value="hunter3"></shae-prop>
      </shae-ent>
    `);
    const shown = container.querySelector('#shown');
    const hidden = container.querySelector('#hidden');
    await Promise.all([shown.shadowEnv.ready(), hidden.shadowEnv.ready()]);
    await Promise.all([shown.shadowEnv.syncWait(), hidden.shadowEnv.syncWait()]);
    const handle = await shown.modelContextExposure;
    return {container, shown, hidden, handle};
  };

  const propsOf = async (namespace) => {
    const {envs} = await run(fake, 'get-entity-tree', {namespace});
    return Object.fromEntries(envs[0].kernel.roots[0].props.map((p) => [p.name, p.value]));
  };
  const namespaces = async () => (await run(fake, 'list-envs')).envs.map((e) => e.namespace);

  it('registers the five tools for the element that carries the attribute, and only its environment is listed', async () => {
    const {hidden, handle} = await mountPage();

    expect(handle.available).to.be.true;
    expect(handle.tools).to.have.lengthOf(5);
    expect(hidden.modelContextExposure).to.be.undefined;

    const {envs} = await run(fake, 'list-envs');
    expect(envs.map((e) => e.namespace)).to.eql(['mc-shown']);
    expect(envs[0].kernel.counts.entities).to.equal(1);
  });

  it('answers with the <shae-prop> values, the redacted one hidden, and refuses the hidden namespace as unknown', async () => {
    await mountPage();

    expect(await propsOf('mc-shown')).to.eql({title: 'hello', secret: R});

    const refused = await fake.tools.get('shae-get-entity-tree').execute({namespace: 'mc-hidden'});
    expect(refused.isError).to.be.true;
    expect(refused.content[0].text).to.equal('no Shadow Environment holds the namespace "mc-hidden"');
  });

  it('a second element joins the same registration, and its redact-props apply to the first one too', async () => {
    const {shown, hidden} = await mountPage();

    hidden.setAttribute('redact-props', 'title');
    hidden.setAttribute('expose-to-model-context', '');
    await hidden.modelContextExposure;
    expect(fake.registrations, 'registered once').to.equal(5);
    expect(fake.tools.size).to.equal(5);

    expect(await namespaces()).to.eql(['mc-shown', 'mc-hidden']);
    expect(await propsOf('mc-shown'), 'the union of both lists').to.eql({title: R, secret: R});
    expect(await propsOf('mc-hidden')).to.eql({secret: R});

    hidden.removeAttribute('expose-to-model-context');
    expect(await namespaces()).to.eql(['mc-shown']);
    expect(await propsOf('mc-shown'), 'title came back with the share that hid it').to.eql({title: 'hello', secret: R});
    expect(shown.modelContextExposure, 'the first one stays').to.not.be.undefined;
  });

  it('the function joins the element: everything visible while its share lasts, the element alone afterwards', async () => {
    await mountPage();

    const all = await exposeShadowEnvsToModelContext({redactProps: ['title']});
    expect(fake.registrations).to.equal(5);
    expect(await namespaces()).to.eql(['mc-shown', 'mc-hidden']);
    expect(await propsOf('mc-hidden'), "the element's secret rule reaches the environment the function exposed").to.eql({secret: R});
    expect(await propsOf('mc-shown')).to.eql({title: R, secret: R});

    all.dispose();
    expect(await namespaces()).to.eql(['mc-shown']);
    expect(await propsOf('mc-shown')).to.eql({title: 'hello', secret: R});
    expect(fake.tools.size).to.equal(5);
  });

  it('removing the last exposing element from the document takes the tools back', async () => {
    const {shown} = await mountPage();
    expect(fake.tools.size).to.equal(5);

    shown.remove();
    await settle();
    expect(shown.isDestroyed).to.be.true;
    expect(fake.tools.size).to.equal(0);
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm -F shadow-objects-testing test`
Expected: PASS, the five new cases among the rest. `turbo` builds `packages/shadow-objects` first; if the run is started with `vitest` directly, build the core package by hand first.

- [ ] **Step 3: Commit**

```bash
pnpm lint:fix
git add packages/shadow-objects-testing/test/worker-element-model-context.test.js
git commit -m "test: the expose-to-model-context attribute is driven from markup in real Chromium"
```

---

### Task 6: the e2e pages -- a worker environment in three engines, and the element next to the function on Chromium's real platform

**Files:**
- Create: `packages/shadow-objects-e2e/pages/model-context-element.html`, `packages/shadow-objects-e2e/src/model-context-element.js`, `packages/shadow-objects-e2e/tests/model-context-element.spec.ts`
- Modify: `packages/shadow-objects-e2e/pages/model-context-platform.html`, `packages/shadow-objects-e2e/src/model-context-platform.js`, `packages/shadow-objects-e2e/tests/model-context-platform.spec.ts`
- Modify: `packages/shadow-objects-e2e/TEST-PLAN.md` (the counts at lines 6 and 22, the table rows for the two pages)
- Modify: `CHANGELOG.md` (repo root)

**Interfaces:**
- Consumes: the attributes and `modelContextExposure` from Task 4; `runTestSuite`, `testAsyncAction`, `testBooleanAction` from `src/test-helpers/`; `/mod-hello.js` from `public/`, which defines the tokens `foo` and `bar`.

- [ ] **Step 1: The fake page, three engines**

`pages/model-context-element.html` -- the elements stand in the markup and upgrade only once the script has installed the fake and imported the definitions:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>model-context-element</title>
  </head>
  <body>
    <shae-worker id="exposed" ns="mce-worker" src="/mod-hello.js" expose-to-model-context redact-props="xyz"></shae-worker>
    <shae-worker id="silent" ns="mce-local" local></shae-worker>

    <shae-ent ns="mce-worker" token="foo" id="foo">
      <shae-prop name="xyz" type="number" value="123"></shae-prop>
      <shae-ent ns="mce-worker" token="bar" id="bar">
        <shae-prop name="plah" type="number" value="666"></shae-prop>
      </shae-ent>
    </shae-ent>
    <shae-ent ns="mce-local" token="foo"></shae-ent>

    <section id="tests"></section>
    <script type="module" src="/src/model-context-element.js"></script>
  </body>
</html>
```

`src/model-context-element.js`:

```javascript
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

/**
 * Registers by name, refuses a duplicate the way Chromium does, and takes a tool back when its
 * signal aborts -- the platform's contract, minus the platform, installed on `document` before
 * the element definitions arrive so that the attribute finds it on upgrade.
 */
const makeFakeModelContext = () => {
  const tools = new Map();
  return {
    tools,
    registrations: 0,
    async registerTool(tool, options) {
      this.registrations += 1;
      if (tools.has(tool.name)) throw new DOMException('Duplicate tool name', 'InvalidStateError');
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name), {once: true});
    },
  };
};

const fake = makeFakeModelContext();
// an own property shadows a native accessor, where Chromium ships one behind its flag
Object.defineProperty(document, 'modelContext', {value: fake, configurable: true, writable: true});

// the definitions come after the fake on purpose: static imports would be hoisted above the line above
await import('@spearwolf/shadow-objects/shae-ent.js');
await import('@spearwolf/shadow-objects/shae-prop.js');
await import('@spearwolf/shadow-objects/shae-worker.js');

runTestSuite(main);

/**
 * `<shae-worker expose-to-model-context>` over a real worker environment next to a local one
 * without the attribute, through a fake model context in all three engines: the attribute
 * exposes one environment, a second element joins the same registration, `redact-props`
 * cumulates across elements, and the last element out takes the tools back.
 */
async function main() {
  const exposed = document.getElementById('exposed');
  const silent = document.getElementById('silent');
  window.envs = {exposed, silent, fake};

  await testAsyncAction('mce-envs-ready', () => Promise.all([exposed.shadowEnv.ready(), silent.shadowEnv.ready()]));
  await testAsyncAction('mce-first-sync', () => Promise.all([exposed.shadowEnv.syncWait(), silent.shadowEnv.syncWait()]));

  let handle;
  await testAsyncAction('mce-exposure-resolves', async () => {
    handle = await exposed.modelContextExposure;
  });

  const run = async (name, input = {}) => fake.tools.get(`shae-${name}`).execute(input);
  const data = (result) => result.structuredContent;
  const namespaces = async () => data(await run('list-envs')).envs.map((e) => e.namespace);
  const nodeProps = (node) => Object.fromEntries(node.props.map((p) => [p.name, JSON.stringify(p.value)]));
  const treeOf = async (namespace) => data(await run('get-entity-tree', {namespace})).envs[0].kernel.roots[0];
  const REDACTED = '{"$type":"redacted"}';

  testBooleanAction(
    'mce-attribute-registers-five-tools',
    () => handle.available === true && handle.tools.length === 5 && fake.tools.size === 5 && fake.registrations === 5,
  );

  testBooleanAction('mce-element-without-attribute-has-no-exposure', () => silent.modelContextExposure === undefined);

  await testAsyncAction('mce-list-envs-names-only-the-exposed-environment', async () => {
    const names = await namespaces();
    if (names.join() !== 'mce-worker') throw new Error(`listed: ${JSON.stringify(names)}`);
    const env = data(await run('list-envs')).envs[0];
    if (env.kind !== 'worker' || env.kernel?.thread !== 'worker') throw new Error(JSON.stringify(env));
  });

  await testAsyncAction('mce-hidden-namespace-is-refused-like-an-unknown-one', async () => {
    const result = await run('get-entity-tree', {namespace: 'mce-local'});
    if (result.isError !== true) throw new Error(JSON.stringify(result));
    if (result.content[0].text !== 'no Shadow Environment holds the namespace "mce-local"') throw new Error(result.content[0].text);
  });

  await testAsyncAction('mce-redact-props-hides-the-value-across-the-wire', async () => {
    const root = await treeOf('mce-worker');
    const props = nodeProps(root);
    if (props.xyz !== REDACTED) throw new Error(`xyz: ${props.xyz}`);
    const child = nodeProps(root.children[0]);
    if (child.plah !== '666') throw new Error(`plah: ${child.plah}`);
  });

  await testAsyncAction('mce-second-element-joins-the-same-registration', async () => {
    silent.setAttribute('redact-props', 'plah');
    silent.setAttribute('expose-to-model-context', '');
    await silent.modelContextExposure;
    if (fake.registrations !== 5) throw new Error(`registered ${fake.registrations} times`);
    if (fake.tools.size !== 5) throw new Error(`tools: ${fake.tools.size}`);
    const names = await namespaces();
    if (names.join() !== 'mce-worker,mce-local') throw new Error(`listed: ${JSON.stringify(names)}`);
  });

  await testAsyncAction('mce-redaction-cumulates-across-elements', async () => {
    const child = nodeProps((await treeOf('mce-worker')).children[0]);
    if (child.plah !== REDACTED) throw new Error(`plah: ${child.plah}`);
  });

  await testAsyncAction('mce-removing-the-attribute-leaves-and-its-rule-goes-with-it', async () => {
    silent.removeAttribute('expose-to-model-context');
    if (silent.modelContextExposure !== undefined) throw new Error('still exposed');
    const names = await namespaces();
    if (names.join() !== 'mce-worker') throw new Error(`listed: ${JSON.stringify(names)}`);
    if (fake.tools.size !== 5) throw new Error('the first element must keep the tools');
    const child = nodeProps((await treeOf('mce-worker')).children[0]);
    if (child.plah !== '666') throw new Error(`plah still hidden: ${child.plah}`);
  });

  await testAsyncAction('mce-removing-the-last-element-takes-the-tools-back', async () => {
    exposed.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!exposed.isDestroyed) throw new Error('the element was not torn down');
    if (fake.tools.size !== 0) throw new Error(`still registered: ${[...fake.tools.keys()].join(', ')}`);
  });
}
```

If Vite refuses the top-level `await` in this file, wrap the three imports and the `runTestSuite(main)` call in an `async` IIFE; the order (fake first, definitions second) is what matters.

`tests/model-context-element.spec.ts`:

```typescript
import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('model-context-element', () => {
  runPageTests('/pages/model-context-element.html', [
    'mce-envs-ready',
    'mce-first-sync',
    'mce-exposure-resolves',
    'mce-attribute-registers-five-tools',
    'mce-element-without-attribute-has-no-exposure',
    'mce-list-envs-names-only-the-exposed-environment',
    'mce-hidden-namespace-is-refused-like-an-unknown-one',
    'mce-redact-props-hides-the-value-across-the-wire',
    'mce-second-element-joins-the-same-registration',
    'mce-redaction-cumulates-across-elements',
    'mce-removing-the-attribute-leaves-and-its-rule-goes-with-it',
    'mce-removing-the-last-element-takes-the-tools-back',
  ]);
});
```

- [ ] **Step 2: The platform page gains an element next to the function call**

`pages/model-context-platform.html`: add, before `<section id="tests">`:

```html
    <shae-worker id="element" ns="mcp-element" local expose-to-model-context redact-props="xyz"></shae-worker>
    <shae-ent ns="mcp-element" token="foo"><shae-prop name="xyz" type="number" value="7"></shae-prop></shae-ent>
```

`src/model-context-platform.js`: add the imports `import '@spearwolf/shadow-objects/shae-ent.js'; import '@spearwolf/shadow-objects/shae-prop.js'; import '@spearwolf/shadow-objects/shae-worker.js';` (the native `document.modelContext` is there from the start, so the order does not matter here). Update the module comment: append `A \`<shae-worker expose-to-model-context>\` stands next to the function call on this page: both are shares of one registration, and the platform sees one set of tools.` In `main()`, before `let handle;`, wait for the element:

```javascript
  const element = document.getElementById('element');
  await element.shadowEnv.ready();
  await element.shadowEnv.syncWait();
  await testAsyncAction('mcp-element-share-resolves', async () => {
    const share = await element.modelContextExposure;
    if (share.available !== true || share.tools.length !== 5) throw new Error(JSON.stringify(share));
  });
```

Keep `mcp-expose-resolves` as it is (the function now joins). Replace `mcp-model-context-is-available`'s check with `handle.available === true && handle.tools.length === 5`. In `mcp-tools-are-listed-by-the-platform` add, after the loop: `const shae = (await mc.getTools()).filter((t) => t.name.startsWith('shae-')); if (shae.length !== 5) throw new Error(\`${shae.length} shae- tools on the platform, one registration expected\`);`. In `mcp-list-envs-executes-through-the-platform`, additionally assert that the list names `mcp-element` as well: `if (!result.structuredContent.envs.some((e) => e.namespace === 'mcp-element')) throw new Error('the element environment is missing');`. Replace `mcp-dispose-takes-the-tools-back` with two cases:

```javascript
  await testAsyncAction('mcp-dispose-leaves-the-element-share-standing', async () => {
    handle.dispose();
    const names = (await mc.getTools()).map((t) => t.name).filter((n) => n.startsWith('shae-'));
    if (names.length !== 5) throw new Error(`after dispose: ${names.join(', ')}`);
    const result = await execute('shae-list-envs', {});
    const listed = result?.structuredContent?.envs?.map((e) => e.namespace) ?? [];
    if (listed.join() !== 'mcp-element') throw new Error(`listed: ${JSON.stringify(listed)}`);
    const tree = await execute('shae-get-entity-tree', {namespace: 'mcp-element'});
    const xyz = tree?.structuredContent?.envs?.[0]?.kernel?.roots?.[0]?.props?.find((p) => p.name === 'xyz');
    if (JSON.stringify(xyz?.value) !== '{"$type":"redacted"}') throw new Error(`xyz: ${JSON.stringify(xyz)}`);
  });

  await testAsyncAction('mcp-removing-the-element-takes-the-tools-off-the-platform', async () => {
    element.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const left = (await mc.getTools()).map((t) => t.name).filter((n) => n.startsWith('shae-'));
    if (left.length > 0) throw new Error(`still registered: ${left.join(', ')}`);
  });
```

`tests/model-context-platform.spec.ts`: the id list becomes

```typescript
    'mcp-element-share-resolves',
    'mcp-expose-resolves',
    'mcp-model-context-is-available',
    'mcp-tools-are-listed-by-the-platform',
    'mcp-list-envs-executes-through-the-platform',
    'mcp-get-entity-tree-executes-through-the-platform',
    'mcp-find-entities-executes-through-the-platform',
    'mcp-a-refusal-comes-back-as-an-error-result',
    'mcp-dispose-leaves-the-element-share-standing',
    'mcp-removing-the-element-takes-the-tools-off-the-platform',
```

- [ ] **Step 3: Run both in every engine**

Run: `pnpm -F shadow-objects-e2e test -- tests/model-context-element.spec.ts tests/model-context-platform.spec.ts`
Expected: the element page passes in chromium, firefox and webkit; the platform page passes in chromium and is skipped elsewhere. The exposed environment of the element page runs a real worker (`src="/mod-hello.js"`), so its `thread: 'worker'` check proves the snapshot crossed the wire.

- [ ] **Step 4: Count and record**

```bash
pnpm -F shadow-objects-e2e exec playwright test --list | tail -1
```

Take the total, divide by three for the per-project count, and put both into `TEST-PLAN.md` at the two places that say `275 per project` / `825` today (lines 6 and 22; line 22 also says *Fifteen spec files* -- make it *Sixteen*). Update the `model-context-platform.spec.ts` row's count and description (append: `; a \`<shae-worker expose-to-model-context>\` on the same page shares the registration with the call, its share outlives the call's \`dispose()\`, and removing the element takes the tools off the platform`). Add a row after it:

```
| `model-context-element.spec.ts` | `pages/model-context-element.html` | <cases> | `<shae-worker expose-to-model-context redact-props="xyz">` over a real worker next to a local element without the attribute, through a fake model context installed before the definitions load: the attribute registers the five tools once, `list-envs` names the exposed environment alone, the hidden namespace is refused as unknown, the redaction crosses the wire, a second element joins the same registration and its `redact-props` cumulate with the first's, removing the attribute leaves and takes its rule with it, and removing the last element takes the tools back. |
```

`<cases>` is the count `--list` shows for this file (the ids above plus the page's own error case).

Root `CHANGELOG.md`, a new section at the top, above `## 2026-09-06 — the inspection proposal reads as built …`:

```markdown
## 2026-09-06 — the e2e and integration suites drive the expose-to-model-context attribute

The element-level opt-in of the inspection proposal (`docs/proposals/web-mcp-shadow-envs.md`, §11.4 and §17) lands in `@spearwolf/shadow-objects`; what it changes for the package is in [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md). The two private test packages grow with it.

- **`packages/shadow-objects-e2e`:** `pages/model-context-element.html` drives `<shae-worker expose-to-model-context redact-props>` over a real worker next to a local element without the attribute, through a fake model context installed before the element definitions load, in Chromium, Firefox and WebKit; `pages/model-context-platform.html` puts such an element next to the function call on Chromium's real `document.modelContext` and shows one registration shared by both. `TEST-PLAN.md`: the case counts stand at <per project> per project, <total> overall.
- **`packages/shadow-objects-testing`:** `test/worker-element-model-context.test.js` builds the same from markup in real Chromium -- parser upgrade with the attribute in place, `<shae-prop>` values through the tools, redaction cumulating across elements and a function call, and the teardown of the last exposing element.
```

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix
git add packages/shadow-objects-e2e CHANGELOG.md
git commit -m "test: the expose-to-model-context attribute runs over a worker in three engines and next to the function on Chromium's platform"
```

---

### Task 7: the design record and the agent guide

**Files:**
- Modify: `docs/proposals/web-mcp-shadow-envs.md` (§0 "Open" list, §11.2 handle paragraph, §11.4, §12 first bullet, §17)
- Modify: `AGENTS.md:34` (the *Inspection (read-only)* bullet)

- [ ] **Step 1: The proposal**

§0, the *Open, as of 2026-09-06* list: change the first bullet to `- Every item of §17 -- the View/Kernel diff tool, mutation tools, a DevTools panel, streaming. None of them is started; each is a proposal of its own. The element-level opt-in of the first draft shipped on 2026-09-06 (§11.4).`

§11.2 (the section that describes `exposeShadowEnvsToModelContext()` and its handle -- find the paragraph that says a second call under the same prefix rejects, or the `dispose()` description): append `*As built, 2026-09-06:* one registration per model context and prefix, shared -- every call and every \`<shae-worker expose-to-model-context>\` is a share of it, the first opens it, a later one joins instead of failing on the duplicate name, \`dispose()\` takes one share back and the tools leave with the last. \`namespaces\` (\`NamespaceRule\`) is the new option; the tools see the union of the shares' namespaces and apply the union of their \`redactProps\`, both read at the start of every call. \`limits\` and \`exposedTo\` are the opener's.`

§11.4 `<shae-worker>`, append after the last paragraph:

```markdown
*As built, 2026-09-06:* the follow-up came, and it is `expose-to-model-context` with `redact-props` next to it. Three decisions shaped it, each taken against the simpler reading:

- **Per environment, not per page.** The attribute exposes the environment of the element that carries it; the agent sees the union over every share, and an environment no share exposes is neither listed nor answered for -- a tool asked for its namespace is refused with the words of an unknown one, so an agent cannot tell hidden from absent. This is what "element-level" promises literally, and it limits what a copied snippet exposes to the environment it sticks to. `ShadowEnv.inspectAll()` gained a filter for it that keeps a refused environment untouched.
- **Calls and elements share one registration.** The platform refuses a duplicate tool name, and the first draft of the attribute would have collided with a call of the function on the same page. Instead of a separate path for elements, the function itself became a share of one registration per model context and prefix (`src/model-context/sharedExposure.ts`): a call without `namespaces` exposes everything, whichever came first; a call's `dispose()` takes its share and leaves an element's standing; the tools go with the last share. The element joins through the public function, with a namespace predicate and a redaction predicate that read the element live, loaded with a dynamic `import()` -- a static import would have pulled the layer into every consumer of `<shae-worker>` -- which `dist/bundle.js` inlines and the lib layout keeps apart.
- **Redaction cumulates.** Every share's `redactProps` is one rule, a value is hidden when any rule says so in every exposed environment, and a rule leaves with its share -- a name stays hidden while another share still names it. Redaction works by name and does not know where a value came from; the conservative reading is the right one for a security measure, and both unions are read at the start of every tool call, so an attribute edited at runtime applies to the next call.

The function stays the primitive: an environment built without an element is exposed by the function, with `namespaces` where a subset is wanted. The §12 stance holds with one word changed: nothing is exposed without a *decision*, and the attribute is a decision the markup carries, which the docs say next to the sample.
```

§12, first bullet: replace `**Nothing is exposed without a call.** No element attribute, no auto-registration, no import side effect. \`exposeShadowEnvsToModelContext()\` is the only way in, and it takes an \`AbortSignal\` to get back out.` with `**Nothing is exposed without a call.** No element attribute, no auto-registration, no import side effect. \`exposeShadowEnvsToModelContext()\` is the only way in, and it takes an \`AbortSignal\` to get back out. *As built, 2026-09-06:* the element attribute of §11.4 is the second way in, per environment, as a share of the same registration; the last share leaving is the way out.`

§17: remove the bullet `- **Element-level opt-in.** A \`<shae-worker>\` attribute that calls the function, once the function has proven itself.`

- [ ] **Step 2: `AGENTS.md`**

In the *Inspection (read-only)* bullet of §2, after `registers nothing on import, and stays out of the worker bundle.`, append: `One registration per model context and prefix, shared (\`src/model-context/sharedExposure.ts\`): every call of the function and every \`<shae-worker expose-to-model-context>\` is a share of it, the tools answer from the union of what the shares expose and redact, and they leave with the last share. The element joins through the public function with live predicates, loaded by a dynamic \`import()\`, so its static import graph stays free of the layer.`

- [ ] **Step 3: Remove this plan**

Plans under `docs/superpowers/plans/` are scaffolding and go once everything they carry is in the proposal, a source comment or a spec -- the convention set on 2026-09-06 for the three phase plans. Check that every deviation an executor recorded while working through the tasks is in §11.4 of the proposal or in a comment next to the code, then:

```bash
git rm docs/superpowers/plans/2026-09-06-model-context-element-opt-in.md
```

and add to the root `CHANGELOG.md` section Task 6 created one bullet: `- **\`docs/superpowers/plans/2026-09-06-model-context-element-opt-in.md\`:** removed; the proposal's §11.4 holds the design and the decisions, git history holds the file.`

- [ ] **Step 4: The whole CI sequence, then commit**

```bash
pnpm run ci
git add docs/proposals/web-mcp-shadow-envs.md AGENTS.md CHANGELOG.md
git commit -m "docs: the proposal records the element-level opt-in and the shared registration as built"
```

`pnpm run ci` covers the terminology check, the build, the typecheck of every package, the vitest suites with merged coverage, the e2e typecheck and `lint:ci`. It does not run Playwright; Task 6 did.

---

## Self-review

- **Spec coverage.** §17 "Element-level opt-in": Task 4. Shared registration, join instead of collision: Task 3 (registry, unions, the rewritten function), proven with a call next to an element in Tasks 4, 5 and 6. Per environment: Tasks 1, 2 (the filter and the refusal wording), 3 (`namespaces` and its union), 5 and 6 (from markup). Redaction cumulating, lists and predicates, leaving with its share, read live: Task 3 spec (`redaction` block), Task 4 spec (`redact-props cumulates …`), Task 5 (`title came back with the share that hid it`), Task 6 (`mce-redaction-cumulates-across-elements`, `…its-rule-goes-with-it`). Opener's `limits`/`exposedTo`: Task 3 spec. Dynamic import and the bundle boundary: Task 4 (element), Task 3 (dist contract), Task 4 Step 6 (size). Docs, README, changelogs: Tasks 1, 3, 4, 6. The proposal and `AGENTS.md`: Task 7.
- **Placeholders.** The four size numbers in Task 4 and the counts in Task 6 are measured in their own steps and written in before the commit; nothing else is left open.
- **Type consistency.** `only?: (ns: NamespaceType) => boolean` (Task 1) is what `inspectEnvs` passes `ctx.isExposed` as (Task 2) and what `unionNamespaces` returns (Task 3). `NamespaceRule`, `toNamespacePredicate`, `ToolContext.isExposed` (Task 2) are what `sharedExposure.ts` consumes (Task 3). `ExposureMember {namespaces, redactProps}`, `ExposureSettings {limits, exposedTo?}`, `ExposureMembership {tools, leave()}` and `joinSharedExposure(modelContext, prefix, member, settings)` are defined and used only inside Task 3. `ExposeOptions.namespaces?: NamespaceRule` and `ExposeHandle` (Task 3) are what the element calls and types against (Task 4). `modelContextExposure` returns `Promise<ExposeHandle> | undefined` in Task 4 and is awaited as such in Tasks 5 and 6. The refusal wording `no Shadow Environment holds the namespace "…"` is identical in Tasks 2, 5 and 6. The `ToolContext` getters of Task 3 depend on `inspectEnvs` reading each field once per call, which Task 2 establishes and its last case pins.
