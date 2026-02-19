# Shadow Objects API Reference

This is the complete API reference for the Shadow Objects framework. Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them.

**Quick navigation:**

- [Shadow Object Creation API](#shadow-object-creation-api)
  - [Inputs (Properties)](#1-inputs-properties)
  - [Context (Dependency Injection)](#2-context-dependency-injection)
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

- **Signature:** `useProperty<T>(name: string): () => T`
- **Returns:** A signal reader function (getter). Calling it returns the current value.
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

### 2. Context (Dependency Injection)

The framework provides a hierarchical dependency injection system. Entities can provide values that flow down to all their descendants in the entity tree.

#### `useContext(name)`

Consumes a context value provided by the nearest ancestor Entity that has it.

- **Signature:** `useContext<T>(name: string): T | undefined`
- **Returns:** The context value (can be a static value, a signal, or an object).
- **Reactivity:** If the provided value is a signal, reading it makes the current computation reactive.

#### `useParentContext(name)`

Like `useContext`, but skips the current Entity and starts searching from the parent. Useful for "middleware" components that want to wrap or extend a context value that shares the same name.

- **Signature:** `useParentContext<T>(name: string): T | undefined`

#### `provideContext(name, value)`

Makes a value available to all descendant Entities in the subtree.

- **Signature:** `provideContext(name: string, value: any): void`
- **Note:** The value is often a signal or a store object to enable reactive communication downstream.

#### `provideGlobalContext(name, value)`

Makes a value available to all Entities in the entire application, regardless of hierarchy position.

- **Signature:** `provideGlobalContext(name: string, value: any): void`

---

### 3. Reactivity Primitives

The framework re-exports reactivity primitives via [@spearwolf/signalize](https://github.com/spearwolf/signalize). These are the building blocks of your logic.

#### `createSignal(initialValue)`

Creates a local reactive state value.

- **Signature:** `createSignal<T>(initial: T): Signal<T>`
- **Returns:** A signal object `{ value, set(val), ... }`. Since `Signal` is also a function, calling it directly returns the current value.

```typescript
const count = createSignal(0);
count.set(c => c + 1);
```

#### `createEffect(callback)`

Runs a side effect immediately, then re-runs it whenever any signal accessed inside it changes.

- **Signature:** `createEffect(fn: () => void): void`

```typescript
createEffect(() => {
    console.log('count is', count());
});
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

Routes can activate based on Entity properties. Syntax: `'@propertyName'`

```javascript
routes: {
    // If the entity has a truthy "debug" property, add debug-overlay behavior
    'game-canvas': ['@debug'],
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
| `token` | The identifier string matching a Registry entry. |
| `context` | (Optional) The `ComponentContext` instance this component belongs to. |
| `parent` | (Optional) The parent `ViewComponent`. |
| `order` | (Optional) Initial sort order (number). Default is `0`. Items are sorted ascending, then by insertion order. |
| `uuid` | (Optional) Explicit unique identifier. If omitted, one is generated automatically. |

### Properties

| Property | Description |
| :--- | :--- |
| `token` | The token string. |
| `uuid` | Unique identifier (read-only). Matches `entity.uuid` in the Shadow Environment. |
| `parent` | Reference to the parent component. |
| `context` | Reference to the managing context. |
| `order` | Numeric sort order within the parent's children list. Useful for controlling execution order or canvas layers. |

### Methods

#### `setProperty(name, value, isEqual?)`

Updates a property value. The change is batched and sent to the Shadow Environment.

```typescript
component.setProperty('score', 1000);

// With custom equality check to avoid unnecessary updates
component.setProperty('position', newPos, (a, b) => a.equals(b));
```

#### `removeProperty(name)`

Removes a property. The change is batched and sent to the Shadow Environment.

```typescript
component.removeProperty('score');
```

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

Removes the component from the hierarchy and signals destruction to the Shadow Environment.

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
| `ShadowEnv.AfterSync` | Fired after each synchronization cycle. Receives the `ChangeTrailType` data. |

```typescript
import { on } from '@spearwolf/eventize';

on(env, ShadowEnv.ContextCreated, (shadowEnv) => {
  console.log('Shadow environment is ready!');
});

on(env, ShadowEnv.AfterSync, (changeTrail) => {
  console.log('Sync complete, changes:', changeTrail.length);
});
```

### Methods

#### `sync()`

Triggers synchronization of pending changes from the `ComponentContext` to the Shadow Environment. Call this in your main render loop (e.g., inside `requestAnimationFrame`). If the environment is not ready, the sync is deferred until `ContextCreated` fires.

#### `syncWait()`

Like `sync()`, but returns a Promise that resolves after synchronization completes. Useful when you need to guarantee the Shadow Environment has processed changes before continuing.

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

Destroys the environment, cleaning up all resources and disconnecting from the Shadow Environment.

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

### `LocalShadowObjectEnv`

Runs the Shadow Environment in the same thread as the View Layer. Good for:
- Simple applications where worker overhead is not needed.
- Debugging (easier to inspect state directly).
- Environments where Web Workers are unavailable.

```typescript
import { LocalShadowObjectEnv } from '@spearwolf/shadow-objects';

const localEnv = new LocalShadowObjectEnv();
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
| `isDestroyed` | `boolean` (read-only). |
| `workerLoaded` | Promise that resolves when the worker is ready. |

**Methods:**

| Method | Description |
| :--- | :--- |
| `importScript(url)` | Import a shadow objects module inside the worker. |

### Worker Timeout Constants

These constants control how long the framework waits for worker responses:

| Constant | Default | Description |
| :--- | :--- | :--- |
| `WorkerLoadTimeout` | 60000ms | Time to wait for the worker to load. |
| `WorkerConfigureTimeout` | 60000ms | Time to wait for module imports. |
| `WorkerChangeTrailTimeout` | 5000ms | Time to wait for change trail confirmation. |
| `WorkerDestroyTimeout` | 5000ms | Time to wait for worker destruction. |

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
| `src` | URL of the JavaScript file with your Shadow Object definitions. Required for the declarative approach. |
| `local` | If present, runs logic on the Main Thread instead of a Web Worker. Default: Worker mode. |
| `auto-sync` | Controls sync frequency. See values below. |
| `ns` | Namespace (Component Context). Defaults to the Global Context. |
| `no-structured-clone` | Only valid with `local`. Disables `structuredClone` for a performance boost. Objects are passed by reference. Use with caution. |

**`auto-sync` values:**

| Value | Behavior |
| :--- | :--- |
| `"frame"` / `"on"` / `"yes"` | Syncs every animation frame via `requestAnimationFrame`. (Default) |
| `"60fps"` or any `Nfps` | Syncs at the targeted frame rate. |
| A number (e.g., `"100"`) | Syncs every N milliseconds. |
| `"no"` / `"off"` | Disables auto-sync. Call `.syncShadowObjects()` manually. |

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

---

### `<shae-ent>`

Represents an Entity (game object) in the Shadow Environment. Corresponds to a `ViewComponent` instance.

`<shae-ent>` elements do not need to be children of `<shae-worker>`. You can place the worker anywhere (e.g., at the end of `<body>`) and scatter entities throughout your layout. As long as the `ns` matches, they connect.

#### Attributes

| Attribute | Description |
| :--- | :--- |
| `token` | The Token (Component Tag) matching a registered Shadow Object constructor. Required. |
| `ns` | The context this entity belongs to. Must match the `ns` on `<shae-worker>` when using named contexts. |
| `forward-custom-events` | Re-dispatches events from the Shadow Object as DOM `CustomEvent`s on this element. Empty or `true` = all events. Comma-separated list = specific events only. |

```html
<shae-ent token="my-player"></shae-ent>
```

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

#### Entity Hierarchy

Nesting `<shae-ent>` elements creates parent-child relationships in the Shadow Environment.

```html
<shae-ent token="solar-system">
  <shae-ent token="planet">
    <shae-ent token="moon"></shae-ent>
  </shae-ent>
</shae-ent>
```

---

### `<shae-prop>`

Declaratively sets properties on the parent `<shae-ent>`.

#### Attributes

| Attribute | Description |
| :--- | :--- |
| `name` | Property name to set on the Shadow Object. |
| `value` | Property value. Always a string in HTML; use `type` to cast it. |
| `type` | Casts the string value to a JavaScript type. See supported types below. |
| `no-trim` | Preserves leading/trailing whitespace. By default string values are trimmed. |

**Supported `type` values:**

| Type | Result |
| :--- | :--- |
| `string`, `text` | String (default). |
| `number`, `float` | `parseFloat` |
| `int`, `integer` | `parseInt` |
| `boolean`, `bool` | `true` / `false` |
| `json` | `JSON.parse` |
| `number[]`, `string[]`, `int[]`, etc. | Splits by whitespace or comma into an array. |
| `float32array`, `uint8array`, etc. | Typed array variants. |

```html
<shae-ent token="player">
  <shae-prop name="score" value="100" type="int"></shae-prop>
  <shae-prop name="active" value="true" type="boolean"></shae-prop>
  <shae-prop name="config" value='{"difficulty": "hard"}' type="json"></shae-prop>
  <shae-prop name="position" value="10 20 30" type="float32array"></shae-prop>
</shae-ent>
```

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
