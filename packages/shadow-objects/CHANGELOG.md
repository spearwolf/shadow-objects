# CHANGELOG

All notable changes to [@spearwolf/shadow-objects](https://github.com/spearwolf/shadow-objects/tree/main/packages/shadow-objects) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Build-system, monorepo, lint/format, and dev-workflow changes that don't affect the shipped package are tracked in the top-level [`CHANGELOG.md`](../../CHANGELOG.md).

## [Unreleased]

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
