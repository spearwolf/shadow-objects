# E2E Test Plan — coverage analysis and proposed test cases

Status: 2026-08-20. Analysis of the Playwright suite in this package, the gaps it leaves, and a
ticket-ready list of test cases to close them.

> **Where the suite stands.** 428 tests across Chromium and Firefox — 214 per project, eleven spec
> files over eleven pages. The harness fixes and the P1 blocks of every group below are in place. One
> framework defect is open, `DEFECT-1` in [`KNOWN-DEFECTS.md`](KNOWN-DEFECTS.md), and
> `create-element.spec.ts` is the only spec that registers `knownFailures` for it.
>
> Still open, all P2/P3: MULTI-9 … MULTI-14, DOM-9 … DOM-12, UPG-6, ASYNC-8 (`src` change after
> `start()`), ASYNC-10 … ASYNC-12 (worker termination, failing `importScript`, transferables),
> SYNC-5 (`reCreateChanges()` after a refused trail), and H-FIX-8 (enable the webkit project).
> DOM-5 is not implementable from the DOM — see the note at the end of `KNOWN-DEFECTS.md`. UPG-3
> and UPG-8 are answered rather than open — see §3.3.

Companion documents: `Backlog.md` §4 (repo root) holds the coverage heuristic across *all* test
layers. This file is E2E-only and goes one level deeper: it names pages, fixtures and assertions.

---

## 1. What exists today

Eleven spec files, 214 registered test cases per project — 428 across Chromium and Firefox. The specs
themselves contain almost no logic: they name a page and a list of ids, and `runPageTests` turns
each id into one Playwright test that asserts `data-testresult="ok"` on the node the page wrote.
All real assertions live in `src/*.js`.

| Spec | Page | Cases | What is actually verified |
|---|---|---|---|
| `dynamic-dom.spec.ts` | `pages/dynamic-dom.html` | 38 | Runtime mutations against a real worker: `appendChild`, a subtree assigned via `innerHTML`, a move, `remove()`, a subtree removal, a `<shae-prop>` added, changed, removed and moved between entities, and a remove-and-re-append inside one microtask (DOM-1 … DOM-4, DOM-6 … DOM-8). |
| `multi-env.spec.ts` | `pages/multi-env.html` | 34 | Three environments side by side (two remote, one local): distinct instances and contexts, the same token in two namespaces, cross-namespace nesting, property isolation, simultaneous changes in one tick, a request answered only in its own namespace, and a `ns` change at runtime and back (MULTI-1 … MULTI-8). |
| `shae-worker.spec.ts` | `pages/shae-worker.html` | 31 | `<shae-worker>` is defined; two workers (remote+autostart, local+no-autostart) report the right `ns`, the right env type, their `contextCreated` event and reach `ready()`; the remote one carries the four timeout attributes and its environment holds itself to them; both workers' kernels are asked for their entity graph and every parent-child relation, slot projection and namespace boundary in the tree is checked against it. |
| `upgrade-timing.spec.ts` | `pages/upgrade-timing.html` | 28 | Markup parsed before the definitions, markup injected before them, elements added after them, and an element whose own definition arrives after the first sync — a `ShaeEntElement` subclass, a wrapper projecting through a `<slot>`, and a `<shae-prop>` following the entity that upgrades between it and its host (UPG-1, UPG-2, UPG-4, UPG-5, UPG-7, UPG-9). |
| `async-events.spec.ts` | `pages/async-events.html` | 23 | `contextCreated` / `contextLost` as DOM CustomEvents, a property change echoed back as a message, `auto-sync` in its forms, a burst of changes coalescing into the final value, `traverseChildren` across the worker boundary, and `forward-custom-events` with and without a filter list (ASYNC-1, ASYNC-3 … ASYNC-7, ASYNC-9). |
| `bundle.spec.ts` | `pages/bundle.html` | 13 | The single-file build: the load flag, the element definitions, the five-entity tree, the cross-namespace child that becomes a root, three property types, and a round-trip through the inlined worker (BUNDLE-1 … BUNDLE-4). |
| `worker-failure.spec.ts` | `pages/worker-failure.html` | 13 | A worker that dies mid-run: `proxyfailed` and `contextlost` as DOM events, the failure reason, the destroyed proxy, a later call rejecting right away, and the recovery through a new proxy that re-creates the surviving entity. |
| `sync-failure.spec.ts` | `pages/sync-failure.html` | 12 | A change trail the worker's kernel refuses: `syncfailed` as a DOM event carrying reason and trail, a rejecting `syncWait()`, no `AfterSync`, no proxy failure, the refused entry going out a second time, and a next cycle that round-trips again (SYNC-1 … SYNC-4, SYNC-6). |
| `auto-destruct.spec.ts` | `pages/auto-destruct.html` | 8 | `autoDestructionOnParentRemoval` cascade vs. promotion-to-root, over a real worker. |
| `create-element.spec.ts` | `pages/create-element.html` | 7 | The markup path upgrades and gets a view component; the four `document.createElement()` cases are registered as `knownFailures` for `DEFECT-1`. |
| `remote-worker-env.spec.ts` | `pages/remote-worker-env.html` | 7 | Programmatic `ShadowEnv` + `RemoteWorkerEnv`: `ready()`, `importScript()`, `isReady`, one `sync()`, one message worker → view. |

Two of the cases per page come from the harness rather than from the page: `runPageTests` always
registers `test suite setup`, and adds `no uncaught or logged errors` unless the page provokes an
error on purpose (`create-element`, `worker-failure` and `sync-failure` do, so they carry only the
first).

`auto-destruct` is the scenario that reports through the kernel rather than the DOM: a fixture
module (`public/mod-auto-destruct.js`) exercises kernel behaviour and reports a structured result
back to the view, which the page then asserts in three separate checks. `dynamic-dom`,
`upgrade-timing`, `multi-env` and `shae-worker` use the same shape for their snapshots.

### 1.1 Fixture code that is loaded but never asserted

One page still sets up more than it checks:

- **`src/remote-worker-env.js:36-37`** creates a child `ViewComponent` `bar` with property `plah`.
  Nothing asserts it arrived.

The `fooEcho` reaction in **`public/mod-hello.js`** is driven by `sync-failure`, which changes `xyz`
on a surviving entity and waits for the echo (`sync-failure-environment-still-syncs`).

### 1.2 Harness weaknesses

| # | Issue | Consequence |
|---|---|---|
| H-7 | `webkit` is commented out in `playwright.config.ts:49-52`. | Safari-specific custom-element and worker semantics are unverified. |

---

## 2. Coverage gaps along the critical axes

### 2.1 Dynamically inserted DOM elements — **covered against a real worker**

`pages/dynamic-dom.html` drives `appendChild`, `innerHTML`, a move, `remove()` and a subtree
removal after `ready()`, and reads the result out of the worker's own kernel rather than off the
change trail. The paths this axis was written for are exercised there:
`ShaeEntElement.connectedCallback` → `#dispatchRequestParent` with a live parent,
`#createParentObserver` / `onParentChanged` (`ShaeEntElement.ts:371-405`),
`ShaePropElement.#disconnectFromEntNode` (`ShaePropElement.ts:381`) with its one-microtask defer
that keeps a move within the same tick from reading as a disconnect, and the remove-and-re-append
flicker (DOM-8).

What is left on this axis:

- `ShaeEntElement.#setParent` and its re-request microtask (`ShaeEntElement.ts:527-536`) — reached
  when a child is inserted before its parent is ready. DOM-9.
- `ShaeWorkerElement.#deferDestroy` (`ShaeWorkerElement.ts:249`) — a reconnect within the
  deferral microtask calls the pending teardown off. A reconnect after that microtask has already
  run finds the environment destroyed for good. The integration suite pins the delay, both sides
  of the reconnect, and the kernel and its entities on either side
  (`shadow-objects-testing/test/worker-element-attributes.test.js`, `shae-worker lifecycle`).
  What is left is the equivalent against a real worker.
- Sibling reordering through `order` (DOM-10), a large batch in one tick (DOM-11), and a shadow root
  attached at runtime whose slot projects an entity (DOM-12).

### 2.2 Element → custom element upgrade timing — **covered, with one order left**

`pages/upgrade-timing.html` controls its script loading explicitly and asserts on the upgrade in
both directions: markup parsed before the definitions, markup injected via `innerHTML` before them,
elements added after them, and a definition that arrives after the first sync has already run.

The host lookup of a `<shae-prop>` is not a `parentElement` walk and does not read a marker flag:
the element sends one bubbling, composed `shaeRequestEntParent` request
(`elements/requestEntAncestor.ts`, from `ShaePropElement.ts:305`), and the only listener that
answers it is `ShaeEntElement.#onRequestParent` (`ShaeEntElement.ts:582-598`), which checks
`requester`, `answer` and `ns`. A host that starts or stops answering sends
`shaeReRequestEntHost`, and the property asks again (`ShaePropElement.ts:372`). Both channels cross
closed shadow boundaries, because the event path is the flattened tree.

The three registration modules are independent — importing
`@spearwolf/shadow-objects/shae-prop.js` on its own yields a working element, and a `<shae-prop>`
upgraded before `<shae-ent>` finds its host once `<shae-ent>` registers. That is documented in
[`guides.md`](../shadow-objects/docs/guides.md#registering-your-own-entity-elements) and guarded by
`shadow-objects-testing/test/prop-element-registration-order.test.js`, which needs a registry that
starts out empty and therefore cannot live on an e2e page that imports both modules together.

Left on this axis: a `<shae-worker>` upgraded after its `<shae-ent>` children (UPG-6, the
`reCreateChanges` path).

### 2.3 Asynchronous events — **both directions, one page left to grow**

`pages/async-events.html` covers the round-trip in both directions against a real worker: a
property change echoed back as a message (ASYNC-1), `dispatchShadowObjectsEvent` reaching the
shadow object (ASYNC-2, also on `multi-env`, `dynamic-dom`, `upgrade-timing` and `shae-worker`),
`traverseChildren` across the worker boundary (ASYNC-4), `forward-custom-events` with and without a
filter list (ASYNC-5), `auto-sync` in its forms (ASYNC-6, ASYNC-7), a burst of changes coalescing
into the final value (ASYNC-9), and `contextCreated` / `contextLost` as DOM CustomEvents (ASYNC-3).

Not covered:

- `<shae-worker src="…">` changed after `start()` — the re-import path
  (`ShaeWorkerElement.ts:97-107`). ASYNC-8.
- Worker termination mid-sync; pending `applyChangeTrail` promises must reject. `worker-failure`
  covers a worker that dies through an uncaught error, not one terminated while a sync is in
  flight. ASYNC-10. A worker shot down mid-sync and a change trail its kernel refuses are two
  different failures: the first takes the environment with it, the second leaves it standing and
  costs nothing but the trail. SYNC-3 is where that line is drawn.
- `importScript` with a URL that 404s (ASYNC-11).
- Transferables over a real worker — only in-process today (ASYNC-12).

### 2.4 Multiple environments and contexts in parallel — **the P1 half is covered**

`pages/multi-env.html` runs three environments side by side — two remote, one local — each with a
fixture module that echoes its own namespace back, so a message arriving in the wrong context shows
up immediately. `pages/shae-worker.html` runs a remote environment in the global namespace next to a
local one in `local` and checks both entity graphs.

Verified there:

**Isolation.** A property set in one namespace does not appear in the others, simultaneous changes
in one tick stay apart, and two entities under the same token in two namespaces are driven by
different kernels (MULTI-2 … MULTI-6).

**Cross-namespace nesting.** `ShaeEntElement.#onRequestParent` and `#onReRequestParent` both bail
out on a namespace mismatch (`ShaeEntElement.ts:594`, `:573`), and `#setParent` additionally drops a
parent whose context differs (`ShaeEntElement.ts:531`). A `<shae-ent ns="beta">` nested inside an
`alpha` entity therefore becomes a *root* in `beta` — asserted on `multi-env` (MULTI-7) and on
`bundle.html` for the `seBase4`-inside-`seBase1` shape it builds.

**Namespace switching at runtime.** Changing the `ns` attribute moves the view component to a
different context, and the element it leaves syncs the *old* environment
(`ShaeEntElement.ts:140-142`). Six `multi-env-ns-switch-*` ids follow an entity out of one
environment and back, properties included (MULTI-8).

What is still never verified:

**Shared sync scheduling.** `ShaeElement` keeps one module-global `SyncNamespaces` set and a single
`nextSyncIsScheduled` flag for *all* namespaces, draining them in one microtask
(`ShaeElement.ts:13-26`). Whether two environments both get their sync in the same drain is
untested — MULTI-9 comes closest.

**Namespace collisions.** `ShadowEnv`'s view setter warns on "overwrite a namespace already in use"
(`ShadowEnv.ts:94-102`) when a second environment claims a namespace. The resulting behaviour —
which environment wins, what happens to the entities of the first — is unspecified by any test
(MULTI-13).

**Independent teardown.** `ComponentContext.dispose()` and `ShadowEnv.destroy()` on one of two live
environments; the other must keep running. Both contracts have unit tests, neither has an E2E test
with a second environment present (MULTI-10, MULTI-11).

---

## 3. Proposed test cases

Grouped by the page that should host them. Priority: **P1** = critical path or explicitly
requested, **P2** = important, **P3** = worthwhile once the rest is in place.

### 3.1 Page `pages/multi-env.html` — parallel environments

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
| MULTI-8 | P2 | **Implemented** — `multi-env-ns-switch-*` on `pages/multi-env.html`. Changing `ns` on a live `<shae-ent>` from `alpha` to `beta` and back: the entity leaves the `alpha` context, arrives in `beta` as a root, the DOM view and the entity tree agree on both sides, and the way back restores the parent link. The properties survive the move (`multi-env-ns-switch-kept-its-properties`). |
| MULTI-9 | P2 | A round-trip in `alpha` (property in → message out) while `beta` is mid-sync: both complete, neither observes the other's change trail. |
| MULTI-10 | P2 | `ShadowEnv.destroy()` on `beta`: `alpha` and `gamma` stay ready and still round-trip. Pending `beta` promises reject with `ShadowEnvDestroyedError`. |
| MULTI-11 | P2 | `ComponentContext.dispose()` on `gamma` releases the namespace; a fresh `ComponentContext.get('gamma')` returns a new, usable context while `alpha`/`beta` are untouched. |
| MULTI-12 | P2 | Mixed local + remote: a local env and a remote env driven by the same fixture module produce identical observable results (same messages, same property values). |
| MULTI-13 | P3 | Two `<shae-worker>` elements claiming the same `ns`: the documented winner keeps the namespace, and the behaviour is asserted rather than left to a console warning. |
| MULTI-14 | P3 | Removing the `<shae-worker>` of `alpha` from the DOM tears down only `alpha`; `<shae-ent ns="alpha">` elements survive as inert and re-attach when a new worker for `alpha` is inserted. |

### 3.2 Page `pages/dynamic-dom.html` — runtime DOM mutations

Setup: one remote environment, a fixture module that reports entity creation, destruction, parent
changes and property values back to the view.

| ID | Prio | Case |
|---|---|---|
| DOM-1 | P1 | `createElement('shae-ent')` + `appendChild` after `ready()` creates the entity in the worker with the right token. |
| DOM-2 | P1 | Appending a subtree built with `innerHTML` in one step: all entities arrive, and every parent is created before its child. |
| DOM-3 | P1 | Moving a live `<shae-ent>` to a different parent element re-parents the entity in the worker; it is not destroyed and recreated, and its properties survive. |
| DOM-4 | P1 | `element.remove()` destroys the entity in the worker. |
| DOM-5 | P1 | Removing a subtree root with `autoDestructionOnParentRemoval` set on children: flagged children cascade, unflagged ones are promoted to root. (The `auto-destruct` scenario, driven from the DOM instead of the kernel API.) |
| DOM-6 | P2 | **Implemented** — `dynamic-dom-added-prop-*`, `dynamic-dom-changed-prop-*`, `dynamic-dom-removed-prop-*` on `pages/dynamic-dom.html`. Adding a `<shae-prop>` to a live `<shae-ent>` sets the property; removing it removes the property. |
| DOM-7 | P2 | **Implemented** — `dynamic-dom-moved-prop-syncs`, `dynamic-dom-moved-prop-left-the-old-entity`, `dynamic-dom-moved-prop-arrived-at-the-new-entity`. Moving a `<shae-prop>` from one `<shae-ent>` to another within the same tick: the property leaves the first entity and lands on the second, and the deferred `#disconnectFromEntNode` does not drop it. |
| DOM-8 | P2 | **Implemented** — `dynamic-dom-flicker-*` on `pages/dynamic-dom.html`. Remove and re-append the same `<shae-ent>` within one microtask: the entity stays live under the same parent, keeps its uuid, and keeps the property its `<shae-prop>` child declared. `<shae-ent>` promises no atomic move — these ids pin down what actually happens. |
| DOM-9 | P2 | Inserting a child `<shae-ent>` *before* its parent element is connected: once the parent connects, the child re-requests and finds it. |
| DOM-10 | P2 | Reordering siblings via the `order` property after insertion produces the expected child order in the kernel. |
| DOM-11 | P3 | Inserting 200 entities in one tick produces exactly 200 entities and a single sync cycle. |
| DOM-12 | P3 | Inserting a `<shae-ent>` into a dynamically attached shadow root with slot projection resolves the parent across the shadow boundary. |

### 3.3 Page `pages/upgrade-timing.html` — custom element upgrade order

This page must control script loading explicitly; several cases need markup in the DOM *before*
any definition happens.

| ID | Prio | Case |
|---|---|---|
| UPG-1 | P1 | Markup parsed before `customElements.define`: after upgrade, every `<shae-ent>` has a `viewComponent`, the tree shape is correct, and one sync delivers all entities. |
| UPG-2 | P1 | `<shae-prop>` values written before the definition are applied after upgrade — no property is lost. |
| UPG-3 | P1 | **Answered, elsewhere** — the registration order is free: `src/shae-prop.ts` defines its element on import, with no wait on `shae-ent`. What has to hold is the other half — a `<shae-prop>` upgraded *before* `<shae-ent>` finds its host once `<shae-ent>` registers — and that is guarded by `shadow-objects-testing/test/prop-element-registration-order.test.js`, which needs an empty Custom Elements registry and cannot run on a page that imports both modules. |
| UPG-4 | P2 | `innerHTML` assigned before the definitions load: same result as parser-generated markup. |
| UPG-5 | P2 | Definitions loaded first, markup inserted afterwards: identical observable outcome to UPG-1. |
| UPG-6 | P2 | `<shae-worker>` upgraded after its `<shae-ent>` children: the entities are still delivered once the environment comes up (`reCreateChanges` path). |
| UPG-7 | P2 | **Implemented** — `upgrade-late-*` on `pages/upgrade-timing.html`. A `<shae-ent>` inside a custom element whose own definition arrives later: parent resolution survives the host upgrade, both for a subclass of `ShaeEntElement` and for a wrapper projecting through a `<slot>`. |
| UPG-8 | P3 | **Answered, elsewhere** — the single import is supported: `shae-prop.js` alone defines a working element. Asserted by `shadow-objects-testing/test/prop-element-registration-order.test.js`, for the same reason as UPG-3. |
| UPG-9 | P2 | **Implemented** — `upgrade-late-prop-found-its-host`, `upgrade-late-prop-reached-the-worker` on `pages/upgrade-timing.html`. A `<shae-prop>` bound to an outer entity follows the custom element that upgrades between the two, and the property arrives on that entity in the worker. |

### 3.4 Page `pages/async-events.html` — message round-trips and sync modes

| ID | Prio | Case |
|---|---|---|
| ASYNC-1 | P1 | Property change → shadow object reacts → `dispatchMessageToView` arrives at the view with the new value. (Activates the existing `fooEcho` path.) |
| ASYNC-2 | P1 | View → shadow object: `dispatchShadowObjectsEvent` over a real worker reaches the shadow object. |
| ASYNC-3 | P1 | `contextCreated` and `contextLost` CustomEvents fire on `<shae-worker>` in the right order. (`async-context-created-event`, `async-context-lost-event`; the two `contextCreated` ids on `shae-worker` cover the same event for two environments.) |
| ASYNC-4 | P2 | `traverseChildren: true` delivers a message to a whole entity subtree across the worker boundary. |
| ASYNC-5 | P2 | `forward-custom-events` re-emits shadow object events as DOM CustomEvents from `<shae-ent>`, over a real worker; the comma-separated filter form only lets listed types through. |
| ASYNC-6 | P2 | `auto-sync="no"` suppresses automatic syncs; an explicit `syncWait()` still delivers. |
| ASYNC-7 | P2 | `auto-sync="10fps"` produces syncs at roughly the requested rate; switching the attribute at runtime changes the rate. |
| ASYNC-8 | P2 | `<shae-worker src="…">` changed after `start()` re-imports and the new module's tokens resolve. |
| ASYNC-9 | P2 | Rapid-fire property changes (100 in one tick) coalesce into one change trail carrying the final value. |
| ASYNC-10 | P3 | Worker terminated mid-sync: pending promises reject rather than hang, and `contextLost` fires. |
| ASYNC-11 | P3 | `importScript` with a URL that 404s rejects with a usable error and leaves the environment intact. |
| ASYNC-12 | P3 | Transferables (an `ArrayBuffer`) survive the round-trip to a real worker and are detached on the view side. |

### 3.5 Page `pages/bundle.html` — the fixture pays for itself

The tree is already there. It only needs assertions.

| ID | Prio | Case |
|---|---|---|
| BUNDLE-1 | P1 | The five-entity tree is delivered with the correct parent-child structure. |
| BUNDLE-2 | P1 | `<shae-prop type="boolean" value="no">` arrives as `false`, `type="number[]" value="1 2 3"` as `[1, 2, 3]`. |
| BUNDLE-3 | P2 | `globalThis.SHADOW_ENTS_BUNDLE_LOADED` is `true`, and the inlined worker starts without a separate network request for the worker file. |
| BUNDLE-4 | P2 | A functional round-trip through the *bundled* build, not just element definition — the bundle is a distinct artifact and currently only smoke-tested. |

### 3.6 Page `pages/sync-failure.html` — a change trail the environment refuses

Setup: one remote environment with `auto-sync="no"`, two fixture modules imported by hand.
`public/mod-hello.js` supplies the surviving entity, `public/mod-refuse.js` a shadow object whose
constructor throws synchronously — the throw leaves `kernel.run()` and comes back as the failure of
the trail that carried the entity. The confirmation is what makes it visible, so the `syncWait()`
that asks for one stands in the same task as the DOM change; a sync the element schedules for
itself carries no serial and would end the cycle as a success.

| ID | Prio | Case |
|---|---|---|
| SYNC-1 | P1 | **Implemented** — `sync-failure-syncwait-rejects`, `sync-failure-dom-event`, `sync-failure-reason-names-the-refusal`, `sync-failure-aftersync-did-not-fire`. A refused trail rejects `syncWait()`, fires `syncfailed` on `<shae-worker>` with the same reason, and produces no `AfterSync`. The reason is a `ChangeTrailRefusedError`; across a worker the wording of the throw travels under `cause` as a string, not as an `Error` instance, and `appliedCount` names how many entries of that trail the kernel applied. |
| SYNC-2 | P1 | **Implemented** — `sync-failure-detail-carries-the-lost-change-trail`. The event carries the trail that was lost, and the create-entities entry for the refused entity is in it, matched by change type and the element's `uuid`. |
| SYNC-3 | P1 | **Implemented** — `sync-failure-is-not-a-proxy-failure`. No `proxyfailed`, no `contextlost`, `isReady` still true, the proxy not destroyed. The line between a refused trail and a dead worker. |
| SYNC-4 | P2 | **Implemented** — `sync-failure-healthy-cycle-first`, `sync-failure-environment-still-syncs`. A round-trip before the refusal and another one after it, with the refused element removed first: neither the proxy nor the worker's kernel is left behind. |
| SYNC-6 | P1 | **Implemented** — `sync-failure-refused-entry-is-sent-again`. The entries the kernel did not apply stay pending and go out again with the next cycle: with the refuser still in the DOM the second `syncWait()` is refused in the same way, and the `syncfailed` event of that second cycle carries the create-entities entry for the same uuid. This is also the cost of the promise — a cause that stays put refuses every following cycle instead of failing once. |
| SYNC-5 | P3 | `reCreateChanges()` as the documented way back after a refused trail. It re-sends the whole view state, so the refused entity has to be gone first or the recovery walks into the same refusal — a case for a fixture that lets the second attempt through, not for this one. |

### 3.7 Harness fixes

| ID | Prio | Case |
|---|---|---|
| H-FIX-1 | P1 | **Implemented** — one `runPageTests` helper (`tests/runPageTests.ts`) for every spec. |
| H-FIX-2 | P1 | **Implemented** — `data-testoutput` is the failure message (`runPageTests.ts:107-109`). |
| H-FIX-3 | P1 | **Implemented** — `runTestSuite` writes the `data-testsuite` marker, and every spec waits for it first, so a setup crash fails as one clear case instead of a locator timeout per id (`runPageTests.ts:62-81`). |
| H-FIX-4 | P2 | **Implemented** — `testAsyncAction` rejects with an `Error` carrying the test name and the deadline (`src/test-helpers/testAsyncAction.js:5`). |
| H-FIX-5 | P2 | **Implemented** — a `no uncaught or logged errors` case per page, with `allowConsoleErrors` for the three pages that provoke one (`runPageTests.ts:113-118`). |
| H-FIX-6 | P2 | **Implemented** — every result in `src/shae-worker.js` is awaited, and `watchCustomEvent` arms the listener separately from the wait so a cold worker start cannot eat the budget. |
| H-FIX-7 | P3 | **Implemented** — both `contextCreated` ids are registered (`tests/shae-worker.spec.ts:9`, `:13`). |
| H-FIX-8 | P3 | Enable the `webkit` project, or record why it stays off (H-7). |

---

## 4. Suggested order for what is left

1. **DOM-9 and DOM-10.** The two mutation paths with a mechanism behind them: a child inserted
   before its parent is ready, and sibling order applied after insertion.
2. **MULTI-10 and MULTI-11.** Independent teardown with a second environment present — the one
   contract that unit tests cannot show, because it is about what keeps running.
3. **UPG-6.** A `<shae-worker>` upgraded after its children, which is the `reCreateChanges` path
   from the element side.
4. **ASYNC-8 and ASYNC-10 … ASYNC-12.** The re-import path, and the three failure and transfer
   cases that need a real worker to mean anything.
5. **MULTI-9, MULTI-12 … MULTI-14, DOM-11, DOM-12, SYNC-5.** The remaining P2/P3 breadth.
6. **H-FIX-8.** Decide the `webkit` project either way and record it.

The suite runs in CI as its own job (`.github/workflows/ci.yml`, `e2e`) against Chromium and
Firefox, and the npm publish is gated on it. The root `test:ci` script still filters this package
out on purpose — it is the fast local loop, not the gate.
