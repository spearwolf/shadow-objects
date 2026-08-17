# Shadow Objects Cheat Sheet

## If you remember nothing else, remember this

- Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them.
- The setup function runs once per shadow object, and an entity can carry several. A token change or a `'@propName'` route switch sets up only the shadow objects that arrive and tears down only the ones that leave; the rest keep running untouched. Everything reactive goes inside it.
- `useProperty` reads from the view. `dispatchMessageToView` writes back. Events connect them.
- Local = main thread (webgl/webgpu apps, non-cloneable data, debugging). Remote = web worker (parallel execution). Both are first-class.
- The change trail is batched and clocked, not immediate. Expecting a synchronous pass-through builds race conditions.
- Shadow Objects is the logic layer. React/Vue/Svelte/Html is the render layer. They work together.

---

## The six invariants

1. Structure flows from the view into the environment only, never back.
2. A shadow object never creates or destroys an entity.
3. An entity does not know its shadow objects by name.
4. The view knows no constructors, only tokens.
5. Environments communicate exclusively through the view.
6. What the framework did not set up, the framework does not tear down.

Details in [concepts.md](./concepts.md#5-invariants).

---

## Defining a Shadow Object

```typescript
import type { EntityApi, ShadowObjectCreationAPI } from '@spearwolf/shadow-objects';
// the lifecycle symbols live in the shadow-objects entry, not the main one
import { onCreate, onDestroy } from '@spearwolf/shadow-objects/shadow-objects.js';

// Functional (recommended)
export function MyLogic({ useProperty, createEffect, onDestroy: whenDestroyed }: ShadowObjectCreationAPI) {
  const speed = useProperty('speed');
  createEffect(() => console.log('speed:', speed()));
  whenDestroyed(() => console.log('cleanup'));
}

// Class-based
export class MyOtherLogic {
  constructor({ useProperty, createEffect }: ShadowObjectCreationAPI) {
    const speed = useProperty('speed');
    createEffect(() => console.log('speed:', speed()));
  }
  [onCreate](entity: EntityApi) { /* after attach */ }
  [onDestroy](entity: EntityApi) { /* before destroy */ }
}
```

Register in your module file (the Registry / Component Manifest):

```javascript
export const shadowObjects = {
  define: { 'my-token': MyLogic }
};
```

---

## Creation API Methods

| Method | Signature | Description |
|---|---|---|
| `useProperty` | `(name, options?) => SignalReader<Maybe<T>>` | Reactive read of a view-layer property |
| `useProperties` | `(map) => { [key]: SignalReader<Maybe<T>> }` | Batch property readers; the only one of these without an `options` parameter |
| `useContext` | `(name, options?) => SignalReader<Maybe<T>>` | Read context from nearest ancestor entity |
| `useParentContext` | `(name, options?) => SignalReader<Maybe<T>>` | Read context starting from parent (skip self) |
| `provideContext` | `(name, value?, options?) => Signal<Maybe<T>>` | Provide value to all descendant entities |
| `provideGlobalContext` | `(name, value?, options?) => Signal<Maybe<T>>` | Provide value to all entities everywhere |
| `createSignal` | `(initial) => Signal`, `() => Signal<T \| undefined>`, `(factory, {lazy: true}) => Signal` | Create local reactive state |
| `createMemo` | `(fn) => SignalReader` | Derived/computed value, re-evaluates when deps change |
| `createEffect` | `(fn, options?) => Effect` | Run side effect, re-runs when deps change |
| `createResource` | `(factory, cleanup?) => Signal` | Manage external resources with auto teardown |
| `on` | `(source?, event, cb) => () => void` | Subscribe to an event (auto-cleaned on destroy); returns the unsubscribe function |
| `once` | `(source?, event, cb) => () => void` | Subscribe once, auto-removed after first fire; returns the unsubscribe function |
| `emit` | `(target?, event, ...args) => void` | Emit event on entity (or a target) |
| `onViewEvent` | `(cb) => void` | Shorthand: listen for events from the view layer |
| `dispatchMessageToView` | `(type, data?, transferables?, children?) => void` | Send event to the view layer |
| `onDestroy` | `(fn) => void` | Register cleanup callback |

---

## Reactivity Primitives

```typescript
// Signal: read/write reactive state
const count = createSignal(0);
count.get() // read
count.set(5) // write
count.set(count.value + 1) // update

// Memo: derived value
const doubled = createMemo(() => count.get() * 2);
doubled() // read

// Effect: runs immediately, re-runs when deps change
createEffect(() => {
  console.log('count is', count.get());
});

// Resource: manage external objects that need cleanup
createResource(
  () => {
    const mesh = new Mesh(getGeometry(), getMaterial());
    scene.add(mesh);
    return mesh;
  },
  (mesh) => {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
);
```

---

## Lifecycle Hooks

| Hook | When it fires |
|---|---|
| `constructor` / function body | Once per Shadow Object, when it is attached to an entity. Build your reactive graph here. |
| `[onCreate](entity)` | After the Shadow Object is fully attached to the entity. Class-based only. |
| `[onDestroy](entity)` | When the Shadow Object is about to go away -- which includes, but is not limited to, the entity being destroyed. Class-based only. |
| `onDestroy(fn)` | Same as above but callable from the functional API. |
| `createEffect(fn)` | Immediately on setup, then again whenever any signal it reads changes. |

**The Shadow Object lifecycle is not the entity lifecycle.** An entity carries whatever Shadow Objects its token and its truthy properties currently route to, and that set is re-resolved on every token change and on every property change. A constructor that drops out of the set has its Shadow Object destroyed -- `[onDestroy]` and every `onDestroy(fn)` callback run, and everything the creation API handed out is disposed -- while the entity lives on; a constructor that joins gets a fresh setup run on an entity that has been around for a while. Both directions happen without an entity being created or destroyed.

---

## Entity Context (Provider / Consumer)

> Dependency injection along the entity tree. Not to be confused with `ComponentContext`, which is the View-Layer namespace binding to a Shadow Environment.

```typescript
// Provider: make a value available to all descendants
export function GameRoot({ provideContext, createSignal }) {
  const level = createSignal(1);
  provideContext('currentLevel', level); // pass a signal for reactivity
}

// Consumer: read from nearest ancestor
export function Enemy({ useContext }) {
  const currentLevel = useContext('currentLevel');
  // currentLevel is a signal reader: currentLevel() to read
}

// Skip self, start from parent
export function Middleware({ createMemo, useParentContext, provideContext }) {
  const upstream = useParentContext('theme');
  provideContext('theme', createMemo(() => ({ ...upstream(), accent: 'red' })));
}

// Global (available everywhere, regardless of hierarchy)
provideGlobalContext('appConfig', { debug: true });
```

---

## Event System

```typescript
// Listen to events on the entity (implicit source)
on('player-ready', (data) => { });

// Listen with explicit source
on(entity, 'player-ready', (data) => { });

// Listen once
once('init-complete', () => { });

// Emit on the entity
emit('player-ready', { health: 100 });

// Emit multiple events at once
emit(['score-changed', 'ui-update'], { score: 500 });

// Emit on a specific target
emit(childEntity, 'parent-command', { action: 'move' });

// Receive events from the view layer
onViewEvent((type, data) => {
  if (type === 'click') { /* ... */ }
});

// Send events to the view layer
dispatchMessageToView('login-success', { user: 'Alice' });
// With transferables (avoids clone overhead)
dispatchMessageToView('frame-data', buffer, [buffer]);
// Dispatch to this entity and all its children in the view
dispatchMessageToView('reset', {}, [], true);
```

---

## View Layer Event Wiring

```javascript
// View -> Shadow Environment
const ent = document.querySelector('shae-ent');
ent.viewComponent.dispatchShadowObjectsEvent('submit', { secret: '999' });

// Shadow Environment -> View (via eventize)
import { on } from '@spearwolf/eventize';
on(ent.viewComponent, 'login-success', (data) => console.log(data.user));

// Shadow Environment -> View (via DOM events, requires forward-custom-events)
ent.addEventListener('login-success', (e) => console.log(e.detail.user));
```

---

## Web Component Attributes

### `<shae-worker>`

| Attribute | Values | Description |
|---|---|---|
| `src` | URL string | Path to the Shadow Object Registry module. Required for the declarative approach, not for `start()`. Trimmed; a change at runtime re-imports. |
| `local` | truthy value | Run Kernel on main thread instead of web worker. `local="false"` stays in worker mode — see below |
| `ns` | string | Namespace for the Component Context |
| `auto-sync` | `"frame"`/`"on"`/`"yes"`/`"true"`/`"auto-sync"`, `"60fps"`, `"100"`, `"no"`/`"off"`/`"false"` | Sync frequency. Default and fallback for an empty value: `"frame"`. `Nfps` with N ≤ 0 warns and does not sync; anything unreadable logs an error and switches off |
| `no-structured-clone` | boolean (presence) | Skip data cloning (local only, performance opt); silently without effect when `local` is missing |
| `no-autostart` | truthy value | Do not create the environment on connect, call `start()` yourself. Not observed: read once, at connect |

**Truthy value ≠ presence.** `local`, `no-autostart` and `no-trim` count as set for `on`, `true`,
`yes`, `local`, `1` (case-insensitive) or for the bare attribute — and as unset for everything
else, `="false"` and `="0"` included. Of the boolean-looking attributes, only
`no-structured-clone` asks for presence alone.

### `<shae-ent>`

| Attribute | Values | Description |
|---|---|---|
| `token` | string | Token (Component Tag) matching a Registry entry. Optional; without it the entity carries `#void`. |
| `ns` | string | Connect to a named Component Context. A change at runtime takes the entity **and its properties** into the other environment — see `docs/api-reference.md`, "Entity Hierarchy" |
| `forward-custom-events` | absent, empty/whitespace, or comma-list | Re-dispatch Shadow Object events as DOM CustomEvents. Empty or whitespace-only: every event. A list: only the types it names. Absent, or a list with no entries: nothing. |

An entity takes its parent from its **own** namespace only; a `<shae-ent>` of another namespace in
between is invisible to that binding and does not block it. A `<shae-prop>` binds by the opposite
rule — proximity, no namespace.

### `<shae-prop>`

| Attribute | Values | Description |
|---|---|---|
| `name` | string | Property name to set on the host entity. Trimmed; empty or whitespace-only binds nothing |
| `value` | string | The value (cast according to `type`); `value=""` counts as no value |
| `type` | see below | Type cast for the value attribute; an unknown name is reported and the string passes through |
| `no-trim` | truthy value | Preserve whitespace in string values; `no-trim="false"` still trims. Without it `value="   "` trims down to `''`, and with `type="number"` that is `0` |

The host is the closest entity above the element in the flattened tree — through shadow roots,
along slot projections, across closed boundaries — regardless of its namespace. It is re-decided
whenever the element moves and whenever something above it changes: a tag registered late, a shadow
root attached afterwards, a changed slot assignment, a host that leaves the tree. Moving the
`<slot>` element itself into another entity is the one case that is not followed. A move binds anew
right away; a change above the element takes effect one microtask later. With no entity above it at
all, the property is set nowhere and reported once per element through the `ConsoleLogger` at warn
level.

Removing the element, renaming it, or moving it to another entity clears the property it declared.
A move within a single tick is a move, not a removal — the property travels with the element.

**`type` values for `<shae-prop>`:**

| Type | Result |
|---|---|
| `string`, `text` | Plain string (default) |
| `number` | `Number()` |
| `float` | `parseFloat` |
| `int`, `integer` | `parseInt` (base 10) |
| `hex`, `hexadecimal` | `parseInt` (base 16) |
| `oct`, `octal` | `parseInt` (base 8) |
| `bin`, `binary` | `parseInt` (base 2) |
| `bigint` | `BigInt()` |
| `boolean`, `bool` | `true` / `false` |
| `json` | `JSON.parse` |
| `number[]`, `float[]`, `int[]`, `integer[]` | Split on whitespace only — `"1,2,3"` stays one element |
| `[]`, `string[]`, `text[]`, `hex[]`, `oct[]`, `bin[]`, `bool[]`, etc. | Split on any run of non-word characters (whitespace, commas, …) |
| `float32array`, `float64array` | Typed array, split on whitespace only |
| `int8array`, `uint8array`, `bigint64array`, etc. | Typed array, split on any run of non-word characters |

`boolean`/`bool` — and each element of `bool[]`/`boolean[]` — is `true` only for `on`, `true`,
`yes`, `local` and `1`, case-insensitively. `value="0"` and `value="2"` are both `false`.

Two failures, two channels. A value that does not convert is reported through the `ConsoleLogger`
at **error** level and leaves the property `undefined` -- nothing throws. An unknown **type name**
is reported at **warn** level and the string passes through unconverted; `warn` is gated behind
`ConsoleLogger.sharedConfig.enable`, `error` is not.
Via the `el.value` property, `0`, `false` and `''` are values and reach the entity; only `null` and `undefined` clear it.

---

## Entity API (`entity.*`)

Inside a Shadow Object, `entity` gives you access to the underlying entity instance:

| Property / Method | Type | Description |
|---|---|---|
| `entity.uuid` | `string` | Unique ID, matches the ViewComponent uuid |
| `entity.order` | `number` | Sort order from the view layer |
| `entity.hasParent` | `boolean` | Whether this entity has a parent |
| `entity.parent` | `EntityApi or undefined` | Parent entity reference |
| `entity.children` | `readonly EntityApi[]` | Child entities |
| `entity.kernel` | `Kernel` | The Kernel this entity lives in |
| `entity.propKeys()` | `string[]` | Every key the entity has ever been given, including cleared ones |
| `entity.propEntries()` | `[string, unknown][]` | The same keys with their values; a cleared property reads `undefined` |
| `entity.traverse(cb)` | `void` | Walk entity and all descendants |

```typescript
// Broadcast an event to all descendants
entity.traverse((e) => {
  emit(e, 'frame-update', { deltaTime: 0.016 });
});
```

---

## ViewComponent API (View Layer)

```typescript
import { ViewComponent, ComponentContext } from '@spearwolf/shadow-objects';

const ctx = ComponentContext.get('my-namespace'); // or .get() for default
const vc = new ViewComponent('my-token', { context: ctx, order: 0 });

vc.setProperty('score', 1000);            // returns true when the value changed
vc.setProperty('pos', newPos, (a, b) => a.equals(b)); // custom equality
vc.setProperty('score', undefined);       // same as removeProperty('score')
vc.removeProperty('score');
vc.dispatchShadowObjectsEvent('jump', { force: 5.0 });

vc.addChild(other);        // throws on a cycle or a foreign ComponentContext
vc.removeFromParent();     // promotes to a root component

vc.destroy();
vc.isDestroyed;            // true
vc.setProperty('x', 1);    // ignored, returns false
vc.context = ctx;          // revives the component under the same uuid
```

| After `destroy()` | Behaviour |
|---|---|
| `token`, `order` | Assignment updates the local value, nothing is sent |
| `setProperty`, `removeProperty`, `dispatchShadowObjectsEvent`, `removeFromParent`, `destroy` | Ignored |
| `dispatchEvent` | Own listeners still fire, children are not traversed |
| `addChild`, `parent = …` | Throws an error with `name === 'ViewComponentError'` (the class is not exported) |

Siblings sort by ascending `order`; equal values keep their insertion order.

---

## ShadowEnv Quick Setup

```typescript
import {
  ComponentContext,
  ShadowEnv,
  LocalShadowObjectEnv,   // main thread
  RemoteWorkerEnv         // web worker
} from '@spearwolf/shadow-objects';

const env = new ShadowEnv();
env.view = ComponentContext.get('my-app');
env.envProxy = new LocalShadowObjectEnv(); // or new RemoteWorkerEnv()

await env.ready();

function loop() {
  env.sync();
  requestAnimationFrame(loop);
}
loop();
```

| `ShadowEnv` Event | When |
|---|---|
| `ShadowEnv.ContextCreated` | Environment is ready (view + proxy both connected) |
| `ShadowEnv.ContextLost` | Environment lost connection |
| `ShadowEnv.AfterSync` | After each sync cycle completes, also when the change trail was empty |
| `ShadowEnv.ProxyFailed` | The proxy lost its Shadow Environment; the reason comes with the event |

```typescript
env.destroy();          // idempotent; env.isDestroyed === true
env.sync();             // no-op
await env.syncWait();   // rejects with ShadowEnvDestroyedError
await env.ready();      // rejects with ShadowEnvDestroyedError
```

`destroy()` rejects every `ready()` and `syncWait()` that is still pending instead of leaving it hanging.

```typescript
ctx.clear();     // empty, but reusable under the same namespace
ctx.dispose();   // final: components destroyed, namespace released, ctx.isDisposed === true
ComponentContext.get(ns);                  // a fresh context
new ViewComponent('a', {context: ctx});    // throws ComponentContextDisposedError
```

`clear()` does not destroy the components you still hold — they report `isDestroyed === false` and go deaf. `dispose()` destroys them first.

Tear down in this order: `env.destroy()`, then `ctx.dispose()`.
