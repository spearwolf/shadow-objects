---
name: use-shadow-objects
description: Use when writing, reviewing or debugging application code that uses @spearwolf/shadow-objects — Shadow Objects, entities, tokens, the Registry and its routes, `<shae-worker>`/`<shae-ent>`/`<shae-prop>`, ShadowEnv, LocalShadowObjectEnv/RemoteWorkerEnv, Kernel, or the `testing.js`, `model-context.js` and `ConsoleLogger.js` subpaths. Also when a property set in the view never reaches a Shadow Object, an effect does not re-run, a context reads `undefined`, a worker dies, or a change trail is refused.
---

# Using Shadow Objects

`@spearwolf/shadow-objects` is an ECS for the browser. **Entities** are lightweight nodes in an
entity tree; **Shadow Objects** are the ECS components that attach behavior to them; a **Token**
(string) is what the View declares, and the **Registry** maps it to constructors. The **Kernel**
runs all of it inside a **Shadow Environment** — main thread (`LocalShadowObjectEnv`) or web worker
(`RemoteWorkerEnv`), both first-class. The **View Layer** (DOM, React, Vue, Svelte, a canvas
renderer) owns structure and input, never behavior.

Two layers, three flows: properties go **down** (View → Kernel → entity → `useProperty` signal),
messages come **up** (`dispatchMessageToView` → ViewComponent → optional DOM `CustomEvent`), and
Entity Context plus the entity event bus run **laterally** inside the environment.

## Six invariants — check these first when fighting the framework

1. Structure flows from the View into the environment only, never back.
2. A Shadow Object never creates or destroys an entity. It owns behavior, not existence.
3. An entity does not know its Shadow Objects by name. They meet over the bus, not over imports.
4. The View knows no constructors, only tokens. Token → constructor is the Registry's business.
5. Environments never talk to each other. The main thread is the bus.
6. What the framework did not set up, the framework does not tear down. Signals, effects, memos and
   `on()` subscriptions from the creation API are disposed automatically; intervals, sockets,
   foreign listeners and library objects belong in `onDestroy` or in `createResource`.

## Import map — pick the right subpath

| Subpath | Contents | Notes |
|---|---|---|
| `@spearwolf/shadow-objects` | `ViewComponent`, `ComponentContext`, `ShadowEnv`, `LocalShadowObjectEnv`, `RemoteWorkerEnv`, `FrameLoop`, element classes, `createKernelSnapshot`, `ChangeTrailRefusedError`, `EntityUuidInUseError`, `WorkerTimeoutError` | View side. Pulls the custom elements, so it **needs a DOM** — never import it in a worker |
| `…/shadow-objects.js` | `Kernel`, `Registry`, `ShadowObject` decorator, `shadowObjects.define()`, the lifecycle symbols, `ShadowObjectCreationAPI`, `EventsOf`, `createKernelSnapshot` | Environment side. This is what Shadow Object modules import |
| `…/elements.js` | Registers `<shae-worker>`, `<shae-ent>`, `<shae-prop>` | Side-effect import. `…/shae-ent.js` etc. register one each |
| `…/testing.js` | `createTestKernel`, `mountShadowObject`, `settle`, `recordKernelErrors` | No test-runner import, no global touched |
| `…/model-context.js` | `exposeShadowEnvsToModelContext`, `ModelContextLike` | WebMCP; never imported by the worker bundle |
| `…/ConsoleLogger.js`, `…/FrameLoop.js` | `ConsoleLogger`, `FrameLoop` | Worker-safe |
| `…/bundle.js` | Everything with the worker inlined as a `blob:` URL | Single-file drop-in |

**Exactly one copy of `@spearwolf/signalize` and one of `@spearwolf/eventize` may be in the tree.**
Both key their slots with realm-wide symbols; two majors of either fail at the boundary. You do not
need to install signalize — the reactivity primitives arrive as creation-API arguments. eventize is
different: `on`/`once`/`off`/`emit` are imported from it directly, so view code that listens on a
`ViewComponent` needs it in its own manifest.

## Writing a Shadow Object

```javascript
// my-logic.js — the module <shae-worker src> points at
export function CounterLogic({useProperty, createSignal, createEffect, onViewEvent, dispatchMessageToView, onDestroy}) {
  const seed = useProperty('count');                 // signal READER: call it
  const count = createSignal(seed() ?? 0);           // ?? not || — 0 is a valid seed
  createEffect(() => dispatchMessageToView('count-changed', {value: count.get()}));
  onViewEvent((type, data) => {
    if (type === 'increment') count.set(count.value + data.value);
  });
  onDestroy(() => {/* only non-framework resources */});
}

export const shadowObjects = {          // the ONE export name the loader reads
  define: {'counter': CounterLogic},
};
```

The function body / constructor is the **setup phase**. It runs once per Shadow Object and never
again while that object stays on its entity. Everything reactive is declared here.

Classes work identically and additionally get **automatic event binding**: a method named like an
event is called when that event fires on the entity. The same holds for an object a *function*
returns. Lifecycle hooks, however, are **symbol-keyed** (see pitfalls).

### Creation API

| Member | Shape | Notes |
|---|---|---|
| `useProperty(name, options?)` | `SignalReader<T\|undefined>` | Reader is cached per name per Shadow Object; a second call's `compare` is ignored and reported at error level |
| `useProperties({key: name})` | `{key: SignalReader}` | No options |
| `useContext(name, options?)` / `useParentContext(...)` | `SignalReader` | Read inside an effect/memo, not as a bare value in the constructor. `useParentContext` is the exception — it answers inline |
| `provideContext(name, valueOrSignal?, options?)` | `Signal` | `clearOnDestroy` defaults `true`. A second call for the same name silently returns the first signal |
| `provideGlobalContext(...)` | `Signal` | Same, environment-wide |
| `createSignal(init?)`, `createSignal(fn, {lazy: true})` | `Signal` | **Not callable**: `.get()` subscribes, `.value` does not, `.set(v)` writes |
| `createMemo(fn)` | `SignalReader` | Callable |
| `createEffect(fn, deps?, options?)` | `Effect` | Callback may return a cleanup. With an explicit dep list it becomes manual: no initial run, no auto-tracking |
| `createResource(factory, cleanup?)` | `Signal` | Cleanup runs before every re-create and on destroy, only if the factory returned non-empty. Guard inside the factory |
| `on` / `once` / `emit` | eventize forms, entity filled in | `on(target, …)` addresses another entity or object. Subscriptions end with the Shadow Object |
| `onViewEvent(cb)` | `void` | No unsubscribe; ends with the Shadow Object |
| `dispatchMessageToView(type, data?, transferables?, traverseChildren?)` | `void` | Top-level only, not on `entity` |
| `onDestroy(fn)` | `void` | For non-framework resources |
| `entity` | `EntityApi` | `uuid`, `order`, `parent`, `children`, `kernel`, `traverse(cb)`, `propKeys()`, `propEntries()` — the last two are **methods** and never shrink |

Full signatures, options, error contracts and the `entity` surface: `references/api.md`.

### Composition — the Registry decides what runs, the View never does

```javascript
export const shadowObjects = {
  define: {'user-profile': UserProfileLogic, 'logging': Logging, 'debug-overlay': Overlay},
  routes: {
    'user-profile': ['logging'],   // composition; the token itself is always included
    '@debug': ['debug-overlay'],   // ANY entity with a truthy `debug` property
    'game-canvas@debug': ['hud'],  // only that token, with that truthy property
  },
  extends: [CoreModule],           // imported once; a duplicate is warned about
  async initialize({define, kernel, registry}) {/* late definitions, e.g. feature flags */},
};
```

Routes resolve recursively, breadth-first, each token once. A token may carry several constructors
(defining it again appends). Adding cross-cutting behavior is a Registry edit — no markup changes.

## The sync tempo — the single most common bug

The change trail is **batched and clocked**, never immediate. This holds in a local environment too.

```javascript
vc.setProperty('level', 5);
assertShadowObjectSawIt();      // WRONG — nothing has been shipped yet

vc.setProperty('level', 5);
await env.syncWait();           // RIGHT — resolves after the environment applied the batch
assertShadowObjectSawIt();
```

`<shae-worker auto-sync>` decides the tempo: `frame` (default), `"60fps"`, `"100"` (ms), or off —
then call `env.sync()` yourself. `sync()` ships without asking for a confirmation; `syncWait()` asks,
and is the only route on which a worker reports a refused trail. Inside Shadow Objects this rarely
bites, because everything there reacts anyway; in imperative glue code and tests it always does.

## Local vs. remote

Pick by what the logic must touch, not by dev-vs-prod. Both ship.

- **Local** (`LocalShadowObjectEnv`, `<shae-worker local>`): the only way to hand a non-cloneable
  value — DOM node, canvas context, WebGL/WebGPU handle — to a Shadow Object, and that additionally
  needs `no-structured-clone` / `disableStructuredClone = true`, because a local environment
  `structuredClone`s every trail entry by default so both modes behave alike. Also: coordination-heavy
  logic, no worker available, straightforward devtools stepping.
- **Remote** (`RemoteWorkerEnv`, plain `<shae-worker>`): CPU-heavy logic, many entities, a UI thread
  that must stay free, small data crossing the boundary.

The Shadow Object code is identical. Only the proxy changes — and a built `<shae-worker>` keeps the
mode it started with.

## Pitfalls

| Symptom / trap | Reality |
|---|---|
| Property set, effect did not run on the next line | Batched + clocked. `await env.syncWait()` |
| `count.set(c => c + 1)` | Stores the **function** as the value. Use `count.set(count.value + 1)` |
| `createSignal(0)()` | A `Signal` is not callable. `.get()` / `.value` / `.set()`. Only `useProperty`/`useContext`/`createMemo` return callable readers |
| `useProperty('n')() \|\| fallback` | `0` and `''` are valid values. Use `??` |
| `onDestroy() {}` as a class method | The hooks are **symbols**: `[onCreate]`, `[onDestroy]`, `[onParentChanged]`, `[onViewEvent]` from `…/shadow-objects.js`. A plain method of that name is never called and the Kernel reports the mismatch |
| A helper method on a returned object gets called out of nowhere | Every method of a returned object (and of a class instance) is an event listener on the entity. Keep helpers in the closure |
| `useContext('x')` reads `undefined` in the constructor | It lands after the constructor returned. Read it in an effect or memo. `useParentContext()` answers inline |
| Second `useProperty('x', {compare})` has no effect | Reader is cached per name; the later `compare` is dropped and reported at error level. Same for `useContext`. `provideContext` drops it silently |
| Context vanished when one provider left | The entity hands the name to the last-attached provider that still holds a value. `undefined` only when the last one is gone |
| `<shae-prop value="10">` arrives as `"10"` | Without `type` the value is the attribute string. `value=""` sets nothing at all; `value="  "` trims to `''` (and to `0` under `type="number"`) |
| A boolean-looking attribute set to `"false"` still counts | `local`, `no-autostart`, `auto-destruct`, `expose-to-model-context` and `no-trim` read a **truthy value**, not presence: set for `on`/`true`/`yes`/`local`/`1` or the bare attribute, unset for everything else including `="false"` and `="0"`. Only `no-structured-clone` asks for presence alone |
| No DOM event arrives from a Shadow Object | Without `forward-custom-events` no `CustomEvent` is dispatched at all. The message still reaches `el.viewComponent` as an eventize event |
| A `<shae-ent>` did not find its parent | `<shae-ent>` binds within **its own namespace**; a foreign-namespace element in between is invisible and does not block. `<shae-prop>` binds by proximity and **ignores** namespace |
| Assertion right after `customElements.define()` fails | Re-binding of entities and properties happens one microtask later. `await Promise.resolve()` first |
| Handing a canvas/DOM node to a local environment throws | The default local clone refuses it. Set `disableStructuredClone = true` / `no-structured-clone` |
| Worker died, re-creating into the same proxy is refused | Three steps, none optional: `env.envProxy = new RemoteWorkerEnv()`, `await env.ready()`, `await proxy.importScript(url)`, then `await env.syncWait()`. A fresh worker has an empty Registry |
| `SyncFailed` handled like a lost worker | A `ChangeTrailRefusedError` means the environment is intact: `appliedCount` entries went through, the rest is still pending and goes out next cycle — **do nothing**. Any other reason books the whole trail as applied |
| A refused trail repeats forever | Deliberate. A missing token or an always-throwing constructor refuses every cycle. End it in the `SyncFailed` listener: remove the offending component or tear the environment down |
| `kernel.getEntity(uuid)` throws | It never returns `undefined`. Use `findEntity()` or `hasEntity()` |
| Second entity/component under one uuid | `EntityUuidInUseError` (Kernel) / `ComponentUuidInUseError` (ComponentContext). The uuid frees when its holder goes |
| Teardown leaves things hanging | Order: `env.destroy()`, then `ctx.dispose()`. `clear()` keeps the namespace and takes components back; `dispose()` releases it and rejects every join |
| A Shadow Object wants to spawn an entity | Invariant 2. Tell the View; the View decides |
| Nothing is logged | `ConsoleLogger.sharedConfig.enable` defaults on for `localhost`/`127.0.0.1`/`::1` only, `debug` is off. `logger.error` is ungated |
| A green unit test, a broken worker | The test kernel clones nothing. A value that arrived by identity may be refused by `structuredClone` at a real boundary. Integration/E2E answers that |

## Testing

```javascript
import {mountShadowObject, createTestKernel} from '@spearwolf/shadow-objects/testing.js';

const so = await mountShadowObject(PlayerLogic, {props: {score: 0}, contexts: {physicsWorld}});
so.setProps({score: 10});
await so.settle();                       // before asserting on so.viewMessages
so.sendViewEvent('damage', {amount: 5}); // SYNCHRONOUS — no settle needed
so.dispose();                            // throws over unacknowledged kernel errors
```

`createTestKernel()` is the layer beneath, for several objects, parents and routes: `define()`,
`route()`, `importModule()`, `createEntity()`/`createChild()`, `entity(uuid)`, `errors`,
`clearErrors()`, `dispose()`. A real Kernel, no DOM, no worker, no `ShadowEnv`, no clone. Rules:
`await settle()` before a view message or a context read; a context needs **two** settles the first
time anything on that entity touches it; view events are synchronous. Details:
`references/testing.md`.

## Introspection, WebMCP and security

`await env.syncWait()` then `await env.inspect({maxDepth: 3})` gives a JSON-safe `EnvSnapshot` of
both halves — the View's component tree and the Kernel's entity tree with properties, Shadow Objects
and Entity Contexts. `ShadowEnv.inspectAll()` covers the page; `createKernelSnapshot(kernel)` works
inside the environment without a `ShadowEnv`. Each `contexts` entry names where its effective value
came from; each `shadowObjects` entry names the tokens it is `definedUnder` — that is the answer to
"why is this Shadow Object here".

`exposeShadowEnvsToModelContext()` (subpath `…/model-context.js`) hands the same data to an AI agent
as five read-only WebMCP tools. **Every value in every answer is application state.** Keep the call
behind a development switch, name secrets in `redactProps` (property values only — an Entity Context
carrying a secret is not covered), and strip `expose-to-model-context` from shipped markup. The
`src` of a `<shae-worker>` is a trust boundary: it runs as the application's origin, so never wire it
from unvalidated input, and protect production with `script-src`/`worker-src`.
Details: `references/inspection.md`.

## Reference files

- `references/api.md` — creation API in full, Registry class, ViewComponent, ComponentContext,
  ShadowEnv, the two proxies, Kernel, error contracts, ConsoleLogger.
- `references/elements.md` — `<shae-worker>`, `<shae-ent>`, `<shae-prop>`: every attribute, the
  `type` table, host/parent binding, teardown and reconnect.
- `references/testing.md` — `createTestKernel`, `TestEntity`, `mountShadowObject`, `settle`, timing.
- `references/inspection.md` — `inspect()`, snapshot shapes, the five WebMCP tools, security.
