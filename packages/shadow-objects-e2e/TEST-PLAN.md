# E2E Test Plan — coverage analysis and proposed test cases

Status: 2026-08-02. Analysis of the existing Playwright suite in this package, the gaps it leaves,
and a ticket-ready list of test cases to close them.

> **Implemented on 2026-08-02.** The harness fixes and the P1 blocks of every group below are in
> place; the suite went from 44 to 298 tests across Chromium and Firefox. New pages:
> `multi-env`, `dynamic-dom`, `upgrade-timing`, `async-events`, `create-element`; `bundle.html`
> was reworked from smoke test to real assertions. Two framework defects surfaced while writing
> them and are recorded in [`KNOWN-DEFECTS.md`](KNOWN-DEFECTS.md).
>
> Still open, all P2/P3: MULTI-8 … MULTI-14, DOM-9 … DOM-12, UPG-6 … UPG-8,
> ASYNC-8 (`src` change after `start()`), ASYNC-10 … ASYNC-12 (worker termination, failing
> `importScript`, transferables), and H-FIX-8 (enable the webkit project). DOM-5 is not
> implementable from the DOM — see the note at the end of `KNOWN-DEFECTS.md`.

Companion documents: `Backlog.md` §4 (repo root) holds the coverage heuristic across *all* test
layers. This file is E2E-only and goes one level deeper: it names pages, fixtures and assertions.

---

## 1. What exists today

Four spec files, 43 registered test cases. The specs themselves contain almost no logic — they
navigate to a page and assert `data-testresult="ok"` on nodes the page wrote. All real assertions
live in `src/*.js`.

| Spec | Page | Cases | What is actually verified |
|---|---|---|---|
| `bundle.spec.ts` | `pages/bundle.html` | 4 | Two elements are attached, two custom elements are defined. Nothing else. |
| `remote-worker-env.spec.ts` | `pages/remote-worker-env.html` | 5 | Programmatic `ShadowEnv` + `RemoteWorkerEnv`: `ready()`, `importScript()`, `isReady`, one `sync()`, one message worker → view. |
| `shae-worker.spec.ts` | `pages/shae-worker.html` | 28 | `<shae-worker>` is defined; two workers (remote+autostart, local+no-autostart) report the right `ns`, the right env type, and reach `ready()`; both workers' kernels are asked for their entity graph and every parent-child relation, slot projection and namespace boundary in the tree is checked against it. |
| `auto-destruct.spec.ts` | `pages/auto-destruct.html` | 6 | `autoDestructionOnParentRemoval` cascade vs. promotion-to-root, over a real worker. |

`auto-destruct` is the only scenario built end-to-end on purpose: a fixture module
(`public/mod-auto-destruct.js`) exercises kernel behaviour and reports a structured result back to
the view, which the page then asserts in three separate checks.

### 1.1 Fixture code that is loaded but never asserted

The pages set up considerably more than the specs check. This is dead weight that reads like
coverage:

- **`pages/bundle.html`** builds a five-level entity tree with `<shae-prop>` values of type
  `boolean` and `number[]`, and places `seBase4` (namespace `worker0`) *inside* `seBase1`
  (global namespace) — the cross-namespace nesting case. All of it is written to `console.log`
  and asserted nowhere. Property parsing, tree shape and namespace isolation are silently untested.
- **`public/mod-hello.js`** registers a reaction on the `xyz` property that dispatches `fooEcho`
  to the view. Nothing ever changes `xyz`, so that path never runs.
- **`src/remote-worker-env.js`** creates a child `ViewComponent` `bar` with property `plah`.
  Nothing asserts it arrived.

### 1.2 Two tests that never run

`src/shae-worker.js` produces `worker0-env-contextCreated` and `worker1-env-contextCreated`, but
neither id appears in the `lookupTests([...])` array of `shae-worker.spec.ts`. The nodes are
written to the DOM and ignored. The `contextCreated` CustomEvent — the documented way for
application code to learn that an environment came up — is therefore not covered.

### 1.3 Harness weaknesses

| # | Issue | Consequence |
|---|---|---|
| H-1 | `lookupTests` is duplicated inline in `auto-destruct.spec.ts` and `remote-worker-env.spec.ts` although `tests/lookupTests.ts` exists and is used by `shae-worker.spec.ts`. | Three copies drift. |
| H-2 | A failing check writes its reason into `data-testoutput`, but no spec ever reads it. | Failures report `expected "ok", got "fail"` with the cause discarded. |
| H-3 | If the page script throws before writing a node, Playwright waits out the full timeout and reports "element not found". | A crash in setup looks like a slow test, and every downstream case fails the same opaque way. |
| H-4 | `testAsyncAction` calls `reject` with no argument on timeout (`setTimeout(reject, timeout)`). | The recorded message is literally `undefined`. |
| H-5 | No spec asserts on console errors, page errors or worker errors. | A worker that dies quietly only shows up as a downstream timeout. |
| H-6 | In `src/shae-worker.js`, `testAsyncAction('worker0-is-remote-env', …)` and `testCustomEvent('worker1-env-contextCreated', …)` are started without `await`. | Result nodes land in non-deterministic order; a late rejection can be attributed to the wrong phase. |
| H-7 | `webkit` is commented out in `playwright.config.ts`. | Safari-specific custom-element and worker semantics are unverified. |
| H-8 | The root `test:ci` script filters this package out. | The entire worker round-trip is unverified in CI. Already tracked in `Backlog.md` as the CI gap. |

---

## 2. Coverage gaps along the critical axes

### 2.1 Dynamically inserted DOM elements — **not covered at all**

Every existing page delivers its entity tree as parser-generated markup. No E2E test ever calls
`createElement`, `appendChild`, `remove()` or assigns `innerHTML` after load.

The integration suite covers a slice of this (`shadow-objects-testing/remove-and-append-e.test.js`)
but only against `LocalShadowObjectEnv`, and it asserts on the change trail rather than on what the
kernel ended up with. The worker boundary — structured clone, message ordering, entity creation on
the far side — is never exercised by a dynamic mutation.

Uncovered paths worth naming:

- `ShaeEntElement.connectedCallback` → `#dispatchRequestParent` when the parent is already live.
- `ShaeEntElement.#createParentObserver` / `onParentChanged` — the `MutationObserver` that detects
  removal from the parent node (`ShaeEntElement.ts:240-269`).
- `ShaeEntElement.#setParent` and its re-request microtask
  (`ShaeEntElement.ts:336-350`) — reached when a child is inserted before its parent is ready.
- `ShaePropElement.#disconnectFromEntNode`, which defers by one microtask so a move within the same
  tick is not seen as a disconnect.
- `ShaeWorkerElement.#deferDestroy` (`ShaeWorkerElement.ts:208-219`) — the comment states that a
  reconnect inside the same microtask *cannot* stop the teardown. That documented behaviour has no test.

### 2.2 Element → custom element upgrade timing — **not covered**

The upgrade path does run in the current pages (both `bundle.html` and `shae-worker.html` place the
module script after the markup), but nothing asserts on it. The reverse order is never tested, and
the interesting failure mode is not tested at all:

`ShaePropElement` finds its host by walking `parentElement` and checking the `isShaeEntElement`
flag. That flag only exists after `<shae-ent>` has been upgraded. `src/shae-prop.ts` guards against
this by gating its own registration:

```ts
customElements.whenDefined(SHAE_ENT).then(() => customElements.define(SHAE_PROP, ShaePropElement));
```

This is a real invariant of the public API — and it has no test. It also means a consumer who
imports only `@spearwolf/shadow-objects/shae-prop.js` gets an element that never upgrades. Neither
the guarantee nor its failure mode is verified.

Uncovered: definition-before-markup vs. markup-before-definition; a `<shae-ent>` inserted into a
shadow root whose host is itself not yet upgraded; markup injected via `innerHTML` before
`customElements.define` has run; `<shae-prop>` upgrading before its `<shae-ent>` host.

### 2.3 Asynchronous events — **one direction, one message**

Covered: `dispatchMessageToView` once, at shadow-object creation (`helloFromFoo`), plus the
structured result in `auto-destruct`.

Not covered:

- A message triggered *later*, by a property change — the `fooEcho` path that already exists in the
  fixture.
- View → shadow objects: `dispatchShadowObjectsEvent` over a real worker. Only tested against the
  local env (`shadow-objects-testing/send-events.test.js`).
- `traverseChildren = true` across the worker boundary.
- `forward-custom-events` against a real worker — currently local-env only.
- `contextCreated` / `contextLost` as DOM CustomEvents (see §1.2).
- The `auto-sync` attribute in all its forms: `frame`, `<n>fps`, a plain millisecond number,
  `no`/`off`, and switching the value at runtime. That is ~45 lines of branching in
  `ShaeWorkerElement.#createAutoSyncEffect` with zero coverage.
- `<shae-worker src="…">` changed after `start()` — the re-import path
  (`ShaeWorkerElement.ts:173-179`).
- Worker termination or crash mid-sync; pending `applyChangeTrail` promises must reject.
- Transferables over a real worker (only in-process today).

### 2.4 Multiple environments and contexts in parallel — **the largest gap**

This is the case you asked about, and it is the one the current suite comes closest to setting up
without ever checking. `pages/shae-worker.html` already runs a remote environment in the global
namespace alongside a local one in `local`. The assertions stop at "both reached `ready()`".

What is never verified:

**Isolation.** A property set in namespace A must not appear in namespace B. Two entities with the
same token in different namespaces must be driven by different kernels.

**Cross-namespace nesting.** `ShaeEntElement.#onRequestParent` and `#onReRequestParent` both bail
out on `requester.ns !== this.ns` (`ShaeEntElement.ts:377`, `:390`), and `#setParent` additionally
drops a parent whose context differs (`ShaeEntElement.ts:341`). So a `<shae-ent ns="worker0">`
nested inside a global-namespace `<shae-ent>` must become a *root* entity in `worker0`, not a
child. `pages/bundle.html` builds exactly this shape (`seBase4` inside `seBase1`) and asserts
nothing about it.

**Namespace switching at runtime.** Changing the `ns` attribute moves the view component to a
different context; the teardown path explicitly syncs the *old* environment
(`ShaeEntElement.ts:86-92`). Untested.

**Shared sync scheduling.** `ShaeElement` keeps one module-global `SyncNamespaces` set and a single
`nextSyncIsScheduled` flag for *all* namespaces, draining them in one microtask. Whether two
environments both get their sync in the same drain is untested.

**Namespace collisions.** `ShadowEnv`'s view setter warns on "overwrite a namespace already in use"
(`ShadowEnv.ts:92-102`) when a second environment claims a namespace. The resulting behaviour —
which environment wins, what happens to the entities of the first — is unspecified by any test.

**Independent teardown.** `ComponentContext.dispose()` and `ShadowEnv.destroy()` on one of two live
environments; the other must keep running. Both contracts have unit tests, neither has an E2E test
with a second environment present.

---

## 3. Proposed test cases

Grouped by the page that should host them. Priority: **P1** = critical path or explicitly
requested, **P2** = important, **P3** = worthwhile once the rest is in place.

### 3.1 New page `pages/multi-env.html` — parallel environments

Setup: three environments side by side — `<shae-worker ns="alpha" src="/mod-multi-a.js">` (remote),
`<shae-worker ns="beta" src="/mod-multi-b.js">` (remote), `<shae-worker ns="gamma" local>`
(local, module imported programmatically). Each module defines a shadow object that echoes its own
namespace back to the view, so a message arriving in the wrong context is immediately visible.

| ID | Prio | Case |
|---|---|---|
| MULTI-1 | P1 | All three environments reach `ready()` concurrently; each `ShadowEnv.get(ns)` returns a distinct instance. |
| MULTI-2 | P1 | `<shae-prop>` change in `alpha` reaches the `alpha` shadow object with the new value. |
| MULTI-3 | P1 | The same property change is **not** observed by the shadow objects in `beta` or `gamma`. |
| MULTI-4 | P1 | Simultaneous property changes in all three namespaces in one tick: every environment receives exactly its own value, no cross-talk. |
| MULTI-5 | P1 | `dispatchMessageToView` from the `beta` worker is delivered to the `beta` view component only; `alpha`/`gamma` listeners are not invoked. |
| MULTI-6 | P1 | Two shadow objects registered under the **same token** in `alpha` and `beta` receive different property values and stay independent. |
| MULTI-7 | P1 | `<shae-ent ns="beta">` nested inside `<shae-ent ns="alpha">` becomes a root entity in `beta` — it has no parent, and the `alpha` entity has no child. (The `bundle.html` shape, finally asserted.) |
| MULTI-8 | P2 | **Implemented** — `multi-env-ns-switch-*` on `pages/multi-env.html`. Changing `ns` on a live `<shae-ent>` from `alpha` to `beta` and back: the entity leaves the `alpha` context, arrives in `beta` as a root, the DOM view and the entity tree agree on both sides, and the way back restores the parent link. **Still open:** properties do not survive the move — the entity arrives in the new environment as a bare token. That belongs to the property lifecycle and is tracked with it. |
| MULTI-9 | P2 | A round-trip in `alpha` (property in → message out) while `beta` is mid-sync: both complete, neither observes the other's change trail. |
| MULTI-10 | P2 | `ShadowEnv.destroy()` on `beta`: `alpha` and `gamma` stay ready and still round-trip. Pending `beta` promises reject with `ShadowEnvDestroyedError`. |
| MULTI-11 | P2 | `ComponentContext.dispose()` on `gamma` releases the namespace; a fresh `ComponentContext.get('gamma')` returns a new, usable context while `alpha`/`beta` are untouched. |
| MULTI-12 | P2 | Mixed local + remote: a local env and a remote env driven by the same fixture module produce identical observable results (same messages, same property values). |
| MULTI-13 | P3 | Two `<shae-worker>` elements claiming the same `ns`: the documented winner keeps the namespace, and the behaviour is asserted rather than left to a console warning. |
| MULTI-14 | P3 | Removing the `<shae-worker>` of `alpha` from the DOM tears down only `alpha`; `<shae-ent ns="alpha">` elements survive as inert and re-attach when a new worker for `alpha` is inserted. |

### 3.2 New page `pages/dynamic-dom.html` — runtime DOM mutations

Setup: one remote environment, a fixture module that reports entity creation, destruction, parent
changes and property values back to the view.

| ID | Prio | Case |
|---|---|---|
| DOM-1 | P1 | `createElement('shae-ent')` + `appendChild` after `ready()` creates the entity in the worker with the right token. |
| DOM-2 | P1 | Appending a subtree built with `innerHTML` in one step: all entities arrive, and every parent is created before its child. |
| DOM-3 | P1 | Moving a live `<shae-ent>` to a different parent element re-parents the entity in the worker; it is not destroyed and recreated, and its properties survive. |
| DOM-4 | P1 | `element.remove()` destroys the entity in the worker. |
| DOM-5 | P1 | Removing a subtree root with `autoDestructionOnParentRemoval` set on children: flagged children cascade, unflagged ones are promoted to root. (The `auto-destruct` scenario, driven from the DOM instead of the kernel API.) |
| DOM-6 | P2 | Adding a `<shae-prop>` to a live `<shae-ent>` sets the property; removing it removes the property. |
| DOM-7 | P2 | Moving a `<shae-prop>` from one `<shae-ent>` to another within the same tick: the property leaves the first entity and lands on the second, and the deferred `#disconnectFromEntNode` does not drop it. |
| DOM-8 | P2 | Remove and re-append the same `<shae-ent>` within one microtask: assert the documented outcome explicitly (this is the `#deferDestroy` contract). |
| DOM-9 | P2 | Inserting a child `<shae-ent>` *before* its parent element is connected: once the parent connects, the child re-requests and finds it. |
| DOM-10 | P2 | Reordering siblings via the `order` property after insertion produces the expected child order in the kernel. |
| DOM-11 | P3 | Inserting 200 entities in one tick produces exactly 200 entities and a single sync cycle. |
| DOM-12 | P3 | Inserting a `<shae-ent>` into a dynamically attached shadow root with slot projection resolves the parent across the shadow boundary. |

### 3.3 New page `pages/upgrade-timing.html` — custom element upgrade order

This page must control script loading explicitly; several cases need markup in the DOM *before*
any definition happens.

| ID | Prio | Case |
|---|---|---|
| UPG-1 | P1 | Markup parsed before `customElements.define`: after upgrade, every `<shae-ent>` has a `viewComponent`, the tree shape is correct, and one sync delivers all entities. |
| UPG-2 | P1 | `<shae-prop>` values written before the definition are applied after upgrade — no property is lost. |
| UPG-3 | P1 | `shae-prop` is not defined until `shae-ent` is, and a `<shae-prop>` upgraded in that order finds its host. This asserts the guarantee in `src/shae-prop.ts`. |
| UPG-4 | P2 | `innerHTML` assigned before the definitions load: same result as parser-generated markup. |
| UPG-5 | P2 | Definitions loaded first, markup inserted afterwards: identical observable outcome to UPG-1. |
| UPG-6 | P2 | `<shae-worker>` upgraded after its `<shae-ent>` children: the entities are still delivered once the environment comes up (`reCreateChanges` path). |
| UPG-7 | P2 | **Implemented** — `upgrade-late-*` on `pages/upgrade-timing.html`. A `<shae-ent>` inside a custom element whose own definition arrives later: parent resolution survives the host upgrade, both for a subclass of `ShaeEntElement` and for a wrapper projecting through a `<slot>`. |
| UPG-8 | P3 | Importing only `@spearwolf/shadow-objects/shae-prop.js` — pin down whether this is supported or must fail loudly, then assert it. |

### 3.4 New page `pages/async-events.html` — message round-trips and sync modes

| ID | Prio | Case |
|---|---|---|
| ASYNC-1 | P1 | Property change → shadow object reacts → `dispatchMessageToView` arrives at the view with the new value. (Activates the existing `fooEcho` path.) |
| ASYNC-2 | P1 | View → shadow object: `dispatchShadowObjectsEvent` over a real worker reaches the shadow object. |
| ASYNC-3 | P1 | `contextCreated` and `contextLost` CustomEvents fire on `<shae-worker>` in the right order. (Fixes §1.2 — the checks already exist, they just need registering.) |
| ASYNC-4 | P2 | `traverseChildren: true` delivers a message to a whole entity subtree across the worker boundary. |
| ASYNC-5 | P2 | `forward-custom-events` re-emits shadow object events as DOM CustomEvents from `<shae-ent>`, over a real worker; the comma-separated filter form only lets listed types through. |
| ASYNC-6 | P2 | `auto-sync="no"` suppresses automatic syncs; an explicit `syncWait()` still delivers. |
| ASYNC-7 | P2 | `auto-sync="10fps"` produces syncs at roughly the requested rate; switching the attribute at runtime changes the rate. |
| ASYNC-8 | P2 | `<shae-worker src="…">` changed after `start()` re-imports and the new module's tokens resolve. |
| ASYNC-9 | P2 | Rapid-fire property changes (100 in one tick) coalesce into one change trail carrying the final value. |
| ASYNC-10 | P3 | Worker terminated mid-sync: pending promises reject rather than hang, and `contextLost` fires. |
| ASYNC-11 | P3 | `importScript` with a URL that 404s rejects with a usable error and leaves the environment intact. |
| ASYNC-12 | P3 | Transferables (an `ArrayBuffer`) survive the round-trip to a real worker and are detached on the view side. |

### 3.5 Rework `pages/bundle.html` — make the fixture pay for itself

The tree is already there. It only needs assertions.

| ID | Prio | Case |
|---|---|---|
| BUNDLE-1 | P1 | The five-entity tree is delivered with the correct parent-child structure. |
| BUNDLE-2 | P1 | `<shae-prop type="boolean" value="no">` arrives as `false`, `type="number[]" value="1 2 3"` as `[1, 2, 3]`. |
| BUNDLE-3 | P2 | `globalThis.SHADOW_ENTS_BUNDLE_LOADED` is `true`, and the inlined worker starts without a separate network request for the worker file. |
| BUNDLE-4 | P2 | A functional round-trip through the *bundled* build, not just element definition — the bundle is a distinct artifact and currently only smoke-tested. |

### 3.6 Harness fixes

| ID | Prio | Case |
|---|---|---|
| H-FIX-1 | P1 | Single `lookupTests` helper; remove the two inline copies (H-1). |
| H-FIX-2 | P1 | Assert on `data-testoutput` when a case fails so the reason reaches the report (H-2). |
| H-FIX-3 | P1 | Each page writes a `data-testsuite="done"` marker when its script finishes; every spec asserts it first, so a setup crash fails fast with a clear cause (H-3). |
| H-FIX-4 | P2 | `testAsyncAction` rejects with a real `Error` carrying the test name and timeout (H-4). |
| H-FIX-5 | P2 | Fail any spec on `pageerror` or `console.error`, with an explicit opt-out for cases that expect one (H-5). |
| H-FIX-6 | P2 | `await` the two fire-and-forget calls in `src/shae-worker.js` (H-6). |
| H-FIX-7 | P3 | Register the two orphaned `contextCreated` ids in `shae-worker.spec.ts` — covered by ASYNC-3, listed here because it is a one-line fix available immediately (§1.2). |
| H-FIX-8 | P3 | Enable the `webkit` project, or record why it stays off (H-7). |

---

## 4. Suggested order

1. **H-FIX-1 … H-FIX-3 and H-FIX-7.** Cheap, and every case below reports better because of them.
2. **`multi-env.html`, MULTI-1 … MULTI-7.** The explicitly requested scenario and the largest gap.
3. **`dynamic-dom.html`, DOM-1 … DOM-5.** The mutation paths that currently have no worker-side
   coverage anywhere in the repo.
4. **`upgrade-timing.html`, UPG-1 … UPG-3.** Cheap to write, and UPG-3 pins an invariant the code
   deliberately maintains but never checks.
5. **`async-events.html`, ASYNC-1 … ASYNC-3.** Completes the message round-trip in both directions.
6. **BUNDLE-1 … BUNDLE-2.** Turns existing dead fixture into coverage.
7. Everything marked P2, then P3.

Running this suite in CI is tracked separately in `Backlog.md` (CI gap). Without it, none of the
above protects anything on a pull request.
