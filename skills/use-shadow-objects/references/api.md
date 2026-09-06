# API reference (condensed)

Everything below is `@spearwolf/shadow-objects` unless a subpath is named.

## ShadowObjectCreationAPI

The first argument of every Shadow Object, function or class. `ShadowObjectCreationAPI<TEvents>`
types `on`/`once`/`emit` against an eventize event map.

### Properties (View → Shadow Object)

```typescript
useProperty<T>(name: string, options?: SignalValueOptions<T> | CompareFunc<T|undefined>): SignalReader<T|undefined>
useProperties<T>(map: {[K in keyof T]: string}): {[K in keyof T]: SignalReader<T[K]|undefined>}
```

`undefined` until the View sets the property. The reader is **cached per name per Shadow Object**;
a second call for the same name returns the first reader and its `compare` is dropped and reported
at `error` level. `useProperties` takes no options. A bare compare function in place of the options
object still works but is reported at `error` level.

### Entity Context (DI along the entity tree)

```typescript
useContext<T>(name: string|symbol, options?): SignalReader<T|undefined>
useParentContext<T>(name: string|symbol, options?): SignalReader<T|undefined>   // skips self
provideContext<T>(name, sourceOrInitialValue?: T|SignalReader<T>, options?: ProvideContextOptions<T>): Signal<T|undefined>
provideGlobalContext<T>(name, sourceOrInitialValue?, options?): Signal<T|undefined>
```

- Both provide functions return the **context signal**; write with `.set()`.
- `ProvideContextOptions` = `{compare?, clearOnDestroy?}`. `clearOnDestroy` defaults `true` and is
  read on **every** call, unlike everything else here.
- Provider caching: a second `provideContext(sameName)` silently returns the first signal and drops
  the value and `compare` handed to it.
- Several providers on one entity: when one leaves, the name goes to the **last-attached provider
  that still holds a non-null value**. Consumers see `undefined` only when the last one is gone.
- Binding follows the tree at any moment: re-parenting an entity re-points its `useContext` readers.
- A consumer effect that throws during the hand-over is reported (context name + entity uuid) and
  costs only its own value — every other reader in that round still gets its value.

### Reactivity (from `@spearwolf/signalize`, bound not re-exported)

```typescript
createSignal<T>(initial: T, params?): Signal<T>
createSignal<T>(initial?: undefined, params?): Signal<T|undefined>
createSignal<T>(factory: () => T, params: {lazy: true}): Signal<T>
createMemo<T>(fn: () => T, options?): SignalReader<T>
createEffect(fn: EffectCallback, options?): Effect
createEffect(fn: EffectCallback, dependencies: SignalLikeDeps, options?): Effect
createResource<T>(factory: () => T|undefined, cleanup?: (r: NonNullable<T>) => unknown): Signal<T|undefined>
```

- `Signal` is **not callable**: `.get()` subscribes, `.value` does not, `.set(v)` writes. `set()`
  never takes an updater function — it would store the function.
- `SignalReader` (from `useProperty`, `useContext`, `createMemo`) **is** callable.
- `createEffect` callback may return a cleanup, run before every re-run and on destroy. With an
  explicit dependency list it goes manual: no run on creation, no auto-tracking; call `effect.run()`
  for an initial pass.
- `createResource` factory takes no arguments and tracks whatever it reads; cleanup gets the
  retiring resource and runs only if the factory returned non-empty. Guard inside the factory.
  A throwing cleanup is reported and does not stop the teardown — what it did not release stays
  unreleased.
- Naming a signalize type yourself (`Signal<number>`) is an import from signalize and needs it
  installed; the runtime values arrive as arguments.

### Events

```typescript
on(eventName, listener): () => void          // also (name, priority, listener), ([names], listener),
                                             // (name, methodName, obj), (listenerObject), (listener), (priority, listener)
on(target, eventName, listener): () => void  // any entity, Shadow Object or plain object
once(...)                                    // same forms, removed after first fire
emit(eventName | eventName[], ...args): void
emit(target, eventName | eventName[], ...args): void
onViewEvent(cb: (type: string, data: unknown) => any): void   // no unsubscribe
dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean): void
```

- The **entity is the bus**. The Kernel attaches every Shadow Object to its entity as an eventize
  listener object, so a method named like an event is called with no subscription — on a class
  instance and on an object a function returns.
- Disambiguation: an object *followed by more arguments* is a target; a name, priority, function or
  lone object addresses the entity. The one form out of reach on the entity is listener-object +
  context-object.
- `emit` is the **one unguarded dispatch**: a listener that throws ends the delivery and the error
  reaches the emitting call. Everything the framework sends of its own accord is guarded.
- `onViewEvent` callbacks are guarded per event: a throw is reported and costs nothing else.
- Typed events: `EventsOf<T>` derives a map from every method of `T` (symbol hooks stay out);
  `ShadowObjectCreationAPI<EventsOf<PlayerLogic>>` checks names and argument tuples at compile time
  only. A narrowed API is still assignable to `ShadowObjectConstructor`.

### Lifecycle

`onDestroy(fn)` — runs when the Shadow Object goes away, exactly once. Two normal paths: its entity
is destroyed, **or** it leaves the constructor set of an entity that lives on (token change, route
switch). Two more: a constructor that registers it and then throws (the instance was never attached
— cope with a half-built object), and an `[onCreate]` that throws (the instance did live and the
regular teardown runs before the error travels to the caller).

A throwing callback is reported through the `ConsoleLogger` and stops nothing — not the remaining
callbacks, not the other Shadow Objects, not the entity teardown.

**Past the teardown the whole creation API is inert**: no subscription, no signal, no context, no
message, no cleanup. Calls return instead of throwing, and are reported at `error` level once per
member. `on()`/`once()` hand back a handle with nothing behind it; signal-shaped members hand back a
destroyed signal. `entity` is the exception — it stays the live `EntityApi`. During the teardown
itself the API is fully open, and what a cleanup registers there is released before it returns.

### `entity` (`EntityApi`)

`uuid`, `order`, `hasParent`, `parent`, `children` (sorted by ascending `order`, insertion order
within equals), `kernel`, `propKeys()`, `propEntries()`, `traverse(cb)` (self first, then
depth-first descendants, each exactly once).

`propKeys()`/`propEntries()` are **methods** and never shrink: a cleared property keeps its key and
reads `undefined`, which is what lets a `useProperty` reader survive the whole lifecycle.
`dispatchMessageToView` is **not** on `entity`.

### Lifecycle symbols (`…/shadow-objects.js`)

`onCreate`, `onDestroy`, `onParentChanged`, `onViewEvent` — all **symbols**. A plain method of that
name is not the hook, is never called, and the Kernel reports the mismatch when it attaches the
object. Interfaces: `OnCreate`, `OnDestroy`, `OnParentChangedEvent`, `OnViewEvent`.

- `[onCreate](entity)` — after full attachment. A throw takes the Shadow Object down again (full
  teardown) and then reaches the caller of `createEntity`/`changeToken`/`changeProperties`/`upgradeEntities`.
- `[onParentChanged](entity)` — sent by `Kernel.setParent()` as its last act. `useParentContext()`
  reads the new parent inline; `useContext()` still names the old value and settles one microtask
  later — read it through an effect. A direct write to `entity.parent`/`entity.parentUuid` sends
  nothing. A throw is reported and reaches neither `setParent()` nor the change trail.

`static displayName = '…'` on the constructor is what the Kernel names the Shadow Object in every
report; set it for minified builds and anonymous constructors.

## Registry (`…/shadow-objects.js`)

Module descriptor keys: `define`, `routes`, `extends`, `initialize({define, kernel, registry})`.
The module's export must be named `shadowObjects`.

- `define`: token → constructor. Defining a token again **appends**; the same constructor twice is
  kept once. The module object accepts plain functions; `registry.define()` and
  `shadowObjects.define()` are typed for classes, though the Kernel builds everything with `new`.
- `routes`: `'token': [tokens]` (the token itself is always included), `'@prop': [...]` (any entity
  with a truthy property of that name), `'token@prop': [...]` (that token in the resolved set **and**
  the truthy property). Recursive, breadth-first, each token once.
- `extends`: a module reached by two chains is imported once; the second is warned about. Submodules
  import first and upgrade nothing on their own.

Class API: `Registry.get(custom?)`, `registry.define()`, `appendRoute(token, routes)`,
`clearRoute(route)`, `findTokensByRoute(route, truthyProps?): Set<string>`,
`findConstructors(route, truthyProps?): ShadowObjectConstructor[] | undefined` (undefined, not an
empty array), `hasToken()`, `hasRoute()` (property routes read `false`), `describe()`,
`tokensOf(construct)`, `Registry.isDefault()`, `clear()`.

Resolutions are memoised per route+truthy-set and dropped on every write. `clear()` on the default
registry removes everything `@ShadowObject` and `shadowObjects.define()` registered anywhere in the
thread.

`@ShadowObject({token, registry?})` returns a **subclass** that goes into the registry;
`instanceof` still holds, the name and an inherited `static displayName` survive, and `eventize(this)`
is applied for you.

## ViewComponent

```typescript
new ViewComponent(token?: string, options?: {parent?, order?, context?, uuid?, autoDestructionOnParentRemoval?})
new ViewComponent(token?: string, parent?: ViewComponent)   // shorthand: default context only
```

`token` falls back to `VoidToken` (`'#void'`). `context` defaults to `ComponentContext.get()`. A
uuid another component of the target context holds is refused with `ComponentUuidInUseError`.
`autoDestructionOnParentRemoval` is immutable (markup: `auto-destruct`).

Methods: `setProperty(name, value, isEqual?): boolean` (`undefined` ≡ `removeProperty`),
`setPropertyWithoutValue(name): boolean` (key present, no value), `removeProperty(name)`,
`addChild(child)` (throws `name === 'ViewComponentError'` — the class is **not** exported — on a
foreign context, a destroyed component, or a cycle), `removeFromParent()`, `isChildOf(parent)`
(shallow), `dispatchEvent(type, data, traverseChildren)` (stays in the View),
`dispatchShadowObjectsEvent(type, data, transferables?)`, `destroy()`.

Receiving: the component is eventized; use eventize's **free functions** — `on(vc, 'name', cb)`,
`off`, `once`, `emit`. `ViewComponent` carries no methods of those names.

Framework-sent events: `ComponentContext.ReRequestParentRoots`, `…ReRequestParent`,
`…ReRequestEntHost`, `ContextLost` (value `'contextLost'`, same string as `ShadowEnv.ContextLost`,
different sender), `ViewComponent.Destroyed` (value `'view-component-destroyed'`).

Context assignment: `vc.context = null` **detaches** (`isDestroyed === true`, entity gone) but keeps
subscriptions; `destroy()` also takes them off. Assigning a *different* context moves the component
**with its properties and equality functions**, its token, order and auto-destruct flag — but not
the parent link. `vc.context = ctx` revives a destroyed component under the same uuid (without its
old subscriptions). A disposed target throws `ComponentContextDisposedError` and changes nothing;
any other rejected join leaves the component with no context at all.

While destroyed: `token`/`order` assignments stay local, property writes and dispatches are ignored,
`addChild`/`parent =` throw.

Sorting: ascending `order`; equal values keep insertion order; negatives sort before `0`.

## ComponentContext

Singleton per namespace — `ComponentContext.get(ns?)`, and `new ComponentContext(ns)` returns the
existing one. Namespaces are strings or symbols; `toNamespace()` trims and maps anything empty to
`GlobalNS`. `getContextsMap()` is the live registry, read-only in practice.

Key methods beyond the ViewComponent-driven ones: `traverseLevelOrderBFS()`, `getChildren()`,
`removeSubTree(uuid)` (no change-trail entries), `broadcastEvent(type, data?)`,
`dispatchMessage(uuid, type, data?, traverseChildren?)`.

Change trails: `buildChangeTrails(commit = true)`, `commitChangeTrail(appliedCount, changeTrail?)`,
`reCreateChanges()`, `hasComponentState(uuid)`, `getComponentState(uuid): ComponentState`
(`{token, parentUuid, order, properties, autoDestructionOnParentRemoval}`). A returned trail is a
snapshot the library never writes to again.

`clear()` destroys the components, keeps the namespace, and takes components back on
`vc.context = ctx`. `dispose()` destroys them, drops the memory, releases the namespace and rejects
every later join. Order: `env.destroy()` then `ctx.dispose()`.

## ShadowEnv

```typescript
const env = new ShadowEnv();
env.view = ComponentContext.get('my-app');
env.envProxy = new LocalShadowObjectEnv();   // or new RemoteWorkerEnv()
await env.ready();
```

Properties: `view`, `envProxy`, `isReady`, `isDestroyed`, `logger` (getter only), `ns$`,
`viewReady`, `proxyReady`. `isReady` does **not** read `viewReady`.

Statics: `ShadowEnv.get(ns)`, `ShadowEnv.inspectAll(request?, signal?, only?)`.

Events (eventize): `ContextCreated` (retained), `ContextLost` (clears the retained one),
`AfterSync(changeTrail)`, `SyncFailed(reason, changeTrail, env)`, `ProxyFailed(reason, env)`. A
throwing listener costs itself; `ProxyFailed` alone hands the error on to the reporting proxy.

Methods: `sync()` (unconfirmed; deferred until ready), `syncWait(): Promise<ChangeTrailType>`,
`inspect(request?, signal?)`, `ready()`, `destroy()` (final; rejects every pending `ready()`/
`syncWait()` with `ShadowEnvDestroyedError`).

`syncWait()` groups every caller that arrives before the trail is built onto the same cycle; a call
after the build belongs to the next one — including a call made inside an `AfterSync`/`SyncFailed`
listener.

### Failure handling

| Reason | Meaning | Answer |
|---|---|---|
| `ChangeTrailRefusedError` (`appliedCount`, `entryCount`, `cause`) | The Kernel applied a prefix. Environment intact | Nothing. The rest is pending and goes out next cycle. Read `cause` — a permanent one refuses every cycle |
| `WorkerTimeoutError` (`messageType`, `timeout`) | No reply in time. Says nothing about progress | Whole trail booked as applied. Rebuild in a **fresh** proxy |
| `WorkerFailedError` / `WorkerDestroyedError` | The environment is gone | Fresh `RemoteWorkerEnv` |
| `WorkerReportedError` (`message`, `name`) | One request the worker turned down; `instanceof` on the original class is impossible across the boundary | Read `name` |

Recovery, three mandatory steps:

```javascript
const proxy = new RemoteWorkerEnv();
env.envProxy = proxy;                              // ShadowEnv calls reCreateChanges() when ready
await env.ready();
await proxy.importScript('/my-shadow-objects.js'); // a fresh worker has an empty Registry
await env.syncWait();                              // sends the rebuilt trail
```

## Environment proxies (`IShadowObjectEnvProxy`)

Seven members: `start()`, `importScript(url)`, `applyChangeTrail(data, waitForConfirmation)`,
`destroy()` (required); `inspect(request, signal?)`, `onMessageToView(event)`, `onProxyFailed(reason)`
(optional). Reject `applyChangeTrail` for a cycle that failed — with a `ChangeTrailRefusedError`
when you can name a prefix, anything else means "all applied".

**`LocalShadowObjectEnv`** — `new LocalShadowObjectEnv(registry?)`. `kernel`, `registry`,
`isLocalEnv`, `disableStructuredClone`. `applyChangeTrail` runs the Kernel **synchronously** inside
the call; the promise settles one microtask later. `importScript(url)` / `importModule(module)`.
`destroy()` clears its Registry unless it is the default one. Note: `@ShadowObject` and
`shadowObjects.define()` without an explicit registry still target the default one.

**`RemoteWorkerEnv`** — `new RemoteWorkerEnv({loadTimeout?, configureTimeout?, changeTrailTimeout?,
inspectTimeout?, destroyTimeout?})`, the only options. Valid range 1…2147483647 ms; anything else is
reported and the constant applies. Defaults: `WorkerLoadTimeout` 60000, `WorkerConfigureTimeout`
60000, `WorkerChangeTrailTimeout` 5000, `WorkerInspectTimeout` 5000, `WorkerDestroyTimeout` 5000.
Properties `isDestroyed`, `workerLoaded` (attach a `catch()` even without awaiting), `timeouts`
(frozen), `logger`. Events `WorkerLoaded`, `WorkerFailed` (`WorkerFailedEvent`: `env`, `type`,
`message`, `reason`, `event`), both retained. A failure is final: everything pending and everything
later rejects at once. `destroy()` makes the worker tear its Kernel down first — the `onDestroy`
callbacks run — then acknowledge; a message sent towards the View during that teardown does **not**
arrive (a local environment does deliver it).

## Kernel (`…/shadow-objects.js`)

`new Kernel(registry?)`. Rarely needed directly — for integrators and debugging.

**Two error contracts.** *Building* paths — `run()`, `createEntity()`, `setParent()`,
`changeToken()`, `changeProperties()`, `upgradeEntities()` — hand the error to the caller and take
their own work back (`run()` wraps it in `ChangeTrailRefusedError`). *Tearing down* paths —
`destroyEntity()`, `Kernel.destroy()`, `[onDestroy]`, creation-scope teardown, entity release —
guard every step, report through `kernel.logger` and carry on. Guarded exceptions on building
paths: `onParentChanged`, View-event delivery, Entity Context hand-over, and the way back of a
failed build.

Methods: `run(event: SyncEvent)`, `getEntity(uuid)` (**throws** for unknown), `findEntity(uuid)`,
`hasEntity(uuid)`, `traverseLevelOrderBFS(reverse?)` (cached, rebuilt on tree changes; a fresh array
per call), `getEntityGraph()` (`{token, entity, props, children, omittedChildren?}`),
`upgradeEntities()`, `findShadowObjects(uuid)`, `noteEntityTreeChange(uuid)`,
`dispatchMessageToView(message)`, `findOrCreateRootContext(name)`, `destroy()`.

`EntityUuidInUseError`: one entity per uuid; the standing entity keeps everything and the uuid frees
after `destroyEntity()`.

A failed `changeToken` is rolled back: the previous token returns, the new Shadow Objects go, the old
ones are rebuilt — but properties written by `changeProperties` stay written, and `upgradeEntities()`
does not roll its first pass back. A ring of entities unreachable from any root is not swept by
`Kernel.destroy()`; its `onDestroy` never runs.

## ConsoleLogger (`…/ConsoleLogger.js`)

Four shared switches plus one per instance, no log level.

| Switch | Default |
|---|---|
| `ConsoleLogger.sharedConfig.enable` | on for hostname exactly `localhost`, `127.0.0.1`, `::1` |
| `ConsoleLogger.sharedConfig.debug` | off |
| `ConsoleLogger.sharedConfig.info`, `.warn` | on |
| instance `enable` | `true`, read once on construction from `ConsoleLogger.<namespace>.enable` |

`logger.error()` is behind **no** switch. Each method asks its own getter, so unguarded calls stay
silent; `isDebug`/`isInfo`/`isWarn` are public for argument lists that cost something to build.

In a browser, `globalThis.ConsoleLogger.debug = true` persists through `localStorage`. A worker gets
its configuration from a JSON object under `ConsoleLogger.RemoteWorkerEnv.workerConfig`, merged on
top of the shared config at worker start; per-namespace keys go in there without the prefix
(`{"MessageRouter.enable": false}`). `setConsoleLoggerStorage()` installs a config store directly.

## FrameLoop

```typescript
import {FrameLoop, type FrameData} from '@spearwolf/shadow-objects';
import {FrameLoop} from '@spearwolf/shadow-objects/FrameLoop.js';   // worker-safe

const unsubscribe = FrameLoop.get().start(target);   // target[FrameLoop.OnFrame](frame)
FrameLoop.get().stop(target);
const own = new FrameLoop(30);                       // own loop; own.maxFps = 0 means uncapped
```

`FrameData` = `{now, lastNow, frameNo, deltaTime}` in seconds; `frameNo` counts from one per run and
`deltaTime === 0` on the first frame. No subscribers, no `requestAnimationFrame`. `FrameLoop.get()`
keeps its instance in **module** state — a second copy of the package on the page drives a second
loop, unlike `ComponentContext` and `ShadowEnv`, which are anchored on `globalThis`
(`__shadowObjectsContexts`, `__shadowEnvs`) and therefore meet across module instances. That global
anchoring also means: namespaces outlive an SSR request, two tenants picking the same namespace
share one environment, and tests must `dispose()` deliberately.
