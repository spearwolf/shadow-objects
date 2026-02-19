# Concepts

## 1. The Mental Model

> **Your UI is the renderer. Shadow Objects is the game world.**

If you have ever worked with a game engine, this will feel familiar. In a game engine like Unity or Godot, you have two distinct layers:

- The **renderer** draws what the player sees on screen.
- The **game world** manages entities, components, and all the logic that drives them.

The renderer does not hold state. It reads from the game world and draws. The game world does not care about pixels. It thinks in entities, behaviors, and data.

Shadow Objects applies exactly this split to web development.

- **The View Layer** is your renderer. It is React, Vue, Svelte, plain Web Components -- whatever you use to render HTML. It handles user input and displays output.
- **The Shadow Environment** is your game world. It holds your entities and their ECS components (Shadow Objects). It manages state, runs logic, and communicates with the View Layer through messages.

Shadow Objects does not replace React, Vue, or Svelte. It is the logic layer those frameworks render.

### Why This Matters

Traditional UI frameworks run everything on the main thread and tie your logic to the DOM hierarchy. This works well for document-centric apps. It breaks down when your application has complex state, rich interactions, or needs to run heavy computation without freezing the UI.

When you force domain-specific state (a physics simulation, a 3D scene graph, thousands of game entities) into a UI component tree constrained to a single thread, you get performance bottlenecks and architectural complexity.

Shadow Objects solves this cleanly:

- **Entities are lightweight game objects.** Shadow Objects are ECS components that attach behavior to them.
- **Logic runs where it belongs.** Shadow environments can run on the main thread (local) or in a web worker (remote). Both are first-class.
- **The View Layer stays thin.** It syncs minimal input data down and reacts to output events coming up.
- **Behavior is composable.** A single entity can have multiple Shadow Objects. You build complex behavior by combining small, reusable components -- not by subclassing.

### The Four Core Concepts

| Concept | Role |
|---|---|
| **Entity (Game Object)** | A node in the entity tree. Holds properties and participates in the context system. |
| **Shadow Object (ECS Component)** | A functional unit of logic attached to an entity. Defines behavior. |
| **Token (Component Tag)** | A string identifier that links a View declaration to a Shadow Object in the Registry. |
| **Registry (Component Manifest)** | The lookup table that maps Tokens to Shadow Object constructors. |

**Token vs. ID:** A Token describes *what kind* of thing this entity is -- like a class name. The framework assigns unique IDs internally to distinguish specific instances.

---

## 2. Architecture

### The Big Picture

Shadow Objects separates your application into two layers: the **View Layer** (always on the main thread) and one or more **Shadow Environments** (main thread or web worker). They communicate by passing messages.

```
View Layer (Main Thread)
  |
  |  messages (properties, events, lifecycle)
  v
Shadow Environment [main thread OR web worker]
  |-- Kernel (ECS System Runner)
  |-- Registry (Component Manifest)
  |-- Entity Tree
        |-- Entity
              |-- Shadow Object(s)
```

### Multi-Environment Setup

One of the more powerful features is that you can run multiple Shadow Environments simultaneously. They do not talk to each other directly -- they communicate through the View Layer. The main thread is the message bus.

```
View Layer (Main Thread)
  |                    |
  v                    v
ShadowEnv A        ShadowEnv B
[main thread]      [web worker]
```

This lets you compose independent logic environments side by side -- for example, a main game simulation in a worker and a UI overlay logic on the main thread -- without either environment knowing about the other. If they need to share data, the View Layer mediates.

### The Kernel (ECS System Runner)

The Kernel is the engine inside each Shadow Environment.

- It maintains the **Entity Tree**, mirroring the hierarchy of your View components.
- When an entity is created, it asks the Registry: "What Shadow Objects belong to this Token?" Then it instantiates them.
- It manages the reactive update cycle, batching changes and propagating them efficiently.

### The Registry (Component Manifest)

The Registry is the configuration lookup table for a Shadow Environment.

- It maps **Tokens (Component Tags)** to **Shadow Object constructors**.
- A single Token can map to multiple Shadow Objects (composition via routing).
- Routes can be conditional -- loading logic only when certain properties are present on the entity.

### The View Layer

The View Layer is abstract. The built-in Web Components (`<shae-worker>`, `<shae-ent>`, `<shae-prop>`) are a convenient default implementation, but everything is built on top of the **ViewComponent API** that you can use directly.

This means you are not locked into the DOM structure. You can map Shadow Objects to:

- Nodes in a GLTF file (3D model)
- A scenegraph in a game engine
- React or Vue component trees via a custom adapter
- Plain JavaScript objects in vanilla JS

The Web Components simply call the ViewComponent API internally and mirror the DOM hierarchy into the entity tree automatically.

### Communication Patterns

**Properties flow downstream (View -> Shadow Environment):**

1. A property is set on a `<shae-prop>` element (or via direct API call).
2. The ViewComponent API sends a message to the Kernel.
3. The Kernel updates the entity's properties.
4. Any Shadow Object that called `useProperty(name)` sees its signal update and reactive effects re-run.

**Events flow upstream and laterally (Shadow Environment -> View):**

- Shadow Objects emit events back to the View Layer using `dispatchMessageToView`.
- The View Layer listens and reacts (updates DOM, triggers animations, navigates, etc.).
- Entities also communicate laterally with each other through the entity tree event system.

---

## 3. Entity Lifecycle

Understanding the lifecycle is important for managing resources, side effects, and subscriptions correctly.

### Phases

```
create -> mount -> active -> destroy
```

**create:** The View Layer sends a message to the Kernel: "Create an entity with this Token." The Kernel creates an Entity node in the entity tree.

**mount:** The Kernel resolves the Token against the Registry and instantiates the associated Shadow Objects. Each Shadow Object function runs once. This is the setup phase -- you define your reactive graph, subscribe to properties, listen for events, and register cleanup callbacks.

**active:** The Shadow Object is alive. It does not re-run its main function. Instead it reacts: property signals update when the View sends new data, effects re-run when their dependencies change, events arrive from the View or from sibling/child entities.

**destroy:** The View Component is unmounted (the `<shae-ent>` element disconnects from the DOM, or you call `component.destroy()` manually). The Kernel destroys the Entity and tears down all associated Shadow Objects. Framework-managed signals, effects, and event listeners are disposed automatically.

### Shadow Object Setup

The body of your Shadow Object function runs once during mount. Use it to define your reactive graph:

```typescript
export function MyLogic({
  useProperty,
  createSignal,
  createEffect,
  onViewEvent,
  onDestroy,
}) {
  // SETUP: Runs once on mount

  const title = useProperty('title');
  const count = createSignal(0);

  createEffect(() => {
    // RUNTIME: Re-runs whenever 'title' or 'count' changes
    console.log(`Title: ${title()}, Count: ${count.get()}`);
  });

  onViewEvent((type, data) => {
    if (type === 'click') {
      count.set(c => c + 1);
    }
  });

  onDestroy(() => {
    // TEARDOWN: Runs once on destroy
    // Clean up external resources here (intervals, sockets, global listeners)
    console.log('Cleaning up...');
  });
}
```

### The ShadowObjectCreationAPI

During setup, your function receives an API object with these capabilities:

**Properties (inputs from View Layer):**
- `useProperty(name)` -- reactive signal for a single property
- `useProperties(map)` -- signals for multiple properties at once

**Context (dependency injection):**
- `provideContext(name, value)` -- provide a value to descendant entities
- `provideGlobalContext(name, value)` -- provide a value globally to all entities
- `useContext(name)` -- consume a context value from the nearest ancestor provider
- `useParentContext(name)` -- consume from the parent, skipping the current entity

**Reactivity:**
- `createSignal(initial)` -- local reactive state
- `createEffect(fn)` -- side effect that re-runs when dependencies change
- `createMemo(fn)` -- derived signal (computed value)
- `createResource(factory, cleanup)` -- manage an external resource with lifecycle management

**Events:**
- `onViewEvent(callback)` -- receive events dispatched from the View Layer
- `dispatchMessageToView(type, data)` -- send events back to the View Layer
- `on(target, event, callback)` -- listen for events on any entity or emitter
- `emit(target, event, data)` -- emit an event on any entity or emitter

**Lifecycle:**
- `onDestroy(callback)` -- register a cleanup function

> **Memory leaks:** Always clean up non-framework resources in `onDestroy`. A `setInterval` that is not cleared will keep the closure alive indefinitely.

---

## 4. Entity Tree, Context, and Events

### The Entity Tree

Every `<shae-ent>` element in your View corresponds to one Entity in the Shadow Environment. These entities form a tree that mirrors your View hierarchy.

Shadow Objects are not nodes in this tree. They are ECS components attached to Entity nodes.

- An Entity can have multiple Shadow Objects (via routing rules in the Registry).
- All Shadow Objects attached to the same Entity share the same properties and lifecycle.

### Context (Dependency Injection)

Context lets you share data deep into the entity tree without manually threading it through every level.

**How it works:**

1. A Shadow Object calls `provideContext('my-value', signal)` on an entity.
2. That value becomes available to all other Shadow Objects on the same entity and to all Shadow Objects on descendant entities.
3. Any consumer calls `useContext('my-value')` to read it.

**Context is entity-bound.** Since context is attached to the entity, it acts as a shared bus for all Shadow Objects on that node. This is the primary way to compose complex logic from small, reusable pieces.

```
Entity (Parent)
  Shadow Object A -- provides 'theme'
  Shadow Object B -- consumes 'theme'

Entity (Child)
  Shadow Object C -- consumes 'theme'  (inherited from ancestor)
```

**Context values are signals.** If the provider updates the value, all consumers anywhere in the subtree update automatically. No manual subscriptions needed.

```typescript
// Provider
export function ThemeProvider({ provideContext, createSignal }) {
  const theme = createSignal('dark');
  provideContext('theme', theme);

  // Whoever changes 'theme' here, all consumers see it immediately
}

// Consumer (anywhere in the descendant tree)
export function ThemedButton({ useContext, createEffect }) {
  const theme = useContext('theme');

  createEffect(() => {
    console.log('Current theme:', theme());
  });
}
```

### Events

Every Entity acts as an event emitter. Because multiple Shadow Objects are attached to the same entity, the entity serves as a shared event bus for them.

**View -> Shadow Environment**

Events dispatched from the View Layer are automatically forwarded to the corresponding entity.

View Layer:
```javascript
viewComponent.dispatchShadowObjectsEvent('my-event', { some: 'data' });
```

Shadow Environment:
```typescript
export function MyLogic({ onViewEvent }) {
  onViewEvent((type, data) => {
    if (type === 'my-event') {
      console.log('Received from View:', data);
    }
  });
}
```

**Shadow Object -> Shadow Object (same entity)**

Shadow Objects on the same entity communicate through the entity event bus.

```typescript
// Feature A listens
export function FeatureA({ on }) {
  on('data-loaded', (data) => {
    console.log('Data arrived:', data);
  });
}

// Feature B emits
export function FeatureB({ emit }) {
  emit('data-loaded', { id: 123 });
}
```

**Broadcasting to descendant entities**

Use `traverse` to broadcast events to all entities in a subtree. This is useful for frame ticks, resize events, or global state changes.

```typescript
export function StageController({ emit, entity, on }) {
  on('tick', (deltaTime) => {
    entity.traverse((e) => {
      emit(e, 'frame-update', { deltaTime });
    });
  });
}
```

`traverse()` visits the current entity first, then all descendants recursively.

**Shadow Environment -> View Layer**

Send events back to the View with `dispatchMessageToView`.

Shadow Environment:
```typescript
export function MyLogic({ dispatchMessageToView }) {
  dispatchMessageToView('notify', { message: 'Save successful!' });
}
```

View Layer:
```javascript
import { on } from '@spearwolf/eventize';

on(viewComponent, {
  notify(data) {
    console.log('Received:', data.message);
  },
});
```

If you are using `<shae-ent>`, you can automatically forward these events to the DOM element using the `forward-custom-events` attribute. See the [Web Components API](./03-api/04-web-components.md#forward-custom-events) for details.
