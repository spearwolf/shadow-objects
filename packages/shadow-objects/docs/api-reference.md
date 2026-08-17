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

- **Signature:** `useProperty<T>(name: string, options?): SignalReader<T | undefined>`
- **Returns:** A signal reader function (getter). Calling it returns the current value, or `undefined` while the View has not set the property.
- **Reactivity:** When the property changes in the View, any effect or computed value reading this signal will re-run.

```typescript
const title = useProperty('title');

createEffect(() => {
    console.log(`The title is now: ${title()}`);
});
```

#### `useProperties(map)`

A convenience helper to create multiple property signals at once.

- **Signature:** `useProperties<T extends Record<string, unknown>>(map: {[K in keyof T]: string}): {[K in keyof T]: SignalReader<Maybe<T[K]>>}`
- **Returns:** An object where keys match the input map, and values are signal readers.

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

- **Signature:** `useContext<T>(name: string | symbol, options?): SignalReader<T | undefined>`
- **Returns:** A signal reader. Call it to get the current value: `const scene = useContext<Scene>('three-scene'); scene();`
- **Reactivity:** Reading it inside an effect or memo tracks the dependency automatically. The value is `undefined` until some ancestor provides it.

#### `useParentContext(name, options?)`

Like `useContext`, but skips the current Entity and starts searching from the parent. Useful for "middleware" components that want to wrap or extend a context value that shares the same name.

- **Signature:** `useParentContext<T>(name: string | symbol, options?): SignalReader<T | undefined>`

#### `provideContext(name, sourceOrInitialValue?, options?)`

Makes a value available to all descendant Entities in the subtree, and to all other Shadow Objects on the same Entity.

- **Signature:** `provideContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?): Signal<T | undefined>`
- **Returns:** The context signal. Write to it with `.set(...)` to push a new value to all consumers.
- **Note:** Pass a signal as the source to keep the context in sync with existing reactive state.

#### `provideGlobalContext(name, sourceOrInitialValue?, options?)`

Makes a value available to all Entities in the entire Shadow Environment, regardless of hierarchy position.

- **Signature:** `provideGlobalContext<T>(name: string | symbol, sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>, options?): Signal<T | undefined>`

---

### 3. Reactivity Primitives

The framework re-exports reactivity primitives via [@spearwolf/signalize](https://github.com/spearwolf/signalize). These are the building blocks of your logic.

#### `createSignal(initialValue)`

Creates a local reactive state value.

- **Signatures:**
  - `createSignal<T>(initial: T, params?): Signal<T>`
  - `createSignal<T>(params?): Signal<T | undefined>` (no initial value)
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

Need the value computed on demand instead of up front? Pass a factory with `{lazy: true}`. Without that flag a function argument is stored as the value, so the flag is required rather than optional:

```typescript
const expensive = createSignal(() => buildLookupTable(), {lazy: true});
// buildLookupTable() has not run yet
expensive.get(); // now it runs, once
```

> **`set()` takes a value, never an updater.** `count.set(c => c + 1)` does not call your function — it stores it as the signal's value. Read the previous value yourself, via `count.value` so the write does not subscribe the surrounding effect to its own signal.

The callable form belongs to `SignalReader`, which is what `useProperty()` and `useContext()` return: `const title = useProperty('title'); title();`

#### `createEffect(callback)`

Runs a side effect immediately, then re-runs it whenever any signal accessed inside it changes.

- **Signature:** `createEffect(fn: EffectCallback, options?): Effect`
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

- **Signature:** `createMemo<T>(fn: () => T): () => T`

```typescript
const doubleCount = createMemo(() => count() * 2);
```

#### `createResource(factory, cleanup?)`

Advanced primitive for managing external resources (Three.js objects, subscriptions, GPU buffers) that depend on reactive state. When dependencies in the factory change, the cleanup function is called for the previous resource, then factory is called to create a new one.

- **Signature:** `createResource((val) => Resource, (val, resource) => void)`

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
  - `on(source: object, event: string, callback: () => any): void`
  - `on(event: string | symbol | (string|symbol)[], callback: () => any): void` (implicitly uses `entity` as source)
  - All other argument forms from the [@spearwolf/eventize](https://github.com/spearwolf/eventize) package are also supported.

#### Listening to View Layer Events

To receive events dispatched from the DOM (View Layer), listen to the special `onViewEvent` symbol on the entity.

```typescript
import { ShadowObjectCreationAPI, onViewEvent as viewEvent } from "@spearwolf/shadow-objects";

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

Same as `on`, but the listener is removed automatically after the first trigger.

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

- **Signature:** `emit(target: object, eventNames: string | symbol | (string|symbol)[], ...eventArgs: any[]): void`

```typescript
export function ParentController({ entity, emit }: ShadowObjectCreationAPI) {
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

Sends a message from the Shadow Environment to the View Layer. The corresponding `<shae-ent>` DOM element will dispatch a `CustomEvent`.

- **Signature:** `dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean): void`

**Parameters:**

| Parameter | Description |
| :--- | :--- |
| `type` | The name of the custom event dispatched on the `<shae-ent>` element. |
| `data` | (Optional) Sent as `event.detail`. |
| `transferables` | (Optional) Array of transferable objects (e.g., `ArrayBuffer`, `MessagePort`) to transfer ownership rather than clone. |
| `traverseChildren` | (Optional) If `true`, the event is dispatched to the view component and all its descendants. Defaults to `false`. |

```typescript
// Shadow Environment
dispatchMessageToView('login-success', { user: 'Alice' });

// View Layer (DOM)
el.addEventListener('login-success', (e) => console.log(e.detail.user));
```

> `dispatchMessageToView` is a top-level method on the API object. It is not available on the `entity` instance.

---

### 6. Lifecycle

#### `onDestroy(callback)`

Registers a cleanup function that runs when the Shadow Object is destroyed. Critical for preventing memory leaks with non-framework resources like timers, WebSocket connections, or GPU resources.

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
| `entity.propKeys` | `string[]` (readonly) | All property keys currently set on this Entity. |
| `entity.propEntries` | `[string, unknown][]` (readonly) | Key-value pairs for all properties on this Entity. |

```typescript
createEffect(() => {
    for (const [key, value] of entity.propEntries) {
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

export default {
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
    // A <shae-ent token="user-profile" debug> does not.
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
// 'page' resolves to: ['header', 'menu', 'logo', 'footer']
```

---

### `extends`

Includes other modules. Essential for modular architecture -- split configuration across files, share common configs, or import third-party module libraries.

```javascript
import { CoreModule } from './core-module.js';

export default {
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
export default {
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

| Option | Description |
| :--- | :--- |
| `token` | The identifier string matching a Registry entry. Falls back to `#void` when omitted. |
| `context` | (Optional) The `ComponentContext` instance this component belongs to. |
| `parent` | (Optional) The parent `ViewComponent`. Must belong to the same context and must not be destroyed. |
| `order` | (Optional) Initial sort order (number). Default is `0`. |
| `uuid` | (Optional) Explicit unique identifier. If omitted, one is generated automatically. |
| `autoDestructionOnParentRemoval` | (Optional) Whether the corresponding Entity is destroyed together with its parent. Default is `false`, which promotes the Entity to a root Entity instead. Immutable after creation. |

### Properties

| Property | Description |
| :--- | :--- |
| `token` | The token string. Assigning `undefined` resets it to `#void`. |
| `uuid` | Unique identifier (read-only). Matches `entity.uuid` in the Shadow Environment. |
| `parent` | Reference to the parent component. Assigning `undefined` detaches the component to the root level. |
| `context` | Reference to the managing context. |
| `order` | Numeric sort order within the parent's children list. Useful for controlling execution order or canvas layers. |
| `isDestroyed` | (read-only) Whether the component has been detached from its context. See [The destroyed state](#the-destroyed-state). |
| `autoDestructionOnParentRemoval` | (read-only) The constructor option of the same name. |

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

#### `removeFromParent()`

Detaches the component from its parent and promotes it to a root component. Does nothing when the component has no parent or is destroyed.

#### `dispatchShadowObjectsEvent(type, data, transferables?)`

Sends a custom event to the Shadow Object running in the Shadow Environment. Since the Shadow Environment may be in a Web Worker, data is cloned by default using `structuredClone`. Use `transferables` to transfer ownership of `ArrayBuffer`, `MessagePort`, etc. instead.

```typescript
component.dispatchShadowObjectsEvent('playerJump', { force: 5.0 });
```

#### `on(type, listener)`

`ViewComponent` is an eventized object (via [@spearwolf/eventize](https://github.com/spearwolf/eventize)). Use `on()` to listen for events sent from Shadow Objects back to the View Layer.

```typescript
import { on } from '@spearwolf/eventize';

on(component, 'msg-from-shadow', (data) => {
  console.log('Received:', data);
});
```

#### `destroy()`

Removes the component from the hierarchy and signals destruction to the Shadow Environment. Calling it more than once is safe.

### The destroyed state

After `destroy()` the component is detached from its `ComponentContext`: it no longer appears in any change trail and no longer has a corresponding Entity. `isDestroyed` reports `true`. Holding on to a destroyed component is safe, and its behaviour is uniform:

| Operation | Behaviour while destroyed |
| :--- | :--- |
| `token`, `order` | Assignment updates the local value, nothing is sent |
| `setProperty`, `removeProperty` | Ignored. `setProperty` returns `false` |
| `dispatchShadowObjectsEvent` | Ignored |
| `dispatchEvent` | Still notifies the component's own listeners, children are not traversed |
| `removeFromParent`, `destroy` | Ignored |
| `addChild`, `parent = …` | Throws a `ViewComponentError` |

The split is deliberate: operations that only concern the component itself are absorbed, because a renderer may still be flushing state at teardown. Operations that would tie a second, live component to a dead one throw, because silently ignoring them would leave the caller with a wrong picture of the entity tree.

Assigning a `context` revives the component under the same uuid:

```typescript
component.destroy();
component.isDestroyed; // true

component.context = ComponentContext.get();
component.isDestroyed; // false -- a new Entity is created with the same uuid
```

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

The orchestrator. It manages a group of `ViewComponent`s and handles the communication channel (Worker or Local) to the Kernel. Multiple independent Shadow Environments can coexist on the same page through namespacing.

> **Not to be confused with [Entity Context](#2-entity-context-dependency-injection).** `ComponentContext` lives in the View Layer and answers "which Shadow Environment does this ViewComponent belong to?". Entity Context lives inside the Shadow Environment and answers "which values does this Entity inherit from its ancestors?". The names are similar; the concepts are unrelated.

```typescript
import { ComponentContext } from '@spearwolf/shadow-objects';
```

### Static Methods

#### `ComponentContext.get(namespace?)`

Retrieves or creates a named context singleton. Omitting `namespace` returns the Default Global Context.

```typescript
const defaultCtx = ComponentContext.get();
const level1Ctx = ComponentContext.get('level-1');
```

### Properties

| Property | Description |
| :--- | :--- |
| `ns` | The namespace this context is registered under. |
| `isDisposed` | (read-only) Whether the context has been torn down by `dispose()`. |

### Methods

#### `clear()`

Removes all components without writing anything to a change trail. The context stays registered under its namespace and can be used again afterwards. This is the reset you want between tests or when swapping a whole scene.

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
| `isReady` | `boolean` (read-only) | `true` when both view and proxy are ready and the environment is not destroyed. |
| `isDestroyed` | `boolean` (read-only) | `true` if the environment has been destroyed. |

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
| `ShadowEnv.ContextCreated` | Fired when the environment becomes ready (view and proxy both connected). |
| `ShadowEnv.ContextLost` | Fired when the environment loses its connection. |
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

The `envProxy` property accepts any implementation of `IShadowObjectEnvProxy`. Two implementations ship out of the box.

`ShadowEnv` installs two callbacks on the proxy it is given: `onMessageToView` for messages coming out of the Shadow Environment, and `onProxyFailed` for the loss of that environment. Both are optional -- an implementation only serves the ones it can serve.

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
| `workerLoaded` | Promise that resolves once the worker is ready and rejects with a `WorkerFailedError` when it fails. Every read hands out a promise that can reject, so attach a `catch()` even when you do not await it -- otherwise a failure surfaces as an unhandled rejection. |

**Methods:**

| Method | Description |
| :--- | :--- |
| `importScript(url)` | Import a shadow objects module inside the worker. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `applyChangeTrail(changeTrail, waitForConfirmation)` | Send a change trail to the worker; with `waitForConfirmation` the promise resolves once the worker has applied it. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `start()` | Spawn the worker and wait for the load handshake. Rejects with a `WorkerDestroyedError` after `destroy()`. |
| `destroy()` | Tears the environment down and terminates the worker — once it has acknowledged, or after `WorkerDestroyTimeout` if it stays silent. |

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
| `destroy()` | Tears down the environment, its proxy and the element's signals. Called by the element itself one microtask after it leaves the tree. |

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

Two events are never forwarded, not even without a filter list:
`ComponentContext.ReRequestParentRoots` and `ComponentContext.ReRequestParent`. They are the
internal signals of the parent resolution and stay on the view side.

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
signal is the only way to set the filter from JavaScript. It reflects into the attribute:
`false` and an empty `Set` remove it, a `Set` writes the comma-separated list, and `true` sets it
to the empty string — as long as the attribute is not already there. A filter list standing in the
markup is left as it is when the signal is set to `true`, and the attribute then says less than the
element does.

```javascript
const ent = document.querySelector('shae-ent');

ent.forwardCustomEvents$.set(true);                       // forward-custom-events=""
ent.forwardCustomEvents$.set(new Set(['score-changed'])); // forward-custom-events="score-changed"
ent.forwardCustomEvents$.set(false);                      // attribute removed
```

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
entities below it under itself; a change to a `<slot>` assignment re-binds what the slot projects;
and an entity that stays in the tree while its parent entity leaves it looks for the closest
ancestor still answering. None of this needs the application to trigger anything.

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

---

### `<shae-prop>`

Declaratively sets properties on the entity above it.

#### Finding the Host Entity

The element binds to the closest entity above it, measured on the flattened tree — the tree as the
page renders it. The search goes through shadow roots, follows slot projections to the entity that
holds the `<slot>`, and crosses closed shadow boundaries just as well.

The lookup runs when the element enters the tree, every time it is moved, and every time something
changes above it. A custom element whose tag is registered late takes the properties under it along
the moment it upgrades; a shadow root attached afterwards takes over what its slots project; a
changed slot assignment is followed. When the host entity leaves the tree, the property looks for
the next entity above it and binds to that one. If nothing answers, it has no host and the property
is taken off the entity it left.

One case is out of reach: moving the `<slot>` element itself out of one entity and into another.
`slotchange` fires after the move and therefore at the new position, so the entity the slot left
hears nothing and keeps the property. Changing what a slot is assigned is followed; moving the slot
is not.

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

```typescript
import { ComponentContext } from '@spearwolf/shadow-objects/view';

const ctxA = ComponentContext.get('world-A');
const defaultCtx = ComponentContext.get();
```

---

## Kernel (ECS System Runner)

The `Kernel` is the core engine that manages Entities and Shadow Objects. It processes change trails from the View Layer and orchestrates the lifecycle of all objects in the Shadow Environment.

Direct Kernel usage is rarely needed. The framework manages the Kernel automatically through `ShadowEnv` and the Web Components. These APIs are here for framework integrators and advanced debugging.

```typescript
import { Kernel, Registry } from '@spearwolf/shadow-objects/shadow-objects.js';

// Create with default registry
const kernel = new Kernel();

// Create with a custom registry
const customRegistry = new Registry();
const kernel = new Kernel(customRegistry);
```

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `registry` | `Registry` | The Registry instance used by this Kernel. |
| `logger` | `ConsoleLogger` | Logger for debugging. |

### Methods

#### `run(event)`

Processes a sync event containing change trails from the View Layer.

```typescript
kernel.run({
  changeTrail: [
    { type: ComponentChangeType.CreateEntities, uuid: '...', token: 'player', ... },
  ]
});
```

#### `getEntity(uuid)`

Retrieves an Entity by UUID.

```typescript
const entity = kernel.getEntity('abc-123');
```

#### `hasEntity(uuid)`

Checks whether an Entity exists.

```typescript
if (kernel.hasEntity('abc-123')) { ... }
```

#### `traverseLevelOrderBFS(reverse?)`

Returns all Entities in breadth-first order. Pass `true` to reverse (leaves to root, useful for cleanup).

```typescript
const entities = kernel.traverseLevelOrderBFS();
const reversed = kernel.traverseLevelOrderBFS(true);
```

#### `getEntityGraph()`

Returns the complete Entity tree as a hierarchical structure. Each node contains `token`, `entity`, `props`, and `children`. Useful for debugging.

```typescript
const graph = kernel.getEntityGraph();
console.log(JSON.stringify(graph, null, 2));
```

#### `upgradeEntities()`

Re-evaluates all Entities against the current Registry. Call this after dynamically adding new Shadow Object definitions.

```typescript
shadowObjects.define('new-feature', NewFeature);
kernel.upgradeEntities();
```

#### `findShadowObjects(uuid)`

Returns all Shadow Object instances currently attached to an Entity.

```typescript
const shadowObjects = kernel.findShadowObjects('abc-123');
```

#### `destroy()`

Destroys the Kernel and all its Entities.

### Kernel Events

| Event | Description |
| :--- | :--- |
| `MessageToView` | Emitted when a Shadow Object calls `dispatchMessageToView`. |

```typescript
import { on } from '@spearwolf/eventize';
import { MessageToView } from '@spearwolf/shadow-objects';

on(kernel, MessageToView, (message) => {
  console.log('Message to view:', message);
});
```

---

## Advanced

### Programmatic Registration

#### `shadowObjects.define()`

Registers a Shadow Object constructor with a token at runtime. An alternative to the module `define` object.

```typescript
import { shadowObjects } from '@spearwolf/shadow-objects/shadow-objects.js';

function MyLogic({ useProperty, createEffect }: ShadowObjectCreationAPI) {
  // ...
}

shadowObjects.define('my-token', MyLogic);
```

**Signature:**

```typescript
shadowObjects.define(
  token: string,
  constructor: ShadowObjectConstructor,
  registry?: Registry
): void
```

**Parameters:**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `token` | `string` | The token to associate with this constructor. |
| `constructor` | `ShadowObjectConstructor` | A function or class. |
| `registry` | `Registry` (optional) | Custom Registry instance. Defaults to the global registry. |

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
import type { ShadowObjectCreationAPI, OnCreate, OnDestroy } from '@spearwolf/shadow-objects/shadow-objects.js';
import { onCreate, onDestroy } from '@spearwolf/shadow-objects/shadow-objects.js';

@ShadowObject({ token: 'player-controller' })
export class PlayerController implements OnCreate, OnDestroy {
  constructor({ useProperty, createEffect }: ShadowObjectCreationAPI) {
    const speed = useProperty<number>('speed');

    createEffect(() => {
      console.log('Speed changed:', speed());
    });
  }

  [onCreate](entity) {
    console.log('Player created:', entity.uuid);
  }

  [onDestroy](entity) {
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

#### `registry.findConstructors(token, truthyProps?)`

Resolves all constructors for a token, including all routed tokens.

```typescript
const constructors = registry.findConstructors('game-object', new Set(['debug']));
// Returns constructors for: game-object, physics, renderer, debug-overlay
```

#### `registry.hasToken(token)`

Checks if a token is registered.

#### `registry.hasRoute(route)`

Checks if a route exists.

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
| `onParentChanged` | `OnParentChangedEvent` | Called when the Entity's parent changes. |
| `onViewEvent` | `OnViewEvent` | Called when the View Layer dispatches an event to this entity. |

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
  type ShadowObjectCreationAPI,
} from '@spearwolf/shadow-objects/shadow-objects.js';

export class FullLifecycleExample implements OnCreate, OnDestroy, OnParentChangedEvent, OnViewEvent {
  constructor(api: ShadowObjectCreationAPI) {
    // Setup phase: call api methods here
  }

  [onCreate](entity) {
    console.log('Created and attached to entity:', entity.uuid);
  }

  [onDestroy](entity) {
    console.log('About to be destroyed');
  }

  [onParentChanged](entity) {
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

```typescript
kernel.logger.enabled = true;
kernel.logger.logLevel = 'debug'; // 'debug' | 'info' | 'warn' | 'error'
```

#### Entity Graph Inspection

```typescript
// Snapshot of the entire entity hierarchy
const graph = kernel.getEntityGraph();

// Each node contains:
// - token: string
// - entity: Entity
// - props: Record<string, unknown>
// - children: EntityGraphNode[]

console.log(JSON.stringify(graph, null, 2));
```
