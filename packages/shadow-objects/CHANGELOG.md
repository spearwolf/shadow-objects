# CHANGELOG

All notable changes to [@spearwolf/shadow-objects](https://github.com/spearwolf/shadow-objects/tree/main/packages/shadow-objects) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Build-system, monorepo, lint/format, and dev-workflow changes that don't affect the shipped package are tracked in the top-level [`CHANGELOG.md`](../../CHANGELOG.md).

## [Unreleased]

> **Next release: minor.** The package is below `1.0.0`, so the accumulated breaking
> changes below bump the minor position — `0.33.0` → `0.34.0`. Fourteen of them reach existing
> consumers: both runtime dependencies take a major step and carry behaviour changes of their
> own; the emitted declarations carry `| undefined` where a value can be missing, so a
> build with `strictNullChecks` sees new errors; `RemoteWorkerEnv` rejects with
> `WorkerDestroyedError` / `WorkerFailedError` instead of the string `'worker was destroyed'`,
> so a `catch` that compared against that string no longer matches; a `<shae-prop>` value that
> used to vanish now arrives at the Shadow Object — `0`, `false` and `''` through the JS
> property, and a whitespace-only `value` attribute as the empty string the trim leaves behind;
> and an unconvertible `<shae-prop>` value no longer throws, so a `try`/`catch` around an
> assignment to `prop.value` stops firing; and an entity below a custom element that is registered
> late now moves under that element, so an application that read the resulting hierarchy — or the
> Entity Context resolved along it — sees a different shape than before; a `<shae-ent>` that
> changes its `ns` at runtime takes its entity into the other environment and re-binds both its own
> parent and the entities that hung on it, where the hierarchy used to stay as it was; a subclass
> with `connectedMoveCallback` keeps being watched after the first `moveBefore()` instead of only
> until it; an entity left behind when the element it hung on leaves the tree climbs to the next
> ancestor instead of pointing at an element that is gone; an element whose `ns` was written
> before it entered the tree becomes an entity
> instead of staying inert, which adds entities an application never saw arrive; a `<shae-prop>`
> that is removed, renamed or moved to another entity clears the property it declared, where a
> shadow object used to keep observing the value under the old name or on the entity the element
> left; a `<shae-ent>` that changes its `ns` carries its properties into the other environment,
> so the shadow object created there starts from a state it did not see before; and a `<shae-prop>`
> that sits in a shadow root or is projected into a slot binds to the entity the flattened tree
> shows above it, where it used to reach an entity further out or none at all — the property then
> arrives on a different entity than it did before; and a `<shae-prop>` re-binds when the tree
> above it changes, so a property that used to sit on the entity that happened to be closest at
> upgrade time now follows the closest one there is, which again puts it on a different entity than
> before. Everything else in this section is additive or a bugfix.

- **Bugfix (elements):** a `<shae-prop>` finds the same entity a `<shae-ent>` in its place would find. Both elements now send one and the same request, so the host is the closest entity above the element in the flattened tree — through shadow roots, along slot projections, across closed boundaries — regardless of its namespace. The lookup used to walk `parentElement`, a chain that ends at the top element of a shadow root: a `<shae-prop>` inside one never reached its host, and where a slot or a closed boundary was involved it bound to an entity further out instead of the one right above it. A move to a position with no entity above it leaves the element without a host, and the property is taken off the entity it left. The rule is written down in `docs/api-reference.md` under `#### Finding the Host Entity`.
- **Bugfix (elements):** a `<shae-prop>` follows the closest entity above it while it stays where it is. Every way of becoming that entity moves the binding — a custom element whose tag is registered late takes the properties under it along, a shadow root attached afterwards takes over what its slots project, a changed slot assignment is followed, though not a `<slot>` element moved into another entity — and so does every way of ceasing to be one: when the host entity leaves the tree, the property binds to the next entity above it, or to none if there is none. The host used to be resolved when the element connected and never again, which left a property on an entity that was no longer the closest one, or on none at all, without a message about it. A re-binding takes effect one microtask after the change, not in the same step. A `<shae-prop>` with no entity anywhere above it reports that once through the `ConsoleLogger`, gated behind `ConsoleLogger.sharedConfig.enable` like every `warn`.
- **New (elements):** `ReRequestEntHostEventName` — the name of the bubbling, composed event a `<shae-ent>` sends when it starts or stops answering host requests. A `<shae-prop>` listens for it and asks again. The name is exported for anyone listening for the event by hand; the event type `ReRequestEntHostEvent` and the `ShadowEntsEventMap` it sits in stay internal, like the rest of `src/elements/events.ts`.
- **Bugfix (types):** the `HTMLElementEventMap` augmentation in `src/elements/events.ts` carries event names only. It used to declare `addEventListener` and `dispatchEvent` inside the interface, where they are not overloads but keys, which made two method names into event names. The file is not imported anywhere, not re-exported from `index.ts`, and not reachable through any `exports` path, so the reach was the type checking of this package itself.
- **Breaking (elements):** a `shaeRequestEntParent` event built by hand is only answered when its `detail` carries an `answer(entNode)` callback — that callback is how the answer travels now, and an event without it passes every entity untouched. The `detail` also takes an optional `ns`: without it the closest entity answers whatever namespace it is in, with it only an entity of that namespace does. `requestEntAncestor(requester, request)` builds and dispatches such an event and is exported for anyone driving the lookup by hand, together with the `EntAncestorRequest` type.
- **Bugfix (elements):** a `<shae-prop>` clears the property it declared when its binding ends. A property belongs to the pair of host entity and name, and that pair is undone in three ways: the element leaves the tree, its `name` attribute changes, or it moves to another entity. All three used to leave the value standing — a removed element left its property behind, a rename added the new name next to the old one, and a move left the property on both entities. A removal and a re-insertion within the same tick stays a move and keeps the property; removing the whole entity writes no property change, because the entity takes its properties with it. Two elements may declare the same name on the same entity — the property is cleared once the last of them lets go, not the first. A cleared property reads `undefined` on the Shadow Object side; the key stays visible in `propKeys()` and `propEntries()`, so a reader from `useProperty()` survives the whole lifecycle. The lifecycle is written down in `docs/api-reference.md`.
- **Bugfix (view components):** a `ViewComponent` carries its properties into the `ComponentContext` it joins. A namespace change already took the token, the parent, the order and `autoDestructionOnParentRemoval` along; the properties stayed behind, and the entity arrived in the other environment as a bare token. They now travel together with the equality function registered for each key, and land in the same `CreateEntities` change as the rest. The function does not decide about the arrival — the target holds nothing for the key yet, so it would be asked whether the value equals `undefined`, and a function comparing by a field would answer yes and drop the property. The value is written first, the rule applies from the next write on. A component that leaves its context without joining another carries nothing — there is no receiver for it — and events already dispatched are still delivered in the environment they were addressed to.
- **New (public API):** `ComponentContext.transferPropertiesTo(component, target)` — hands the properties a context holds for a component over to the context it has just joined. Called by the `ViewComponent#context` setter; available for anyone driving a context switch by hand.
- **Bugfix (elements):** the environment a `<shae-ent>` leaves on a namespace change is told to sync. The destruction of the entity used to sit in the old context until something unrelated happened to flush it, which for an entity without children could be arbitrarily long — the element itself only syncs the namespace it has arrived in.
- **Bugfix (elements):** a `<shae-ent>` moves under its closest entity ancestor when that ancestor is registered with `customElements.define()` while it already sits in the document. Parent resolution runs on a bubbling, composed event that only listening elements answer, and an element not yet upgraded does not listen — the entity below it stayed attached to the next ancestor up, permanently and without a warning, giving it a wrong Entity Context. Every application that subclasses `ShaeEntElement` or puts entities inside a lazily registered wrapper element is affected. The adjustment covers entities that were roots as well as entities that already had a parent, and it reaches across shadow boundaries. It does not extend to a move that leaves the element connected — see the parent-resolution rules in `docs/api-reference.md`.
- **Bugfix (elements):** `<shae-ent>` re-binds the entity tree when its `ns` changes at runtime. The element leaves the `ComponentContext` of the old namespace and joins the new one, and both directions of the binding follow: its own `entParentNode` is either resolved anew in the new namespace or honestly empty, and the entities that hung on it are told to look for their closest ancestor again — an element that gains a namespace hands them to the next ancestor, one that loses it takes the entities below it under itself. The way back restores the shape the tree had before. `entParentNode` used to keep pointing at an ancestor from the old namespace while the entity tree had already let go, and the entities below stayed where they were.
- **Bugfix (elements):** an entity that stays in the tree while the `<shae-ent>` it hung on leaves it looks for the closest ancestor still answering. This is what happens to everything projected into a slot that the departing element holds: removing that element takes the slot along, and the entity below it never sees a lifecycle callback of its own. The entity tree lets go on its own — the departing `ViewComponent` promotes its children to roots — so the element side used to be left pointing at an element that is no longer in the document, with no way back.
- **Bugfix (elements):** the observation of the parent node follows a `<shae-ent>` to its new position. It watches one specific node, so once the element sits somewhere else the old observation reports a node that is no longer there and every further move goes unseen. This is reachable through a subclass of `ShaeEntElement` that defines `connectedMoveCallback` and is moved with `Element.moveBefore()` — the one path on which the element changes parents without running through `disconnectedCallback`.
- **Bugfix (elements):** a `<shae-ent>` whose `ns` is set before it enters the tree becomes an entity. Writing `ns` — through the attribute or the JS property — on an element that is constructed but not yet connected moves the component context ahead of the element, and the element used to stay in that namespace forever without a `ViewComponent`: no entity, no properties arriving, no sync, and no message about any of it. The same state was reachable by changing `ns` while the element sat outside the tree, which left it holding a destroyed `ViewComponent` after it came back. Both are resolved when the element connects.
- **Bugfix (elements):** `<shae-prop>` keeps `0`, `false` and the empty string assigned through the `value` JS property. `ComponentChanges` reads an explicit `undefined` as removing the property, so those three used to leave the Shadow Object without the property at all instead of with a falsy value. An empty `value` attribute still counts as a missing one and sets nothing; the normalization for that case sits where attributes are read, not in the conversion effect.
- **Behavior (elements):** a whitespace-only `value` attribute is the empty string once trimmed, and is converted from there — `<shae-prop type="number" value="   ">` is `0`. Previously it set no property at all. `no-trim` is unaffected and still keeps the whitespace as the value.
- **Behavior (elements):** a `<shae-prop>` value that cannot be converted into the requested type is reported through the `ConsoleLogger` and sets the property to `undefined`, instead of throwing out of the element. This covers `json`, `bigint`, `bigint64array` and `biguint64array` — the four types whose conversion can fail — and applies to both paths, the `value` attribute and the `value` JS property. Assigning an unconvertible value to `prop.value` therefore no longer raises a `SyntaxError` at the caller. The report goes through `logger.error`, which is not gated behind `ConsoleLogger.sharedConfig.enable`, so a dropped value stays visible outside localhost.
- **Dependencies (breaking):** the declared runtime ranges in the published `package.json` move to `@spearwolf/eventize@^6.0.0` and `@spearwolf/signalize@1.0.0-beta.0`, from the `^5.0.0` / `^0.30.0` that `0.33.0` shipped. The two move as a pair — signalize 1.0 declares `peerDependencies: {"@spearwolf/eventize": "^6.0.0"}`, which is the range widening that lifts the 5.x holdback. Both libraries key their marker slots with realm-wide symbols, so two majors of either in one consumer tree share a slot per object: eventize 6 answers that with a `TypeError` naming both protocols, signalize 1.0 with two graphs that recognise nothing of each other. Verify with `pnpm why @spearwolf/eventize` after upgrading. Behaviour reaching code built on this package:
  - A bulk `off(target)` clears retained events as well as listeners. Inside the framework this only happens while tearing `ShadowEnv`, `SignalsPath` and `Entity` down, so nothing changes here; a consumer that used `off()` as a listener reset and went on relying on a retained value has to `retain()` again.
  - An event name matching only an inherited `Object.prototype` member — `toString`, `valueOf`, `constructor`, `hasOwnProperty` and their kin — no longer dispatches to that inherited function. `ViewComponent.dispatchShadowObjectsEvent()` and `Entity.dispatchViewEvent()` carry consumer-chosen strings, so an event named this way used to reach `Object.prototype` and now reaches nothing.
  - A retained replay that throws no longer throws out of `on()` / `once()`. The failure goes to `console.warn`, the remaining replays of that batch still run, and the call returns its unsubscribe handle. `RemoteWorkerEnv.workerLoaded` is built on a retained `WorkerLoaded`.
  - An unsubscribe handle is single-shot; a second call is inert instead of releasing a sibling's registration.
  - Several signalize teardown and delivery paths collect their failures into an `AggregateError` instead of throwing the first and abandoning the rest. A `catch` doing an `instanceof` check, or reading `.message`, has to unwrap `error.errors` first — a single failure is still rethrown unchanged.
  - Every message signalize authors is prefixed `[signalize] `, and `batch()` / `beQuiet()` / `hibernate()` refuse an `async` callback outright.
- **Types (public API):** `ShadowObjectCreationAPI.createSignal` is declared `typeof createSignal` instead of `(...args: Parameters<typeof createSignal<T>>) => ReturnType<typeof createSignal<T>>` — the same fix, for the same reason, as the `createEffect` entry below. `Parameters<>` and `ReturnType<>` collapse an overload set onto its last member, and signalize 1.0 has three: the `{lazy: true}` factory form became a type error, and `createSignal<T>()` without an initial value claimed `Signal<T>` where the runtime hands out a signal holding `undefined`. Both forms now type-check as what they are.
- **Size:** `dist/bundle.js` grows 139.6 kB → 189.7 kB minified, 42.1 kB → 58.1 kB gzipped. Both dependencies roughly doubled in minified size (eventize 9.5 → 19.2 kB, signalize 14.7 → 30.0 kB) and the bundle carries each of them twice — once directly, once base64-inlined inside the worker. The `dist/` file list and the shape of `dist/package.json` are unchanged; only the two dependency ranges in it move.
- **Types:** the emitted declarations are as narrow as the values behind them. They carry `| undefined` wherever a value can be missing — visible on `ShaeEntElement.componentContext$` / `viewComponent$` / `token$`, `ShaePropElement.entNode$` / `viewComponent$` / `name$` / `type$`, `ShadowEnv.ns$`, the return of `FrameLoop.start()` and of `filterUndefinedProps()` — and `generateUUID()` returns the template literal type of `crypto.randomUUID()` instead of a plain `string`. Consumers compiling with `strictNullChecks` will see new errors where they relied on a value that was never promised — the promise is the fix.
- **Types (public API):** `provideContext()` and `provideGlobalContext()` accept a `SignalReader<T>` as their source, next to the `SignalReader<T | undefined>` they already took. Handing an existing signal to a context is the documented way to keep it in sync, and it is now typeable.
- **Bugfix (worker environments):** `RemoteWorkerEnv.applyChangeTrail()` and `importScript()` reached for a worker that a regular `destroy()` had already released, and threw a `TypeError` out of a method that promises a `Promise`. Both reject with a new `WorkerDestroyedError` now, and a `start()` that is torn down while it waits does the same instead of throwing a bare string.
- **Bugfix (worker environments):** `RemoteWorkerEnv.start()` on a destroyed environment spawned a fresh worker thread. It only noticed the teardown after the load handshake — up to `WorkerLoadTimeout` later — and then skipped the `terminate()`, leaving a thread running that no reference reached any more. A destroyed environment now turns `start()` away with a `WorkerDestroyedError` before it creates anything.
- **New (public API):** `WorkerDestroyedError` — the reason a torn-down `RemoteWorkerEnv` turns away every further request. Kept apart from `WorkerFailedError`, which reports the breakdown of the worker itself.
- **Bugfix (elements):** `<shae-ent>` threw a `TypeError` as soon as it was asked for its parent node while sitting outside any tree: the lookup fell back to reading `host` on a `parentNode` that is `null` in exactly that branch. `getParentNodeForObserver()` now goes through the root node and returns `undefined` when there is no parent left. Its return type narrowed to `Node | undefined`, which subclasses see.
- **Bugfix (elements):** `<shae-ent>` threw while detaching from its parent element when it had never been given a `ViewComponent`. Without one there is nothing to detach; the branch is skipped.
- **Bugfix (elements):** `<shae-worker>.importScript()` rejects with a `ShadowEnvDestroyedError` when the environment is torn down between `ready()` resolving and the import starting, instead of running into a `TypeError`.
- **Bugfix (logging):** `ConsoleLogger.loadConfig()` threw a `TypeError` when one of the four `ConsoleLogger.styles.*` keys was present in `localStorage`: the style values are read without a converter, and the missing converter was called anyway. Since `loadConfig()` runs from the constructor of the first logger, a single style entry set in the devtools took the whole library down at startup.
- **Bugfix (worker environments):** `RemoteWorkerEnv` only listened for `message`. A worker that died on an unhandled error, or sent something the structured clone algorithm could not read back, went unnoticed — `applyChangeTrail()` sat out the full 5s, `importScript()` and `start()` the full 60s, and no consumer had any way of learning that the environment was gone. `error` and `messageerror` are now subscribed before the load handshake begins; a failure terminates the worker, sets `isDestroyed`, and rejects everything pending and everything later with a new `WorkerFailedError`.
- **New (public API):** `RemoteWorkerEnv.WorkerFailed` (retained, payload `WorkerFailedEvent` with `env`, `type`, `message`, `reason`, `event`) and `WorkerFailedError`. `workerLoaded` rejects on a failure instead of hanging forever.
- **New (public API):** `ShadowEnv.ProxyFailed`, carrying the reason; `ContextLost` follows. A new `envProxy` is the way back: once it is ready the view re-creates its changes from the Component Memory, so the next sync restores every entity in the new environment. `IShadowObjectEnvProxy` gained the optional callback `onProxyFailed`, which `ShadowEnv` installs just like `onMessageToView`. `<shae-worker>` mirrors it as a `proxyfailed` DOM `CustomEvent`, alongside the `contextcreated` and `contextlost` it already dispatched.
- **Behavior (view):** a consumer listening for `ShadowEnv.ProxyFailed` can no longer stop the environment from noticing its own loss — `isReady` drops and `ContextLost` fires even when that listener throws.
- **Behavior (worker environments):** a `start()` that fails now terminates the worker it created instead of just dropping the reference.
- **Bugfix (environments):** `LocalShadowObjectEnv.destroy()` emptied the registry it was working with. Unless a registry is handed to the constructor, that is the default one — shared with every other environment in the thread and with every class registered through `@ShadowObject` or `shadowObjects.define()` — so tearing down a single environment stripped the definitions from all of them. `destroy()` now only clears a registry that belongs to that environment alone; passing `Registry.get()` explicitly still counts as the shared one.
- **Bugfix (change trail, VIEW-23):** `ComponentChanges.changeToken()` dropped the pending create-token of a component that had not been flushed yet. `#token` starts at `VoidToken` and only tracks the last token *written to a trail*, so resetting the token of a fresh component (`c.token = undefined`, or any assignment of the void token) cleared `#nextToken` and produced a `CreateEntities` change with no `token` field at all — the kernel then registered the entity with `token: undefined` and never looked up a shadow object for it. A pending create now keeps its token, and `makeCreateEntityChange()` never emits a create without one.
- **Bugfix (view components, VIEW-24):** assigning a `ViewComponent.context` that had been disposed left the component in a state that reported itself as alive. The setter destroyed the component in its old context and *then* let `addComponent()` throw, so `isDestroyed` stayed `false` while every `setProperty` / `removeProperty` / `dispatchShadowObjectsEvent` silently went nowhere. A disposed context is now rejected before the teardown, so the component keeps its current context; any other failure to join leaves the component detached rather than pointing at a context that never took it in.
- **Bugfix (view components, VIEW-25):** `ComponentContext.changeOrder()` guarded against `dispose()` but not against `clear()`. Changing the `order` of a component after `clear()` pushed its uuid back into `#rootComponents` without a view instance, and the next `clear()` threw `component-context panic: #rootComponents is not empty!`. The guard now asks whether the context still holds the component.
- **Bugfix (view components, VIEW-26):** `ComponentContext.removeFromParent()` dereferenced the child entry outside the guard that checks it exists. `destroyComponent()` is public and does not detach the component, so `destroyComponent(c); buildChangeTrails(); c.destroy();` threw a `TypeError`. A child the context no longer holds is now ignored, matching the sibling paths.
- **Bugfix (entity lifecycle, KERN-8):** `Kernel.setParent()` defaulted an absent `order` to `0` and assigned it. A `SetParent` change only carries the order when it actually changed (see VIEW-18), so re-parenting an entity silently reset its order on the kernel side while the view side kept the real value — the two then disagreed, and a `ContextLost` recovery re-created from the wrong state. An absent order now keeps the current one; an explicit one still wins.
- **Bugfix (elements):** `<shae-worker>` produced an unhandled promise rejection whenever it was connected and disconnected within the same task. `connectedCallback()` autostarts via `start()` and the `src` effect calls `importScript()`; both await `ShadowEnv.ready()`, which rejects with a `ShadowEnvDestroyedError` once the environment is destroyed (see VIEW-8), and neither promise was observed. Both call sites now absorb that rejection — a teardown is silent, anything else is logged. `start()` and `importScript()` still reject for callers that do wait for them.
- **Breaking (elements):** `ShaePropElement` no longer carries `isShaeEntElement`. The flag was a copy-paste from `ShaeEntElement` and actively wrong: it let a `<shae-prop>` be mistaken for an entity, so a `<shae-prop>` nested inside another `<shae-prop>` bound to the wrong element. Replaced by `isShaePropElement` — a marker for consumers and tests, not something the host lookup itself reads; the lookup runs on which elements answer the `shaeRequestEntParent` event, not on either flag.
- **Tests:** regression cases for VIEW-23 to VIEW-26 and KERN-8 in the existing specs; two new browser specs in `shadow-objects-testing` (`worker-element-teardown` for the unhandled rejection, `prop-element-host` for the host lookup through a nested `<shae-prop>`). All seven cases were verified to fail against the unfixed sources.
- **Bugfix (view components, VIEW-14):** `ComponentContext` silently lost components whose `order` fell into the first gap of an existing sibling list. The hand-rolled insertion in `#appendToOrdered` had no fallback when its backwards scan ran off the front, so for three or more siblings and `children[0].order <= order < children[1].order` the component was removed from `#rootComponents` but never added to the parent's children. It stayed in `#components`, was unreachable via BFS, never produced a `CreateEntities` change, and made the next `clear()` throw `component-context panic`. Reachable through `new ViewComponent(t, {parent, order})`, `new ViewComponent(t, {order})` and the `order` setter. Replaced with a linear insertion that skips uuids without a view instance instead of dereferencing them.
- **Bugfix (view components, VIEW-15):** `addChild()` accepted cycles. `a.addChild(b); b.addChild(a)` emptied `#rootComponents`, made the whole branch invisible to every change trail, and `a.addChild(a)` sent `removeSubTree()` into unbounded recursion. `addChild()` (and therefore the `parent` setter) now rejects the component itself and any of its ancestors with a `ViewComponentError`; the tree is left untouched when the check fires. `removeSubTree()` additionally tracks visited uuids so a pre-existing cycle cannot overflow the stack.
- **Bugfix (view components, VIEW-16):** `#deleteComponent()` removed a component from `#components` and `#rootComponents` but left its uuid in the parent's children list. `removeSubTree()` on a non-root therefore corrupted that list, and every later `getChildren()` or ordered insertion on it threw a `TypeError`. The uuid is now detached from the parent as well.
- **Bugfix (view components, VIEW-17):** registering a new `ViewComponent` under a uuid that was already in use reset the children list without telling the children. They kept pointing at the previous instance, were no longer root components, and dropped out of the tree. The previous instance's children are now promoted to root components.
- **Bugfix (context recovery, VIEW-18):** `ComponentMemory.setParent()` reset `order` to `0` whenever a `SetParent` change carried no order. Since `ComponentChanges` only includes `order` when it actually changed, re-parenting a component made the memory forget its order, and a `ContextLost` recovery re-created the entity with the wrong one. The order is now only overwritten when the change carries it.
- **Bugfix (sync, VIEW-19):** `ShadowEnv.syncWait()` never settled when the change trail was empty — `AfterSync` was emitted only inside `if (data.length > 0)`, and because the pending promise is cached, every later `syncWait()` returned the same dead promise. `AfterSync` is now emitted on every sync cycle with the (possibly empty) change trail, matching what the docs already promised. `#syncWaitForConfirmation` is reset in that path too, and a sync that finds the environment no longer ready re-arms itself instead of dropping a pending `syncWait()`.
- **New (public API, LOW-4):** `ComponentContext.dispose()` and `ComponentContext.isDisposed`. Until now a context could only be emptied with `clear()`, never released: it stayed in the global `__shadowEntsContexts` map for the lifetime of the page, so namespaces accumulated and a namespace could not be handed back. `dispose()` destroys every `ViewComponent` the context holds (each one then correctly reports `isDestroyed`), drops the component memory and releases the namespace, so `ComponentContext.get(ns)` creates a fresh context afterwards. A disposed context stays inert -- no components, empty change trails -- and rejects any component that tries to join it with a new `ComponentContextDisposedError`, rather than letting it look alive while never reaching an Entity. Idempotent. `clear()` is unchanged and remains the reusable reset.
- **New (public API):** `ComponentContextDisposedError`.
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
- **Packaging:** releases are published from GitHub Actions through npm trusted publishing (OIDC) rather than a long-lived token, so every tarball from this version on carries a provenance attestation linking it to the commit and workflow run that built it. Nothing in the published `dist/` layout changes; details in the [monorepo changelog](../../CHANGELOG.md).
- **Build:** declarations are emitted by TypeScript 7. The published file list is unchanged and the declarations are byte-identical except for `create-worker.d.ts` / `create-worker.bundle.d.ts`, which now read `declare function _default(): Worker` instead of `declare const _default: () => Worker` — the same type in a different spelling, in a module the `exports` map does not expose.

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