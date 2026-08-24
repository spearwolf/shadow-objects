# Shadow Objects API Reference

This is the complete API reference for the Shadow Objects framework. Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them.

**Quick navigation:**

- [Shadow Object Creation API](#shadow-object-creation-api)
  - [Inputs (Properties)](#1-inputs-properties)
  - [Entity Context (Dependency Injection)](#2-entity-context-dependency-injection)
  - [Reactivity Primitives](#3-reactivity-primitives)
  - [Events](#4-events)
  - [View Integration](#5-view-integration)
  - [Lifecycle](#6-lifecycle)
  - [The entity Instance](#7-the-entity-instance)
- [Registry (Component Manifest)](#registry-component-manifest)
  - [Module Definition](#defining-a-module)
  - [define](#define)
  - [routes](#routes)
  - [extends](#extends)
  - [initialize](#initialize)
- [ViewComponent](#viewcomponent)
- [ComponentContext](#componentcontext)
- [ShadowEnv](#shadowenv)
- [Environment Proxies](#environment-proxies)
- [FrameLoop](#frameloop)
- [Web Components](#web-components)
  - [shae-worker](#shae-worker)
  - [shae-ent](#shae-ent)
  - [shae-prop](#shae-prop)
  - [Namespacing and Contexts](#namespacing-and-contexts)
- [Kernel (ECS System Runner)](#kernel-ecs-system-runner)
- [Advanced](#advanced)
  - [Programmatic Registration](#programmatic-registration)
  - [The @ShadowObject Decorator](#the-shadowobject-decorator)
  - [Registry Class](#the-registry-class)
  - [Lifecycle Event Symbols](#lifecycle-event-symbols)
  - [Debugging](#debugging)

---

## Shadow Object Creation API

Whether you define a Shadow Object as a function or a class, the first argument received is the `ShadowObjectCreationAPI` object. This object provides all the methods you need to hook into an Entity's lifecycle, manage reactive state, and communicate with the View Layer.

```typescript
import type { ShadowObjectCreationAPI } from '@spearwolf/shadow-objects/shadow-objects.js';

export function MyLogic(api: ShadowObjectCreationAPI) {
    const { useProperty, createSignal, on } = api;
    // ...
}
```

---

### 1. Inputs (Properties)

These methods let the Shadow Object read data flowing in from the View Layer -- properties set on `<shae-ent>` elements or via `component.setProperty`.

#### `useProperty(name)`

Creates a reactive signal that tracks the value of a specific property on the Entity.

- **Signature:** `useProperty<T>(name: string, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>>`
- **Returns:** A signal reader function (getter). Calling it returns the current value, or `undefined` while the View has not set the property.
- **Reactivity:** When the property changes in the View, any effect or computed value reading this signal will re-run.
- **Options:** `SignalValueOptions<T>` is `{compare?: CompareFunc<T | undefined>}` — the equality check that decides whether a write counts as a change. A bare comparison function in place of the options object still works and logs a deprecation warning.

The reader is cached per name and per Shadow Object: a second `useProperty('title')` hands back the very same reader, and the `compare` of that second call is ignored with a message on the console. Pass options on the first call for a given name.

```typescript
const title = useProperty('title');

createEffect(() => {
    console.log(`The title is now: ${title()}`);
});
```

#### `useProperties(props)`

A convenience helper to create multiple property signals at once.

- **Signature:** `useProperties<T extends Record<string, unknown>>(props: {[K in keyof T]: string}): {[K in keyof T]: SignalReader<Maybe<T[K]>>}`
- **Returns:** An object where keys match the input object, and values are signal readers.
- **Options:** none — every reader is created as if by `useProperty(name)` without options.

```typescript
const { x, y, title } = useProperties<{ x: number; y: number; title: string }>({
    x: "x",
    y: "y",
    title: "title"
});
// x() and y() return number|undefined
// title() returns string|undefined
```

---

### 2. Entity Context (Dependency Injection)

The framework provides a hierarchical dependency injection system. Entities can provide values that flow down to all their descendants in the entity tree.

> **Not to be confused with [`ComponentContext`](#componentcontext).** Entity Context is dependency injection inside the Shadow Environment. `ComponentContext` is the View-Layer object that groups ViewComponents under a namespace. Different layer, different purpose, no interaction.

Both the consumer and the provider side work with signals, so a value that changes propagates to every consumer in the subtree without any manual subscription.

#### `useContext(name, options?)`

Consumes a context value provided by the nearest ancestor Entity that has it.

- **Signature:** `useContext<T>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>>`
- **Returns:** A signal reader. Call it to get the current value: `const scene = useContext<Scene>('three-scene'); scene();`
- **Reactivity:** Reading it inside an effect or memo tracks the dependency automatically. The value is `undefined` until some ancestor provides it.

Like `useProperty`, the reader is cached per name and per Shadow Object, and a `compare` passed on a later call for the same name is ignored with a message on the console.

The binding follows the entity tree at any point in time. An Entity that already holds a context and is then attached to a parent reads from that parent onwards, and one that loses its parent falls back to the root context.

#### `useParentContext(name, options?)`

Like `useContext`, but skips the current Entity and starts searching from the parent. Useful for "middleware" components that want to wrap or extend a context value that shares the same name.

- **Signature:** `useParentContext<T>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>>`
- **Caching:** same as `useContext` — one reader per name and Shadow Object.

#### `provideContext(name, sourceOrInitialValue?, options?)`

Makes a value available to all descendant Entities in the subtree, and to all other Shadow Objects on the same Entity.

- **Signature:** `provideContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?: ProvideContextOptions<T> | CompareFunc<T | undefined>): Signal<Maybe<T>>`
- **Returns:** The context signal. Write to it with `.set(...)` to push a new value to all consumers.
- **Note:** Pass a signal as the source to keep the context in sync with existing reactive state.
- **Options:** `ProvideContextOptions<T>` adds `clearOnDestroy?: boolean` to the `compare` of `SignalValueOptions<T>`. It defaults to `true`: when the Shadow Object goes away, the context is set to `undefined` and every consumer sees that. "Goes away" covers both ways it can happen — the Entity is destroyed, or the Shadow Object leaves the constructor set of an Entity that lives on, as a token change or a route change makes it do.

An Entity may have several Shadow Objects providing the same name, and then the departure of one of them is not the end of the context. Whichever way the Shadow Object goes away, the Entity hands the name over to a provider that is still attached: the one attached last that holds a value (`!= null`). That order is the order in which the providers took the name: attaching one writes its value through, so a provider that attached later has written over an earlier one, and the hand-over falls back on that order rather than inventing a new one. It is not the order of the writes — a provider that writes to its signal after attaching carries the name until the next departure, and the hand-over does not restore that write, because what the Entity keeps on file is its providers and not the sequence in which they wrote. A provider holding nothing is passed over, because it has nothing to say about the name and electing it would clear a name that is still being provided; so is one whose signal has been destroyed, which is what a Shadow Object does when it ends the signal it was handed. `undefined` reaches the consumers once the last provider of the name on that Entity is gone — and it reaches them then even where the one that left had opted out of `clearOnDestroy`, because that option decides what the leaving provider writes, not who owns the name afterwards.

This is the opposite of what two `<shae-prop>` elements declaring one name do (see `<shae-prop>` → "Lifecycle"): there nothing is re-read when one of them goes, and the value of the element that left stays. A provider remains attached to the name and can be asked again; an element writes a value and lets go of it.

The signal is cached per name and per Shadow Object like the readers above, and here the second call is silent about it: it hands back the first signal and drops both the `sourceOrInitialValue` and the `compare` it was given, with nothing on the console. `clearOnDestroy` is the exception — it is read on every call, so one call asking for it is enough to have the context cleared.

#### `provideGlobalContext(name, sourceOrInitialValue?, options?)`

Makes a value available to all Entities in the entire Shadow Environment, regardless of hierarchy position.

- **Signature:** `provideGlobalContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?: ProvideContextOptions<T> | CompareFunc<T | undefined>): Signal<Maybe<T>>`
- **Options:** the same as `provideContext`, `clearOnDestroy` included — and the same caching, one signal per name and Shadow Object, with a second call dropping its value and `compare` just as silently.
- **Departure:** on one Entity exactly as `provideContext` above — every Shadow Object of that Entity feeds the one signal the Entity contributes under this name, and a departure hands the name over to a provider that stays. Across Entities a second level decides: the global value is the first non-empty contribution in the chain, so an Entity whose contribution falls empty lets the next Entity through on its own.

---

### 3. Reactivity Primitives

The framework re-exports reactivity primitives via [@spearwolf/signalize](https://github.com/spearwolf/signalize). These are the building blocks of your logic.

#### `createSignal(initialValue)`

Creates a local reactive state value.

- **Signatures:**
  - `createSignal<T>(initial: T, params?): Signal<T>`
  - `createSignal<T>(initial?: undefined, params?): Signal<T | undefined>` (no initial value)
  - `createSignal<T>(factory: () => T, params: {lazy: true}): Signal<T>` (evaluated on the first read)
- **Returns:** A `Signal` object. It is *not* callable — read it via `count.get()` or `count.value`, write it via `count.set(val)`.

```typescript
const count = createSignal(0);

count.get();                // read -- subscribes the surrounding effect
count.value;                // read without subscribing
count.set(count.value + 1); // write
```

Leave the initial value out and you get a `Signal<T | undefined>`, because that is what the signal actually holds until the first write:

```typescript
const name = createSignal<string>(); // Signal<string | undefined>
name.value;                          // undefined
name.set('spearwolf');
```

`params` keeps its second position here: to pass options without an initial value, write the `undefined` out — `createSignal<string>(undefined, {compare})`.

Need the value computed on demand instead of up front? Pass a factory with `{lazy: true}`. Without that flag, `createSignal<T>(fn)` with an explicit type parameter lands on no overload at all and is rejected; only the inferred form `createSignal(fn)` compiles, and it stores the function itself as the value (`Signal<() => R>`). Either way the flag is required rather than optional:

```typescript
const expensive = createSignal(() => buildLookupTable(), {lazy: true});
// buildLookupTable() has not run yet
expensive.get(); // now it runs, once
```

> **`set()` takes a value, never an updater.** `count.set(c => c + 1)` does not call your function — it stores it as the signal's value. Read the previous value yourself, via `count.value` so the write does not subscribe the surrounding effect to its own signal.

The callable form belongs to `SignalReader`, which is what `useProperty()` and `useContext()` return: `const title = useProperty('title'); title();`

#### `createEffect(callback)`

Runs a side effect immediately, then re-runs it whenever any signal accessed inside it changes.

- **Signatures:**
  - `createEffect(fn: EffectCallback, options?): Effect`
  - `createEffect(fn: EffectCallback, dependencies: SignalLikeDeps, options?): Effect` (shorthand for `{dependencies}`)
  - A dependency may also be a name (`string` or `symbol`) rather than a signal. Such a name is looked up in a group, so those two forms require `attach` — see [@spearwolf/signalize](https://github.com/spearwolf/signalize).
- **Returns:** The `Effect` handle. You rarely need it — the effect is destroyed automatically with the shadow object.

The callback may return a cleanup function, which runs before every re-run and on destruction:

```typescript
createEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
});
```

Passing an explicit dependency list switches the effect to manual mode: it does *not* run on creation, and signals read inside the callback are no longer tracked — only the listed ones trigger a re-run.

```typescript
const effect = createEffect(() => {
    console.log('count is', count.get());
}, [count]);

effect.run(); // opt in to an initial pass
```

#### `createMemo(factory)`

Creates a derived signal (computed value). It only re-evaluates when its dependencies change.

- **Signature:** `createMemo<T>(fn: () => T, options?: CreateMemoOptions): SignalReader<T>`
- **Options:** `attach`, `name`, `lazy`, `priority`, `batchWrites` — see [@spearwolf/signalize](https://github.com/spearwolf/signalize).

```typescript
const doubleCount = createMemo(() => count.get() * 2);
```

#### `createResource(factory, cleanup?)`

Advanced primitive for managing external resources (Three.js objects, subscriptions, GPU buffers) that depend on reactive state. When dependencies in the factory change, the cleanup function is called for the previous resource, then factory is called to create a new one.

- **Signature:** `createResource<T>(factory: () => T | undefined, cleanup?: (resource: NonNullable<T>) => unknown): Signal<Maybe<T>>`
- **Returns:** A `Signal` holding the current resource — `.value` reads it without subscribing, `.get()` subscribes. This is the only way to reach the resource from outside the factory.
- **Arguments:** the factory is called with **none** and tracks whatever signals it reads; the cleanup is called with **one**, the resource it is retiring. While no resource exists the signal holds `undefined`.

```typescript
createResource(() => {
    // Runs when id() changes
    return loadModel(id());
}, (model) => {
    // Runs before the next load, or on destroy
    model.dispose();
});
```

A `cleanup` that throws when the Shadow Object tears down does not stop the rest of the teardown, and the resource signal is set to `undefined` and destroyed either way. What the cleanup did not get to release stays unreleased — a `model.dispose()` that never ran is not made up for elsewhere. The error is reported through the `ConsoleLogger`: the same contract as a throwing callback registered through [`onDestroy(callback)`](#ondestroycallback), which spells out what it covers and what it does not.

---

### 4. Events

Shadow Objects communicate via an event system that mirrors standard DOM events but runs entirely within the Shadow Environment.

#### `on(source, eventName, callback)`

Listens for an event on a source. Subscriptions created via `on()` are automatically removed when the Shadow Object is destroyed.

- **Signatures:**
  - `on(source: object, event: string, callback: () => any): () => void`
  - `on(event: string | symbol | (string|symbol)[], callback: () => any): () => void` (implicitly uses `entity` as source)
  - All other argument forms from the [@spearwolf/eventize](https://github.com/spearwolf/eventize) package are also supported.

The return value is the unsubscribe function. Calling it early is the way to end a subscription before the Shadow Object is destroyed; ignoring it is fine, since the automatic cleanup still applies.

```typescript
const stop = on('player-ready', () => { /* … */ });
stop(); // done listening
```

#### Listening to View Layer Events

To receive events dispatched from the DOM (View Layer), listen to the special `onViewEvent` symbol on the entity.

- **Signature:** `onViewEvent(callback: (type: string, data: unknown) => any): void`
- **Returns:** nothing. Unlike `on()` there is no unsubscribe function — the listener ends with the Shadow Object.

```typescript
import type { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects";
import { onViewEvent as viewEvent } from "@spearwolf/shadow-objects/shadow-objects.js";

function MyBehavior({ on, onViewEvent }: ShadowObjectCreationAPI) {

    // Convenient wrapper on the creation API
    onViewEvent((type, data) => {
        if (type === 'click') {
            console.log('Clicked!', data);
        }
    });

    // Equivalent using on() directly
    on(viewEvent, (type, data) => {
        // ...
    });
}
```

#### `once(source, eventName, callback)`

Same as `on`, including the unsubscribe function it returns, but the listener is removed automatically after the first trigger.

#### `emit(eventNames, ...eventArgs)`

Emits an event on the entity associated with the current shadow object. This is the preferred way to communicate with other Shadow Objects on the same Entity or signal state changes.

- **Signature:** `emit(eventNames: string | symbol | (string|symbol)[], ...eventArgs: any[]): void`

```typescript
export function PlayerLogic({ emit, on }: ShadowObjectCreationAPI) {
    // Emit to other Shadow Objects on this entity
    emit('player-ready', { health: 100 });

    // Emit multiple events at once
    emit(['score-changed', 'ui-update'], { score: 500 });
}

export function GameUI({ on }: ShadowObjectCreationAPI) {
    on('player-ready', (data) => {
        console.log('Player health:', data.health);
    });
}
```

#### `emit(target, eventNames, ...eventArgs)`

Emits an event on a specific target object instead of the current entity.

- **Signature:** `emit(target: EventizedObject, eventNames: string | symbol | (string|symbol)[], ...eventArgs: any[]): void`

The target has to be an eventized object. An `EntityApi` — what `entity.children` and `entity.parent` hand back — is one at runtime, but its type does not carry the eventize markers, so TypeScript turns it down here. Address another Entity through `emit` from `@spearwolf/eventize`, which takes any object:

```typescript
import { emit } from '@spearwolf/eventize';

export function ParentController({ entity }: ShadowObjectCreationAPI) {
    const child = entity.children[0];
    if (child) {
        emit(child, 'parent-command', { action: 'move' });
    }
}
```

**Best practices for events:**

- Use the default form (`emit('name')`) for events that represent the component's own state or actions. This lets parent components or other systems listen on the entity easily.
- Prefer events over direct method calls. Notify about changes rather than commanding other objects.

---

### 5. View Integration

Shadow Objects can push messages directly to the View Layer (the DOM) by dispatching typed events.

#### `dispatchMessageToView(type, data?, transferables?, traverseChildren?)`

Sends a message from the Shadow Environment to the View Layer. It always arrives on the `ViewComponent` as an eventize event. The corresponding `<shae-ent>` DOM element additionally dispatches it as a `CustomEvent`, but only if the element carries `forward-custom-events` and the type passes its allow list — without the attribute no DOM event is dispatched at all.

- **Signature:** `dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean): void`

**Parameters:**

| Parameter | Description |
| :--- | :--- |
| `type` | The event name on the `ViewComponent`, and the name of the `CustomEvent` on the `<shae-ent>` element where `forward-custom-events` is in play. |
| `data` | (Optional) Sent as `event.detail`. |
| `transferables` | (Optional) Array of transferable objects (e.g., `ArrayBuffer`, `MessagePort`) to transfer ownership rather than clone. |
| `traverseChildren` | (Optional) If `true`, the event is dispatched to the view component and all its descendants. Defaults to `false`. |

```typescript
// Shadow Environment
dispatchMessageToView('login-success', { user: 'Alice' });

// View Layer (DOM)
el.addEventListener('login-success', (e) => console.log((e as CustomEvent).detail.user));
```

> `dispatchMessageToView` is a top-level method on the API object. It is not available on the `entity` instance.

---

### 6. Lifecycle

#### `onDestroy(callback)`

Registers a cleanup function that runs when the Shadow Object is destroyed. Critical for preventing memory leaks with non-framework resources like timers, WebSocket connections, or GPU resources.

A Shadow Object reaches that point on two paths: its Entity is destroyed, or it leaves the constructor set of an Entity that lives on — a token change or a route that stops resolving to it. The callback runs on both, exactly once.

A third path reaches the callback without a Shadow Object ever having lived: a constructor that registers `onDestroy` and then throws. The Kernel ends the creation scope of that constructor, so everything registered up to the throw is released — the callback among it. `onCreate` never ran there, and the instance was never attached to its Entity, so a callback written to touch the Shadow Object itself has to cope with a half-built one. Cleanups that only release what the creation API handed out are unaffected.

A fourth reaches it on an instance that did live: a class-side `[onCreate]` hook that throws. Attaching is the last step of a creation, and a Shadow Object that does not get through it is taken down again — the regular teardown, with the `[onDestroy]` hook, every `onDestroy` callback, the `onDestroy` notification other objects listen for, and the removal from the Entity. Only then does the error travel on to whoever asked for the creation: the `createEntity()`, `changeToken()`, `changeProperties()` or `upgradeEntities()` the Shadow Object was being built for.

A callback that throws does not stop what comes after it: the remaining `onDestroy` callbacks of the same Shadow Object still run, the other Shadow Objects on the same Entity still reach their own teardown, and the Entity itself is still destroyed. The error is reported through the `ConsoleLogger` instead of reaching whichever call set the teardown going: the code that destroyed the Entity, or the `changeToken()`, `changeProperties()` or `upgradeEntities()` that re-resolved its constructor set. The class-side `[onDestroy]` hook — see [Lifecycle Hooks](./cheat-sheet.md#lifecycle-hooks) — is held to the same contract on both paths: the Kernel calls it directly, ahead of everything else that teardown does, and a throw is reported and goes no further. So is a listener one Shadow Object puts directly on another's own `onDestroy` notification — `on(otherShadowObject, onDestroy, …)` — which the Kernel sends to each Shadow Object in turn, on a destroyed Entity as much as on one that lives on.

A listener sitting on the Entity itself is held to the same contract, wherever in the delivery it stands — registered through `on(onDestroy, …)` / `once(onDestroy, …)` on the creation API, at whatever priority that call passes through to the Entity, or put on the Entity from the outside ahead of that, `Priority.Max` included, where a child with `autoDestructionOnParentRemoval` registers: a throw from it costs no Shadow Object of that Entity the cleanups it registered through `onDestroy(callback)`, and costs the Entity neither its properties nor its contexts nor its subscriptions. Such a listener is only ever reached on the first path, because a destroyed Entity is the only occasion on which that notification is sent. The Kernel runs the creation scopes and the Entity's own release itself once the Entity-wide notification is through, however that notification ended. The Entity does not listen on its own notification, so the whole priority ladder belongs to whoever registers there: a listener at `Priority.Min` — `-Infinity`, the lowest eventize has — is the last one the delivery reaches, and the Entity still holds its properties and its contexts when it runs. A subscription taken through the creation API is the one place where a low priority does not pay off, and not because of the ladder: it belongs to the creation scope that handed it out, and that scope tears down at `Priority.Low` and releases everything it handed out, so the delivery never reaches a creation-API subscription registered below `Priority.Low`.

What a throw there does cost is the listeners registered behind it on the same Entity: the notification is a single delivery, and a delivery ends where a listener throws. The error is reported through the `ConsoleLogger`. The Kernel's own bookkeeping is untouched either way: the Entity is out of the Kernel when `destroyEntity()` returns, whatever ran or failed along the way, and the call hands nothing on to its caller.

- **Signature:** `onDestroy(fn: () => void): void`

```typescript
const interval = setInterval(tick, 1000);
onDestroy(() => clearInterval(interval));
```

---

### 7. The `entity` Instance

The API provides direct access to the underlying `EntityApi` instance via the `entity` property. Use this for entity metadata, tree traversal, and property inspection.

#### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `entity.uuid` | `string` (readonly) | Unique identifier of the Entity. Matches the UUID of the corresponding `ViewComponent`. |
| `entity.order` | `number` (readonly) | Sort order defined in the View Layer. Useful for systems that process entities in sequence (rendering layers, etc.). |
| `entity.hasParent` | `boolean` (readonly) | Whether this Entity has a parent in the Entity tree. |
| `entity.parent` | `EntityApi \| undefined` (readonly) | Reference to the parent Entity, if any. |
| `entity.children` | `readonly EntityApi[]` (readonly) | Array of child Entities. |
| `entity.propKeys()` | `() => string[]` | Every key the Entity has ever been given, cleared ones included. |
| `entity.propEntries()` | `() => [string, unknown][]` | The same keys with their values; a cleared property reads `undefined`. |
| `entity.kernel` | `Kernel` (readonly) | The Kernel this Entity lives in. |

`propKeys` and `propEntries` are **methods**, not properties -- call them. They also do not shrink: a property that was cleared keeps its key and reads `undefined`, which is what lets a `useProperty()` reader survive the whole lifecycle.

`entity.children` is sorted by ascending `order`; a newly attached child is placed after all siblings sharing its `order`.

```typescript
createEffect(() => {
    for (const [key, value] of entity.propEntries()) {
        console.log(`${key} = ${value}`);
    }
});
```

#### `entity.traverse(callback)`

Traverses the Entity and all its descendants, calling the callback for each. Visits the current entity first, then recursively visits all descendants (depth-first).

- **Signature:** `traverse(callback: (entity: EntityApi) => unknown): void`

```typescript
import { emit } from '@spearwolf/eventize';

// Broadcast a frame tick to all children
entity.traverse((e) => {
    emit(e, 'frame-update', { deltaTime: 0.016 });
});
```

`traverse()` is useful for broadcast patterns where a parent needs to notify all descendants of an event, like a frame tick or a configuration change. Every Entity below the starting point is visited exactly once.

---

## Registry (Component Manifest)

The Registry is the routing table of the Shadow Objects framework. It tells the Kernel (ECS System Runner) which code to run for a given Entity Token (Component Tag). This configuration is organized into Modules.

Think of the Registry as the component manifest for your ECS: it declares what behavior attaches to what game object type.

### Defining a Module

A module is a plain JavaScript object. It is the entry point referenced by the `src` attribute of `<shae-worker>`.

```javascript
// my-logic.js
import { MyCounter } from './MyCounter.js';
import { Analytics } from './Analytics.js';

export const shadowObjects = {
    define: {
        'counter': MyCounter,
        'analytics': Analytics,
    },
    routes: {
        'counter': ['analytics'],
    }
};
```

---

### `define`

Maps Token (Component Tag) strings to Shadow Object constructors.

- **Key:** The token string (e.g., `'my-button'`). This matches the `token` attribute on `<shae-ent>`.
- **Value:** A Shadow Object definition (function or class).

A token can carry more than one definition: defining the same token again in another module appends the constructor instead of replacing it, and an Entity with that token gets all of them. The same constructor registered twice is kept once.

```javascript
define: {
    'hero-section': HeroLogic,
    'nav-bar': NavbarLogic,
}
```

---

### `routes`

Defines how Tokens relate to each other. Routes enable composition and conditional logic without touching the View Layer.

#### 1. Composition (Mixin Pattern)

Map one token to a list of other tokens. When an Entity is created with the main token, the Kernel instantiates Shadow Objects for all tokens in the route list.

```javascript
routes: {
    // <shae-ent token="user-profile"> gets UserProfile, Logger, and ThemeSubscriber
    'user-profile': ['logger', 'theme-subscriber'],
}
```

This lets you attach reusable behaviors (logging, analytics, layout management) to entities without changing any HTML.

#### 2. Conditional Routing

Routes can activate based on Entity properties. There are two forms.

**Global property route:** `'@propertyName'` -- applies to *every* entity that has a truthy property of that name, regardless of its token.

```javascript
routes: {
    // Any entity with a truthy "debug" property gets debug-overlay behavior
    '@debug': ['debug-overlay'],
}
```

```html
<!-- Loads GameCanvas + DebugOverlay -->
<shae-ent token="game-canvas">
    <shae-prop name="debug" value="true"></shae-prop>
</shae-ent>

<!-- Loads only GameCanvas -->
<shae-ent token="game-canvas"></shae-ent>
```

**Token-scoped property route:** `'token@propertyName'` -- applies only when the resolved token set contains `token` *and* the entity has a truthy `propertyName`.

```javascript
routes: {
    // Only a game-canvas with a truthy "debug" property gets the overlay.
    // A user-profile carrying the same <shae-prop name="debug"> does not.
    'game-canvas@debug': ['debug-overlay'],
}
```

Both forms take part in recursive resolution, so a token pulled in by a property route can itself have routes.

#### 3. Nested Routing

Routes are recursive. Token A routing to Token B, and Token B routing to Token C, means an entity with Token A gets all three.

```javascript
routes: {
    'page': ['header', 'footer'],
    'header': ['menu', 'logo'],
}
// 'page' resolves to: ['page', 'header', 'footer', 'menu', 'logo']
```

The starting token is part of its own resolution, and the walk is breadth-first: everything one hop away comes before anything two hops away. Each token appears once, however many routes lead to it.

---

### `extends`

Includes other modules. Essential for modular architecture -- split configuration across files, share common configs, or import third-party module libraries.

A module that two `extends` chains have in common is imported once; the second attempt is skipped and reported on the console. Sub-modules are imported first and do not upgrade any Entities on their own — the outer module triggers the upgrade once everything is registered.

```javascript
import { CoreModule } from './core-module.js';

export const shadowObjects = {
    extends: [CoreModule],
    define: {
        'my-feature': MyFeature,
    }
};
```

---

### `initialize`

An optional async hook that runs when the module is loaded. Receives an object with `define`, `kernel`, and `registry` properties.

Useful for:
- Fetching remote configurations or feature flags before startup.
- Conditionally registering Shadow Objects based on runtime environment.
- Initializing global services or connections.

```javascript
export const shadowObjects = {
    async initialize({ define, kernel, registry }) {
        const config = await fetchConfig();
        if (config.featureEnabled) {
            define('feature', FeatureLogic);
        }
    }
};
```

**Registry best practices:**

1. Keep Shadow Objects small and focused. Use routes to compose complex behaviors.
2. Use conditional routing for cross-cutting concerns: debugging, logging, feature flags.
3. Namespace your tokens for large apps (e.g., `ui:button`, `data:user`) to avoid collisions.

---

## ViewComponent

Represents a single node in the view hierarchy that maps to a Shadow Entity. Most developers use `<shae-ent>` instead, but `ViewComponent` is the right tool when integrating with non-DOM renderers (Canvas, WebGL, game engines) or custom framework bindings (React, Vue, Svelte).

```typescript
import { ViewComponent } from '@spearwolf/shadow-objects';
```

### Constructor

```typescript
new ViewComponent(token: string, options?: ViewComponentOptions)
```

`token` is the first positional parameter, not a member of `options`: the identifier string matching a Registry entry. It falls back to `VoidToken` (`'#void'`) when omitted.

| Option | Description |
| :--- | :--- |
| `context` | (Optional) The `ComponentContext` instance this component belongs to. Defaults to `ComponentContext.get()`, the Default Global Context. |
| `parent` | (Optional) The parent `ViewComponent`. Must belong to the same context and must not be destroyed. |
| `order` | (Optional) Initial sort order (number). Default is `0`. |
| `uuid` | (Optional) Explicit unique identifier. If omitted, one is generated automatically. A uuid that a component of the target `ComponentContext` is holding is refused with a `ComponentUuidInUseError`; it is free again once its holder has left that `ComponentContext`. |
| `autoDestructionOnParentRemoval` | (Optional) Whether the corresponding Entity is destroyed together with its parent. Default is `false`, which promotes the Entity to a root Entity instead. Immutable after creation. |

A `ViewComponent` passed in place of `options` is read as `{parent: thatComponent}`. It carries no `context` with it, so the new component joins the Default Global Context -- which makes the shorthand work only when the parent lives there too. A parent in a named context makes the constructor throw, because the child would be joining a different context than its parent:

```typescript
const child = new ViewComponent('child', parent);      // fine while parent is in the default context

const scoped = new ViewComponent('p', { context: ComponentContext.get('level-1') });
new ViewComponent('child', scoped);                    // throws: cannot add a child from another context
new ViewComponent('child', { parent: scoped, context: ComponentContext.get('level-1') }); // the explicit form
```

### Properties

| Property | Description |
| :--- | :--- |
| `token` | The token string. Assigning `undefined` resets it to `VoidToken`, exported as `'#void'`. |
| `uuid` | Unique identifier (read-only). Matches `entity.uuid` in the Shadow Environment. |
| `parent` | Reference to the parent component. Assigning `undefined` detaches the component to the root level. |
| `context` | The managing context. Assignable in both directions -- see below. |
| `order` | Numeric sort order within the parent's children list. Useful for controlling execution order or canvas layers. |
| `isDestroyed` | (read-only) Whether the component has been detached from its context. See [The destroyed state](#the-destroyed-state). |
| `autoDestructionOnParentRemoval` | (read-only) The constructor option of the same name. |

#### Assigning a context

Assigning `null` or `undefined` to `context` **detaches** the component: it leaves the context it was in, it no longer appears in any change trail, `isDestroyed` reports `true`, and the corresponding Entity goes away. The component keeps its event subscriptions and everything an integration installed on the instance, because it can be taken back in. `destroy()` goes one step further and takes both off.

Assigning a *different* context moves the component, and it does not travel empty. Its properties are carried over into the new context along with the equality function registered for each key, so the Entity arrives in the other environment with the state it had, not as a bare token. The `token`, the `order` and `autoDestructionOnParentRemoval` come along too.

**The parent link does not.** Leaving a context detaches the component from its parent first, so it arrives in the new context as a root and `parent` reads `undefined` afterwards. Assigning `context` by hand, with nothing re-attaching it, is also what the change trail then reports: no `parentUuid`. Moving a whole subtree that way therefore means re-establishing the hierarchy on the far side:

```typescript
const level2 = ComponentContext.get('level-2');

const root = new ViewComponent('root', { context: ComponentContext.get('level-1') });
const vc = new ViewComponent('player', { parent: root, context: ComponentContext.get('level-1') });
vc.setProperty('score', 1000);

root.context = level2;
vc.context = level2;    // score travels along

vc.parent;              // undefined -- the hierarchy did not
root.addChild(vc);      // re-attach it on the far side

vc.context = null;      // detached from the context
vc.isDestroyed;         // true
```

A component that leaves its context without joining another carries nothing -- there is no receiver for it.

Two paths do keep the hierarchy, and neither does it by carrying the link:

- **A `<shae-ent>` that changes its `ns`.** The element asks for an ancestor again in the new namespace and re-binds the same `ViewComponent` from the element tree, before the next trail is built -- so that trail does carry the `parentUuid`. The hierarchy is intact afterwards whenever an ancestor answers there, and the entity arrives as a root when none does, which is what happens if the ancestor stayed behind in the old namespace.
- **Recovery after a `ProxyFailed`.** `reCreateChanges()` rebuilds each component from the Component Memory, and that memory holds `parentUuid`.

#### Sort order

Siblings are sorted by ascending `order`. Components with an equal `order` keep their insertion order, so a newly added component is placed after all siblings sharing its `order`. Negative values are allowed and sort before the default `0`. Assigning `null` or `undefined` resets `order` to `0`.

```typescript
new ViewComponent('a', { parent, order: 10 });
new ViewComponent('b', { parent, order: 10 }); // after 'a'
new ViewComponent('c', { parent, order: 5 });  // before both
// children: c, a, b
```

### Methods

#### `setProperty(name, value, isEqual?): boolean`

Updates a property value. The change is batched and sent to the Shadow Environment. Returns `true` if the value differs from the last one written to a change trail, `false` if the write was a no-op.

```typescript
component.setProperty('score', 1000);

// With custom equality check to avoid unnecessary updates
component.setProperty('position', newPos, (a, b) => a.equals(b));
```

Setting a property to `undefined` is equivalent to `removeProperty(name)`.

#### `removeProperty(name)`

Removes a property. The change is batched and sent to the Shadow Environment.

```typescript
component.removeProperty('score');
```

#### `addChild(child)`

Attaches `child` to this component, detaching it from its previous parent. Equivalent to `child.parent = component`.

Throws a `ViewComponentError` when:

- the child belongs to a different `ComponentContext`
- either component is destroyed
- the child is the component itself or one of its ancestors -- the entity tree is a tree, and a cycle would silently drop the whole branch out of every change trail

```typescript
parent.addChild(child);

parent.addChild(parent);      // throws: would create a cycle
child.addChild(parent);       // throws: parent is an ancestor of child
```

The error class itself is **not** exported, so `instanceof` is not available to you. Match on the name instead:

```typescript
try {
  parent.addChild(parent);
} catch (error) {
  if (error instanceof Error && error.name === 'ViewComponentError') {
    // …
  }
}
```

#### `removeFromParent()`

Detaches the component from its parent and promotes it to a root component. Does nothing when the component has no parent or is destroyed.

#### `isChildOf(parent)`

Whether `parent` is this component's direct parent. A shallow check, not an ancestor walk.

```typescript
child.isChildOf(parent);     // true right after parent.addChild(child)
```

#### `dispatchEvent(type, data, traverseChildren)`

Delivers an event to this component's own listeners, and with `traverseChildren` to all its descendants as well. This stays in the View Layer -- use `dispatchShadowObjectsEvent()` to reach a Shadow Object. It is the method the framework itself uses to hand a message coming back from the Shadow Environment to a component.

```typescript
component.dispatchEvent('reset', { hard: true }, true); // this component and every descendant
```

#### `dispatchShadowObjectsEvent(type, data, transferables?)`

Sends a custom event to the Shadow Object running in the Shadow Environment. Since the Shadow Environment may be in a Web Worker, data is cloned by default using `structuredClone`. Use `transferables` to transfer ownership of `ArrayBuffer`, `MessagePort`, etc. instead.

```typescript
component.dispatchShadowObjectsEvent('playerJump', { force: 5.0 });
```

#### Receiving Events

A `ViewComponent` is an eventized object (via [@spearwolf/eventize](https://github.com/spearwolf/eventize)), which is how events sent from Shadow Objects back to the View Layer reach you. The eventize surface is reached through that package's **free functions** -- `on`, `once`, `off`, `emit` -- with the component as their first argument. `ViewComponent` carries no methods of those names.

```typescript
import { on, off } from '@spearwolf/eventize';

const unsubscribe = on(component, 'msg-from-shadow', (data) => {
  console.log('Received:', data);
});

unsubscribe();      // or off(component, 'msg-from-shadow')
```

`destroy()` takes every `on()` and `once()` subscription off the component: a listener registered before the call hears no later `dispatchEvent()`, and the unsubscribe function it returned has nothing left to do. A listener registered afterwards is heard as usual -- the call takes off what lies on the component in that moment, it does not seal it, so a component revived through `context` needs its subscriptions again. A promise from `onceAsync()` stays outside this and settles only when the event it waits for arrives. Leaving a context is no teardown in this sense: `vc.context = otherCtx` and `vc.context = null` keep both the subscriptions and an own `dispatchEvent`. The teardown announces itself on the component immediately before it takes anything off -- `ViewComponent.Destroyed`, see the table below.

Five events arrive from the framework itself rather than from a Shadow Object:

| Event | When |
| :--- | :--- |
| `ComponentContext.ReRequestParentRoots` | The component should drop its parent and ask for one again. |
| `ComponentContext.ReRequestParent` | The component should ask for a parent again and take whatever comes back — the same parent, a different one, or none at all where nobody answers. Receives the sender's identity as `data`. |
| `ComponentContext.ReRequestEntHost` | The element behind the component should let the properties hanging on it look for their host entity again. `<shae-ent>` answers it on its own; a component without such an element has nothing to do here. |
| `ContextLost` | The context rebuilt its changes from the Component Memory, so everything the component sent before is on its way again. Broadcast by `ComponentContext.reCreateChanges()`. |
| `ViewComponent.Destroyed` | The component has been ended and is about to lose every subscription on it. Whoever holds something there sets it up again from here -- but not inside the handler itself, which runs before the teardown and would have its work taken off with the rest. Emitted by `destroy()` on the component itself. Its value is `'view-component-destroyed'` -- a different string from the `Destroyed` exported at the top level of `@spearwolf/shadow-objects`, which is `'destroyed'` and belongs to the worker channel. Two names that read alike, two values, two senders. |

`ContextLost` is exported from `@spearwolf/shadow-objects` as a standalone constant, and its value -- `'contextLost'` -- is the **same string** as `ShadowEnv.ContextLost`. Two names, one value, two different senders: this one is broadcast to every `ViewComponent` in a context, the other is emitted by a `ShadowEnv`. A listener registered on the wrong object hears nothing; one registered on the right object hears only its own sender.

```typescript
import { on } from '@spearwolf/eventize';
import { ContextLost, ComponentContext } from '@spearwolf/shadow-objects';

on(component, ContextLost, () => {
  console.log('the change trail is being rebuilt');
});

on(component, ComponentContext.ReRequestParentRoots, () => {
  // re-resolve the parent
});
```

#### `destroy()`

Removes the component from the hierarchy and signals destruction to the Shadow Environment. It also takes every `on()` and `once()` subscription off the component and drops a `dispatchEvent` an integration installed on the instance, which uncovers the method of the prototype again. Calling it more than once is safe: each call takes off what lies on the component at that moment. Immediately before the teardown it emits `ViewComponent.Destroyed` on the component, so an integration holding something there hears it while everything is still in place.

`<shae-ent>` listens to that: its three re-request subscriptions and its `dispatchEvent` patch stand again one microtask after the teardown, on the same component. A context that takes its components down as a whole -- `clear()`, `dispose()`, `destroyComponent()`, `removeSubTree()` -- therefore leaves no deaf element behind; a `vc.context = ctx` after it takes the component back in, and the element answers the next re-request round and forwards custom events again. One task does go past it, the one the teardown itself runs in: a re-request round broadcast there does not reach the element, and a `vc.dispatchEvent()` there reaches the eventize listeners but leaves no DOM `CustomEvent` behind, because the patch is not back yet. That is the width of the window, and it is exactly one microtask.

### The destroyed state

After `destroy()` the component is detached from its `ComponentContext`: it no longer appears in any change trail and no longer has a corresponding Entity. `isDestroyed` reports `true`. The context reaches the same state from its own side -- `ComponentContext.clear()`, `destroyComponent()`, `removeSubTree()` and `dispose()` leave the components they take down exactly here. `clear()` and `dispose()` reach every component that has joined the context and has not left it again. `removeSubTree(uuid)` is addressed to an entry: it takes down the instance holding it together with its descendants. `destroyComponent(component)` releases exactly the instance it is given and leaves the entry -- and with it the entity -- standing when a namesake holds it. Holding on to a destroyed component is safe, and its behaviour is uniform. Every one of these paths emits `ViewComponent.Destroyed` on the component it takes down. One thing the table below does not cover: `vc.context = null` reaches `isDestroyed === true` as well, and every row holds for it except the two about `dispatchEvent` and about the announcement -- a component that only left its context keeps its subscriptions and an own `dispatchEvent`, and it announces nothing, because it can be taken back in.

| Operation | Behaviour while destroyed |
| :--- | :--- |
| `token`, `order` | Assignment updates the local value, nothing is sent |
| `setProperty`, `removeProperty` | Ignored. `setProperty` returns `false` |
| `dispatchShadowObjectsEvent` | Ignored |
| `dispatchEvent` | Notifies the listeners registered since the `destroy()`, children are not traversed |
| `removeFromParent` | Ignored |
| `destroy` | Nothing left to detach, it announces `ViewComponent.Destroyed` again, and it takes off whatever lies on the component at that moment |
| `addChild`, `parent = …` | Throws a `ViewComponentError` |

The split is deliberate: operations that only concern the component itself are absorbed, because a renderer may still be flushing state at teardown. Operations that would tie a second, live component to a dead one throw, because silently ignoring them would leave the caller with a wrong picture of the entity tree. As above, catch that throw by narrowing to `Error` and reading `error.name` -- the class is not exported.

Note what "absorbed" means for `token` and `order`: the assignment does take effect locally, so reading the property back gives you the value you wrote. What is dropped is the message to the context.

Assigning a `context` revives the component under the same uuid:

```typescript
component.destroy();
component.isDestroyed; // true

component.context = ComponentContext.get();
component.isDestroyed; // false -- a new Entity is created with the same uuid
```

A component revived after a `destroy()` carries no subscription from before it: `on(component, …)` has to be set up again, and an integration that had installed its own `dispatchEvent` has to install it again. One revived after a `vc.context = null` still carries both -- that path detaches the component, it does not silence it.

Assigning a context that has been disposed throws a `ComponentContextDisposedError` and changes nothing: a component that still lives in another context stays there. Leaving the old context is only worth it if the new one can actually be joined.

Every other rejected join costs the component the `ComponentContext` it was leaving. Assigning a `ComponentContext` in which another component holds the same uuid throws a `ComponentUuidInUseError` -- carrying the uuid on `error.uuid` -- and leaves the component with none at all: `isDestroyed` reads `true`, and the one it came from has already released it. Assign a `ComponentContext` again to take it back in.

### Custom Integration Example

Here is how you map a game engine object to a Shadow Entity manually:

```typescript
class GameEntity {
  constructor(game, token) {
    this.viewComponent = new ViewComponent(token, {
      context: game.shadowContext,
    });

    this.viewComponent.setProperty('x', this.x);
    this.viewComponent.setProperty('y', this.y);
  }

  update() {
    if (this.moved) {
      this.viewComponent.setProperty('x', this.x);
      this.viewComponent.setProperty('y', this.y);
    }
  }

  onDamage() {
    this.viewComponent.dispatchShadowObjectsEvent('damage', { amount: 10 });
  }

  destroy() {
    this.viewComponent.destroy();
  }
}
```

---

## ComponentContext

The View-Layer state of a group of `ViewComponent`s, and the source of the change trails that travel to the Shadow Environment. It holds the components, their hierarchy and their properties, and summarizes every change since the last trail into the next one. Multiple independent Shadow Environments can coexist on the same page through namespacing.

Carrying the trail across to the Kernel is not its job. A `ShadowEnv` reads the trails from here and hands them to its `envProxy` -- that is where the choice between a worker and the main thread is made.

> **Not to be confused with [Entity Context](#2-entity-context-dependency-injection).** `ComponentContext` lives in the View Layer and answers "which Shadow Environment does this ViewComponent belong to?". Entity Context lives inside the Shadow Environment and answers "which values does this Entity inherit from its ancestors?". The names are similar; the concepts are unrelated.

```typescript
import { ComponentContext } from '@spearwolf/shadow-objects';
```

Most of the surface below is driven by `ViewComponent`: creating a component, assigning a `parent`, writing a property or calling `destroy()` all land here. Reach for these methods directly when you drive a context by hand -- a custom element, a framework binding, a test harness.

### Constructor

```typescript
new ComponentContext(namespace?: NamespaceType)
```

A context is a singleton per namespace, and the constructor honours that: when the namespace is already taken it hands back the **existing** instance instead of a second one. `ComponentContext.get()` says the same thing more plainly and is the preferred spelling.

```typescript
const first = new ComponentContext('level-1');
const second = new ComponentContext('level-1');
second === first; // true
```

### Static Methods

#### `ComponentContext.get(namespace?)`

Retrieves or creates a named context singleton. Omitting `namespace` returns the Default Global Context.

```typescript
const defaultCtx = ComponentContext.get();
const level1Ctx = ComponentContext.get('level-1');
```

#### `ComponentContext.getContextsMap()`

The `Map` of every context by namespace, created on first access. This is the live registry, not a copy -- reading it is fine, writing to it is not.

```typescript
ComponentContext.getContextsMap().size;
```

### Static Event Names

Three event names that arrive as ordinary events on a `ViewComponent`; see [Receiving Events](#receiving-events) for how to listen. The context sends the first two itself, through the `dispatchReRequestParent…` methods below. The third has no such method: it travels the same channel, but a `<shae-ent>` sets it off by calling `broadcastEvent()` on every context there is.

| Name | Value | Meaning |
| :--- | :--- | :--- |
| `ComponentContext.ReRequestParentRoots` | `'re-request-parent-roots'` | Drop your parent and ask for one again. |
| `ComponentContext.ReRequestParent` | `'re-request-parent'` | Ask again and take the answer, including the absence of one. |
| `ComponentContext.ReRequestEntHost` | `'re-request-ent-host'` | Let the properties hanging on your element look for their host entity again. |

### Properties

| Property | Description |
| :--- | :--- |
| `ns` | The namespace this context is registered under. Set when the context is created. |
| `isDisposed` | (read-only) Whether the context has been torn down by `dispose()`. |

### Methods

#### Components and hierarchy

| Method | Description |
| :--- | :--- |
| `addComponent(component)` | Take a component in and write a `CreateEntities` change for it. Throws a `ComponentContextDisposedError` on a disposed context, and a `ComponentUuidInUseError` when another component of this context holds the uuid. Called by the `ViewComponent` `context` setter. |
| `hasComponent(component)` | Whether this context holds a component with that uuid. |
| `hasComponents()` | Whether it holds any component at all. |
| `isRootComponent(component)` | Whether the component is a root, i.e. has no parent in this context. |
| `isChildOf(child, parent)` | Whether `child` currently sits in the children list of `parent`. |
| `getChildren(component)` | The children of a component, in sort order. A fresh array each call. |
| `traverseLevelOrderBFS()` | Every component in the context, breadth-first from the roots. |
| `destroyComponent(component)` | Write the destroy change for a component, promote its children to roots and detach the component from this context. |
| `addToChildren(parent, child)` | Insert `child` into the children of `parent`. Throws a plain `Error` when the context does not hold `parent`. It only appends: a `child` that already stands in the children list of another parent stays there as well, and it is not checked against the ancestors of `parent`. Both are the job of `ViewComponent.addChild()`. |
| `removeFromParent(component, parent)` | Detach a component from that parent and make it a root. A no-op when a later `ViewComponent` has since claimed `component`'s uuid. |
| `moveToRoot(component)` | Make a component a root without naming its previous parent. A no-op when a later `ViewComponent` has since claimed `component`'s uuid. |
| `removeSubTree(uuid)` | Destroy a component and all its descendants **without** writing anything to a change trail. Each of them is detached from this `ComponentContext` -- unless a `ViewComponent.Destroyed` listener assigns the `ComponentContext` back onto the component it is announcing, which takes that component in again under the same uuid. |
| `changeToken(component, token?)` | Record a token change for a component. |
| `changeOrder(component)` | Re-sort a component among its siblings after its `order` changed, and record the new value. A component this context does not hold is ignored. |

`destroyComponent()` leaves the `ViewComponent` you pass destroyed: it reports `isDestroyed === true` and holds no context any more. `ViewComponent.destroy()` reaches the same state from the other side, and that is the call an application makes. It releases exactly the instance named: if a later `ViewComponent` has since claimed the same uuid, that component's entry and entity are unaffected.

#### Properties

| Method | Description |
| :--- | :--- |
| `setProperty(component, propKey, value, isEqual?)` | Write a property. Returns `true` when the value differs from the last one written to a change trail. An `isEqual` function is remembered for that key; omitting it forgets a previously registered one. |
| `removeProperty(component, propKey)` | Remove a property. |
| `transferPropertiesTo(component, target)` | Hand the properties this context holds for `component` over to the context it has just joined. |

`transferPropertiesTo()` is why a namespace change carries the properties along. The `ViewComponent` `context` setter calls it after the join, so the values land in the same `CreateEntities` change as the token and the order. Each value is written first and its equality function registered afterwards -- the other way round, the target would be asked whether the incoming value equals the `undefined` it still holds, and a function that says yes would drop the property instead of carrying it over. The properties are copied, not moved; what stays behind goes down with the entity in this context.

#### Events

| Method | Description |
| :--- | :--- |
| `dispatchShadowObjectsEvent(component, type, data, transferables?)` | Queue an event for the Shadow Objects of one component. It travels with the next change trail. |
| `broadcastEvent(type, data?)` | Deliver an event to every `ViewComponent` in this context, breadth-first. Stays in the View Layer. |
| `dispatchMessage(uuid, type, data?, traverseChildren?)` | Deliver an event to one component by uuid, optionally to its descendants too. This is the path a message coming back from the Shadow Environment takes. |
| `dispatchReRequestParentRoots()` | Send `ReRequestParentRoots` to every root component. |
| `dispatchReRequestParentChildren(component)` | Send `ReRequestParentRoots` to the components currently hanging on `component`. |
| `dispatchReRequestParentSiblings(component, data?)` | Send `ReRequestParent` to the siblings of `component`, with `data` carrying the sender's identity. |

`dispatchReRequestParentSiblings()` has one fallback worth knowing: a component with no parent of its own has no siblings to narrow down to, so the call becomes `dispatchReRequestParentRoots()` -- every root is asked, and asked with `ReRequestParentRoots` rather than `ReRequestParent`.

#### Change trails

| Method | Description |
| :--- | :--- |
| `buildChangeTrails(commit = true)` | The changes since the previous call, as a `ChangeTrailType`. Returns an empty array when the context holds no components. With `commit` it also counts the trail as applied and writes the Component Memory; with `commit = false` it does neither, and `commitChangeTrail()` settles the trail afterwards. It runs a pending re-request round before it reads anything, so the call can move entities in the hierarchy — and the trail it hands back carries the result. |
| `commitChangeTrail(appliedCount, changeTrail?)` | Fold the first `appliedCount` entries of the trail built last into the state the next trail is diffed against, and write them to the Component Memory. Everything behind that line stays pending and goes out again with the next trail. `changeTrail`, when given, is the trail this call settles -- the call is ignored unless it is the one the context built last. |
| `reCreateChanges()` | Rebuild every component from the Component Memory, so that the next trail re-creates all of them. This is how a fresh proxy is brought up to the state the view is already in -- and the only kind of environment it belongs to: one that still holds the entities refuses every re-created `CreateEntities` it is sent, with an `EntityUuidInUseError`. |

A change trail returned by `buildChangeTrails()` is a snapshot: nothing in the library writes to it again, not even the property tuples of its entries. This holds for anything derived from it too, including the value `ShadowEnv.syncWait()` resolves with and the payloads of `ShadowEnv.AfterSync` and `ShadowEnv.SyncFailed`.

Building a trail and committing it are two steps because a trail can be refused on the way. Until it
is committed, every value it carries is still pending: `buildChangeTrails(false)` hands out the
entries and leaves the bookkeeping where it stands, and `commitChangeTrail()` draws the line between
the entries the Shadow Environment applied and the ones it still owes. `ShadowEnv` drives both
halves; a consumer calling `buildChangeTrails()` without an argument gets the single-step behaviour
and never has to think about it.

A value that changes again between the build and the commit stays pending. The commit releases only
what the entry it settles actually carried, so the newer value goes out with the next trail rather
than being written off as delivered. This holds for the awkward half of that case as well: a value
set back to the one the Shadow Environment last confirmed is still a change, because the entry on
its way out carries another one and would otherwise be the last word.

Two builds without a commit in between are allowed: the older trail is then committed in full, which
is the optimistic reading, rather than leaving two trails claiming the same entries.

`reCreateChanges()` announces itself: it broadcasts the `ContextLost` event to every `ViewComponent` in the context, parents and children alike. It returns immediately when the memory is empty -- after a `clear()`, for instance, there is nothing left to recover.

What it rebuilds goes to a Shadow Environment that no longer holds those uuids. A Kernel that still
holds them refuses the re-created creation of the first one and every cycle that follows, because a
uuid names one Entity at a time. The recovery therefore starts with a fresh proxy, and `ShadowEnv`
makes the `reCreateChanges()` call itself once that proxy reports ready -- the two steps that follow
it, the `importScript()` that gives the new worker its Registry and the `sync()` that sends the
rebuilt trail, belong to the application; [`syncWait()`](#syncwait) spells the sequence out.

#### `clear()`

Removes all components without writing anything to a change trail. The context stays registered under its namespace and can be used again afterwards. This is the reset you want between tests or when swapping a whole scene.

Every `ViewComponent` that has joined this `ComponentContext` and has not left it again is destroyed on the way out. Each reports `isDestroyed === true`, holds no context any more, and every `setProperty` on it returns `false` and writes nothing. See [The destroyed state](#the-destroyed-state) for what such a component still answers.

Assigning the context takes the component back in under the same uuid, with a fresh `CreateEntities` change -- the same revival that follows a `ViewComponent.destroy()`.

```typescript
ctx.clear();

vc.isDestroyed;          // true
vc.context;              // undefined
ctx.hasComponent(vc);    // false
vc.setProperty('a', 1);  // false, nothing written

vc.context = ctx;        // takes it back in, same uuid
vc.isDestroyed;          // false
vc.setProperty('a', 1);  // true
```

#### `dispose()`

The final teardown. Every `ViewComponent` the context holds is destroyed (so each one reports `isDestroyed === true`), the component memory is dropped, and the namespace is released, so `ComponentContext.get(ns)` hands out a fresh context afterwards. Calling it more than once is a no-op.

A disposed context stays inert: it holds no components, `buildChangeTrails()` returns an empty array, and any `ViewComponent` that tries to join it -- through the constructor or by assigning `context` -- is rejected with a `ComponentContextDisposedError`. The rejected component keeps whatever context it had. A disposed context cannot be revived.

```typescript
import { ComponentContext, ComponentContextDisposedError } from '@spearwolf/shadow-objects';

const ctx = ComponentContext.get('level-1');
// …
ctx.dispose();

ctx.isDisposed;                              // true
ComponentContext.get('level-1') === ctx;     // false -- a fresh context
new ViewComponent('a', { context: ctx });    // throws ComponentContextDisposedError
```

Rejecting is deliberate, for the same reason `destroy()` rejects pending promises: a component silently attached to a dead context would look alive while never reaching an Entity.

A `ShadowEnv` bound to this context keeps its reference and will simply sync empty change trails. Destroy the environment first if you want the namespace released on both sides:

```typescript
env.destroy();
ctx.dispose();
```

### Namespacing

A Context represents an isolated instance of a Shadow Environment (Kernel + Entities).

- **Default Context:** Used when no namespace is specified. Ideal for single-environment applications.
- **Named Contexts:** Pass a string namespace (e.g., `'ui-overlay'`, `'minimap'`) to create completely separate logical environments. Each can run on the main thread or in its own worker.

Each `ViewComponent` belongs to exactly one Context.

A namespace is a string or a symbol. Two exports name the machinery behind that:

| Export | Description |
| :--- | :--- |
| `GlobalNS` | The symbol the Default Global Context is registered under -- what `ComponentContext.get()` resolves to when you pass nothing. |
| `toNamespace(namespace?)` | The normalization every namespace goes through: a string is trimmed, a symbol is taken as it is, and anything empty or missing becomes `GlobalNS`. |

```typescript
import { ComponentContext, GlobalNS, toNamespace } from '@spearwolf/shadow-objects';

toNamespace();          // GlobalNS
toNamespace('  ');      // GlobalNS -- a blank name is no name
toNamespace(' ui  ');   // 'ui'

ComponentContext.get().ns === GlobalNS;              // true
ComponentContext.get(' ui ') === ComponentContext.get('ui'); // true
```

---

## ShadowEnv

The bridge between the View Layer (`ComponentContext`) and the Shadow Environment (logic layer). It synchronizes state changes and events between them.

Shadow environments can run on the main thread (local) or in a web worker (remote). Both are first-class.

```typescript
import { ShadowEnv } from '@spearwolf/shadow-objects';
```

### Constructor

```typescript
const env = new ShadowEnv();
```

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `view` | `ComponentContext` | The `ComponentContext` instance to observe. |
| `envProxy` | `IShadowObjectEnvProxy` | The environment proxy connecting to the Shadow Environment implementation. |
| `isReady` | `boolean` (read-only) | `true` when a `view` and an `envProxy` are set, the proxy has started, and the environment is not destroyed. |
| `isDestroyed` | `boolean` (read-only) | `true` if the environment has been destroyed. |
| `logger` | `ConsoleLogger` (read-only) | The logger this environment reports through. |
| `ns$` | `Signal<NamespaceType \| undefined>` (read-only) | A signal slot the environment itself never writes -- it reads `undefined` for the whole lifetime of a `ShadowEnv`. Read the namespace from `env.view.ns`. |
| `viewReady` | `boolean` | Set by the `view` setter to reflect whether a context is attached. |
| `proxyReady` | `boolean` | Set to `true` once the start of the currently assigned proxy has resolved, and back to `false` when that proxy fails. A start that finishes after its proxy has been replaced, cleared or destroyed writes nothing here. |

`viewReady` and `proxyReady` are writable signal accessors, and together they are the input of the effect that emits `ContextCreated` and `ContextLost`. Assigning them by hand drives those events -- setting `proxyReady = false` is what a proxy failure does internally.

That effect is built with the first `view` or `envProxy` the environment is given, and `destroy()` takes it down again -- an environment that receives neither half never builds it, and stays collectable. Assigning the two flags by hand therefore drives the events on an environment that has one of its halves; on an untouched one it writes the flags and nothing else.

That one build step runs outside the reactive context of whoever assigns the half -- the effect belongs to the environment, not to a `createEffect()` the assignment happens to stand in. One part of that is observable: an assignment of the first `view` or `envProxy` from inside an open `batch()` flushes it, so the effects the batch holds back run at that point. The writes the setter itself makes stay in the batch and run when it closes. It is the first assignment that carries something which builds the effect and flushes -- a `null` or `undefined` handed to either property builds nothing -- and once the effect stands, every further assignment leaves an open batch alone.

They are *not*, however, what `isReady` reads. It asks whether a `view` and an `envProxy` are actually set, whether `proxyReady` holds, and whether the environment is still alive; `viewReady` does not enter that calculation. Assigning `viewReady = false` therefore leaves `isReady` reporting `true`. Ask `isReady` when you want to know whether the environment can sync, and treat the two flags as the wiring behind the events rather than as its ingredients.

### Static Methods

#### `ShadowEnv.get(namespace)`

Retrieves an existing `ShadowEnv` instance by namespace. Returns `undefined` if none exists.

```typescript
const env = ShadowEnv.get('my-game');
```

A namespace carries one environment at a time. Assigning a `view` registers the environment under
`view.ns` and displaces whatever was registered there, with a warning through the `ConsoleLogger`.
The registration is released by the environment that holds it -- when its `view` moves to another
context or is cleared, and when it is destroyed. An environment that has been displaced releases
nothing, so this lookup keeps answering the environment that is actually registered.

### Events

`ShadowEnv` emits events via [@spearwolf/eventize](https://github.com/spearwolf/eventize).

| Event | Description |
| :--- | :--- |
| `ShadowEnv.ContextCreated` | Fired when the environment becomes ready (view and proxy both connected). Receives the `ShadowEnv`. Retained, so a listener registered afterwards still gets it. |
| `ShadowEnv.ContextLost` | Fired when the environment loses its connection. Receives the `ShadowEnv`. Clears the retained `ContextCreated`, so a listener registered after the loss gets nothing until the environment becomes ready again. |
| `ShadowEnv.AfterSync` | Fired after a synchronization cycle the Shadow Environment applied, including cycles with nothing to send. Receives the `ChangeTrailType` data, which is an empty array when nothing changed. A cycle that failed emits `SyncFailed` instead, so a listener of this event hears the successful cycles and nothing else. |
| `ShadowEnv.SyncFailed` | Fired when the Shadow Environment could not apply the change trail of a cycle — a worker that does not confirm within `changeTrailTimeout`, a Kernel error the worker reports back, a proxy whose environment is already gone. Receives the reason, the full `ChangeTrailType` of that cycle, and the `ShadowEnv`. Where the Kernel itself refused, the reason is a `ChangeTrailRefusedError` and its `appliedCount` says how much of that trail went through. The environment stays ready: what failed is the cycle, not the connection. |
| `ShadowEnv.ProxyFailed` | Fired when the proxy loses the Shadow Environment it stands for. Receives the reason and the `ShadowEnv`. `ContextLost` follows, because the environment stops being ready. |

```typescript
import { on } from '@spearwolf/eventize';

on(env, ShadowEnv.ContextCreated, (shadowEnv) => {
  console.log('Shadow environment is ready!');
});

on(env, ShadowEnv.AfterSync, (changeTrail) => {
  console.log('Sync complete, changes:', changeTrail.length);
});
```

A listener that throws ends the run of its event where it stands, and the listeners behind it hear
nothing -- the same as everywhere else in the library. What such a listener cannot do is derail the
cycle it was told about: `syncWait()` is settled before either event goes out, so a promise waiting
on that cycle never depends on the listeners getting through, and the throw is reported through the
`ConsoleLogger` instead of escaping as an unhandled rejection.

Recovery from a `ProxyFailed` is a new proxy: `env.envProxy = new RemoteWorkerEnv()`. The setter starts it, and once it is ready the view re-creates its pending changes from the Component Memory. The next `sync()` therefore restores every entity in the new environment -- token, parent, order and properties -- so the application does not have to rebuild its `ViewComponent`s or its markup.

A `SyncFailed` does not cost the change trail of that cycle. Where the Kernel itself refused, it
says how far it got: the reason is a `ChangeTrailRefusedError`, `appliedCount` names the number of
entries it applied, and the view folds exactly that prefix into its bookkeeping. Everything behind
the line stays pending and goes out again with the next cycle, so the two sides agree on what is
applied without anyone having to guess.

The other side of that promise: a cause that stays put refuses every following cycle too. A token no
definition exists for, or a Shadow Object whose constructor always throws, produces the same refusal
again and again instead of failing once and leaving a state nobody notices is missing. `SyncFailed`
is where an application puts a stop to that -- by taking the offending component out of the view, or
by tearing the environment down.

A reason that says nothing about how far the Kernel got is read differently: a confirmation window
that ran out, a `WorkerDestroyedError`, a proxy of someone else's making. The whole trail then counts
as applied, which is the safe direction -- a worker that timed out may well hold all of it, and a
creation sent a second time to a Kernel that holds the entity is refused, so a trail kept pending on
a guess would come back to that refusal cycle after cycle. Over a worker this is also
the case for every trail sent without a confirmation, `ShadowEnv.sync()` among them: nobody asks,
so nobody answers, and the view has nothing to draw a line with.

A re-creation from the Component Memory remains the way back from a lost proxy, not from a refused
trail: it rebuilds the pending changes, and the next `sync()` sends the full state of every
component. It belongs to a fresh proxy, though -- against an environment whose Kernel still holds
those uuids, every re-created creation is refused. Assigning `env.envProxy` a new proxy is the first
of three steps: `ShadowEnv` calls `reCreateChanges()` itself once the new environment reports ready,
then the new worker needs its Registry through `importScript()`, and the rebuilt trail needs a
`sync()` to go out. [`syncWait()`](#syncwait) has the whole sequence.

### Methods

#### `sync()`

Triggers synchronization of pending changes from the `ComponentContext` to the Shadow Environment. Call this in your main render loop (e.g., inside `requestAnimationFrame`). If the environment is not ready, the sync is deferred until `ContextCreated` fires.

#### `syncWait()`

Like `sync()`, but returns a Promise that settles once the cycle is over. Useful when you need to guarantee the Shadow Environment has processed changes before continuing.

The Promise resolves with the change trail of a cycle the Shadow Environment applied, including one with nothing to send -- then the change trail is an empty array. It stays pending only while the environment is not ready; it settles once `ContextCreated` fires.

It rejects with the reason the proxy gave when the Shadow Environment could not apply the trail: a worker that does not confirm within `changeTrailTimeout`, a Kernel error the worker reports back, a `WorkerDestroyedError` from a worker that is already gone. The same reason reaches every listener of `ShadowEnv.SyncFailed`, and `AfterSync` does not fire for that cycle.

Where the Kernel refused the trail, that reason is a `ChangeTrailRefusedError`: `appliedCount` and `entryCount` say how far it got, and `cause` carries what the entry actually threw -- the error object itself locally, the wording the worker put on the wire across a worker boundary. The entries the Kernel did not apply are still pending and go out again with the next cycle.

The two kinds of reason want two different answers, so the `catch` tells them apart:

```typescript
try {
  const changeTrail = await env.syncWait();
  console.log('Synced changes:', changeTrail);
} catch (error) {
  if (error instanceof ChangeTrailRefusedError) {
    // the Kernel said how far it got. The entries from `appliedCount` on are still pending and
    // go out again with the next cycle -- the environment is intact, and nothing has to be
    // rebuilt here. What is worth doing is reading `cause`: a reason that stays put refuses
    // every following cycle the same way.
    console.warn('refused at entry', error.appliedCount, 'of', error.entryCount, error.cause);
  } else {
    // a reason that says nothing about how far the Kernel got -- a confirmation window that ran
    // out, a worker that is gone. The whole trail counts as applied, and only a rebuild from the
    // Component Memory brings the two sides back together. That rebuild goes to a fresh proxy:
    // the Kernel behind the old one may still hold those uuids.
    const proxy = new RemoteWorkerEnv();
    env.envProxy = proxy;
    await env.ready();                                   // ShadowEnv re-creates the components here
    await proxy.importScript('/my-shadow-objects.js');   // a new worker starts empty
    await env.syncWait();                                // and this sends the rebuilt trail
  }
}
```

Three steps, and none of them is optional. `env.envProxy = …` starts the new worker and, once it
reports ready, `ShadowEnv` calls `ComponentContext.reCreateChanges()` itself -- the components are
rebuilt, the trail is pending. `importScript()` is what gives that worker its Registry: a fresh one
knows no token at all, so entities created before the import get no Shadow Objects. And the rebuilt
trail waits for a `sync()` like any other pending change; `syncWait()` sends it and says whether it
arrived.

Why a fresh proxy rather than a rebuild into the one that is there: the environment behind the old
proxy may still hold the entities of the trail, and a `CreateEntities` for a uuid its Kernel holds is
refused with an [`EntityUuidInUseError`](#entityuuidinuseerror) -- a rebuild sent there is turned
away entry for entry, cycle after cycle. A Kernel that has just been started holds nothing, so the
same rebuild goes through in full.

The decision to rebuild at all is deliberately left to the consumer. A cycle can fail because a
single worker hiccup swallowed one trail, and it can fail because the Shadow Environment refuses
everything it is sent -- the first case is over with a fresh environment, the second one produces
the same failure in it. Only the application knows which of the two it is in.

#### `ChangeTrailRefusedError`

The reason a Shadow Environment gives when it could apply only part of a change trail. Exported
from `@spearwolf/shadow-objects` for the view side and from `@spearwolf/shadow-objects/shadow-objects`
for the Kernel side.

| Member | Type | Description |
| :--- | :--- | :--- |
| `appliedCount` | `number` | How many entries the Kernel applied before it stopped. The entries `[0, appliedCount)` are applied, the entry at `appliedCount` is the one that threw, everything behind it was never attempted. |
| `entryCount` | `number` | How many entries the change trail carried. |
| `cause` | `unknown` | What the entry threw. The error object itself in a local environment, the wording the worker put on the wire across a worker boundary. |

```typescript
import { ChangeTrailRefusedError, ShadowEnv } from '@spearwolf/shadow-objects';
import { on } from '@spearwolf/eventize';

on(env, ShadowEnv.SyncFailed, (reason, changeTrail) => {
  if (reason instanceof ChangeTrailRefusedError) {
    // the entries from `reason.appliedCount` on are still pending and go out again
    console.warn('refused at entry', reason.appliedCount, 'of', changeTrail.length, reason.cause);
  }
});
```

A cause that stays put refuses every following cycle in the same way. Taking the component that
provokes it out of the view is what ends the loop.

#### `ready()`

Returns a Promise that resolves when the environment is ready. Resolves immediately if already ready.

```typescript
await env.ready();
console.log('Environment is ready:', env.isReady);
```

#### `destroy()`

Tears the environment down: the `envProxy` is destroyed, the namespace is released from the global registry, and all signals and event listeners are removed. Calling it more than once is a no-op, and `isDestroyed` reports `true` afterwards.

Destruction is final, so nothing is left waiting on it. Every pending `ready()` and `syncWait()` Promise is rejected with a `ShadowEnvDestroyedError`, and calling either afterwards rejects immediately. `sync()` becomes a no-op, and a sync that was already scheduled does not run.

```typescript
import { ShadowEnvDestroyedError } from '@spearwolf/shadow-objects';

try {
  await env.syncWait();
} catch (error) {
  if (error instanceof ShadowEnvDestroyedError) {
    // the environment went away before this sync could complete
  }
}
```

Rejecting is deliberate. Resolving would tell the caller a sync completed that never happened, and leaving the Promise pending -- the previous behaviour -- silently stalls whatever awaited it.

### Examples

#### Local Shadow Environment (Main Thread)

```typescript
import { ComponentContext, ShadowEnv, LocalShadowObjectEnv } from '@spearwolf/shadow-objects';

const env = new ShadowEnv();

env.view = ComponentContext.get('my-game');
env.envProxy = new LocalShadowObjectEnv();

function animate() {
  env.sync();
  requestAnimationFrame(animate);
}
animate();
```

#### Remote Shadow Environment (Web Worker)

```typescript
import { ComponentContext, ShadowEnv, RemoteWorkerEnv } from '@spearwolf/shadow-objects';

const env = new ShadowEnv();

env.view = ComponentContext.get('my-game');
env.envProxy = new RemoteWorkerEnv();

function animate() {
  env.sync();
  requestAnimationFrame(animate);
}
animate();
```

---

## Environment Proxies

The `envProxy` property accepts any implementation of `IShadowObjectEnvProxy`. Two implementations ship out of the box; writing a third is a matter of these six members.

| Member | Signature | Required |
| :--- | :--- | :--- |
| `start` | `() => Promise<void>` | yes |
| `importScript` | `(url: URL \| string) => Promise<void>` | yes |
| `applyChangeTrail` | `(data: ChangeTrailType, waitForConfirmation: boolean) => Promise<void>` | yes |
| `destroy` | `() => void` | yes |
| `onMessageToView` | `(event: Omit<MessageToViewEvent, 'transferables'>) => any` | no |
| `onProxyFailed` | `(reason: unknown) => any` | no |

A rejected `applyChangeTrail` is part of the contract, not an accident: the environment reads it
as a cycle that failed, emits `ShadowEnv.SyncFailed` with the reason the Promise carries, and
rejects the `syncWait()` waiting on that cycle. `ShadowEnv.AfterSync` stays quiet. Reject when the
trail did not arrive or could not be applied, resolve when it did -- and note that the distinction
holds regardless of `waitForConfirmation`: an implementation applying the trail synchronously may
well know it failed without anyone having asked for a confirmation. A proxy that swallows its own
errors and resolves anyway reports a Shadow Environment that is further along than it is.

How far the Kernel got is part of the contract too, for an implementation that can say it: reject
with a `ChangeTrailRefusedError` and the view folds exactly the prefix `appliedCount` names into its
bookkeeping, sending the rest again with the next trail. Every other reason is read as "the whole
trail counts as applied", so a proxy that has always rejected with something else keeps behaving
exactly as it did.

Losing the environment altogether is the other channel: that is `onProxyFailed`, and the two are
not interchangeable. A refused trail leaves the environment ready and costs one cycle; a failed
proxy ends it.

The last two are callbacks rather than calls: `ShadowEnv` installs both on every proxy it is given -- `onMessageToView` for messages coming out of the Shadow Environment, `onProxyFailed` for the loss of that environment. An implementation that cannot fail simply never calls the latter.

The environment takes both back off a proxy it lets go, which is what a proxy sees when it is replaced, cleared, or caught by `ShadowEnv.destroy()`. `onProxyFailed` is gone as soon as the proxy's own `destroy()` returns. `onMessageToView` outlives it by one microtask, so that a message the teardown itself hands to a microtask -- what an `onDestroy` sends towards the view -- still reaches the environment. After that the proxy is on its own: reading either field off itself finds `undefined`, and an implementation that instead keeps a reference to the callback it was given reports to an environment that has moved on.

### `LocalShadowObjectEnv`

Runs the Shadow Environment in the same thread as the View Layer. Good for:
- Simple applications where worker overhead is not needed.
- Debugging (easier to inspect state directly).
- Environments where Web Workers are unavailable.

```typescript
import { LocalShadowObjectEnv } from '@spearwolf/shadow-objects';
import { Registry } from '@spearwolf/shadow-objects/shadow-objects.js';

const localEnv = new LocalShadowObjectEnv();

// or with a registry of its own, isolated from the default one — note that
// `@ShadowObject` and `shadowObjects.define()` calls without an explicit
// `registry` argument still target the default registry, not this one:
const scopedEnv = new LocalShadowObjectEnv(new Registry());
```

**Properties:**

| Property | Description |
| :--- | :--- |
| `kernel` | Direct access to the `Kernel` instance. |
| `registry` | Direct access to the `Registry` instance. |
| `isLocalEnv` | Always `true`. |
| `disableStructuredClone` | Set to `true` to skip cloning data (performance optimization for local use). The clone is what keeps the local environment semantically equal to the remote one -- see [Both Modes Clone the Change Trail](./best-practices.md#both-modes-clone-the-change-trail). |

**Methods:**

| Method | Description |
| :--- | :--- |
| `constructor(registry?)` | Without an argument the environment uses the default registry; pass a `Registry` to isolate it. See the example above. |
| `start()` | Resolves immediately -- there is no thread to bring up. |
| `applyChangeTrail(data, waitForConfirmation)` | Runs the change trail through the Kernel synchronously, before this method returns. `waitForConfirmation` does not change that -- only the settling of the returned promise moves: one microtask later than the call instead of in the same microtask, so it never settles in the same microtask as the call that made it. That is not the same relative ordering `RemoteWorkerEnv` gives its own promises -- that one settles only after its worker round-trip and can land later still. |
| `importScript(url)` | Import a shadow objects module from a URL. Rejects with `Error('module has no "shadowObjects" export')` when the module carries no such export -- the same wording `RemoteWorkerEnv` reports for the same case. |
| `importModule(module)` | Import a shadow objects module directly. |
| `destroy()` | Tears the environment down: the Kernel is destroyed and the set of imported modules is forgotten. The `Registry` in use is cleared too, unless it is the default registry — that one is shared with every other environment in the thread and stays untouched. |

### `RemoteWorkerEnv`

Runs the Shadow Environment in a Web Worker. Recommended for:
- Complex applications with heavy logic.
- Keeping the UI thread responsive.
- Production applications.

```typescript
import { RemoteWorkerEnv } from '@spearwolf/shadow-objects';

const remoteEnv = new RemoteWorkerEnv();

// or with one or more of the four timeouts set explicitly
const patientEnv = new RemoteWorkerEnv({ changeTrailTimeout: 15000 });
```

**The constructor options are the four timeouts, and nothing else.** `loadTimeout`,
`configureTimeout`, `changeTrailTimeout` and `destroyTimeout` correspond one to one to the four
[Worker Timeout Constants](#worker-timeout-constants), and every key is decided on its own: a key
left out — or set to `undefined` — keeps its constant, so `new RemoteWorkerEnv()`,
`new RemoteWorkerEnv({})` and the example above differ only in the one value that was named. A
valid value is a number of milliseconds from `1` to `2147483647` — close to 25 days, and as long
as a wait can honestly be made. Anything else — `0`, `Infinity`, `NaN`, a negative number, a number
above the upper bound, something that is not a number at all — is reported through
`env.logger.error` and the constant applies. `0` and `Infinity` are refused on purpose: neither
arms a timer, so a `destroyTimeout` set to one of them would leave `destroy()` waiting for an
acknowledgement a dead worker never sends, and the `terminate()` at the end of that chain would
never run. The upper bound is refused for the mirror image of the same reason: `setTimeout()`
truncates its delay into a signed 32-bit field, so a larger number comes back out as some other,
shorter one — `loadTimeout: 2147483648` fires at once rather than waiting its 24.9 days. A value
that quietly means something else than it says is turned away rather than honoured. The declarative half of the same decision is the four
`<shae-worker>` attributes; see [`<shae-worker>` Attributes](#shae-worker).

**Properties:**

| Property | Description |
| :--- | :--- |
| `isDestroyed` | `boolean` (read-only). Also `true` once the worker has failed. |
| `workerLoaded` | Promise that resolves once the worker is ready. It rejects with a `WorkerFailedError` when the worker fails and with a `WorkerDestroyedError` when the environment is torn down. Every read hands out a promise that can reject, so attach a `catch()` even when you do not await it -- otherwise the rejection surfaces as an unhandled one. |
| `timeouts` | `Readonly<WorkerTimeouts>`. The four timeouts this environment holds itself to, resolved once when it is built. This is what a diagnosis asks when the values come from a template rather than from a call. The object is frozen, so writing `env.timeouts.loadTimeout` throws in strict mode and does nothing outside it; the property slot itself is not — like `logger`, it is `readonly` to the type layer only, and an assignment to `env.timeouts` goes through and bypasses the check above. |
| `logger` | `ConsoleLogger` (read-only). The logger this environment reports through. Its enabled state travels into the worker together with the shared logger configuration when the worker starts. A JSON object stored under `ConsoleLogger.RemoteWorkerEnv.workerConfig` is merged on top of that configuration; see [Console Logger](#console-logger). |

**Methods:**

| Method | Description |
| :--- | :--- |
| `importScript(url)` | Import a shadow objects module inside the worker. Rejects with a `WorkerDestroyedError` after `destroy()`. A module with no `shadowObjects` export rejects with the string `module has no "shadowObjects" export` that came in over the wire, rather than the `Error` a `LocalShadowObjectEnv` rejects the same case with. |
| `applyChangeTrail(changeTrail, waitForConfirmation)` | Send a change trail to the worker; with `waitForConfirmation` the promise resolves once the worker has applied it, and rejects with a `ChangeTrailRefusedError` where the worker's Kernel refused it. A trail sent without a confirmation carries no serial, gets no answer, and therefore never reports a refusal. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `start()` | Spawn the worker and wait for the load handshake. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `destroy()` | Tears the environment down and terminates the worker — once it has acknowledged, or after `WorkerDestroyTimeout` if it stays silent. Takes effect whether or not a worker was ever spawned. On that message the worker tears its own kernel down — its entities are destroyed and the `onDestroy` callbacks of their Shadow Objects run — acknowledges with `Destroyed` once, and hears nothing after that. The environment stops listening to the worker as the teardown begins, so whatever it still sends -- a `MessageToView` among it -- does not arrive. |

**Events:**

| Event | Description |
| :--- | :--- |
| `RemoteWorkerEnv.WorkerLoaded` | Fired when the worker has completed its handshake. Receives the environment. Retained, so a late listener still gets it. A listener that throws ends the run where it stands -- the listeners behind it hear nothing -- but the retained value survives that, so whoever subscribes afterwards still gets it. A `workerLoaded` promise that was waiting behind the throwing listener is the exception: it stays pending until the environment fails or is torn down, and a fresh read of `workerLoaded` resolves from the retained value. |
| `RemoteWorkerEnv.WorkerFailed` | Fired when the worker dies or sends something that cannot be deserialized. Receives a `WorkerFailedEvent`. Retained, so a late listener still gets it. A listener that throws ends the run where it stands -- the listeners behind it hear nothing -- but the retained value survives that, so whoever subscribes afterwards still gets it. |

Both events are put back when a listener throws, so a consumer subscribing later still gets them. Two things that recovery costs are worth knowing before you subscribe. The listeners registered behind the throwing one never hear that event. And a listener subscribed to every event name -- an eventize wildcard subscription -- survives the sweep the recovery makes, because that sweep reaches the subscriptions of the one event name. At the default priority it hears the event exactly once, in the recovery: eventize serves the subscriptions of the name ahead of the wildcard ones, so the throw ends the first run before the wildcard is reached. A wildcard registered with a priority above the throwing listener runs ahead of it and hears the event twice.

`WorkerFailedEvent` fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `env` | `RemoteWorkerEnv` | The environment whose worker failed. |
| `type` | `'error' \| 'messageerror'` | `'error'` when the worker itself threw, `'messageerror'` when it sent something that could not be deserialized. |
| `message` | `string` | A readable description of the failure. |
| `reason` | `WorkerFailedError` | The error every pending and every later request is rejected with. |
| `event` | `ErrorEvent \| MessageEvent` | The worker event the failure was read from. |

A failure is final for this environment: the worker is terminated, `isDestroyed` becomes `true`, and everything still waiting for a reply -- along with every later `applyChangeTrail()`, `importScript()`, `start()` and `workerLoaded` -- is rejected with the `WorkerFailedError` right away instead of running into its timeout.

The two ends are told apart by the error they hand out: a worker that broke down reports a `WorkerFailedError`, a deliberate `destroy()` a `WorkerDestroyedError`. Both are final for that environment -- carry on with a fresh `RemoteWorkerEnv`. Both classes are exported from `@spearwolf/shadow-objects`.

**`destroy()` counts once, and it counts always.** It marks the environment destroyed whether or not a worker was ever spawned, so the `WorkerDestroyedError` the three methods above promise follows any teardown. Calling it a second time finds nothing left to do: no second `Destroy` goes out, and no worker is terminated twice.

**What the worker does with it.** In this order: it takes its kernel down, entity by entity, so the `onDestroy` callbacks of the Shadow Objects run while the thread is still alive; then it sends the `Destroyed` acknowledgement; from then on it discards every message that reaches it and takes its `message` listener off the global scope. One `Destroy` therefore means exactly one `Destroyed`: a second one is discarded like everything else, and the worker stays down -- there is no message and no call that starts it again.

Two things are worth knowing. A callback that throws is kept where it happened. The failure is logged under the name of the Shadow Object where its own hook or teardown failed, and under the uuid where the failure was the Entity's own. The Entity it belongs to is taken down all the same, the sweep carries on, and the acknowledgement goes out as always -- without it the view would sit out its `WorkerDestroyTimeout` and learn nothing it could act on. And what an `onDestroy` sends towards the view during this teardown does not arrive: the router unsubscribes from the kernel before taking it down, so that the acknowledgement is not overtaken by a message from a kernel that is on its way out. A `LocalShadowObjectEnv` delivers such a message, so this is the one point at which the two environments do not end alike.

A teardown settles what is still waiting. A `start()` caught in the middle of its load handshake rejects with a `WorkerDestroyedError` right away -- whether the worker was still coming up, went on to complete the handshake afterwards, or never answered at all; nothing sits out `WorkerLoadTimeout` for a reply that has nowhere left to go. An `applyChangeTrail()` or `importScript()` already on the wire goes the same way, and that cuts a real window: `destroy()` waits for the worker's `Destroyed` reply or `WorkerDestroyTimeout`, so the worker may well finish the change trail in the meantime and confirm it. That confirmation no longer reaches the caller -- the request is rejected at the moment of the teardown, whether it was going to succeed or run into its timeout. Send what has to arrive before you tear the environment down. `workerLoaded` follows the same rule: every promise of it that has not already resolved rejects, and so does every read after the teardown. A confirmation belongs to exactly one request, so a change trail that fails rejects only the caller holding its serial and an import that fails only the caller holding its url; requests running side by side settle on their own.

```typescript
import { on } from '@spearwolf/eventize';
import { RemoteWorkerEnv } from '@spearwolf/shadow-objects';

on(remoteEnv, RemoteWorkerEnv.WorkerFailed, ({ type, message, reason }) => {
  console.warn('worker failed:', type, message, reason);
});
```

### Worker Timeout Constants

These constants control how long the framework waits for worker responses:

| Constant | Default | Description |
| :--- | :--- | :--- |
| `WorkerLoadTimeout` | 60000ms | Time to wait for the worker to load. |
| `WorkerConfigureTimeout` | 60000ms | Time to wait for module imports. |
| `WorkerChangeTrailTimeout` | 5000ms | Time to wait for change trail confirmation. |
| `WorkerDestroyTimeout` | 5000ms | Time to wait for worker destruction. |

They are the last line of defence, not the first: a worker that dies or sends something unreadable rejects the waiting calls immediately.

They are also the default rather than the law: a single environment moves any of the four with the
[`RemoteWorkerEnv` constructor options](#remoteworkerenv), and a declarative one with the four
`<shae-worker>` [attributes](#shae-worker) that carry the same names.

```typescript
import {
  WorkerLoadTimeout,
  WorkerConfigureTimeout,
  WorkerChangeTrailTimeout,
  WorkerDestroyTimeout,
} from '@spearwolf/shadow-objects';
```

---

## FrameLoop

`FrameLoop` delivers a frame to every target that listens, driven by `requestAnimationFrame`. It is what `<shae-worker>` rides on when `auto-sync` is `frame`, and it is available on its own for any view or Shadow Object that wants to do work per frame.

| Symbol | Signature | Meaning |
| :--- | :--- | :--- |
| `FrameLoop.OnFrame` | `symbol` | The event name. |
| `FrameLoop.get()` | `(): FrameLoop` | The shared loop. Created on first read, the same instance afterwards, no cap on the frame rate. The instance lives in module state, so "shared" reaches as far as the module instance and no further -- see [Shared Registries](./concepts.md#shared-registries). |
| `new FrameLoop(maxFps?)` | `(maxFps?: number) => FrameLoop` | A loop of your own. `0`, negative and non-finite values mean: no cap. |
| `maxFps` | `number`, get/set | The cap, writable while the loop runs. |
| `subscriptionCount` | `number`, get | How many targets listen. Zero means the loop asks for no frames. |
| `start(target)` | `(target: object \| ListenerFuncType) => (() => void) \| undefined` | Subscribes the target and arms the loop. Returns the function that takes it off again. `null` and `undefined` are a no-op without a return value. |
| `stop(target)` | `(target: object \| ListenerFuncType) => void` | Takes the target off and cancels the pending frame once nobody listens any more. |
| `FrameData` | `{now: number; lastNow: number; frameNo: number; deltaTime: number}` | The payload of `OnFrame`. |

A loop with no subscribers asks for no frames: the last target to leave takes the loop off the browser, whether it leaves between two frames or from inside the frame handler itself. A target that subscribes while the last one leaves keeps the loop running with exactly one pending frame.

```typescript
import {FrameLoop, type FrameData} from '@spearwolf/shadow-objects';

const unsubscribe = FrameLoop.get().start(({deltaTime}: FrameData) => {
  advance(deltaTime);
});

unsubscribe();
```

A target can also be an object that carries the event name as a method:

```typescript
class Renderer {
  [FrameLoop.OnFrame]({now, deltaTime}: FrameData) {
    this.draw(now, deltaTime);
  }
}
```

`FrameLoop.OnFrame` is a `Symbol()`, not a `Symbol.for()`: subscribing through the global symbol registry with `Symbol.for('onFrame')` reaches nothing. Import the symbol from the class.

### Frame data

All four fields of `FrameData` carry seconds:

| Field | Meaning |
| :--- | :--- |
| `now` | The timestamp of this frame. |
| `lastNow` | The timestamp of the frame before it — equal to `now` on the first frame. |
| `frameNo` | The number of this frame, counted from one at the start of every run. |
| `deltaTime` | The time elapsed since the frame before it — `0` on the first frame. |

The first frame reports no delta rather than a delta against an empty predecessor, so no listener ever receives a `NaN`. A loop that has gone idle starts a fresh run when the next target arrives: that frame is frame one and reports no delta again, rather than handing out the length of the pause.

### Capping the frame rate

`maxFps` holds back the frames that arrive too early. The distance is measured from the last frame that was actually emitted, and the threshold is three quarters of the nominal frame time. Animation frames do not arrive at the nominal distance, and browsers differ in how coarsely they round the timestamps they hand out, so the threshold has room for that jitter: a cap at or above the refresh rate of the display lets every frame through, and a cap at half the refresh rate drops every second frame. A held-back frame still arms the next one, so the cap slows the loop down instead of stopping it. Between those two points the cap quantizes: the loop can only emit on a frame it is handed, so the rate it actually delivers is one of those reachable by dropping whole frames -- the refresh rate, its half, its third, and so on. Which of them a cap lands on is decided by the threshold, not by which one lies closest to the number you asked for. On a 144 Hz display, `maxFps = 90` delivers about 72 frames per second.

```typescript
const loop = new FrameLoop(30);
loop.maxFps = 60; // takes effect on the next frame
```

### Two import paths

```typescript
import {FrameLoop} from '@spearwolf/shadow-objects';          // view side
import {FrameLoop} from '@spearwolf/shadow-objects/FrameLoop.js'; // anywhere
```

The package entry point pulls the Custom Elements in with it and therefore needs a document. The subpath carries the class alone and works in a worker as well — use it in Shadow Objects, and the entry point only where the view layer is loaded anyway.

---

## Web Components

The framework ships a suite of Custom Elements that let you declare your Shadow Environment directly in HTML. These handle lifecycle, connection, and synchronization of the underlying `ViewComponent` and `ShadowEnv` classes.

---

### `<shae-worker>`

The root of any Shadow Objects application. Initializes the Shadow Environment (Worker or local) and manages the synchronization loop.

#### Attributes

| Attribute | Description |
| :--- | :--- |
| `src` | URL of the JavaScript file with your Shadow Object definitions. Required for the declarative approach. The value is trimmed. Changing it once the environment is ready imports the new module into it. |
| `local` | Runs logic on the Main Thread instead of a Web Worker. Read as a truthy value, not as a presence — see below. Default: Worker mode. |
| `auto-sync` | Controls sync frequency. See values below. |
| `ns` | Namespace (Component Context). Defaults to the Global Context. |
| `no-structured-clone` | Presence attribute. Disables `structuredClone` for a performance boost. Objects are passed by reference. Use with caution. Only takes effect together with `local`; without it, it is silently ignored. |
| `no-autostart` | Keeps the element from creating the Shadow Environment on connect. Call `start()` yourself. Read as a truthy value, not as a presence — see below. |
| `load-timeout` | How long the worker environment waits for the load handshake, in milliseconds. Default: `WorkerLoadTimeout` (60000). |
| `configure-timeout` | How long it waits for a module import to be confirmed, in milliseconds. Default: `WorkerConfigureTimeout` (60000). |
| `change-trail-timeout` | How long it waits for the confirmation of a change trail, in milliseconds. Default: `WorkerChangeTrailTimeout` (5000). |
| `destroy-timeout` | How long it waits for the worker to acknowledge the teardown before terminating it, in milliseconds. Default: `WorkerDestroyTimeout` (5000). |

**Truthy attributes are not presence attributes.** `local` and `no-autostart` read their value:
the attribute counts as set when it carries `on`, `true`, `yes`, `local` or `1` (case-insensitive,
surrounding whitespace ignored) — or when it stands there bare, `local` and `local=""` alike.
Every other value counts as unset, so `local="false"` stays in Worker mode and `no-autostart="0"`
autostarts. `no-structured-clone` is the odd one out and asks only whether the attribute exists at
all: `no-structured-clone="false"` disables `structuredClone` just as the bare attribute does.

`no-autostart` is not observed and is read exactly once, when the element connects. Setting or
removing it afterwards changes nothing.

**The four timeout attributes.** Each takes a number of milliseconds from `1` to `2147483647`
(close to 25 days); anything else — including `0`, `Infinity` and anything above the upper bound —
is reported to the console and the constant applies.
They are the declarative half of the [`RemoteWorkerEnv` constructor options](#remoteworkerenv),
which is where the rule and the reason behind it are written out. Like `no-autostart` they are not
observed: they are read at the one moment they matter, when the worker environment is built, and
setting one afterwards changes nothing about an environment that already exists. Under `local` they
do nothing and say nothing — a local environment waits for no reply and has none of the four.

Changing `local` after the environment has been created is refused: the write is reported through
the `ConsoleLogger` (`logger.error`, not gated behind `ConsoleLogger.sharedConfig.enable`) and the
attribute is written back to the canonical spelling of the environment that is actually in effect —
the bare `local` attribute for a local environment, or its absence for a worker environment. A write
that does not move the effective value (`local` to `local="yes"`) does nothing and reports nothing.
Switching environments requires building a new `<shae-worker>` element. On an element built and
`start()`ed by hand while it was never in the document, the report is immediate but the write-back
is parked until the first connect, so `hasAttribute('local')` reads the refused value until then.

**`auto-sync` values:** the value is trimmed and lower-cased before it is read.

| Value | Behavior |
| :--- | :--- |
| `"frame"` / `"on"` / `"yes"` / `"true"` / `"auto-sync"` | Syncs every animation frame via `requestAnimationFrame`. (Default) |
| `auto-sync=""`, or the attribute removed | Falls back to `"frame"`. |
| `"60fps"` or any `Nfps` with N greater than 0 | Syncs every `Math.floor(1000 / N)` milliseconds. |
| `"0fps"` or any `Nfps` with N of 0 or less | Reports through `logger.warn` and syncs not at all. |
| A number (e.g., `"100"`) | Syncs every N milliseconds. A number of 0 or less switches syncing off without a report. |
| `"no"` / `"off"` / `"false"` | Disables auto-sync. Call `.syncShadowObjects()` manually. |
| Anything else | Reports through `logger.error` and switches syncing off. |

```html
<!-- Worker mode (default) -->
<shae-worker src="./my-game-kernel.js"></shae-worker>

<!-- Main thread mode -->
<shae-worker src="./kernel.js" local></shae-worker>

<!-- Custom sync rate -->
<shae-worker src="./kernel.js" auto-sync="30fps"></shae-worker>

<!-- Manual sync control -->
<shae-worker src="./kernel.js" auto-sync="off"></shae-worker>
```

#### JavaScript API

| Method | Description |
| :--- | :--- |
| `start()` | Creates the Shadow Environment and waits until it is ready. The element calls it on connect by itself, unless `no-autostart` is set. |
| `importScript(src)` | Waits for the environment and imports a shadow objects module into it. Rejects with a `ShadowEnvDestroyedError` when the environment is torn down before the import begins. A blank `src` rejects with `Error('src is blank')` — the method is `async`, so nothing is thrown at the call site and a `try`/`catch` around it catches nothing; use `await` or `.catch()`. |
| `syncShadowObjects()` | Hands the environment of this element's namespace to the next sync. The call is collected per namespace and carried out one microtask later, so calling it more than once in a task costs one sync. Needed with `auto-sync="off"`. Inherited from `ShaeElement`, which means `<shae-ent>` has it too. |
| `destroy()` | Tears down the environment, its proxy and the element's signals. Called by the element itself one microtask after it leaves the tree, unless it is back in the tree by then. It counts once: every call after the first finds nothing left to do and changes nothing. |

**The subscriptions begin at the first connect.** A `<shae-worker>` built with
`document.createElement()` and never put into a document listens to nothing — it holds its
`ShadowEnv`, but no effect and no event subscription — so nothing on the module level points at it.
Here that call runs exactly once: an element this teardown has reached is turned away at the door.

> **`start()` before the first connect costs two things.** The method is public, and calling it on
> an element that is out of the document builds the environment while nothing on the element is
> listening yet. The `contextcreated` event for that environment is therefore not dispatched — nor
> is `contextlost`, should the environment lose its connection before the element connects; both
> fire once, at a moment that has passed by the time the element has listeners. And where `ns` is
> changed between that `start()` and the first connect, `shadowEnv.view` keeps naming the context of
> the namespace the element was started with: `start()` resolves the view once, and the binding that
> follows an `ns` change is not up yet. A write of `ns` after the first connect moves it as usual,
> and assigning `shadowEnv.view` by hand settles it at any point. A `src` set in that window is not
> affected — the import is caught up on connect. The declarative path meets none of this: an element
> that connects before it starts has its listeners in place first.

**Leaving the tree and coming back.** The teardown waits one microtask. An element that is
back in the document before that microtask runs keeps everything it had: the same
`ShadowEnv`, the same proxy, the same entities in it, and `start()` resolves as before — a
re-render that removes and re-inserts the element within one task costs nothing. An element
still out of the tree when the microtask runs is destroyed, and destroyed for good:
`shadowEnv.isDestroyed` is `true`, `shadowEnv.envProxy` is gone, and a later `start()`
rejects with a `ShadowEnvDestroyedError`. Putting that element back into the document does
not revive it — build a new one. `<shae-ent>` elements of the same namespace keep their
`ViewComponent`s either way; what goes is the environment behind them.

**And that is where this element parts from the other two.** `<shae-ent>` and `<shae-prop>` carry
`destroy()` and `isDestroyed` as well, and mean something weaker by them: those elements release
their subscriptions, keep their state and take everything up again when they return to the
document — see [Leaving the Tree and Coming Back](#leaving-the-tree-and-coming-back). Here the
teardown takes the environment with it, so there is nothing to return to.

| Property | Description |
| :--- | :--- |
| `shadowEnv` | The `ShadowEnv` this element owns, read-only. Available before the environment is started. |
| `isDestroyed` | Read-only: whether the element has been torn down. Once `true` it stays `true` — putting the element back into the document does not change it. |
| `logger` | The `ConsoleLogger` this element reports through, read-only. |
| `autostart` | Whether the element may start on connect. Writable, defaults to `true`; the `no-autostart` attribute is the declarative half of the same decision. |
| `shouldAutostart` | Read-only: `autostart` and the `no-autostart` attribute taken together. This is what the element asks when it connects. |
| `autoSync` | The current `auto-sync` value. **Writing takes strings only:** any other value is read as a flag — a truthy one becomes `"frame"`, a falsy one `"no"`. `el.autoSync = 30` therefore syncs every frame, while `auto-sync="30"` is a 30-millisecond interval. Every value other than the frame default is reflected into the attribute; the frame default is written only when the attribute is already there. |
| `frameLoop` | The [`FrameLoop`](#frameloop) driving the frame-based sync, taken on first read. There is one per module instance — every element that reads it from the same copy of the package gets the same instance, while a second copy on the page drives a loop of its own; see [Shared Registries](./concepts.md#shared-registries). |
| `ns` | The namespace, get and set, inherited from `ShaeElement`. Writing trims the value and reflects it back into the `ns` attribute; an empty value removes the attribute and returns the element to the Global Context. |
| `isShaeWorkerElement` | `true`. `isShaeElement` is `true` as well, inherited from `ShaeElement`. |
| `ShaeWorkerElement.DefaultAutoSync` | Static, `"frame"` — what an empty `auto-sync`, a removed one and any truthy non-string assignment fall back to. An unreadable value does *not* come here; it is reported and switches syncing off. |
| `ShaeWorkerElement.observedAttributes` | Static: `ns`, `local`, `src`, `no-structured-clone`, `auto-sync`. `no-autostart` and the four timeout attributes — `load-timeout`, `configure-timeout`, `change-trail-timeout`, `destroy-timeout` — are deliberately not among them. |

The four signals `isConnected$`, `autoSync$`, `src$` and the inherited `ns$` are part of the
surface as well: read them with `.value` or subscribe to them. They are what the attributes feed —
`src$` carries the trimmed `src`, `autoSync$` the value behind `autoSync`, `isConnected$` whether
the element sits in the tree.

`[FrameLoop.OnFrame]` is the method the frame loop calls; it syncs. The inherited
`syncShadowObjectsOf()` is `protected` and meant for subclasses. The Custom Elements callbacks —
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` — are implemented; a
subclass that overrides one has to call `super`.

#### DOM Events

The element mirrors four of the `ShadowEnv` events onto itself as `CustomEvent`s, so the declarative setup has the same information available as the programmatic one. The names are lower-cased; `detail` always carries `shadowEnv`. `ShadowEnv.AfterSync` is *not* among them — it fires on every successful cycle, which makes it a poor fit for the DOM, and it stays on the `ShadowEnv`. Its counterpart `ShadowEnv.SyncFailed` is mirrored, because a refused change trail is the kind of thing a declarative setup has to be able to hear.

| Event | `detail` | When |
| :--- | :--- | :--- |
| `contextcreated` | `{shadowEnv}` | The environment became ready. |
| `contextlost` | `{shadowEnv}` | The environment lost its connection. |
| `proxyfailed` | `{shadowEnv, reason}` | The proxy lost the Shadow Environment it stands for. `contextlost` follows. |
| `syncfailed` | `{shadowEnv, reason, changeTrail}` | The Shadow Environment could not apply the change trail of a cycle. The environment stays ready, and the trail in the `detail` is what did not arrive. |

All four are dispatched with `bubbles: false` and without `composed`, so they are only heard on
the element itself — there is no delegation to an ancestor and none across a shadow boundary.

```javascript
const worker = document.querySelector('shae-worker');

worker.addEventListener('proxyfailed', (event) => {
  console.warn('the shadow environment went away:', event.detail.reason);
});
```

---

### `<shae-ent>`

Represents an Entity (game object) in the Shadow Environment. Corresponds to a `ViewComponent` instance.

`<shae-ent>` elements do not need to be children of `<shae-worker>`. You can place the worker anywhere (e.g., at the end of `<body>`) and scatter entities throughout your layout. As long as the `ns` matches, they connect.

#### Attributes

| Attribute | Description |
| :--- | :--- |
| `token` | The Token (Component Tag) matching a registered Shadow Object constructor. Optional: an entity without one carries the void token `#void` and matches no Shadow Object. Removing the attribute takes the entity back to it. |
| `ns` | The context this entity belongs to. Must match the `ns` on `<shae-worker>` when using named contexts. Can be changed at runtime, see [Entity Hierarchy](#entity-hierarchy). |
| `forward-custom-events` | Re-dispatches events from the Shadow Object as DOM `CustomEvent`s on this element. Present with an empty or whitespace-only value: every event. A comma-separated list: only the types it names — `forward-custom-events="true"` forwards the type named `true` and nothing else. Absent, or a list that names no type: nothing is forwarded. |

```html
<shae-ent token="my-player"></shae-ent>
```

Both `ns` and `token` are also readable and writable from JavaScript, and both are normalized on
the way in. `el.ns = '  hud  '` leaves `ns="hud"` in the DOM, and an empty namespace removes the
attribute and returns the element to the Global Context. The `token` attribute is trimmed when it
is read, and the trimmed value goes back onto the attribute: on a live element both
`el.token = '  x  '` and `setAttribute('token', '  x  ')` end at `token="x"`, and
`el.token = undefined` removes the attribute. Markup is no exception — `<shae-ent token="  x  ">`
reads `token="x"` once the element has connected, because connecting is where the element takes the
reflection up and writes what its signals carry out to the attributes. Only before that first
connect does the attribute still say what was written into it.

**Forwarding events example:**

```html
<!-- Forward all events -->
<shae-ent token="game-level" forward-custom-events></shae-ent>

<script>
  const ent = document.querySelector('shae-ent');
  ent.addEventListener('level-complete', (e) => {
    console.log('Level completed!', e.detail);
  });
</script>

<!-- Forward specific events only -->
<shae-ent token="game-level" forward-custom-events="score-changed,level-complete"></shae-ent>
```

Three events are never forwarded, not even without a filter list:
`ComponentContext.ReRequestParentRoots`, `ComponentContext.ReRequestParent` and
`ComponentContext.ReRequestEntHost`. They are the internal signals of the parent resolution and
stay on the view side.

#### JavaScript API

| Member | Description |
| :--- | :--- |
| `token` | The Token, get and set. Writing reflects into the `token` attribute; `undefined` removes it. |
| `ns` | The namespace, get and set, inherited from `ShaeElement`. Writing trims and reflects; an empty value removes the attribute and returns the element to the Global Context. |
| `uuid` | The uuid of the `ViewComponent`, read-only. `undefined` while the element has none. |
| `viewComponent` | The `ViewComponent` this element stands for, read-only. |
| `componentContext` | The `ComponentContext` of its namespace, read-only. |
| `entParentNode` | The `<shae-ent>` this entity hangs on — the resolved entity ancestor, which is not the DOM parent node. A writable field; the next lookup decides it again. |
| `isShaeEntElement` | `true`. `isShaeElement` is `true` as well, inherited from `ShaeElement`. |
| `findShadowRootHost()` | The host element of the shadow root this element sits in, or `undefined` outside one — the answer is decided again whenever the element enters or leaves the tree, and an element that has left it sits in no shadow root. |
| `onParentChanged(newParent, oldParent)` | Called when the element leaves its parent node. Re-resolves the entity ancestor; an extension point for subclasses, which have to call `super`. |
| `syncShadowObjects()` | Hands the environment of this element's namespace to the next sync, one microtask later. Inherited from `ShaeElement`. |
| `destroy()` | Releases every subscription this element holds. Called by the element itself one microtask after it leaves the tree, unless it is back in the tree by then. It counts once: every call after the first changes nothing. Reversible — see [Leaving the Tree and Coming Back](#leaving-the-tree-and-coming-back). |
| `isDestroyed` | Read-only: whether the element is released right now. Back to `false` the moment it reconnects. |
| `ShaeEntElement.observedAttributes` | Static: `ns`, `token`, `forward-custom-events`. |

The signals `token$`, `viewComponent$`, `componentContext$`, `forwardCustomEvents$` and the
inherited `ns$` are public, not `protected` — read them with `.value` or subscribe to them.
`forwardCustomEvents$` matters twice over: there is no `forwardCustomEvents` accessor, so the
signal is the only way to set the filter from JavaScript. The attribute is the serialized form of
the signal: `false` and an empty `Set` remove it, a `Set` writes the comma-separated list, and
`true` sets it to the empty string, whatever stood there before. The element compares spellings and
not meanings, and writes wherever the two differ: `forward-custom-events="foo, bar"` becomes
`forward-custom-events="foo,bar"`, and `forward-custom-events="   "` — a whitespace-only value,
which reads as "every event" — becomes the empty string that spells the same thing. An attribute
already carrying the exact serialization is the one case left untouched.

```javascript
const ent = document.querySelector('shae-ent');

ent.forwardCustomEvents$.set(true);                       // forward-custom-events="", replacing any filter list
ent.forwardCustomEvents$.set(new Set(['score-changed'])); // forward-custom-events="score-changed"
ent.forwardCustomEvents$.set(false);                      // attribute removed
```

The element reads the attribute back whenever it connects, and the forwarding follows that result.
Signal, attribute and what actually reaches the DOM therefore say the same thing over the whole
lifecycle, across any number of removals and re-appends — the first connect included, where the
element writes each of these signals out before it reads anything back. That is where markup reaches
the canonical spelling: `forward-custom-events=" , , "` names no event type, so the attribute is
removed, and `token="  x  "` becomes `token="x"`. The one window in which the two can disagree
closes on its own: an element that has been out of the document long enough to be released holds no
reflecting handler, so a write in that state reaches the signal and not the attribute — and the
element writes it out as it reconnects, before it reads any attribute back. The signal wins that
exchange, never the attribute left standing on the older value.

`getParentNodeForObserver()` and the inherited `syncShadowObjectsOf()` are `protected` and meant
for subclasses, and so is `logger`, a `ConsoleLogger` in the namespace `ShaeEntElement` — see
[Console Logger](#console-logger) for `ConsoleLogger.ShaeEntElement.enable`. That switch decides
the `isDebug`, `isInfo` and `isWarn` getters on this element's own logger, not the `debug`, `info`
and `warn` calls themselves, which print whatever a caller passes to them regardless; `error` has
no such getter on any `ConsoleLogger` instance either, so a report at that level — the refused join
below among them — reaches the console whatever the switch says. The Custom Elements callbacks —
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` — are implemented; a
subclass that overrides one has to call `super`.

Two more `protected` methods carry the lifecycle, and a subclass that holds subscriptions of its own
has to use both or lose them. `teardown()` is the overridable half of `destroy()` — release what the
subclass holds and call `super.teardown()` last. `restore()` is its counterpart — call
`super.restore()` first, take the same subscriptions up, and write any signal that reflects
into an attribute back out while doing so, because `connectedCallback` reads those attributes
immediately afterwards. `restore()` runs from `connectedCallback`, on the first connect as well as
on a return after a release; a constructor takes no subscriptions up, and a subclass constructor
must not either — it reads attributes into signals and leaves it at that. Overriding `destroy()` itself is possible but rarely right: the guard that
makes the teardown run once, and run once even when releasing something calls back into the element,
lives there. A subclass that overrides `teardown()` without overriding `restore()` works exactly
once — after the first release its own subscriptions are gone for the life of the element, with
nothing reported.

#### Leaving the Tree and Coming Back

**Subscriptions begin at the first connect.** An element that has been built and never put into a
document holds no effect, no signal subscription and no event listener, so nothing on the module
level points at it and it can be collected. `restore()` is what takes them up, and the first connect
calls it exactly the way a return after a release does. This holds for all three elements.

Three further things hold for an element that leaves the document. The first two hold for
[`<shae-prop>`](#shae-prop) as well; on the third the two elements differ, and that section says how.

**A move inside one task costs nothing.** The release waits one microtask, and an element that is
back in the document before that microtask runs never sees it — `isDestroyed` stays `false` and
nothing is set up again. Every re-render that removes a node and re-inserts it within the same task
falls into that window.

**An element that stays out lets go.** One microtask after it left, `destroy()` runs: every effect,
every signal subscription and every event listener the element holds comes off, `isDestroyed` reads
`true`, and nothing on the module level points at the element any longer — it can be collected. The
`ViewComponent` is not ended along with it: leaving the tree already took it out of its
`ComponentContext`, and ending it as well would take the entity down in the worker.

**An element that comes back picks up where it left off.** Reconnecting sets `isDestroyed` back to
`false` and takes every subscription up again. The element carries the same `ViewComponent`, the
same `uuid`, the same token and the same properties it left with, because its signals were never
destroyed — they held their values throughout.

A `token`, `ns` or `forward-custom-events` written while the element was released lands in the
signal, where nothing is listening to carry it onto the attribute. The element settles that itself
on the way back in: it writes those three signals out to their attributes before it reads any
attribute back, so the newer value wins and the older one on the attribute is overwritten, not the
other way round. Reading `el.getAttribute('token')` on a released element therefore shows the value
it had when it left; reading it once the element is connected again shows the value that was
written.

`destroy()` is callable by hand for an element whose end is known earlier, and it means the same
thing there: released, not finished. An element released while it is still *in* the document stops
answering the parent and host requests that travel past it — an entity or property below it binds
further up instead of to something that no longer maintains the binding — and it does not take its
own subscriptions up again until it has left the document and come back. Removing it and
re-inserting it is the way back; re-inserting one that never left is not, because it never
reconnects.

> **`<shae-worker>` is the exception.** Its `destroy()` and `isDestroyed` name something else: that
> teardown takes the Shadow Environment with it, and an environment cannot be rebuilt. A
> `<shae-worker>` that was released stays released, and re-inserting it into the document does
> nothing — see [`<shae-worker>`](#shae-worker) for its own account of the same window. Do not read
> the one element's lifecycle off the other.

#### A context the entity cannot join

Assigning a `ComponentContext` to a `ViewComponent` can be rejected two ways: another component of
that context already holds the uuid (`ComponentUuidInUseError`), or the context itself has been
disposed (`ComponentContextDisposedError`) — see [Assigning a context](#assigning-a-context) and
[`dispose()`](#dispose). `<shae-ent>` attempts this assignment on every connect and on every
namespace change, from `connectedCallback()` and from the `componentContext$` signal it maintains,
and neither call site has anywhere of its own to send a throw: the first is a custom element
reaction, whose exception the browser reports to the global `error` event instead of the code that
triggered the connect; the second runs inside a signal effect, whose exception signalize collects
and re-throws out of whichever `set()` started the effect chain — which can be a plain `el.ns = …`
assignment several calls up. `<shae-ent>` catches the rejection at the one place both routes go
through and reports it on its own `logger` instead of letting either escape.

What the element is afterwards depends on which of the two errors it was, and on whether it
already had a `ViewComponent`. A uuid already in use costs the component whatever context it had:
the setter has already left that context, if there was one, before the failure surfaces, so
`viewComponent.isDestroyed` reads `true` no matter what stood there before. A disposed context is
rejected before anything is undone, so the component keeps exactly the context it already had —
`isDestroyed` stays `true` where it had none, the ordinary case right after leaving and re-entering
the tree, but stays `false` where it still held a live one — reachable only by writing
`componentContext$` to a disposed `ComponentContext` reference directly, never through `ns`: a
namespace switch resolves through `ComponentContext.get(ns)`, which hands out a fresh context for
any namespace `dispose()` has freed, so it can never pass a disposed one on. On the very first
join, before any `ViewComponent` exists, a rejected `new ViewComponent(…)` never reaches the point
that would have set `viewComponent$` — `viewComponent` stays `undefined`, not a destroyed instance.
What changes every time, whichever of these it is: `componentContext` already names the context
the join was refused from. The rest of
the connect or namespace change still runs regardless: a parent request goes out, hosted slots are
collected, `syncShadowObjects()` runs. An entity that hung on this element and asked it for
parenthood gets an answer either way.

The way back is the next *change* of `componentContext$`, not any particular fix to the rejection's
cause. A further namespace switch, or leaving the tree and re-entering it, writes the signal to a
new value and the join is attempted again — reviving the same `ViewComponent` under the same uuid
if it succeeds this time. Writing the same namespace a second time is not such a change: the signal
reports nothing, the listener does not run, and the entity stays exactly as rejected as before, even
once whatever blocked the first attempt is gone.

#### Entity Hierarchy

Nesting `<shae-ent>` elements creates parent-child relationships in the Shadow Environment.

```html
<shae-ent token="solar-system">
  <shae-ent token="planet">
    <shae-ent token="moon"></shae-ent>
  </shae-ent>
</shae-ent>
```

The parent is resolved when an element connects: it is the closest `<shae-ent>` on the ancestor
path that answers at that moment, across shadow boundaries and slot projections.

**An entity takes its parent from its own namespace only.** The request an element sends out names
the namespace it stands in, and an entity of another one lets that request pass instead of
answering it — a `<shae-ent ns="hud">` between a child and its parent entity is not there as far as
that binding is concerned, and it does not stop it either. This is the opposite of the rule
`<shae-prop>` follows, where proximity decides and membership does not count for anything; see
[Finding the Host Entity](#finding-the-host-entity).

An answer is not the same thing as a parent link. An ancestor whose entity sits in a different
`ComponentContext` answers the request and becomes this element's `entParentNode`, but the entity
tree does not follow: `viewComponent.parent` stays empty. The request goes out once more a microtask
later, gets the same answer, and the matter rests there — the element keeps its `entParentNode` and
its entity keeps no parent, without the two feeding each other. An entity that holds no
`ComponentContext` reads the same way: it stands in no entity tree, so `viewComponent.parent` stays
empty while `entParentNode` names the ancestor that answered. That is what a `<shae-ent>` looks like
after a `ComponentContext.clear()` while it stays in the document, until its component is taken back
in.

Three things happen after that and are picked up on their own: an element that is itself an entity —
a subclass of `ShaeEntElement`, say, loaded from a lazy module — and that is registered with
`customElements.define()` while the markup around it already sits in the document takes the
entities below it under itself; a change to a `<slot>` assignment re-binds what the slot projects,
and so does moving the `<slot>` element itself; and an entity that stays in the tree
while its parent entity leaves it looks for the closest ancestor still answering. None of this
needs the application to trigger anything.

The first two take effect one microtask after the change, the third right away — the parent leaving
is the one case the entity hears about directly instead of through a round over its peers. Read
`entParentNode` in the same step as a `customElements.define()` or a slot change and you read the
state from before; `await Promise.resolve()` first.

Everything that becomes an entity in one task is answered by a single round, and that round is what
keeps the cost of a large namespace flat: a round is a broadcast, so one round per arriving entity
would cost n(n+1)/2 messages for n entities coming up together, each message a full ancestor
request through the DOM — a bill that passes a frame at around 145 entities in one namespace and
passes a quarter of a second at six hundred. One round per task costs n messages instead, and
stays clear of a frame over the whole measured range, up to six hundred entities coming up
together.

The move is followed wherever the slot goes: into another entity, into a part of the same shadow
root with no entity above it, and `slot.remove()` along with the window until the slot is put back.
`slotchange` is not `composed` and reaches only the shadow root the slot has landed in, so the
entity giving the slot away hangs its listener on the `<slot>` element itself and hears the event
wherever the slot ends up. What stands at the destination therefore decides nothing about whether
the move is announced.

An entity picks a slot up when the slot reports an assignment, and it lets go of every slot it
holds when it leaves the tree. Entering the tree is the counterpart: the entity takes up the slots
below it that project something, so a shadow host that leaves the document and is inserted again
answers for what its shadow root holds exactly as it did before. The assignment inside that shadow
root does not change on the way, so nothing reports it — and the entity does not wait to be told.

Where the projection ends up is what the flattened tree says, and no answer is a result as well. A
projected `<shae-ent>` that finds nothing of its own namespace above the slot has no parent
afterwards: `entParentNode` and `viewComponent.parent` are both empty and the entity is a root of
its `ComponentContext`, until something above it answers again. A `<shae-prop>` asks no question
about namespaces and takes the closest entity there is; with none above it, it has no host — see
[Finding the Host Entity](#finding-the-host-entity).

A change of `ns` at runtime takes the entity along into the other environment: it leaves the
`ComponentContext` of one namespace and joins the one of the other. The binding to the ancestor is
resolved again in both directions — for the element itself, and for the entities that hung on it,
which look for the closest ancestor answering in their own namespace.

The entity keeps its uuid, its token, its order and its properties on the way over, so the shadow
object created for it in the other environment starts from the state the view holds. Events
already dispatched do not travel: they are delivered in the environment they were addressed to,
which is the one the entity still lives in at that moment.

Everything else keeps the parent it resolved. One case is worth knowing: a move that leaves an
element attached to the same parent node — a container inserted between it and its parent — goes
unseen. A move that takes it out of its parent node is noticed, whether the element runs through
disconnect and reconnect on the way or is watched across the move.

#### Driving the Lookup by Hand

Both elements find the entity above them by asking for it. The question travels as a bubbling,
composed `CustomEvent`, and the ascent of a composed event *is* the ascent through the flattened
tree — which is why the lookup sees slot projections and closed shadow boundaries. The request is
exported, so an element of your own can ask the same question.

```javascript
import {requestEntAncestor} from '@spearwolf/shadow-objects';

class MyWidget extends HTMLElement {
  connectedCallback() {
    requestEntAncestor(this, {
      answer: (entNode) => {
        this.entNode = entNode;
      },
    });
  }
}
```

`requestEntAncestor(requester, request)` takes everything of an `EntAncestorRequest` except the
`requester` — the sender is set by the function and cannot be overwritten by the caller.

| `EntAncestorRequest` | Description |
| :--- | :--- |
| `requester` | The element asking. Set by `requestEntAncestor`. |
| `ns` | Optional. With it, only an entity of that namespace answers; without it, the closest entity answers whatever namespace it is in. `<shae-ent>` sends its own namespace, `<shae-prop>` sends none. |
| `answer(entNode)` | Called by the first ancestor that matches. It stops the event right afterwards, so the answer comes from the closest match and never twice. |

An event built by hand is only answered when its `detail` carries an `answer` function. Without
one it passes every entity untouched and is not stopped — the entity has no way to reply, so it
does not treat the event as a request at all.

Three event names are exported, together with the event types and the event map that puts them
into `HTMLElementEventMap` — an `addEventListener` for any of them is typed without a cast:

| Constant | Value | Sent by |
| :--- | :--- | :--- |
| `RequestEntParentEventName` | `'shaeRequestEntParent'` | Anyone looking for the entity above them. Type: `RequestEntParentEvent`. |
| `ReRequestEntParentEventName` | `'shaeReRequestEntParent'` | A `<shae-ent>` inside a shadow root whose slot assignment changed. Type: `ReRequestEntParentEvent`. |
| `ReRequestEntHostEventName` | `'shaeReRequestEntHost'` | A `<shae-ent>` that starts or stops answering host requests. `<shae-prop>` listens for it and asks again. Type: `ReRequestEntHostEvent`. |

```typescript
import type {ShadowEntsEventMap} from '@spearwolf/shadow-objects';

const keys: (keyof ShadowEntsEventMap)[] = ['shaeRequestEntParent'];
```

**Registration order does not matter.** The three registration modules are independent and can be
imported one at a time:

```javascript
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-worker.js';
```

An element that becomes an entity while the markup around it already stands announces itself to
everything below it: entities look for their parent once more, properties for their host. The same
holds for a subclass of `ShaeEntElement` registered from a lazily loaded module. Both take effect
one microtask after `customElements.define()` returns — the two channels wait for the tree to stop
moving, and everything that becomes an entity in one task is answered by one round.

Wrapping the built-in elements in tags of your own is walked through in [Guides → Registering Your Own Entity Elements](./guides.md#registering-your-own-entity-elements).

---

### `<shae-prop>`

Declaratively sets properties on the entity above it.

#### Finding the Host Entity

The element binds to the closest entity above it, measured on the flattened tree — the tree as the
page renders it. The search goes through shadow roots, follows slot projections to the entity that
holds the `<slot>`, and crosses closed shadow boundaries just as well.

The lookup runs when the element enters the tree, every time it is moved, and every time a change
above it is announced — which is every change but the one named at the end of this section. A
custom element whose tag is registered late takes the properties under it along
the moment it upgrades; a shadow root attached afterwards takes over what its slots project; a
changed slot assignment is followed. When the host entity leaves the tree, the property looks for
the next entity above it and binds to that one. If nothing answers, it has no host and the property
is taken off the entity it left.

Moving the `<slot>` element itself out of one entity and into another is followed too, and it is
the one case that takes the long way round: `slotchange` fires after the move and therefore at the
new position, where the entity that lost the projection has no name any more. The new entity above
the slot therefore asks every entity and every property in every namespace to look again, and the
answers sort themselves out. Like every change above an element, it takes effect one microtask
later.

The destination decides nothing about whether the move is announced. A `<slot>` that lands in a
part of its shadow root with no entity above it is followed just as well, and so is `slot.remove()`
along with the window until the slot is put back: `slotchange` is not `composed` and reaches only
the shadow root the slot has landed in, so the entity that gives the slot away is the one that
reports the loss — it listens on the `<slot>` element itself. The property then binds to the
closest entity the flattened tree still shows above it, and to none where there is none.

The timing is worth knowing, because the code does not show it: a re-binding takes effect one
microtask after the change, not in the same step. Rebuild the tree and read `entNode` right
afterwards and you read the state from before. This is the timing of the re-request channel — of
every message that says "something above you changed" — and a `<shae-ent>` follows it just the
same, so the two sides of a re-binding land together. The first lookup, the one the element makes
when it enters the tree, is synchronous, and letting go when the element leaves runs in a microtask
of its own.

A `<shae-prop>` with no entity anywhere above it sets its property nowhere and reports that once
through the `ConsoleLogger`. Once means once per element, not once per lookup: the re-request
channel repeats the same question every time anything above the element changes, and only the
first unanswered lookup is reported. An element on its way out of the tree reports nothing — the
report needs the element to be connected, because a departing element is not one that is missing a
host. The report is a `warn` and therefore gated behind `ConsoleLogger.sharedConfig.enable`, which
defaults to "the page is served from localhost" — off a localhost page the case is silent.

The namespace plays no part in it: what counts is proximity, not membership. A `<shae-prop>` under
a `<shae-ent ns="hud">` inside a `<shae-ent>` of the global namespace belongs to the `hud` entity,
because that is the closest one. Entities bind by the opposite rule — a `<shae-ent>` takes its
parent from its own namespace only, and an entity of another one is invisible to it; see
[Entity Hierarchy](#entity-hierarchy). Both rules run on the same request, which is described
under [Driving the Lookup by Hand](#driving-the-lookup-by-hand).

A `<shae-prop>` nested in another `<shae-prop>` passes through to the entity — only a `<shae-ent>`
can host a property.

```html
<shae-ent id="host" token="player">
  <div id="widget"></div>
</shae-ent>

<script>
  // the property lands on #host, across the shadow boundary
  document.getElementById('widget').attachShadow({mode: 'open'}).innerHTML =
    '<shae-prop name="score" value="100" type="int"></shae-prop>';
</script>
```

#### Attributes

| Attribute | Description |
| :--- | :--- |
| `name` | Property name to set on the Shadow Object. The value is trimmed; an empty or whitespace-only `name` binds nothing. |
| `value` | Property value. Always a string in HTML; use `type` to cast it. An empty attribute (`value=""`) counts as a missing one and sets no property at all. |
| `type` | Casts the string value to a JavaScript type. See supported types below. An unknown type name is reported and leaves the value a string. |
| `no-trim` | Preserves leading/trailing whitespace. Read as a truthy value, not as a presence: `no-trim="false"` and `no-trim="0"` still trim, while `no-trim`, `no-trim=""`, `no-trim="true"`, `on`, `yes`, `local` and `1` keep the whitespace. By default string values are trimmed — a whitespace-only value therefore becomes the empty string, and `type` converts it from there (`type="number" value="   "` is `0`). |

**Supported `type` values:**

| Type | Result |
| :--- | :--- |
| `string`, `text` | String (default). |
| `number` | `Number()` |
| `float` | `parseFloat` |
| `int`, `integer` | `parseInt` (base 10) |
| `hex`, `hexadecimal` | `parseInt` (base 16) |
| `oct`, `octal` | `parseInt` (base 8) |
| `bin`, `binary` | `parseInt` (base 2) |
| `bigint` | `BigInt()` |
| `boolean`, `bool` | `true` / `false` |
| `json` | `JSON.parse` |
| `number[]`, `float[]`, `int[]`, `integer[]` | Splits on whitespace only, then converts each element. `value="1,2,3"` is a single unsplit element, not three. |
| `[]`, `string[]`, `text[]`, `hex[]`, `hexadecimal[]`, `oct[]`, `octal[]`, `bin[]`, `binary[]`, `bool[]`, `boolean[]` | Splits on any run of non-word characters — whitespace, commas, semicolons, etc. |
| `float32array`, `float64array` | Splits on whitespace only, like the numeric array types above. |
| `int8array`, `uint8array`, `uint8clampedarray`, `int16array`, `uint16array`, `int32array`, `uint32array`, `bigint64array`, `biguint64array` | Splits on any run of non-word characters, like the string/hex/oct/bin/bool array types above. |

`boolean` and `bool` recognize exactly five spellings of truth, case-insensitively: `on`, `true`,
`yes`, `local` and `1`. Everything else is `false` — `value="0"` and `value="2"` alike. The same
five apply per element to `bool[]` and `boolean[]`.

#### JavaScript API

| Member | Description |
| :--- | :--- |
| `name` | The property name, read-only. Mirrors the `name` attribute, trimmed. |
| `value` | Reads the converted value. Writing bypasses the `value` attribute and feeds the conversion directly — the attribute keeps whatever it had. `0`, `false` and `''` are values and are set as such; `null` and `undefined` clear the property (see `ViewComponent.setProperty` above). A value that is not a string passes through untouched, even with a `type` set, because the conversion only applies to strings. |
| `shouldTrim` | Whether string values are trimmed, read-only. The inverse of the `no-trim` attribute. |
| `entNode` | The host entity, get and set. Writing it binds the property to that entity by hand — the next lookup decides again from where the element stands. |
| `viewComponent` | The `ViewComponent` of the host entity, read-only. Follows `entNode` and is `undefined` without a host. |
| `isShaePropElement` | `true`. This element does not extend `ShaeElement`, so there is no `isShaeElement` and no `ns` on it. |
| `destroy()` | Releases every subscription this element holds. Called by the element itself one microtask after it leaves the tree, unless it is back in the tree by then. It counts once: every call after the first changes nothing. Reversible — see below. |
| `isDestroyed` | Read-only: whether the element is released right now. Back to `false` the moment it reconnects. |
| `ShaePropElement.observedAttributes` | Static: `name`, `value`, `type`, `no-trim`. |

Unlike the two other elements, `<shae-prop>` keeps its signals to itself: `entNode$`,
`viewComponent$`, `name$`, `valueIn$`, `valueOut$`, `type$`, `shouldTrim$` and `logger` are
`protected` and only reachable from a subclass. The Custom Elements callbacks —
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` — are implemented; a
subclass that overrides one has to call `super`.

`teardown()` and `restore()` are `protected` and carry the lifecycle here exactly as they do on
`ShaeElement`, which this element does not extend. A subclass that holds subscriptions of its own
has to use both or lose them: `teardown()` is the overridable half of `destroy()` — release what the
subclass holds and call `super.teardown()` last — and `restore()` takes the same subscriptions up
again after `super.restore()`. There is nothing to write back out to an attribute here, unlike
`<shae-ent>`: this element re-reads its own attributes on every connect. `restore()` runs from
`connectedCallback`, on the first connect as well as on a return after a release; a subclass
constructor takes no subscriptions up. Overriding `destroy()` itself is possible but rarely right:
the guard that makes the teardown run once, and run once even when releasing something calls back
into the element, lives there. A subclass that overrides `teardown()` without overriding `restore()`
works exactly once — after the first release its own subscriptions are gone for the life of the
element, with nothing reported.

#### Leaving the Tree and Binding Again

**Subscriptions begin at the first connect**, as they do for [`<shae-ent>`](#leaving-the-tree-and-coming-back):
an element built and never put into a document holds nothing and can be collected.

Of what follows, the first two things hold as for `<shae-ent>` as well; the third is where this
element goes its own way.

**A move inside one task costs nothing.** The release waits one microtask. An element back in the
document before that microtask runs keeps its host, its declaration on the entity and its value.

**An element that stays out lets go.** One microtask after it left, `destroy()` runs: the three
effects and the host binding come off, `isDestroyed` reads `true`, and the element can be
collected. The property itself was already taken off the entity on the way out — losing the host is
what clears it, and that happens whether or not the element is released afterwards.

**An element that comes back reads its position again.** Reconnecting sets `isDestroyed` back to
`false`, takes the subscriptions up again and then does what this element does on *every* connect:
it reads `name`, `value`, `type` and `no-trim` off its attributes and looks the host entity up from
where it now stands. The markup and the tree decide, so a `prop.value` or `prop.entNode` written to
the element while it was out of the document is replaced rather than applied — set the `value`
attribute if the write is meant to survive the return.

That is the one place where the two elements differ: a `<shae-ent>` carries `token`, `ns` and
`forward-custom-events` back out of its signals as it reconnects and keeps what was written to it,
while a `<shae-prop>` re-reads its own.

> **`<shae-worker>` is the exception.** Its `destroy()` and `isDestroyed` name something else: that
> teardown takes the Shadow Environment with it and cannot be undone. See
> [`<shae-worker>`](#shae-worker).

#### Invalid Values

A value that cannot be converted into the requested type — malformed JSON, a string `bigint`
cannot parse, the same inside `bigint64array` and `biguint64array` — is reported through the
`ConsoleLogger` and sets the property to `undefined`. This holds for both paths, the attribute
and the JavaScript property; neither throws. The report goes out at error level, which the
logger does not gate behind `ConsoleLogger.sharedConfig.enable`, so it reaches the console on
any host.

A numeric type answers with a number or with nothing. Where its conversion comes out as `NaN`,
the case is the same one: reported at error level, property set to `undefined`. That covers
`number`, `float`, `int`, `hex`, `oct`, `bin`, their list forms and every numeric typed array —
one unreadable segment costs the whole list, just as one unreadable entry costs a
`bigint64array`.

What is tested is the result, not the shape of the input. `parseInt` stays lenient as long as a
number comes out of it, so `type="int" value="12abc"` is `12`. `Infinity` is a number and passes.

The empty string is where the three conversions part company, and a split leaves one behind for
every leading, trailing or doubled separator. `Number()` reads it as `0`, `parseFloat()` and
`parseInt()` read it as no number at all:

| Conversion | Types | An empty segment is |
| :--- | :--- | :--- |
| `Number()` | `number`, `number[]`, `int8array`, `uint8array`, `uint8clampedarray`, `int16array`, `uint16array`, `int32array`, `uint32array`, `float32array`, `float64array` | `0` |
| `parseFloat()` | `float`, `float[]` | rejected |
| `parseInt()` | `int`, `hex`, `oct`, `bin` and their list forms | rejected |

So `type="number[]" no-trim value=" 1 2 "` is `[0, 1, 2, 0]`, while `type="hex[]" value="-ff 0a"`
sets nothing at all — `-` is a separator for that type and leaves an empty segment in front of it.
The scalar branches answer the same way to a value that the trim empties: `type="number"
value="   "` is `0`, and `type="int" value="   "` sets no property.

An unknown *type name* is a different case from an unconvertible value, and it is reported
differently. `type="whatever"` names no conversion, so the element reports the name through
`logger.warn` and lets the string through untouched — trimmed, unless `no-trim` says otherwise,
and otherwise exactly as written. Nothing is cleared and nothing throws. Being a `warn`, that
report *is* gated behind `ConsoleLogger.sharedConfig.enable` and stays silent off a localhost
page, where the `error` of an unconvertible value is not.

```html
<shae-ent token="player">
  <shae-prop name="score" value="100" type="int"></shae-prop>
  <shae-prop name="active" value="true" type="boolean"></shae-prop>
  <shae-prop name="config" value='{"difficulty": "hard"}' type="json"></shae-prop>
  <shae-prop name="position" value="10 20 30" type="float32array"></shae-prop>
</shae-ent>
```

#### Lifecycle

The element declares a property for as long as it stands where it stands under the name it has.
Three things end that, and all three clear the property on the entity that held it:

- **The element leaves the tree.** Removing a `<shae-prop>` removes its property.
- **The `name` attribute changes.** The old name is cleared and the new one takes the value.
- **The element moves to another entity.** The entity it left loses the property, the entity it
  reaches gets it.

Removing an element and putting it back within the same tick is none of these — a move through
`append` or `insertBefore` keeps the property, it does not drop and re-add it.

Removing the whole entity is a different matter and writes no property change: the entity goes,
and its properties go with it.

Two elements may declare the same name on the same entity. The one that writes last decides the
value, and the property is cleared only once the last of them lets go. Nothing is re-read when one
of them goes: the value stays where it was, even if the element that wrote it is the one that left.
If you need a defined winner, give each declaration its own name.

The same collision under `provideContext` (§2, "Entity Context") ends differently, and on purpose:
a context keeps its providers on file and hands the name to one that stays, a property does not. A
provider stays attached to the name for as long as its Shadow Object lives, which is what makes it
answerable afterwards; a `<shae-prop>` writes a value and is then done with it, and the entity holds
the value, not the writer. Both readings after a departure are defined, and they are defined
differently: a context is decided anew among the providers that remain, a property keeps the value
that stands until the last declaration of the name lets go.

On the Shadow Object side, a cleared property reads `undefined` — the key itself stays visible in
`propKeys()` and `propEntries()`. A reader taken from `useProperty()` keeps working across the
whole lifecycle and simply reports `undefined` once the property is gone.

---

### Namespacing and Contexts

Shadow Objects supports running multiple isolated environments on the same page. This is handled via Component Contexts identified by a namespace string (`ns`).

This section is the declarative view: two environments standing side by side as markup. The constant the Default Global Context is registered under, and the normalization every namespace goes through, are in [ComponentContext → Namespacing](#namespacing).

#### The Default Context

If you omit the `ns` attribute, components attach to the Default Global Context. This is sufficient for most single-app pages.

#### Named Contexts

Use the `ns` attribute to run independent environments on the same page.

```html
<!-- Environment A -->
<shae-worker src="./game-a.js" ns="world-A"></shae-worker>

<div id="ui-container">
  <shae-ent token="player-hud" ns="world-A"></shae-ent>
</div>

<!-- Environment B -->
<shae-worker src="./game-b.js" ns="world-B"></shae-worker>
<div id="container-b">
  <shae-ent token="hero" ns="world-B"></shae-ent>
</div>
```

#### JavaScript Access

The same two environments, reached from script. `ComponentContext.get(name)` returns the one context registered under that name, creating it on first ask; calling it again with the same name returns the same instance.

```typescript
import { ComponentContext } from '@spearwolf/shadow-objects';

const ctxA = ComponentContext.get('world-A');
const defaultCtx = ComponentContext.get();
```

---

## Kernel (ECS System Runner)

The `Kernel` is the core engine that manages Entities and Shadow Objects. It processes change trails from the View Layer and orchestrates the lifecycle of all objects in the Shadow Environment.

Direct Kernel usage is rarely needed. The framework manages the Kernel automatically through `ShadowEnv` and the Web Components. These APIs are here for framework integrators and advanced debugging.

Everything in this section is imported from `@spearwolf/shadow-objects/shadow-objects.js`. That is the entry point for the Shadow Environment side, which usually runs in a worker: the root entry `@spearwolf/shadow-objects` pulls the custom elements along with it and needs a DOM to load at all.

```typescript
import { Kernel, Registry } from '@spearwolf/shadow-objects/shadow-objects.js';

// Create with default registry
const kernel = new Kernel();

// Create with a custom registry
const customRegistry = new Registry();
const customKernel = new Kernel(customRegistry);
```

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `registry` | `Registry` | The Registry instance used by this Kernel. Writable: a Registry assigned here decides the resolution from the next lookup on, and `upgradeEntities()` is what applies it to the Entities that already exist. |
| `logger` | `ConsoleLogger` (readonly) | Logger for debugging, see [Console Logger](#console-logger). |

### Methods

#### `run(event)`

Processes a sync event containing change trails from the View Layer. Each entry of the trail is dispatched to one of the seven writing methods below.

- **Signature:** `run(event: SyncEvent): void`

```typescript
import { ComponentChangeType } from '@spearwolf/shadow-objects/shadow-objects.js';
import type { SyncEvent } from '@spearwolf/shadow-objects/shadow-objects.js';

const event: SyncEvent = {
  changeTrail: [
    { type: ComponentChangeType.CreateEntities, uuid: 'abc-123', token: 'player' },
  ],
};

kernel.run(event);
```

#### `getEntity(uuid)`

Retrieves an Entity by UUID. The return type is `Entity`, never `undefined`: an unknown UUID throws `entity with uuid "..." not found!`. Use `hasEntity` when you are not sure.

That throw is the contract of every change that describes the Entity tree -- a new parent, a new order, new properties: it names an Entity the view believes to be there, and a UUID the Kernel does not hold is a disagreement between the two sides. An event is the other case, and runs into the void instead: see `dispatchEventsToEntity` below.

- **Signature:** `getEntity(uuid: string): Entity`

```typescript
const entity = kernel.getEntity('abc-123');
```

#### `findEntity(uuid)`

The Entity behind a UUID, or `undefined` when the Kernel does not hold one. The counterpart to `getEntity`, for a caller that has something to do in both cases -- and one lookup instead of the two an `hasEntity` check in front of `getEntity` costs.

- **Signature:** `findEntity(uuid: string): Entity | undefined`

```typescript
kernel.findEntity('abc-123')?.dispatchViewEvent('ping', {});
```

#### `hasEntity(uuid)`

Checks whether an Entity exists.

- **Signature:** `hasEntity(uuid: string): boolean`

```typescript
if (kernel.hasEntity('abc-123')) {
  const entity = kernel.getEntity('abc-123');
  console.log(entity.uuid);
}
```

#### `traverseLevelOrderBFS(reverse?)`

Returns all Entities in breadth-first order. Pass `true` to reverse (leaves to root, useful for cleanup). A fresh array each call, and it belongs to the caller: sorting, splicing or reversing it changes nothing about what the next call hands out.

The list is cached and rebuilt on the first call after the Entity tree moves -- a creation, a destruction, a new parent, a new `order`. Every route that moves it counts, the Kernel methods as much as a write straight to `entity.parent`, `entity.parentUuid` or `entity.order`, and a call to `entity.removeFromParent()`.

- **Signature:** `traverseLevelOrderBFS(reverse?: boolean): Entity[]`

```typescript
const entities = kernel.traverseLevelOrderBFS();
const reversed = kernel.traverseLevelOrderBFS(true);
```

#### `getEntityGraph()`

Returns the Entity tree as a hierarchical structure, starting at the root Entities -- those without a parent. The Kernel keeps that set from the parent link of the Entity itself, so an Entity attached or detached through a setter joins and leaves it exactly as one moved with `setParent` does. Each node contains `token`, `entity`, `props`, and `children`; a node the Kernel no longer holds drops out, and every Entity appears exactly once. Useful for debugging.

- **Signature:** `getEntityGraph(): EntityGraphNode[]`

```typescript
const graph = kernel.getEntityGraph();
console.log(JSON.stringify(graph, null, 2));
```

#### `upgradeEntities()`

Re-evaluates all Entities against the current Registry. Call this after dynamically adding new Shadow Object definitions.

Only the difference is acted on. A constructor that was in an Entity's set before and is in it afterwards is left alone: its Shadow Object is neither destroyed nor built a second time. Constructors that dropped out are destroyed first, walking the tree from the leaves, then the new ones are created walking it from the root.

- **Signature:** `upgradeEntities(): void`

```typescript
shadowObjects.define('new-feature', NewFeature);
kernel.upgradeEntities();
```

#### `findShadowObjects(uuid)`

Returns all Shadow Object instances currently attached to an Entity.

- **Signature:** `findShadowObjects(uuid: string): ShadowObjectType[]`

```typescript
const attached = kernel.findShadowObjects('abc-123');
```

#### `noteEntityTreeChange(uuid)`

Tells the Kernel that an Entity has changed its place in the Entity tree. The cached traversal is dropped, and the Entity joins the set of root Entities if it has no parent, or leaves it if it has one. The place is read off the Entity, so the call needs nothing but the UUID; a UUID the Kernel does not hold drops the cache and nothing else.

`Entity` calls this itself from every write that moves it, so `entity.parent`, `entity.parentUuid`, `entity.order` and `entity.removeFromParent()` need no follow-up. What does need one is a children list written by hand: `Entity.addChild()`, `Entity.removeChild()`, `Entity.resortChildren()` and `ComponentContext.addToChildren()` all write or reorder that list without touching the parent link, and the Kernel hears nothing about it. Call this afterwards and the next walk reads the list as it now stands.

The root set is the half such a call cannot fix, and the reason is the same one: it follows the parent link, and a hand-written children list writes none. A child attached with `addChild()` alone keeps whichever place the root set already gave it -- created without a parent it is a root, and it stays one. Both walks start at that set and visit every Entity once, so where the child ends up is decided by which of the two they reach first: reached through the parent, it sits under it, and reached on its own, it stands at the top level next to the parent it was just put under. Write the parent link if the Entity is to move: `child.parent = parent` does both halves and reports on its own.

- **Signature:** `noteEntityTreeChange(uuid: string): void`

```typescript
parent.addChild(child);
kernel.noteEntityTreeChange(child.uuid);
// the next walk reads the children list as it now stands -- `child` is still
// wherever the root set had it, because `addChild()` wrote no parent link
```

#### Applying a Change Trail by Hand

`run()` is the front door; these seven methods are what it dispatches to. Call them directly and you are writing a change trail entry yourself, without the envelope.

| Method | Signature | Description |
| :--- | :--- | :--- |
| `createEntity` | `(uuid, token, parentUuid?, order?, properties?, autoDestructionOnParentRemoval?)` | Creates an Entity and its Shadow Objects. A uuid the Kernel already holds an Entity for is refused with an [`EntityUuidInUseError`](#entityuuidinuseerror), and the Entity standing behind that uuid is left exactly as it is. `properties` is a list of `[name, value]` pairs; an entry that names only `name` sets the property to `undefined`. A creation that does not get through leaves no Entity behind: the error reaches the caller, and the Entity the call was made for is not in the Kernel afterwards. What its constructors did to *other* Entities before the throw is not taken back, and the rollback reaches one step further: an Entity a constructor hung or moved under the failed one is left as a root, or destroyed where it carries `autoDestructionOnParentRemoval`. The paragraph below spells that out. |
| `destroyEntity` | `(uuid: string)` | Destroys the Entity, its Shadow Objects and its children. Detaching the Entity from its parent, each Shadow Object's teardown, and the Entity's own release each stand behind a guard of their own, so a throw at any one of them costs nothing behind it — a teardown that throws costs no sibling its own; every throw is reported through the `ConsoleLogger` rather than handed to the caller, and the Entity is out of the Kernel when the call returns either way. A listener on the Entity's own destruction notification is held to the same contract: the creation scopes tear down and the Entity releases its properties, listeners, subscriptions and contexts step by step, whether or not that notification reached them and whether or not an earlier step of that release threw — see [`onDestroy(callback)`](#ondestroycallback). |
| `setParent` | `(uuid, parentUuid?, order?)` | Moves the Entity under a new parent, or makes it a root when `parentUuid` is omitted. An absent `order` keeps the current one -- it is not a reset to `0`. A `parentUuid` naming the Entity itself or one of its descendants is refused with an error, and the Entity stays where it was. |
| `updateOrder` | `(uuid: string, order: number)` | Sets the sort order among siblings. |
| `changeProperties` | `(uuid: string, properties: ComponentPropertiesType)` | Writes property values; every reader bound to one of the names sees the new value. Where a written property routes to a constructor that throws, the Shadow Objects go back to the set the Entity carried before the call — the properties stay written, so that set and the new properties can disagree until the next re-resolution. |
| `changeToken` | `(uuid: string, token: string)` | Replaces the Entity's token, which re-resolves its Shadow Objects — the same resolution `upgradeEntities()` runs over the whole tree, but not the same answer to a failure. A creation that does not get through is taken back here: the previous token returns and the Shadow Objects belonging to it are built again, before the error reaches the caller. An `upgradeEntities()` that throws takes nothing back; the paragraph below spells both out. |
| `dispatchEventsToEntity` | `(uuid: string, events: IComponentEvent[])` | Delivers View Layer events to the Entity, where every attached Shadow Object receives them as `onViewEvent`. A UUID the Kernel does not hold is ignored: the events are dropped, and the rest of the Change Trail is applied. |

**The Entity tree stays a tree.** `setParent` refuses a parent that is the Entity itself or one of its descendants, and so does the `parent` setter of the `Entity` class, the other way the link is written. Both run the check before they touch anything, so a refused call leaves the Entity attached where it was, with its `order` and its place among the siblings intact. The check itself is `Entity.assertAttachableTo(nextParent)` -- it walks the parent chain and throws; call it yourself if you drive the link by a route of your own. `ViewComponent.addChild()` guards the same thing on the View Layer side. Both routes also keep the same bookkeeping: whichever one writes the link, the Entity reports its new place to the Kernel, so the root set and the cached traversal follow. Exactly one thing they do not share -- `onParentChanged` belongs to `Kernel.setParent()`, and a write straight to the setter moves the Entity without sending it.

**A failed creation takes its own Entity back.** While `createEntity` runs, the Entity is already registered in the Kernel, because a Shadow Object constructor may address the Kernel with its own UUID -- hanging a child under it with `createEntity`, moving another Entity under it with `setParent`, or looking it up. Should one of those constructors throw, the Shadow Objects that already stand go through their regular teardown, their `onDestroy` included, and the Entity the call was made for is gone when the error reaches the caller. The rollback covers that one Entity, not the Kernel as a whole: an Entity the failing constructor created or destroyed elsewhere stays as the constructor left it, and the teardown adds to that, because it walks the children list of the failed Entity. Whatever hangs there when the throw comes is promoted to a root -- a child the constructor created under it as much as an Entity that was already there and got moved under it with `setParent`, which is taken off the parent it came from in the process. The exception is read off that Entity itself, not off the way it got there: one carrying `autoDestructionOnParentRemoval` is destroyed instead, its Shadow Objects hearing their `onDestroy`. Either way it ends up in a state that is neither the one before the call nor the one the constructor built; covering that would take a snapshot of the Kernel, which this path does not make. In a Worker, `MessageRouter` answers the Change Trail the throw came out of with a rejection -- an `AppliedChangeTrail` carrying an `error` -- which arrives on the View Layer side as `ShadowEnv.SyncFailed`.

**A uuid names one Entity at a time.** `createEntity` refuses a uuid the Kernel already holds an Entity for, with an [`EntityUuidInUseError`](#entityuuidinuseerror) carrying that uuid on `error.uuid`. The refusal comes before the call writes anything, so there is nothing to take back: the Entity standing behind the uuid keeps its Shadow Objects, its signals, its contexts, its token and its properties, and a `parentUuid` the refused call named gains no child. The uuid is free again once `destroyEntity()` has been through -- rebuilding an Entity under the same uuid means destroying the one that stands first. In a Change Trail the refusal is the `cause` of the `ChangeTrailRefusedError` the trail ends with, and `appliedCount` names the entries ahead of it that did go through -- as the error object itself in a local environment, and as the wording the Kernel put on the wire across a worker boundary, where an `instanceof` check therefore finds a string.

**A failed token change is taken back.** `changeToken` writes the new token before the constructors run, because that token is what the constructor set is resolved from. Should one of those constructors -- or one of the `[onCreate]` hooks behind them -- throw, the Kernel puts the previous token back, takes the Shadow Objects of the new token down again, builds the ones the old token had, and only then hands the error to the caller. The order is the one it reads as: the token first, so the rebuild runs against the token the Entity carries afterwards, and the new Shadow Objects leave before the old ones return, so the two sets never stand on the Entity at the same time. An error thrown on that way back does not replace the one the caller is waiting for -- it goes to the `ConsoleLogger`. Two things stay outside it. `changeProperties` has written its properties by the time a constructor runs, and they stay written; only the Shadow Objects go back — which can leave a restored Shadow Object standing on an Entity whose properties no longer route to its constructor. That disagreement lasts until the next re-resolution of the set: the constructor is not in the list `changeProperties`, `changeToken` or `upgradeEntities()` resolves next, so the Shadow Object is taken down there. And `upgradeEntities()` puts everything its first pass took down out of reach, at the Entity whose rebuild throws as much as at every other one: teardown and rebuild are two separate passes over the whole Entity tree, and the rollback belongs to the call the throw fell in — the second-pass call, which has taken nothing down of its own. That Entity carries the token it came in with, because an upgrade writes no token, and it is left with the Shadow Objects the first pass spared. Where its whole constructor set changed, that is none at all. Nor is that Entity the only one left that way: the throw leaves the second pass altogether, so every Entity behind it in the traversal order never reaches its rebuild and stands with what the first pass spared as well.

Neither check reaches a children list written without the parent link -- `Entity.addChild()` and `ComponentContext.addToChildren()` do exactly that. Neither does the Kernel's bookkeeping, and `Entity.removeChild()` and `Entity.resortChildren()` join the two there: all four write or reorder a children list and report nothing, so the cached traversal can lag a call behind them. Whoever writes the children list drives that themselves with `kernel.noteEntityTreeChange(uuid)`, which drops the cache -- the root set stays out of reach, as it follows the parent link none of the four wrote. The four traversals over the children lists carry the ring case instead: `Kernel.traverseLevelOrderBFS()`, `Kernel.getEntityGraph()`, `entity.traverse()` and `ComponentContext.traverseLevelOrderBFS()` each visit every node once and terminate.

Termination is all they carry, though. A ring closed through `Entity.addChild()` or `ComponentContext.addToChildren()` and reachable from no root is not walked by `Kernel.destroy()`, which sweeps from the roots: its Entities go with the bookkeeping and their `onDestroy` never runs. Keep such a ring reachable from a root, or take it down yourself before the Kernel goes.

#### `EntityUuidInUseError`

The reason the Kernel gives when it is asked to create an Entity under a uuid it already holds one
for. Exported from `@spearwolf/shadow-objects` for the view side and from
`@spearwolf/shadow-objects/shadow-objects` for the Kernel side.

| Member | Type | Description |
| :--- | :--- | :--- |
| `uuid` | `string` | The uuid the Kernel already holds an Entity for. |

Only a local environment hands the object itself to the view side. A Worker puts the wording of the
refusal on the wire, so the `cause` of the `ChangeTrailRefusedError` that arrives there is a string
and carries no `uuid` field -- the same limit the `ChangeTrailRefusedError` section names.

```typescript
import { EntityUuidInUseError } from '@spearwolf/shadow-objects/shadow-objects';

try {
  kernel.createEntity(uuid, 'my-token');
} catch (error) {
  if (error instanceof EntityUuidInUseError) {
    // the entity behind error.uuid stands untouched; destroy it to free the uuid
    kernel.destroyEntity(error.uuid);
  }
}
```

#### `dispatchMessageToView(message)`

Sends a message the other way, from the Shadow Environment back to the View Layer. This is what the creation API's `dispatchMessageToView` ends up calling. The Kernel emits it as the `MessageToView` event one microtask later, not during the call.

- **Signature:** `dispatchMessageToView(message: MessageToViewEvent): void`

#### `findOrCreateRootContext(name)`

Returns the root of the Entity Context tree for a context name, creating it on first ask. This is the top of the chain that `provideGlobalContext` writes to and `useContext` reads from when no Entity above provides the name.

- **Signature:** `findOrCreateRootContext(name: string | symbol): SignalsPath`

#### `destroy()`

Destroys the Kernel and all its Entities.

- **Signature:** `destroy(): void`

### Kernel Events

| Event | Description |
| :--- | :--- |
| `MessageToView` | Emitted when a Shadow Object calls `dispatchMessageToView`. |

```typescript
import { on } from '@spearwolf/eventize';
import { MessageToView } from '@spearwolf/shadow-objects/shadow-objects.js';

on(kernel, MessageToView, (message) => {
  console.log('Message to view:', message);
});
```

---

## Advanced

### Programmatic Registration

#### `shadowObjects.define()`

Registers a Shadow Object constructor with a token at runtime. An alternative to the module `define` object.

The `shadowObjects` imported here is a helper object with a single method, exported by the library. It is not the named export a registry module declares under the same name -- that one is a [module descriptor](#registry-component-manifest) the loader reads. Same word, two things.

```typescript
import { shadowObjects } from '@spearwolf/shadow-objects/shadow-objects.js';
import type { ShadowObjectCreationAPI } from '@spearwolf/shadow-objects/shadow-objects.js';

class MyLogic {
  constructor({ useProperty, createEffect }: ShadowObjectCreationAPI) {
    // ...
  }
}

shadowObjects.define('my-token', MyLogic);
```

- **Signature:** `shadowObjects.define(token: string, constructor: ShadowObjectConstructor, registry?: Registry): void`

**Parameters:**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `token` | `string` | The token to associate with this constructor. |
| `constructor` | `ShadowObjectConstructor` | A class -- something callable with `new`. |
| `registry` | `Registry` (optional) | Custom Registry instance. Defaults to the global registry. |

`shadowObjects.define()` and `registry.define()` take a `ShadowObjectConstructor`, which is the class form. The module `define: { ... }` object is wider and accepts a plain function as well. The Kernel builds every Shadow Object with `new`, so a function works there at runtime -- these two entry points just do not promise it.

Common use cases:

```typescript
// Conditional registration
if (process.env.NODE_ENV === 'development') {
  shadowObjects.define('debug-panel', DebugPanel);
}

// Dynamic plugin loading
async function loadPlugin(pluginUrl: string) {
  const plugin = await import(pluginUrl);
  shadowObjects.define(plugin.token, plugin.ShadowObject);
}
```

---

### The `@ShadowObject` Decorator

A declarative way to register class-based Shadow Objects. Automatically registers the class with the specified token.

```typescript
import { ShadowObject } from '@spearwolf/shadow-objects/shadow-objects.js';
import type { EntityApi, ShadowObjectCreationAPI, OnCreate, OnDestroy } from '@spearwolf/shadow-objects/shadow-objects.js';
import { onCreate, onDestroy } from '@spearwolf/shadow-objects/shadow-objects.js';

@ShadowObject({ token: 'player-controller' })
export class PlayerController implements OnCreate, OnDestroy {
  constructor({ useProperty, createEffect }: ShadowObjectCreationAPI) {
    const speed = useProperty<number>('speed');

    createEffect(() => {
      console.log('Speed changed:', speed());
    });
  }

  [onCreate](entity: EntityApi) {
    console.log('Player created:', entity.uuid);
  }

  [onDestroy](entity: EntityApi) {
    console.log('Player destroyed:', entity.uuid);
  }
}
```

**Options:**

| Option | Type | Description |
| :--- | :--- | :--- |
| `token` | `string` | The token to register this class with. |
| `registry` | `Registry` (optional) | Custom Registry instance. |

The decorator automatically calls `eventize(this)` on the instance, making it compatible with the event system. You do not need to call `eventize` manually.

What the decorator returns is a subclass of the decorated class, and that subclass is what goes into the Registry. Instances still pass `instanceof` against your class, but `constructor.name` reads `__ShadowObject` -- worth knowing when a log line or a stack trace is what you are reading.

---

### The Registry Class

The `Registry` manages the mapping between tokens and Shadow Object constructors, plus routing rules for composition.

```typescript
import { Registry } from '@spearwolf/shadow-objects/shadow-objects.js';

const defaultRegistry = Registry.get();
const registry = Registry.get(customRegistry); // returns customRegistry or the default
```

#### `registry.define(token, constructor)`

Registers a constructor with a token. If the token already exists, the constructor is added to the list (multiple Shadow Objects per token are allowed).

```typescript
registry.define('my-token', MyLogic);
registry.define('my-token', AnotherLogic); // Both will be instantiated
```

#### `registry.appendRoute(token, routes)`

Adds routing rules for a token.

```typescript
registry.appendRoute('game-object', ['physics', 'renderer']);
registry.appendRoute('@debug', ['debug-overlay']);
```

#### `registry.clearRoute(route)`

Removes a routing rule.

```typescript
registry.clearRoute('game-object');
```

#### `registry.findTokensByRoute(route, truthyProps?)`

Resolves a route to the set of tokens it stands for, and this is where the resolution rule lives. The starting token is part of its own result, the walk is breadth-first, and each token appears once however many routes lead to it. Pass the names of the currently truthy properties as `truthyProps` to bring property routes into the walk.

- **Signature:** `findTokensByRoute(route: string, truthyProps?: Set<string>): Set<string>`

```typescript
registry.appendRoute('game-object', ['physics', 'renderer']);
registry.appendRoute('@debug', ['debug-overlay']);

registry.findTokensByRoute('game-object', new Set(['debug']));
// Set { 'game-object', 'physics', 'renderer', 'debug-overlay' }
```

#### `registry.findConstructors(route, truthyProps?)`

Resolves all constructors for a route, including all routed tokens. Returns `undefined` when the resolution yields no registered constructor at all -- not an empty array.

- **Signature:** `findConstructors(route: string, truthyProps?: Set<string>): ShadowObjectConstructor[] | undefined`

```typescript
const constructors = registry.findConstructors('game-object', new Set(['debug']));
// Returns constructors for: game-object, physics, renderer, debug-overlay
```

#### `registry.hasToken(token)`

Checks if a token is registered.

#### `registry.hasRoute(route)`

Checks if a token route exists. Property routes -- the `@name` form that `appendRoute` also accepts -- are not answered here and read as `false` even while they resolve.

#### `registry.clear()`

Removes all registrations and routes.

Calling this on the default registry removes everything `@ShadowObject` and `shadowObjects.define()` registered anywhere in the thread — including for other environments.

---

### Lifecycle Event Symbols

The framework uses Symbols for lifecycle events. Import these when implementing class-based Shadow Objects:

```typescript
import {
  onCreate,
  onDestroy,
  onParentChanged,
  onViewEvent,
} from '@spearwolf/shadow-objects/shadow-objects.js';
```

| Symbol | Interface | Description |
| :--- | :--- | :--- |
| `onCreate` | `OnCreate` | Called after the Shadow Object is fully initialized. A throw here takes the Shadow Object down again and reaches the caller that asked for the creation. |
| `onDestroy` | `OnDestroy` | Called before the Shadow Object is destroyed. |
| `onParentChanged` | `OnParentChangedEvent` | Sent by `Kernel.setParent()` as the last thing that call does, before it returns. An Entity that is destroyed later in the same task has still heard about its last move. A handler that reads `useParentContext()` inline sees the new parent's value, provided the parent's own value has itself settled -- that reader is a direct link to the parent's own context signal, rebound before the notification goes out, but a parent whose own provided value was set in the same task has not settled it there yet, and the read comes back `undefined` until it does. `useContext()` runs through a separate one-microtask batch collector and names the value the Entity is leaving; it settles to the new value one microtask after the notification, so a handler that needs it there reads it through an effect instead. Inside a change trail the handler runs before the next entry of that trail is applied, and inside the `batch()` that trail runs in -- so a signal write the handler makes there settles its own dependent effects only once the whole trail has been applied, where the same write outside a change trail settles them right away. A throw from the handler is reported through `kernel.logger` and reaches neither `setParent()` nor the change trail around it -- the same is true of an error a Kernel call the handler makes throws back into it, such as `createEntity()` refusing a uuid already in use. A write straight to `entity.parent` or `entity.parentUuid` moves the Entity but sends nothing. |
| `onViewEvent` | `OnViewEvent` | Called when the View Layer dispatches an event to this entity. |

All four are called on the Shadow Object as the change happens. One of `onParentChanged`'s two context readers waits for the tree to stop moving all the same: `useContext()` settles through a batch collector one microtask behind the move, where `useParentContext()` is a direct link that is already rebound by the time the notification goes out.

The `onDestroy` symbol above is the class-side hook. The creation API has a callback of the same name for the function style -- see [`onDestroy(callback)`](#ondestroycallback), which also lists the paths a Shadow Object reaches its end on. The two hooks do not answer the same set: the class-side one is called on an attached Shadow Object, which keeps it out of the path where a constructor throws before its instance is ever attached — only the creation-API callback is reached there. A `[onCreate]` that throws is on the other side of that line: the instance was attached, so the teardown that follows runs the class-side hook along with everything else.

**Full lifecycle example:**

```typescript
import {
  onCreate,
  onDestroy,
  onParentChanged,
  onViewEvent,
  type OnCreate,
  type OnDestroy,
  type OnParentChangedEvent,
  type OnViewEvent,
  type EntityApi,
  type ShadowObjectCreationAPI,
} from '@spearwolf/shadow-objects/shadow-objects.js';

export class FullLifecycleExample implements OnCreate, OnDestroy, OnParentChangedEvent, OnViewEvent {
  constructor(api: ShadowObjectCreationAPI) {
    // Setup phase: call api methods here
  }

  [onCreate](entity: EntityApi) {
    console.log('Created and attached to entity:', entity.uuid);
  }

  [onDestroy](entity: EntityApi) {
    console.log('About to be destroyed');
  }

  [onParentChanged](entity: EntityApi) {
    console.log('Parent changed, new parent:', entity.parent?.uuid);
  }

  [onViewEvent](type: string, data: unknown) {
    console.log('View event received:', type, data);
  }
}
```

---

### Debugging

#### Console Logger

There is no log level to set. Logging is decided by four independent switches shared by every logger in the thread, and one flag per instance.

| Where | Field | Default |
| :--- | :--- | :--- |
| `ConsoleLogger.sharedConfig` | `enable` | on for `localhost` only |
| `ConsoleLogger.sharedConfig` | `debug` | off |
| `ConsoleLogger.sharedConfig` | `info`, `warn` | on |
| the instance | `enable` | `true` |
| `globalThis.ConsoleLogger` | typed `ConsoleLoggerControl` | — |
| `globalThis.ConsoleLoggerStorage` | typed `ConsoleLoggerConfig` | — |

`isEnabled` combines the two `enable` flags: the instance's own and the shared one. The other three getters take `isEnabled` and add the switch for their level, so `debug` is the one that needs turning on before anything else matters.

```typescript
import { ConsoleLogger } from '@spearwolf/shadow-objects/ConsoleLogger.js';

ConsoleLogger.sharedConfig.enable = true;
ConsoleLogger.sharedConfig.debug = true;

if (kernel.logger.isDebug) {
  kernel.logger.debug('entity graph', kernel.getEntityGraph());
}
```

**The getters are the caller's job.** `logger.debug(...)` prints unconditionally -- it does not consult `isDebug` itself. Ask first, as the Kernel does, or the message goes to the console whatever the switches say.

In the browser this is reachable without a rebuild: on first use the logger installs a live config object at `globalThis.ConsoleLogger` whose setters write through to `localStorage`, so `ConsoleLogger.debug = true` typed into the console survives a reload. Past the one-time storage-capability probe at module load -- which writes and immediately removes a single throwaway key -- these four setters are the only place the library writes to the storage of its host on its own; a `ConsoleLogger` instance reads its own `<namespace>.enable` flag and never creates the key, so the switch has to be turned on once through the handle, or by hand in the storage, before it shows up.

`ConsoleLoggerConfig` types the fallback store behind `globalThis.ConsoleLoggerStorage`, and `ConsoleLoggerControl` types the handle behind `globalThis.ConsoleLogger` -- see the table above. Neither global is declared ambiently: a consumer that wants a typed reference to either casts `globalThis` locally, the way `ConsoleLogger.ts` does for its own access. `consoleLoggerConfigKey()` builds the storage key a given config value lives under, and `setConsoleLoggerStorage()` installs a config object as the fallback store directly, bypassing the storage probe -- what `WorkerRuntime` calls in a worker, where there is no `localStorage` to probe in the first place. All four -- the two types and the two functions -- are reachable only through the `@spearwolf/shadow-objects/ConsoleLogger.js` subpath used in the example above; `src/index.ts` does not re-export `utils/ConsoleLogger.js`.

`ConsoleLogger.<namespace>.enable` turns a single logger off on its own, independent of the four shared switches above -- the key a `Kernel`, a `ShadowEnv` or an element's own logger reads on construction, set through the storage of the host directly (there is no handle for a per-namespace flag). It is read once and never written by the library. A worker thread has no storage of its own to set such a key in: `WorkerRuntime`, `MessageRouter` and the `Kernel` that runs there read the same kind of per-namespace key out of the configuration their host forwards -- see below for how it reaches them.

The worker of a `RemoteWorkerEnv` is configured from the same origin: a JSON object stored under `ConsoleLogger.RemoteWorkerEnv.workerConfig` is merged on top of the shared config when the worker starts, so the second thread can be made talkative without touching the code that spawns it. The key is read, not trusted -- a value that does not parse to a plain JSON object counts as no config at all, and the key is named once through `remoteEnv.logger.warn`, which is not gated behind `ConsoleLogger.sharedConfig.enable`. That forwarded configuration reaches the `WorkerRuntime` and `MessageRouter` loggers of the worker thread: both read the same `ConsoleLogger.sharedConfig`, gate their debug and warn lines behind it the way every other logger in this library does, and leave their error reports ungated. The worker builds neither logger before this configuration message has been processed -- a logger built ahead of it would read the defaults on construction and pin them for the whole thread, the loggers built after it included. The per-namespace switches travel inside the same JSON object, each as a key named after its logger -- `MessageRouter.enable`, `WorkerRuntime.enable`, `Kernel.enable` -- rather than under a separate one, and without the `ConsoleLogger.` prefix a real storage needs: `localStorage.setItem('ConsoleLogger.RemoteWorkerEnv.workerConfig', '{"MessageRouter.enable": false}')` keeps the debug and warn lines of the worker's `MessageRouter` off the console; its error reports print whatever the switches say.

#### Entity Graph Inspection

```typescript
// Snapshot of the entire entity hierarchy
const graph = kernel.getEntityGraph();

// Each node contains:
// - token: string
// - entity: Entity
// - props: Record<string, unknown>
// - children: EntityGraphNode[]

// The entity keeps its state in private fields, so it serializes as `{}`.
// Read token, props and children from the snapshot; reach for the entity itself
// through the node, not through the JSON.
console.log(JSON.stringify(graph, null, 2));
```
