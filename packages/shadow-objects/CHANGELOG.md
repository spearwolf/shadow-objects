# CHANGELOG

All notable changes to [@spearwolf/shadow-objects](https://github.com/spearwolf/shadow-objects/tree/main/packages/shadow-objects) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Build-system, monorepo, lint/format, and dev-workflow changes that don't affect the shipped package are tracked in the top-level [`CHANGELOG.md`](../../CHANGELOG.md).

## [Unreleased]

- **Bugfix (view components, VIEW-14):** `ComponentContext` silently lost components whose `order` fell into the first gap of an existing sibling list. The hand-rolled insertion in `#appendToOrdered` had no fallback when its backwards scan ran off the front, so for three or more siblings and `children[0].order <= order < children[1].order` the component was removed from `#rootComponents` but never added to the parent's children. It stayed in `#components`, was unreachable via BFS, never produced a `CreateEntities` change, and made the next `clear()` throw `component-context panic`. Reachable through `new ViewComponent(t, {parent, order})`, `new ViewComponent(t, {order})` and the `order` setter. Replaced with a linear insertion that skips uuids without a view instance instead of dereferencing them.
- **Bugfix (view components, VIEW-15):** `addChild()` accepted cycles. `a.addChild(b); b.addChild(a)` emptied `#rootComponents`, made the whole branch invisible to every change trail, and `a.addChild(a)` sent `removeSubTree()` into unbounded recursion. `addChild()` (and therefore the `parent` setter) now rejects the component itself and any of its ancestors with a `ViewComponentError`; the tree is left untouched when the check fires. `removeSubTree()` additionally tracks visited uuids so a pre-existing cycle cannot overflow the stack.
- **Bugfix (view components, VIEW-16):** `#deleteComponent()` removed a component from `#components` and `#rootComponents` but left its uuid in the parent's children list. `removeSubTree()` on a non-root therefore corrupted that list, and every later `getChildren()` or ordered insertion on it threw a `TypeError`. The uuid is now detached from the parent as well.
- **Bugfix (view components, VIEW-17):** registering a new `ViewComponent` under a uuid that was already in use reset the children list without telling the children. They kept pointing at the previous instance, were no longer root components, and dropped out of the tree. The previous instance's children are now promoted to root components.
- **Bugfix (context recovery, VIEW-18):** `ComponentMemory.setParent()` reset `order` to `0` whenever a `SetParent` change carried no order. Since `ComponentChanges` only includes `order` when it actually changed, re-parenting a component made the memory forget its order, and a `ContextLost` recovery re-created the entity with the wrong one. The order is now only overwritten when the change carries it.
- **Bugfix (sync, VIEW-19):** `ShadowEnv.syncWait()` never settled when the change trail was empty — `AfterSync` was emitted only inside `if (data.length > 0)`, and because the pending promise is cached, every later `syncWait()` returned the same dead promise. `AfterSync` is now emitted on every sync cycle with the (possibly empty) change trail, matching what the docs already promised. `#syncWaitForConfirmation` is reset in that path too, and a sync that finds the environment no longer ready re-arms itself instead of dropping a pending `syncWait()`.
- **Bugfix (sync, VIEW-8):** `ShadowEnv.destroy()` left every pending `ready()` and `syncWait()` caller hanging forever. Both promises are built on `onceAsync()` listeners, and `destroy()` removes all listeners via `off(this)` without settling them. They are now rejected with a new `ShadowEnvDestroyedError`; calling `ready()` or `syncWait()` after destruction rejects immediately, `sync()` becomes a no-op, and a sync scheduled before the destroy no longer runs. Rejecting rather than resolving is deliberate: resolving would report a sync that never happened. `destroy()` is now idempotent and no longer destroys the `envProxy` twice (the explicit call plus the one inside the `envProxy` setter).
- **New (public API):** `ShadowEnvDestroyedError`, the rejection reason for pending `ready()`/`syncWait()` promises when the environment is destroyed.
- **Behavior (view components, VIEW-20):** the destroyed state of a `ViewComponent` is now a defined contract instead of an accident of which call site used `?.`. Previously `order`, `setProperty`, `removeProperty`, `dispatchShadowObjectsEvent` and `dispatchEvent(…, true)` threw a `TypeError` after `destroy()`, while `token`, `removeFromParent` and `destroy` were silent no-ops and `addChild` threw a misleading "from another context". Now every mutation that only concerns the component itself is ignored, `dispatchEvent` still notifies the component's own listeners without traversing children, and `addChild` / `parent = …` throw a `ViewComponentError` that names the destruction. Assigning a `context` still revives the component under the same uuid.
- **New (public API):** `ViewComponent.isDestroyed` reports whether the component is detached from its `ComponentContext`.
- **New (public API):** `ViewComponent.setProperty()` and `ComponentContext.setProperty()` return a `boolean` telling whether the value differed from the last one written to a change trail. Previously the return type was `void` on `ViewComponent` and `false | void` on `ComponentContext`. Backwards-compatible.
- **Bugfix (view components, VIEW-21):** `new ViewComponent(undefined)` left `token` as `undefined` while the change trail correctly reported `#void`, so view state and wire format disagreed. `ComponentChanges.changeToken(undefined)` marked the component dirty but emitted nothing, silently keeping the old token. Both now normalize to `VoidToken`, as the `token` setter always did.
- **Bugfix (view components, VIEW-22):** `setProperty(key, undefined)` and `removeProperty(key)` produced the same `[key, undefined]` entry on the wire but diverged internally — `setProperty` kept the key in the committed property map. A `removeProperty()` after a `setProperty(undefined)` therefore emitted the same change a second time. An explicit `undefined` is now treated as a removal in the committed state as well.
- **Tests:** new unit specs for `ComponentChanges` (45 cases: lifecycle flags, the three trail phases, token/parent/order diffing, property change and removal semantics, events and transferables) and `ComponentMemory` (20 cases), neither of which had a dedicated spec before. `ComponentContext` gained a spec covering ordered insertion, tree invariants, `reCreateChanges` and property semantics; `ViewComponent` gained cases for cycle rejection, the destroyed-state contract and token normalization; `ShadowEnv` gained cases for `syncWait()` and `AfterSync`.
- **Bugfix (types):** `ShadowObjectCreationAPI.createEffect` was typed as `(...args: Parameters<typeof createEffect>)`. `Parameters<>` resolves to the *last* overload of signalize's four, so the type demanded three arguments and rejected the documented `createEffect(callback)` call. Now declared as `typeof createEffect`, which keeps all four overloads. Runtime behavior is unchanged — this only ever affected type checking.
- **Docs (correctness):** `api-reference.md` documented `createEffect` as `(fn: () => void): void`. It returns an `Effect`, accepts an options/dependency argument, and its callback may return a cleanup function; all three are now documented.
- **Docs (correctness):** every example that read a `createSignal()` result by calling it (`count()`) or updated it with a callback (`count.set(c => c + 1)`) was broken. `createSignal` returns a `Signal` object, which is not callable — reads are `count.get()` (subscribing) or `count.value` (not subscribing) — and `set()` stores a function as the value instead of invoking it as an updater. Corrected in `README.md`, `getting-started.md`, `guides.md`, `best-practices.md` and `api-reference.md`; the callable form belongs to `SignalReader` (`useProperty`/`useContext`) and is now spelled out. The hand-rolled `createSignal` test double in `best-practices.md` §testing modelled both wrong behaviors and would have let broken code pass its tests — replaced with one that mirrors the real API.
- **Docs (correctness):** the unit-test example in `best-practices.md` §9 used `jest.fn()` and relied on globals. The repo runs vitest — switched to `vi.fn()` with an explicit `import {expect, test, vi} from 'vitest'`, matching how the specs under `src/` import. Verified by running the example verbatim.
- **Docs (correctness):** the `cheat-sheet.md` API table gave wrong return types for `useContext`/`useParentContext` (`SignalReader`, not the value), `provideContext`/`provideGlobalContext` (`Signal`, not `void`) and `createEffect` (`Effect`, not `void`).
- **Docs (correctness):** `api-reference.md` documented conditional routing as requiring a token to point at a `'@prop'` route. It does not: `'@prop'` routes apply to *every* entity carrying a truthy property of that name, regardless of token. Corrected, and the previously undocumented token-scoped form `'token@prop'` added (both verified against `Registry.spec.ts`).
- **Docs (introduction):** the framework introduction was rewritten around the five domains (View, Environment, Kernel, Composition, Shadow Object). `concepts.md` gained the domain table, a "the View owns structure, not behavior" section, the change-trail/sync-tempo section with the race-condition warning, the four Registry module keys, and a new §5 "Invariants". `guides.md` gained "Composing Behavior with Routes". `cheat-sheet.md` gained the six invariants. `best-practices.md` §6 no longer frames local as a development-only mode and now covers sync tempo in imperative code. The package `README.md` was reduced to an npm landing page (description, install, quick example, domain table, links); `docs/README.md` is now pure navigation.
- **Docs (correctness):** the package `README.md` quick example was not runnable — it used a non-existent `useSignals()` API and called `Registry.define()` as a static method. Replaced with a working `<shae-worker>` + module-`define` example, plus a pointer to `shadowObjects.define()` for runtime registration.
- **Docs (correctness):** `api-reference.md` §2 documented `useContext()`/`useParentContext()` as returning the value and `provideContext()`/`provideGlobalContext()` as returning `void`. They return a `SignalReader` and a `Signal` respectively; signatures corrected and `symbol` keys documented.
- **Docs (terminology):** the two unrelated concepts both called "context" are now disambiguated. Entity Context (`provideContext`/`useContext`, DI along the entity tree) vs. `ComponentContext` (View-Layer namespace binding to a Shadow Environment) — cross-referenced notes in `concepts.md`, `api-reference.md`, and `cheat-sheet.md`; headings renamed to "Entity Context".
- **Docs (links):** fixed three dead links in `getting-started.md` and `concepts.md` still pointing at the pre-flattening `02-guides/` and `03-api/` layout.

## [0.33.0] - 2026-06-19

- Runtime dependency bumped: `@spearwolf/signalize` `^0.29.0` → `^0.30.0`.

## [0.32.0] - 2026-05-13

- Runtime dependencies bumped: `@spearwolf/eventize` `^4.3.1` → `^5.0.0`, `@spearwolf/signalize` `^0.28.0` → `^0.29.0`. The eventize 5.0.0 major bump only changes `emit()`/`emitAsync()` on *non-eventized* targets (they now duck-type into the target's matching method or `.emit()` instead of throwing); all internal `emit()` call-sites in shadow-objects target eventized objects, so the change is transparent. signalize 0.29.0 itself bundles the same eventize bump plus a docs rewrite — no runtime-behavior change for shadow-objects. Verified with `pnpm cbt` (7 turbo tasks, 191 unit/integration + 44 e2e tests).

## [0.31.0] - 2026-05-09

- **Bugfix (entity lifecycle, KERN-3):** `kernel.destroyEntity()` now handles its children explicitly instead of leaving them as orphaned entries inside the kernel. Children with `autoDestructionOnParentRemoval` cascade-destroy together with the parent; all other children are promoted to root entities and remain reachable. This fixes a real leak where children without the auto-destruct flag were left in `kernel.#entities` after the parent was destroyed.
- **Bugfix (entity lifecycle, KERN-2):** `autoDestructionOnParentRemoval` now survives re-parenting. The subscription is rebound to the new parent on every parent change (`Entity.parentUuid` setter / `Kernel.setParent()`), so a re-parented child is no longer destroyed when its *original* parent dies, and is correctly destroyed with its *current* parent.
- **Bugfix (change trail, KERN-1):** the `autoDestructionOnParentRemoval` flag is now carried end-to-end through the change-trail pipeline. `ICreateEntitiesChange` exposes a new optional `autoDestructionOnParentRemoval?: boolean` field, `ComponentChanges.create()` accepts it as a 4th parameter, and `Kernel.run()`/`parse()` forwards it to `createEntity()`. Previously the kernel parameter existed but the trail-based path (worker and local env) never set it, so the feature was unreachable in production.
- **New (public API):** `ViewComponent` accepts an `autoDestructionOnParentRemoval?: boolean` constructor option (also exposed as a read-only getter); the value flows through `ComponentContext.addComponent()` into the change trail, and survives `ContextLost` recovery via `ComponentMemory`. Backwards-compatible (defaults to `false`).
- **Bugfix (entity lifecycle, KERN-5):** `Entity.parentUuid` setter and `Kernel.setParent()` now resolve the new parent UUID *before* detaching from the current parent. A `setParent` call with an unknown UUID throws as before but the entity stays attached to its original parent instead of being orphaned mid-mutation.
- **Bugfix (registry, KERN-6):** `Registry.clear()` now also clears the prop-based (`@`-prefix) routes. Previously they accumulated across `clear()` calls, polluting tests and long-lived registries.
- **DX (creation API, KERN-7):** `useProperty()`, `useContext()`, and `useParentContext()` now warn when a subsequent call passes a different `{compare}` function than the first call. The cached signal is created once with the original options; subsequent calls silently returned the cached reader, which could lead to surprising equality semantics. New behavior: still returns the cached reader, but emits a `console.warn` so the mismatch is visible.
- **Bugfix (BFS cache, KERN-4):** `kernel.destroyEntity()` now invalidates the BFS traversal cache. Previously, programmatic destruction (e.g. through an auto-destroy listener) could leave `traverseLevelOrderBFS()` returning stale UUIDs.
- **Bugfix (`./bundle.js` export):** the published `dist/bundle.js` now actually contains the inlined worker and the shae-element registrations. Previous releases shipped a 790-byte stub that only set `globalThis.SHADOW_ENTS_BUNDLE_LOADED = true` because the source-side `package.json#sideEffects` array referenced the (no-longer-emitted) intermediate `build/src/*` paths and the bundle entry was tree-shaken. Consumers using `import '@spearwolf/shadow-objects/bundle.js'` now get the full bundle (~130 KB).
- **Cleanup:** the published `dist/` no longer contains the leftover `tsconfig.lib.tsbuildinfo` build artifact.
- Runtime dependencies updated: `@spearwolf/eventize@^4.3.1`, `@spearwolf/signalize@^0.28.0`.

## [0.30.2] - 2026-02-26

- **API Update:** When calling the `kernel.createEntity()` function, there is now a new parameter `autoDestructionOnParentRemoval`. This makes it easier to create entities yourself from inside a shadow-object.
  - These entities created _internally_ or _in the dark_ are then cleaned up when the original entity is deleted from the view.
  - Allow access to `entity.kernel` from inside a shadow-object.

## [0.30.1] - 2026-02-04

- update dependencies
  - `@spearwolf/signalize` to 0.27.2

## [0.30.0] - 2026-01-21

- **New Feature:** Added `emit()` helper to `ShadowObjectCreationAPI`.
  - Simplifies emitting events from within shadow-object implementations.
  - Example:
    ```typescript
    emit('my-event', { some: 'data' });
    ```
  - This is equivalent to `emit(entity, 'my-event', { some: 'data' })`.
- **Refactor** Eliminate a potential memory leak when unsubcribing from event subscriptions by calling the returned unsubscribe function from `on()` and `once()` from the `ShadowObjectCreationAPI`.

## [0.29.0] - 2026-01-21

- **New Feature:** Added `forward-custom-events` attribute to `<shae-ent>` custom element.
  - Allows forwarding events emitted by the internal `ViewComponent` (Shadow Object) as standard DOM `CustomEvent`s on the `<shae-ent>` element.
  - Supports forwarding all events or filtering specific event types (e.g., `forward-custom-events="my-event,another-event"`).
  - Event payload is passed as `detail` property of the `CustomEvent`.

## [0.28.0] - 2026-01-20

- **API Update:** `on()` and `once()` in `ShadowObjectCreationAPI` now support an implicit event source.
  - If the first argument is a `string`, `symbol`, or `[]`, the `entity` is automatically used as the event source.
  - Example: `on('eventName', callback)` is equivalent to `on(entity, 'eventName', callback)`.
  - This simplifies the common case of listening to entity events.
- **API Update:** introduce `onViewEvent()` in `ShadowObjectCreationAPI`
  - Simplifies listening to view events dispatched to the entity.
  - Example:
    ```typescript
    onViewEvent((type, data) => {
      if (type === 'my-event') {
        // handle event
      }
    });
    ```
- **Refactor** the `EntityApi` type
- **Refactor** the `useProperties` supports type maps now
- **Documentation:** Comprehensive update to the documentation structure and content.

### ⚠️ Breaking Changes

- The _entity_ events `onCreate`, `onDestroy`, `onParentChanged` and `onViewEvent` changed to _symbols_.
  - Update your event listeners accordingly:
    - import the event symbols from the package:
      ```typescript
      import {onCreate, onDestroy, onParentChanged, onViewEvent} from '@spearwolf/shadow-objects/shadow-objects.js';
      ```
    - _Functional Shadow-Objects:_
      - **Before:** `on(entity, 'onCreate', ...)`
      - **After:** `on(onCreate, ...)`
    - _Class-based Shadow-Objects:_
      - **Before:** `onCreate(entity)`
      - **After:** `[onCreate](entity)`

## [0.27.0] - 2026-01-19

### ⚠️ Breaking Changes

- **API Update:** `dispatchMessageToView` has been moved from the `entity` instance to the `ShadowObjectCreationAPI`.
  - **Before:** `entity.dispatchMessageToView(...)`
  - **After:** `dispatchMessageToView(...)` (available as an argument in the constructor/factory function)
- **Type Definitions:** Removed `dispatchMessageToView` from `EntityApi` interface.

## [0.26.4] - 2026-01-15

- fix return type definitions for `provideContext()` and `provideGlobalContext()`

## [0.26.3] - 2026-01-15

- fix type definitions for `provideContext()`, `provideGlobalContext()`, `useContext()`, `useParentContext()` and `useProperty()` when using the deprecated third argument as `isEqual` callback
- improve type definitions for `createResource()`
  - resource is set to `undefined` after entity destruction

## [0.26.2] - 2026-01-12

- fix the check for when the deprecation warning is shown in `provideContext()` and `provideGlobalContext()`

## [0.26.1] - 2026-01-08

- automatic clearing of the context value is now performed by default _after_ the user-defined `onDestroy()` hooks

## [0.26.0] - 2026-01-08

- `provideContext()` and `provideGlobalContext()` expect as third argument now an option object `{compare?, clearOnDestroy?}`
  - the old way (third argument as `isEqual` callback) will continue to work but is now deprecated!
- both `provide*Context()` features will now clear the context value to _undefined_ on shadow-object destruction by default
  - opt out via `{clearOnDestroy: false}`

## [0.25.0] - 2025-12-31

- use `display: contents` style for all shadow object host elements to avoid layout issues

## [0.24.0] - 2025-11-27

- renamed interface `ShadowObjectParams` to `ShadowObjectCreationAPI` for clarity and consistency with the concept of the _Shadow Object Creation API_
- renamed `useResource()` to `createResource()` in `ShadowObjectCreationAPI` interface

## [0.23.0] - 2025-11-26

- enhance the shadow-objects creation api _aka_ `ShadowObjectParams`
  - added the `useProperties()` function
  - added the `useResource()` function
- added lots of new tests and improved code coverage