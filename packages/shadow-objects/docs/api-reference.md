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

#### `useParentContext(name, options?)`

Like `useContext`, but skips the current Entity and starts searching from the parent. Useful for "middleware" components that want to wrap or extend a context value that shares the same name.

- **Signature:** `useParentContext<T>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>): SignalReader<Maybe<T>>`
- **Caching:** same as `useContext` — one reader per name and Shadow Object.

#### `provideContext(name, sourceOrInitialValue?, options?)`

Makes a value available to all descendant Entities in the subtree, and to all other Shadow Objects on the same Entity.

- **Signature:** `provideContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?: ProvideContextOptions<T> | CompareFunc<T | undefined>): Signal<Maybe<T>>`
- **Returns:** The context signal. Write to it with `.set(...)` to push a new value to all consumers.
- **Note:** Pass a signal as the source to keep the context in sync with existing reactive state.
- **Options:** `ProvideContextOptions<T>` adds `clearOnDestroy?: boolean` to the `compare` of `SignalValueOptions<T>`. It defaults to `true`: when the Shadow Object goes away, the context is set to `undefined` and every consumer sees that.

The signal is cached per name and per Shadow Object like the readers above, and here the second call is silent about it: it hands back the first signal and drops both the `sourceOrInitialValue` and the `compare` it was given, with nothing on the console. `clearOnDestroy` is the exception — it is read on every call, so one call asking for it is enough to have the context cleared.

#### `provideGlobalContext(name, sourceOrInitialValue?, options?)`

Makes a value available to all Entities in the entire Shadow Environment, regardless of hierarchy position.

- **Signature:** `provideGlobalContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?: ProvideContextOptions<T> | CompareFunc<T | undefined>): Signal<Maybe<T>>`
- **Options:** the same as `provideContext`, `clearOnDestroy` included — and the same caching, one signal per name and Shadow Object, with a second call dropping its value and `compare` just as silently.

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

`traverse()` is useful for broadcast patterns where a parent needs to notify all descendants of an event, like a frame tick or a configuration change.

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
| `uuid` | (Optional) Explicit unique identifier. If omitted, one is generated automatically. |
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

After `destroy()` the component is detached from its `ComponentContext`: it no longer appears in any change trail and no longer has a corresponding Entity. `isDestroyed` reports `true`. The context reaches the same state from its own side -- `ComponentContext.clear()`, `destroyComponent()`, `removeSubTree()` and `dispose()` leave the components they take down exactly here. `clear()` and `dispose()` reach every component that has joined the context, including one whose uuid a later `ViewComponent` has claimed. `removeSubTree(uuid)` is addressed to an entry: it takes down the instance holding it together with its descendants, and an instance a later join has displaced from that uuid stands in no subtree, so it is left standing. `destroyComponent(component)` releases exactly the instance it is given and leaves the entry -- and with it the entity -- standing when a namesake holds it. Holding on to a destroyed component is safe, and its behaviour is uniform. Every one of these paths emits `ViewComponent.Destroyed` on the component it takes down. One thing the table below does not cover: `vc.context = null` reaches `isDestroyed === true` as well, and every row holds for it except the two about `dispatchEvent` and about the announcement -- a component that only left its context keeps its subscriptions and an own `dispatchEvent`, and it announces nothing, because it can be taken back in.

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
| `addComponent(component)` | Take a component in and write a `CreateEntities` change for it. Throws a `ComponentContextDisposedError` on a disposed context. Called by the `ViewComponent` `context` setter. |
| `hasComponent(component)` | Whether this context holds a component with that uuid. |
| `hasComponents()` | Whether it holds any component at all. |
| `isRootComponent(component)` | Whether the component is a root, i.e. has no parent in this context. |
| `isChildOf(child, parent)` | Whether `child` currently sits in the children list of `parent`. |
| `getChildren(component)` | The children of a component, in sort order. A fresh array each call. |
| `traverseLevelOrderBFS()` | Every component in the context, breadth-first from the roots. |
| `destroyComponent(component)` | Write the destroy change for a component, promote its children to roots and detach the component from this context. |
| `addToChildren(parent, child)` | Insert `child` into the children of `parent`. Throws a plain `Error` when the context does not hold `parent`. |
| `removeFromParent(component, parent)` | Detach a component from that parent and make it a root. A no-op when a later `ViewComponent` has since claimed `component`'s uuid. |
| `moveToRoot(component)` | Make a component a root without naming its previous parent. A no-op when a later `ViewComponent` has since claimed `component`'s uuid. |
| `removeSubTree(uuid)` | Destroy a component and all its descendants **without** writing anything to a change trail. Each of them is detached from this context. |
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
| `buildChangeTrails(clearChanges = true)` | The changes since the previous call, as a `ChangeTrailType`. Returns an empty array when the context holds no components. Also writes the Component Memory. |
| `reCreateChanges()` | Rebuild every component from the Component Memory, so that the next trail re-creates all of them. This is how a fresh proxy is brought up to the state the view is already in. |

A change trail returned by `buildChangeTrails()` is a snapshot: nothing in the library writes to it again, not even the property tuples of its entries. This holds for anything derived from it too, including the value `ShadowEnv.syncWait()` resolves with and the payload of `ShadowEnv.AfterSync`.

`reCreateChanges()` announces itself: it broadcasts the `ContextLost` event to every `ViewComponent` in the context, parents and children alike. It returns immediately when the memory is empty -- after a `clear()`, for instance, there is nothing left to recover.

#### `clear()`

Removes all components without writing anything to a change trail. The context stays registered under its namespace and can be used again afterwards. This is the reset you want between tests or when swapping a whole scene.

Every `ViewComponent` that has joined the context is destroyed on the way out, not one per uuid: where a second `ViewComponent` has joined under the uuid of an earlier one, both go down. Each reports `isDestroyed === true`, holds no context any more, and every `setProperty` on it returns `false` and writes nothing. See [The destroyed state](#the-destroyed-state) for what such a component still answers.

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
| `proxyReady` | `boolean` | Set to `true` once `envProxy.start()` has resolved, and back to `false` when the proxy fails. |

`viewReady` and `proxyReady` are writable signal accessors, and together they are the input of the effect that emits `ContextCreated` and `ContextLost`. Assigning them by hand drives those events -- setting `proxyReady = false` is what a proxy failure does internally.

They are *not*, however, what `isReady` reads. It asks whether a `view` and an `envProxy` are actually set, whether `proxyReady` holds, and whether the environment is still alive; `viewReady` does not enter that calculation. Assigning `viewReady = false` therefore leaves `isReady` reporting `true`. Ask `isReady` when you want to know whether the environment can sync, and treat the two flags as the wiring behind the events rather than as its ingredients.

### Static Methods

#### `ShadowEnv.get(namespace)`

Retrieves an existing `ShadowEnv` instance by namespace. Returns `undefined` if none exists.

```typescript
const env = ShadowEnv.get('my-game');
```

### Events

`ShadowEnv` emits events via [@spearwolf/eventize](https://github.com/spearwolf/eventize).

| Event | Description |
| :--- | :--- |
| `ShadowEnv.ContextCreated` | Fired when the environment becomes ready (view and proxy both connected). Receives the `ShadowEnv`. Retained, so a listener registered afterwards still gets it. |
| `ShadowEnv.ContextLost` | Fired when the environment loses its connection. Receives the `ShadowEnv`. Clears the retained `ContextCreated`, so a listener registered after the loss gets nothing until the environment becomes ready again. |
| `ShadowEnv.AfterSync` | Fired after each synchronization cycle, including cycles with nothing to send. Receives the `ChangeTrailType` data, which is an empty array when nothing changed. |
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

Recovery from a `ProxyFailed` is a new proxy: `env.envProxy = new RemoteWorkerEnv()`. The setter starts it, and once it is ready the view re-creates its pending changes from the Component Memory. The next `sync()` therefore restores every entity in the new environment -- token, parent, order and properties -- so the application does not have to rebuild its `ViewComponent`s or its markup.

### Methods

#### `sync()`

Triggers synchronization of pending changes from the `ComponentContext` to the Shadow Environment. Call this in your main render loop (e.g., inside `requestAnimationFrame`). If the environment is not ready, the sync is deferred until `ContextCreated` fires.

#### `syncWait()`

Like `sync()`, but returns a Promise that resolves after synchronization completes. Useful when you need to guarantee the Shadow Environment has processed changes before continuing.

The Promise resolves on every cycle, including one with nothing to send -- then the change trail is an empty array. It stays pending only while the environment is not ready; it resolves once `ContextCreated` fires.

```typescript
const changeTrail = await env.syncWait();
console.log('Synced changes:', changeTrail);
```

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

The last two are callbacks rather than calls: `ShadowEnv` installs both on every proxy it is given -- `onMessageToView` for messages coming out of the Shadow Environment, `onProxyFailed` for the loss of that environment. An implementation that cannot fail simply never calls the latter.

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
| `disableStructuredClone` | Set to `true` to skip cloning data (performance optimization for local use). |

**Methods:**

| Method | Description |
| :--- | :--- |
| `constructor(registry?)` | Without an argument the environment uses the default registry; pass a `Registry` to isolate it. See the example above. |
| `start()` | Resolves immediately -- there is no thread to bring up. |
| `applyChangeTrail(data, waitForConfirmation)` | Run a change trail through the Kernel. `waitForConfirmation` is ignored: the run is synchronous, and the returned promise is already settled when you get it. |
| `importScript(url)` | Import a shadow objects module from a URL. |
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
```

**Properties:**

| Property | Description |
| :--- | :--- |
| `isDestroyed` | `boolean` (read-only). Also `true` once the worker has failed. |
| `workerLoaded` | Promise that resolves once the worker is ready. It rejects with a `WorkerFailedError` when the worker fails and with a `WorkerDestroyedError` when the environment is torn down. Every read hands out a promise that can reject, so attach a `catch()` even when you do not await it -- otherwise the rejection surfaces as an unhandled one. |
| `logger` | `ConsoleLogger` (read-only). The logger this environment reports through. Its enabled state travels into the worker together with the shared logger configuration when the worker starts. A JSON object stored under `ConsoleLogger.RemoteWorkerEnv.workerConfig` is merged on top of that configuration; see [Console Logger](#console-logger). |

**Methods:**

| Method | Description |
| :--- | :--- |
| `importScript(url)` | Import a shadow objects module inside the worker. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `applyChangeTrail(changeTrail, waitForConfirmation)` | Send a change trail to the worker; with `waitForConfirmation` the promise resolves once the worker has applied it. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `start()` | Spawn the worker and wait for the load handshake. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `destroy()` | Tears the environment down and terminates the worker — once it has acknowledged, or after `WorkerDestroyTimeout` if it stays silent. Takes effect whether or not a worker was ever spawned. |

**Events:**

| Event | Description |
| :--- | :--- |
| `RemoteWorkerEnv.WorkerLoaded` | Fired when the worker has completed its handshake. Receives the environment. Retained, so a late listener still gets it. |
| `RemoteWorkerEnv.WorkerFailed` | Fired when the worker dies or sends something that cannot be deserialized. Receives a `WorkerFailedEvent`. Retained, so a late listener still gets it. |

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

A teardown settles what is still waiting. A `start()` caught in the middle of its load handshake rejects with a `WorkerDestroyedError` right away -- whether the worker was still coming up, went on to complete the handshake afterwards, or never answered at all; nothing sits out `WorkerLoadTimeout` for a reply that has nowhere left to go. An `applyChangeTrail()` or `importScript()` already on the wire goes the same way, and that cuts a real window: `destroy()` waits for the worker's `Destroyed` reply or `WorkerDestroyTimeout`, so the worker may well finish the change trail in the meantime and confirm it. That confirmation no longer reaches the caller -- the request is rejected at the moment of the teardown, whether it was going to succeed or run into its timeout. Send what has to arrive before you tear the environment down. `workerLoaded` follows the same rule: every promise of it that has not already resolved rejects, and so does every read after the teardown.

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

```typescript
import {
  WorkerLoadTimeout,
  WorkerConfigureTimeout,
  WorkerChangeTrailTimeout,
  WorkerDestroyTimeout,
} from '@spearwolf/shadow-objects';
```

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

**Truthy attributes are not presence attributes.** `local` and `no-autostart` read their value:
the attribute counts as set when it carries `on`, `true`, `yes`, `local` or `1` (case-insensitive,
surrounding whitespace ignored) — or when it stands there bare, `local` and `local=""` alike.
Every other value counts as unset, so `local="false"` stays in Worker mode and `no-autostart="0"`
autostarts. `no-structured-clone` is the odd one out and asks only whether the attribute exists at
all: `no-structured-clone="false"` disables `structuredClone` just as the bare attribute does.

`no-autostart` is not observed and is read exactly once, when the element connects. Setting or
removing it afterwards changes nothing.

Changing `local` after the environment has been created is refused. The attribute callback throws,
and a throw from a Custom Elements reaction does not reach the caller of `setAttribute` — the
browser reports it to the global `error` event instead.

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

**Leaving the tree and coming back.** The teardown waits one microtask. An element that is
back in the document before that microtask runs keeps everything it had: the same
`ShadowEnv`, the same proxy, the same entities in it, and `start()` resolves as before — a
re-render that removes and re-inserts the element within one task costs nothing. An element
still out of the tree when the microtask runs is destroyed, and destroyed for good:
`shadowEnv.isDestroyed` is `true`, `shadowEnv.envProxy` is gone, and a later `start()`
rejects with a `ShadowEnvDestroyedError`. Putting that element back into the document does
not revive it — build a new one. `<shae-ent>` elements of the same namespace keep their
`ViewComponent`s either way; what goes is the environment behind them.

| Property | Description |
| :--- | :--- |
| `shadowEnv` | The `ShadowEnv` this element owns, read-only. Available before the environment is started. |
| `logger` | The `ConsoleLogger` this element reports through, read-only. |
| `autostart` | Whether the element may start on connect. Writable, defaults to `true`; the `no-autostart` attribute is the declarative half of the same decision. |
| `shouldAutostart` | Read-only: `autostart` and the `no-autostart` attribute taken together. This is what the element asks when it connects. |
| `autoSync` | The current `auto-sync` value. **Writing takes strings only:** any other value is read as a flag — a truthy one becomes `"frame"`, a falsy one `"no"`. `el.autoSync = 30` therefore syncs every frame, while `auto-sync="30"` is a 30-millisecond interval. Every value other than the frame default is reflected into the attribute; the frame default is written only when the attribute is already there. |
| `frameLoop` | The `FrameLoop` driving the frame-based sync, taken on first read. There is one per process — every element that reads it gets the same instance. |
| `ns` | The namespace, get and set, inherited from `ShaeElement`. Writing trims the value and reflects it back into the `ns` attribute; an empty value removes the attribute and returns the element to the Global Context. |
| `isShaeWorkerElement` | `true`. `isShaeElement` is `true` as well, inherited from `ShaeElement`. |
| `ShaeWorkerElement.DefaultAutoSync` | Static, `"frame"` — what an empty `auto-sync`, a removed one and any truthy non-string assignment fall back to. An unreadable value does *not* come here; it is reported and switches syncing off. |
| `ShaeWorkerElement.observedAttributes` | Static: `ns`, `local`, `src`, `no-structured-clone`, `auto-sync`. `no-autostart` is deliberately not among them. |

The four signals `isConnected$`, `autoSync$`, `src$` and the inherited `ns$` are part of the
surface as well: read them with `.value` or subscribe to them. They are what the attributes feed —
`src$` carries the trimmed `src`, `autoSync$` the value behind `autoSync`, `isConnected$` whether
the element sits in the tree.

`[FrameLoop.OnFrame]` is the method the frame loop calls; it syncs. The inherited
`syncShadowObjectsOf()` is `protected` and meant for subclasses. The Custom Elements callbacks —
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` — are implemented; a
subclass that overrides one has to call `super`.

#### DOM Events

The element mirrors three of the `ShadowEnv` events onto itself as `CustomEvent`s, so the declarative setup has the same information available as the programmatic one. The names are lower-cased; `detail` always carries `shadowEnv`. `ShadowEnv.AfterSync` is *not* among them — it stays on the `ShadowEnv`.

| Event | `detail` | When |
| :--- | :--- | :--- |
| `contextcreated` | `{shadowEnv}` | The environment became ready. |
| `contextlost` | `{shadowEnv}` | The environment lost its connection. |
| `proxyfailed` | `{shadowEnv, reason}` | The proxy lost the Shadow Environment it stands for. `contextlost` follows. |

All three are dispatched with `bubbles: false` and without `composed`, so they are only heard on
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

Both `ns` and `token` are also readable and writable from JavaScript, and the two differ in what
that does to the markup. `ns` is normalized on the way in: `el.ns = '  hud  '` leaves `ns="hud"` in
the DOM, and an empty namespace removes the attribute and returns the element to the Global
Context. The `token` attribute is trimmed when it is read, and markup the element was upgraded from
keeps what it says — `<shae-ent token="  x  ">` still reads `token="  x  "` while `el.token` reads
`x`. From then on the reflection writes back: on a live element both `el.token = '  x  '` and
`setAttribute('token', '  x  ')` end at `token="x"`, and `el.token = undefined` removes the
attribute.

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
| `findShadowRootHost()` | The host element of the shadow root this element sits in, or `undefined` outside one. |
| `onParentChanged(newParent, oldParent)` | Called when the element leaves its parent node. Re-resolves the entity ancestor; an extension point for subclasses, which have to call `super`. |
| `syncShadowObjects()` | Hands the environment of this element's namespace to the next sync, one microtask later. Inherited from `ShaeElement`. |
| `ShaeEntElement.observedAttributes` | Static: `ns`, `token`, `forward-custom-events`. |

The signals `token$`, `viewComponent$`, `componentContext$`, `forwardCustomEvents$` and the
inherited `ns$` are public, not `protected` — read them with `.value` or subscribe to them.
`forwardCustomEvents$` matters twice over: there is no `forwardCustomEvents` accessor, so the
signal is the only way to set the filter from JavaScript. The attribute is the serialized form of
the signal: `false` and an empty `Set` remove it, a `Set` writes the comma-separated list, and
`true` sets it to the empty string, whatever stood there before. A value already saying the same
thing as the signal is left exactly as it is written, so markup keeps its spelling.

```javascript
const ent = document.querySelector('shae-ent');

ent.forwardCustomEvents$.set(true);                       // forward-custom-events="", replacing any filter list
ent.forwardCustomEvents$.set(new Set(['score-changed'])); // forward-custom-events="score-changed"
ent.forwardCustomEvents$.set(false);                      // attribute removed
```

The element reads the attribute back whenever it connects, and the forwarding follows that result.
Signal, attribute and what actually reaches the DOM therefore say the same thing over the whole
lifecycle, across any number of removals and re-appends.

`getParentNodeForObserver()` and the inherited `syncShadowObjectsOf()` are `protected` and meant
for subclasses. The Custom Elements callbacks — `connectedCallback`, `disconnectedCallback`,
`attributeChangedCallback` — are implemented; a subclass that overrides one has to call `super`.

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
its entity keeps no parent, without the two feeding each other. No attribute leads into that state;
it takes writing `viewComponent$` from outside.

Three things happen after that and are picked up on their own: an element that is itself an entity —
a subclass of `ShaeEntElement`, say, loaded from a lazy module — and that is registered with
`customElements.define()` while the markup around it already sits in the document takes the
entities below it under itself; a change to a `<slot>` assignment re-binds what the slot projects,
and so does moving the `<slot>` element itself; and an entity that stays in the tree
while its parent entity leaves it looks for the closest ancestor still answering. None of this
needs the application to trigger anything.

The move is followed wherever the slot goes: into another entity, into a part of the same shadow
root with no entity above it, and `slot.remove()` along with the window until the slot is put back.
`slotchange` is not `composed` and reaches only the shadow root the slot has landed in, so the
entity giving the slot away hangs its listener on the `<slot>` element itself and hears the event
wherever the slot ends up. What stands at the destination therefore decides nothing about whether
the move is announced.

One thing takes that listener away again. An entity picks a slot up when the slot reports an
assignment, and it lets go on either of two occasions: when it stops being the closest entity above
the slot, and when it leaves the tree. A shadow host that leaves the document and is inserted again
reports no assignment, because the assignment inside its shadow root did not change — so the entity
in it has let go and picks nothing back up.

After such a round trip only the announcement from the receiving side is left. A move into another
entity therefore carries as always, and it is also what ends the gap: the entity the slot arrives
under picks the slot up again and answers for it from then on. A move to a place with no entity
above it goes unseen, and it stays unseen however often the assignment changes afterwards — the
report arrives at the slot, and above the slot nobody is listening.

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
holds for a subclass of `ShaeEntElement` registered from a lazily loaded module. The entities below
have re-bound by the time `customElements.define()` returns; the properties follow one microtask
later, because their channel waits for the tree to stop moving.

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
closest entity the flattened tree still shows above it, and to none where there is none. The one
gap is the shadow host that leaves the document and is inserted again: see the note on the slot
move under [Entity Hierarchy](#entity-hierarchy).

The timing is worth knowing, because the code does not show it: a re-binding takes effect one
microtask after the change, not in the same step. Rebuild the tree and read `entNode` right
afterwards and you read the state from before. This is the timing of the re-request channel — of
every message that says "something above you changed". The first lookup, the one the element makes
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
| `ShaePropElement.observedAttributes` | Static: `name`, `value`, `type`, `no-trim`. |

Unlike the two other elements, `<shae-prop>` keeps its signals to itself: `entNode$`,
`viewComponent$`, `name$`, `valueIn$`, `valueOut$`, `type$`, `shouldTrim$` and `logger` are
`protected` and only reachable from a subclass. The Custom Elements callbacks —
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` — are implemented; a
subclass that overrides one has to call `super`.

#### Invalid Values

A value that cannot be converted into the requested type — malformed JSON, a string `bigint`
cannot parse, the same inside `bigint64array` and `biguint64array` — is reported through the
`ConsoleLogger` and sets the property to `undefined`. This holds for both paths, the attribute
and the JavaScript property; neither throws. The report goes out at error level, which the
logger does not gate behind `ConsoleLogger.sharedConfig.enable`, so it reaches the console on
any host. Every other type is lenient by construction and reports nothing: the numeric ones
yield `NaN`, the typed arrays yield a filled array.

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

- **Signature:** `getEntity(uuid: string): Entity`

```typescript
const entity = kernel.getEntity('abc-123');
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

Returns all Entities in breadth-first order. Pass `true` to reverse (leaves to root, useful for cleanup). The array is the Kernel's own cache, not a copy -- sort, splice or push it in place and you have changed what the Kernel hands out next.

- **Signature:** `traverseLevelOrderBFS(reverse?: boolean): Entity[]`

```typescript
const entities = kernel.traverseLevelOrderBFS();
const reversed = kernel.traverseLevelOrderBFS(true);
```

#### `getEntityGraph()`

Returns the Entity tree as a hierarchical structure, starting at the root Entities -- those without a parent. Each node contains `token`, `entity`, `props`, and `children`; a node the Kernel no longer holds drops out. Useful for debugging.

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

#### Applying a Change Trail by Hand

`run()` is the front door; these seven methods are what it dispatches to. Call them directly and you are writing a change trail entry yourself, without the envelope.

| Method | Signature | Description |
| :--- | :--- | :--- |
| `createEntity` | `(uuid, token, parentUuid?, order?, properties?, autoDestructionOnParentRemoval?)` | Creates an Entity and its Shadow Objects. `properties` is a list of `[name, value]` pairs. |
| `destroyEntity` | `(uuid: string)` | Destroys the Entity, its Shadow Objects and its children. |
| `setParent` | `(uuid, parentUuid?, order?)` | Moves the Entity under a new parent, or makes it a root when `parentUuid` is omitted. An absent `order` keeps the current one -- it is not a reset to `0`. |
| `updateOrder` | `(uuid: string, order: number)` | Sets the sort order among siblings. |
| `changeProperties` | `(uuid: string, properties: [string, unknown][])` | Writes property values; every reader bound to one of the names sees the new value. |
| `changeToken` | `(uuid: string, token: string)` | Replaces the Entity's token, which re-resolves its Shadow Objects the same way `upgradeEntities()` does. |
| `dispatchEventsToEntity` | `(uuid: string, events: IComponentEvent[])` | Delivers View Layer events to the Entity, where every attached Shadow Object receives them as `onViewEvent`. |

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
| `onCreate` | `OnCreate` | Called after the Shadow Object is fully initialized. |
| `onDestroy` | `OnDestroy` | Called before the Shadow Object is destroyed. |
| `onParentChanged` | `OnParentChangedEvent` | Called when the Entity's parent changes -- one microtask after the change, not during it. A Shadow Object cannot assume this has run by the time `kernel.run()` returns; `await Promise.resolve()` first. |
| `onViewEvent` | `OnViewEvent` | Called when the View Layer dispatches an event to this entity. |

Three of the four are called on the Shadow Object as the change happens. `onParentChanged` is the exception: its channel waits for the tree to stop moving.

The `onDestroy` symbol above is the class-side hook. The creation API has a callback of the same name for the function style -- see [`onDestroy(callback)`](#ondestroycallback), which also lists the two paths a Shadow Object reaches its end on.

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

In the browser this is reachable without a rebuild: on first use the logger installs a live config object at `globalThis.ConsoleLogger` whose setters write through to `localStorage`, so `ConsoleLogger.debug = true` typed into the console survives a reload.

The worker of a `RemoteWorkerEnv` is configured from the same origin: a JSON object stored under `ConsoleLogger.RemoteWorkerEnv.workerConfig` is merged on top of the shared config when the worker starts, so the second thread can be made talkative without touching the code that spawns it. The key is read, not trusted -- a value that does not parse to a plain JSON object counts as no config at all, and the key is named once through `remoteEnv.logger.warn`, which is not gated behind `ConsoleLogger.sharedConfig.enable`.

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
