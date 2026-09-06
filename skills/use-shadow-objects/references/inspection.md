# Introspection, WebMCP and security

## `ShadowEnv.inspect(request?, signal?)`

```javascript
await env.syncWait();                          // the ordering rule — see below
const snapshot = await env.inspect({maxDepth: 3});
const all = await ShadowEnv.inspectAll({maxDepth: 2});   // every environment holding a namespace
```

A JSON-safe picture of both halves: the View's committed Component Memory and the Kernel's live
entity tree. Everything JSON would drop is replaced by a tagged stand-in.

**The `syncWait()` in front is not optional.** The View snapshot reads the *committed* memory and the
Kernel changes only when a change trail reaches it, so a snapshot taken between a property write and
the next cycle shows the previous value on both sides. Over a worker the request queues behind the
trails already on their way, so it reflects exactly those — the same one `syncWait()` is enough.

The promise **rejects** only for the caller's reasons (`signal` aborted, `ShadowEnvDestroyedError`).
Everything inside the environment is **reported** under `error` with `kernel` absent: a proxy without
`inspect` (`{name: 'NotInspectable'}`), a Kernel that threw, a `WorkerTimeoutError` naming
`'inspected'`, a `WorkerFailedError`. A proxy that is not ready yet is no error — `state.proxyReady`
says so.

`EnvSnapshot`: `{namespace, isGlobalNamespace, kind: 'local'|'worker'|'custom'|'none', state, view?,
kernel?, error?}`. The global namespace reports as `'ShadowObjectsGlobalNS'`.

### `InspectRequest`

| Field | Default | Meaning |
|---|---|---|
| `include` | all four | `'props'`, `'shadowObjects'`, `'contexts'`, `'registry'`. The View side reads only `'props'` |
| `rootUuids` | the roots | Descend from these instead. An unknown uuid lands in `truncation`, never throws |
| `maxDepth` | `4` | Depth below each root; non-finite reads as the cap `64` |
| `maxNodes` | `250` | Total across the walk |
| `values` | `{maxDepth: 3, maxArrayLength: 20, maxObjectEntries: 30, maxStringLength: 200}` | Per value, not per snapshot |
| `filter` | none | `{token?, propName?, shadowObject?, contextName?, limit?}` — search instead of walk |

With a `filter`, matches land in `kernel.search` = `{matches: [{uuid, token, path}], total}` and
`roots` stays empty; `maxDepth`/`maxNodes`/`rootUuids` do not apply, `limit` defaults to `50`, and a
symbol context name cannot be named here. `truncation` names node and reason (`'max-depth'`,
`'max-nodes'`, `'unknown-root'`); `childCount` still says how many children a cut node has, and
`rootUuids` is the way to descend. A node named in `rootUuids` carries `ancestors` — the chain from
the root down to its parent.

### Snapshot shapes

`KernelSnapshot`: `takenAt`, `thread` (`'main'`|`'worker'`), `counts`, `roots`, `globalContexts`,
`registry` (`{tokens, routes, propRoutes, isDefault}`), `truncation`, `search?`.

`EntityNodeSnapshot`: `uuid`, `token`, `order`, `parentUuid`, `autoDestructionOnParentRemoval`,
`childCount`, plus per `include`:

- `props` — `{name, value, routes}`; `routes` says whether the value counts truthy for property routing.
- `shadowObjects` — `{displayName, definedUnder, usesProperties, usesContexts, usesParentContexts,
  providesContexts, providesGlobalContexts, hooks}`. **`definedUnder` answers "why is this Shadow
  Object on this entity"** when a route brought it there.
- `contexts` — `{name, provided?, inherited?, effective, providedBy, source}` with `source` one of
  `{kind:'self'}`, `{kind:'ancestor', uuid}`, `{kind:'global'}`, `{kind:'none'}`. **This answers
  "why does my consumer read `undefined`".** "Holds a value" means `!= null`.

`ViewSnapshot`: `takenAt`, `counts`, `roots`, `truncation`. A `ViewComponentSnapshot` adds
`element` — a CSS selector path to the `<shae-ent>`, absent inside a shadow root (the query pierces
none), for a component no element carries, and without a `document`.

`SerializedValue` tags: `undefined`, `bigint`, `symbol`, `function`, `date`, `signal` (with its
value), `dom`, `array-buffer`/`typed-array`, `object` (`class` + `preview`), `circular`, `truncated`
(`reason: 'depth'|'length'|'entries'|'string'`). Serializing never throws.

Inside the environment, without a `ShadowEnv`:

```typescript
import {createKernelSnapshot} from '@spearwolf/shadow-objects/shadow-objects.js';
const snap = createKernelSnapshot(kernel, {rootUuids: [uuid]});
```

Quickest console entry point: `ShadowEnv.get('game-world').inspect().then(console.log)`.
`kernel.getEntityGraph()` is the raw alternative, but the entity keeps its state in private fields
and serializes as `{}` — read `token`, `props` and `children` from the node, not from the JSON.

## WebMCP — `exposeShadowEnvsToModelContext(options?)`

```javascript
import {exposeShadowEnvsToModelContext} from '@spearwolf/shadow-objects/model-context.js';

if (import.meta.env.DEV) {
  const handle = await exposeShadowEnvsToModelContext({
    redactProps: ['sessionToken', 'email'],
    namespaces: ['game'],
    limits: {maxDepth: 3},
  });
  handle.available;   // false where the platform has no model context — nothing was registered
  handle.tools;       // the five names
  handle.dispose();   // takes this share back
}
```

| Option | Default | Meaning |
|---|---|---|
| `modelContext` | `document.modelContext`, then `navigator.modelContext` | Anything with `registerTool()` — a fake in a test, an adapter of your own |
| `toolPrefix` | `'shae-'` | |
| `signal` | none | Aborting equals `dispose()`; an already-aborted signal registers nothing |
| `exposedTo` | not set | Passed to `registerTool()` by the **opening** share |
| `limits` | `{}` | Defaults per tool call, set by the opening share; the agent's own input wins field by field |
| `redactProps` | none | `string[]` or `(name, uuid) => boolean` → `{$type: 'redacted'}` on both halves. **Property values only** |
| `namespaces` | every environment with a namespace | `NamespaceType[]` or `(ns) => boolean` |

**One registration per model context and prefix, shared.** Every call and every
`<shae-worker expose-to-model-context>` is a *share*: the first opens it, later ones join, the tools
leave with the last share. The tools answer from the **union** — every namespace any share exposes,
every property any share hides — read at the start of every call. `limits` and `exposedTo` belong to
the opener; a later share with other values is reported and joins under the opener's.

The promise resolves `{available: false, tools: [], dispose}` where there is no model context (a
worker, Node, a browser without WebMCP, plain `http://` outside `localhost`) and logs one `info`
line. It rejects with what `registerTool()` rejected with — a `NotAllowedError` under a Permissions
Policy among them. Registration is all-or-nothing.

### The five tools

Every tool carries `annotations: {readOnlyHint: true, untrustedContentHint: true}` and answers one
envelope: `{content: [{type: 'text', text}], structuredContent, isError?}`. A refusal — unknown
namespace, unknown uuid, a search without a criterion, a wrong input type, a failed environment — is
an `isError` result, never a rejection, so the wording reaches the agent. Only an aborted signal
rejects `execute()`.

| Tool | Input | `structuredContent` |
|---|---|---|
| `shae-list-envs` | none | `{envs: [{namespace, isGlobalNamespace, kind, state, view?, kernel?, error?}]}` — no tree; the cheapest call and the first to make |
| `shae-get-entity-tree` | `{namespace?, rootUuid?, maxDepth?, maxNodes?, include?, valueDepth?}` | `{envs: EnvSnapshot[]}` |
| `shae-get-entity` | `{uuid, namespace?}` | `{matches: [{namespace, entity, ancestors, view?, truncation?}], errors?}` |
| `shae-find-entities` | `{namespace?, token?, propName?, shadowObject?, contextName?, limit?}`, at least one criterion | `{results: [{namespace, matches, total, error?}]}` — the search runs where the Kernel runs and ships matches, not the tree |
| `shae-get-registry` | `{namespace?}` | `{registries: [{namespace, kind, registry?, error?}]}` |

Inputs map onto `InspectRequest`: `rootUuid` → `rootUuids: [rootUuid]`, `valueDepth` →
`values.maxDepth`. Snapshots are built per call, never cached — and the tools cannot run the
application's `syncWait()` for the agent.

`ModelContextLike` / `ModelContextToolLike` are the structural contract, exported for tests and own
adapters; `findModelContext()` is the lookup. In a test, hand the function a `modelContext` of your
own and call `execute()` directly.

Platform note (September 2026): Chromium ships `document.modelContext` behind
`--enable-features=WebMCP` (Chrome 149 origin trial; `about:flags#enable-webmcp-testing` locally).
An in-page agent lists with `getTools()` and runs `executeTool(tool, input)` where `input` is the
**JSON string** of the arguments. A rejecting `execute` is reported to the agent without its message
— hence the `isError` results.

## Security

**The module URL is a trust boundary.** `<shae-worker src>` and every `importScript()` argument
resolve against the document — any origin resolves — and the module is then loaded with a dynamic
`import()`. It acts as the application's origin: same credentials on every `fetch()`, same IndexedDB
and Cache Storage; under `LocalShadowObjectEnv` even `document.cookie` and `localStorage`. Never set
it from unvalidated input. Production protection is a CSP, not a library check:

```
Content-Security-Policy: script-src 'self'; worker-src 'self' blob:
```

That covers the inlined `blob:` worker of the `bundle.js` entry point (a `blob:` worker inherits the
document's policy container, a `<meta http-equiv>` included). Every other entry point creates the
worker from `shadow-objects.worker.js` fetched as its own response — **nothing the document declares
reaches the `import()` inside it**, so the header has to be served on that script's response too.

**Exposing environments to an agent.** Every value in every answer is application state — a session
token or a user's draft routed through a `<shae-prop>` shows up in the answer for every agent the
page exposes tools to.

- Nothing is exposed without a decision: no auto-registration, no import side effect. The function
  is one way in, the `expose-to-model-context` attribute the other — and a copied snippet copies the
  exposure. Strip it from shipped markup; keep the call behind the same switch that enables the
  `ConsoleLogger`, or behind a build flag.
- Read-only and declared as such; `untrustedContentHint` unconditionally.
- `redactProps` has **no default list** on purpose — a guess would suggest a coverage it cannot have.
  **Entity Context values are not covered**: a secret travelling as a context is a secret the agent
  sees.
- Shares add up. A `redact-props` on one element hides that name everywhere; redaction grows with a
  share and shrinks when it leaves.
- A secure context is required. On plain `http://` outside `localhost` there is no model context.
- Set `limits` for the agent's context window, not for yourself. Defaults: depth 4, 250 nodes,
  values cut at depth 3. `shae-find-entities` exists so a search does not ship the tree.

The View half names elements by CSS selector path, never by node, and reveals nothing the agent
could not read from the DOM itself.
