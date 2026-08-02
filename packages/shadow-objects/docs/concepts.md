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

There is a second, quieter problem. The DOM tree that React, Angular, Vue, or plain JavaScript produces rarely matches the structure of your application logic. It is shaped by layout, by routing, by whatever component library you picked. Your logic wants a different shape, and you end up threading state through nodes that only exist for visual reasons.

Shadow Objects solves both cleanly:

- **Entities are lightweight game objects.** Shadow Objects are ECS components that attach behavior to them.
- **Logic gets its own hierarchy.** The entity tree is spanned, driven, and queried by the View Layer, but it is not the DOM tree. It can be flatter, deeper, or shaped completely differently.
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

### The Five Domains

Two layers is the right first picture, but it puts several distinct jobs into the same box. Look closer and the framework splits into five domains, each with a clear owner:

| # | Domain | Responsibility | Where it lives |
|---|---|---|---|
| 1 | **View** | Structure, properties, input | always the main thread |
| 2 | **Environment** | Place of execution, transport | main thread or worker |
| 3 | **Kernel** | Lifecycle, entity tree | inside the environment |
| 4 | **Composition** | Registry, token, routing | inside the environment |
| 5 | **Shadow Object** | Application logic, reactivity, communication | inside the environment |

The seam between domain 4 and domain 5 is the one worth remembering. *Composition* decides which Shadow Objects come into being on an entity. The *Shadow Object* decides what happens then. Keeping those apart is what lets you attach cross-cutting behavior -- logging, analytics, a debug overlay -- without touching a single line of View code.

The [project README](https://github.com/spearwolf/shadow-objects#the-five-domains) walks through each domain with its building blocks, what it owns, and what it must not touch.

### The View Owns Structure, Not Behavior

This is the single most useful sentence about the architecture.

The View decides **what exists**: which entities there are, how they hang in the tree, which properties they carry, and when they are created and destroyed. It is the only part of the system allowed to make that call.

The View does **not** decide which Shadow Objects run on an entity. It knows tokens, never constructors. It says "here is a `player`", not "here runs `PlayerLogic`". The mapping from token to logic belongs to the Registry, and the Kernel asks the Registry, never the View.

That split is why you can rewire behavior entirely from the logic module while the markup stays untouched, and why the same View code works over the DOM, a GLTF scene graph, or a canvas renderer.

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

The Registry is the configuration lookup table for a Shadow Environment. It owns the mapping from tokens to constructors and the rules by which one token turns into several. It holds no application state: it is configuration, not a runtime object.

The module object that `<shae-worker src>` points at knows four keys:

| Key | What it does |
|---|---|
| `define` | Maps tokens to Shadow Object constructors. |
| `routes` | Composes. One token pulls in further tokens, recursively, and conditionally via `'@propName'` so a property on the entity can decide about additional logic. |
| `extends` | Pulls in other modules. |
| `initialize` | Runs asynchronously at load time and may add definitions later, for example after a feature flag request. |

This is the second decoupling in the framework, and the underrated one. The first separates the View Layer from the logic. This one separates the *composition* of logic from the place it is used. Cross-cutting behavior such as logging, analytics, or a debug overlay gets attached to entities without a single line of View code changing.

Routing decides about existence, not about behavior. What the Shadow Objects do with each other afterwards is written inside them. See [`routes`](./api-reference.md#routes) for the full syntax.

### The View Layer

The View Layer is abstract. The built-in Web Components (`<shae-worker>`, `<shae-ent>`, `<shae-prop>`) are a convenient default implementation, but everything is built on top of the **ViewComponent API** that you can use directly.

This means you are not locked into the DOM structure. You can map Shadow Objects to:

- Nodes in a GLTF file (3D model)
- A scenegraph in a game engine
- React or Vue component trees via a custom adapter
- Plain JavaScript objects in vanilla JS

The Web Components simply call the ViewComponent API internally and mirror the DOM hierarchy into the entity tree automatically.

### Communication Patterns

There are exactly three directions, and they never cross.

**Downstream: properties (View -> Shadow Environment)**

1. A property is set on a `<shae-prop>` element (or via direct API call).
2. `ComponentChanges` books the change. Nothing is sent yet.
3. The next `sync()` collects everything that changed into one batch and ships it to the Kernel.
4. The Kernel writes the values onto the entity.
5. Any Shadow Object that called `useProperty(name)` sees its signal update and reactive effects re-run.

The View pushes data. It never calls logic.

**Upstream: messages (Shadow Environment -> View)**

- A Shadow Object calls `dispatchMessageToView`.
- The Kernel emits `MessageToView`, and the environment proxy carries it across the thread boundary.
- The `ViewComponent` fires it as an [eventize](https://github.com/spearwolf/eventize) event. With the `forward-custom-events` attribute it additionally becomes a DOM `CustomEvent` on the `<shae-ent>` element.

The logic knows no DOM. It only knows message types.

**Lateral: context and the entity bus**

- Contexts travel from ancestor entities to descendants, and they are signals, so consumers update themselves.
- Events emitted on an entity reach every Shadow Object attached to that node.
- `entity.traverse()` reaches the whole subtree. Frame ticks, resize events, and global state changes go this way.

### The Change Trail and the Sync Tempo

The transport between View Layer and Shadow Environment is a **change trail**: a batch of everything that changed since the last run.

`ShadowEnv.sync()` builds that batch and ships it. The `<shae-worker auto-sync>` attribute decides how often that happens: once per animation frame (the default), at a fixed rate, or never, in which case you call `sync()` yourself.

> **The change trail is batched and clocked, not immediate.** Setting a property does not run the dependent effect on the next line. If you expect a synchronous pass-through, you are building race conditions.

When you do need a guarantee, use `syncWait()`, which resolves after the Shadow Environment has processed the batch. See [`ShadowEnv`](./api-reference.md#shadowenv) for both methods.

For local environments you can additionally switch off structured cloning, and then references travel instead of copies. That is more than a performance knob: it is the only way to hand a non-cloneable object such as a DOM node or a canvas context straight to a Shadow Object.

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
      count.set(count.value + 1);
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

### Entity Context (Dependency Injection)

> **Two different things are called "context" in this framework.** *Entity Context* -- described here -- is dependency injection along the entity tree, used from inside Shadow Objects via `provideContext` / `useContext`. `ComponentContext` is something else entirely: the View-Layer object that groups ViewComponents under a namespace and connects them to one Shadow Environment. They never interact. Whenever this documentation says just "context", it means Entity Context.

Entity Context lets you share data deep into the entity tree without manually threading it through every level.

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

If you are using `<shae-ent>`, you can automatically forward these events to the DOM element using the `forward-custom-events` attribute. See the [`<shae-ent>` reference](./api-reference.md#shae-ent) for details.

### What Does Not Exist

There is no channel between two Shadow Environments. View Components in different namespaces are fully isolated: each namespace gets its own Kernel, its own Registry, its own entity tree. If two environments need to know about each other, the View Layer mediates. That is by design, not an omission.

---

## 5. Invariants

The domains hold as long as these sentences hold. If you ever find yourself fighting the framework, check this list first -- chances are you are pushing against one of them.

1. **Structure flows from the View Layer into the environment only, never back.** The Kernel executes what the View tells it. It never invents entities.
2. **A Shadow Object never creates or destroys an entity.** It owns behavior, not existence. If logic needs to spawn something, it tells the View Layer, and the View Layer decides.
3. **An Entity does not know its Shadow Objects by name.** It holds properties, contexts, and an event bus. Everything reacting to that state is a Shadow Object, and they find each other over the bus, not over imports.
4. **The View Layer knows no constructors, only tokens.** Which logic a token resolves to is the Registry's business.
5. **Environments communicate exclusively through the View Layer.** The main thread is the bus.
6. **What the framework did not set up, the framework does not tear down.** Signals, effects, memos, and listeners registered through the creation API are disposed automatically on destroy. Intervals, sockets, and foreign listeners belong in `onDestroy` or in a `createResource`.

Three pillars hold up a roof. Five domains hold up a framework.
