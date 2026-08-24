# Best Practices and Patterns

This guide collects idiomatic patterns and practical advice for developing with Shadow Objects. These patterns come from real-world usage and reflect how the framework's architecture wants to be used.

---

## 1. Shadow Object Structure

Shadow Objects should be pure functions that define their reactive graph and side effects synchronously. Think of the function body as the setup phase -- you declare what should happen, and the framework runs it.

### The Functional Pattern

Prefer the functional API over class-based definitions. It makes the three phases of a Shadow Object explicit and hard to mix up.

```typescript
export function MyShadowObject({
  useProperty,
  createEffect,
  onDestroy
}: ShadowObjectCreationAPI) {

  // 1. Setup Inputs (Signals)
  const getSpeed = useProperty("speed");

  // 2. Define Reactions (Side Effects)
  createEffect(() => {
    console.log("Current speed:", getSpeed());
  });

  // 3. Register Cleanup
  onDestroy(() => {
    console.log("Cleaning up...");
  });
}
```

---

## 2. State Management

### Signals vs. Context

- Use Signals (`createSignal`, `useProperty`) for local state that only this Shadow Object or its direct view component needs.
- Use Context (`provideContext`) for shared state that child entities need. Context is the Dependency Injection system for the entity tree.

### Context Reader Pattern

Avoid scattering raw context key strings throughout your codebase. If the key changes or you need a type, you have to hunt down every usage. Instead, create Context Reader functions that encapsulate the key and the return type.

**Avoid this:**
```typescript
// Consumer.ts
const getScene = useContext("three-scene"); // magic string, no type info
```

**Do this instead:**

```typescript
// three-scene.context.ts
import type { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects/shadow-objects.js";
import type { Scene } from "three";

export const ThreeSceneContext = (useContext: ShadowObjectCreationAPI["useContext"]) =>
  useContext<Scene>("three-scene");
```

```typescript
// Consumer.ts
import { ThreeSceneContext } from "./three-scene.context";

export function MyObject({ useContext }: ShadowObjectCreationAPI) {
  const getScene = ThreeSceneContext(useContext); // type-safe, refactor-safe
}
```

---

## 3. Resource Management

When integrating external libraries that have their own create/dispose lifecycle (Three.js objects, WebSocket connections, physics bodies), use `createResource`. It automatically tears down the previous resource and creates a new one whenever its dependencies change.

### The `createResource` Pattern

```typescript
const myMeshResource = createResource(
  // Factory: runs when reactive dependencies change
  () => {
    const scene = getScene();
    const color = getColor();

    // Guard: if required deps are missing, return nothing
    if (!scene || !color) return;

    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    scene.add(mesh);
    return mesh;
  },
  // Cleanup: runs before re-creation or on entity destroy
  (mesh) => {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
);

// Access the current resource value
const mesh = myMeshResource.get();
```

The cleanup function only runs if the factory previously returned a non-empty value. Always do the guard check in the factory to prevent creating objects with missing dependencies.

---

## 4. View Integration

### Declarative vs. Imperative Properties

Use `<shae-prop>` for primitives (numbers, strings, booleans, arrays). The framework syncs them automatically:

```html
<shae-ent token="my-token">
  <shae-prop name="speed" value="10" type="number"></shae-prop>
</shae-ent>
```

Use `setProperty` imperatively for complex objects that cannot be serialized in HTML (DOM references, Canvas elements, arbitrary objects):

```typescript
// In your custom web component or React/Vue/Svelte integration
this.viewComponent.setProperty("canvasElement", this.canvasRef.current);
```

### Batch Properties

When you need multiple properties, use `useProperties` rather than calling `useProperty` multiple times:

```typescript
const { x, y, visible } = useProperties<{ x: number; y: number; visible: boolean }>({
  x: "position-x",
  y: "position-y",
  visible: "is-visible"
});
```

---

## 5. Naming Conventions

Consistency in file layout makes it easy to navigate a large Shadow Objects codebase.

- Shadow Objects: `src/shadow-objects/<domain>/<name>.shadow-object.ts`
- Context Readers: `src/shadow-objects/<domain>/<name>.context.ts`
- Web Components: `src/elements/<name>.element.ts`
- Group directories by domain/feature (`three/`, `physics/`, `ui/`) rather than by file type.

---

## 6. When to Use Local vs. Remote Environments

Shadow environments can run on the main thread (local) or in a web worker (remote). Both are first-class. **Local is not a debugging crutch, and remote is not an optimization trick.** They answer different requirements, and plenty of production apps ship local.

### Use a local environment when:

- You need to pass non-cloneable objects (DOM references, Canvas contexts, WebGL/WebGPU handles) directly to the Shadow Object. This is the decisive one: no worker can do it, at any price. It takes `no-structured-clone` — the clone a local environment runs by default refuses exactly these values, see [Both Modes Clone the Change Trail](#both-modes-clone-the-change-trail).
- Your logic is coordination-heavy rather than compute-heavy, so a worker would only add latency
- Web Workers are unavailable in the target environment
- You want to step through logic with browser devtools without crossing a worker boundary
- You add `no-structured-clone` for extra performance when you own the data

### Use a remote environment (web worker) when:

- Your Shadow Object logic is CPU-intensive (physics, pathfinding, game AI, simulations)
- You want to keep the UI thread free so animations and input handling stay smooth
- You have a lot of entities running complex effects
- The data crossing the boundary is small compared to the work done behind it

The Shadow Object code is identical either way. Only the proxy changes: build the environment with `LocalShadowObjectEnv` or `RemoteWorkerEnv`, or write `<shae-worker>` with or without the `local` attribute. Pick by what your logic needs to touch, not by whether you are in development or production; a `<shae-worker>` already built and running keeps the mode it started with, and switching means building a new one.

### Both Modes Clone the Change Trail

A local environment clones every entry of the change trail with `structuredClone` before it applies it, although nothing between the view and the Shadow Objects forces a copy. That is the point: local and remote then have the same semantics. An object handed to a Shadow Object arrives as a copy in either mode, so a Shadow Object that writes into it changes nothing the view can see, and an application built against the local environment meets the same behaviour once the same code runs in a worker.

The price is one `structuredClone` per trail entry per sync tick -- and the refusal of everything `structuredClone` cannot take, a DOM node, a canvas context or a WebGL handle included.

Switching the clone off is what lifts both:

```html
<shae-worker local no-structured-clone></shae-worker>
```

```javascript
localEnv.disableStructuredClone = true;
```

The view and the Shadow Objects then share the very objects in the trail. That is the mode in which a local environment carries a handle no worker could ever be given, and it is the mode in which the two environments stop behaving alike -- take it when you own the data on both ends, not to save the clone alone.

### Mind the Sync Tempo, in Both Modes

The change trail is batched and clocked, not immediate. Setting a property does not run the dependent effect on the next line -- not even locally, where no thread boundary is involved. Code that assumes a synchronous pass-through will work by accident until timing shifts, and then it will not.

```javascript
// Wrong: the shadow object has not seen the new value yet
viewComponent.setProperty('level', 5);
assertSomethingAboutTheShadowObject();

// Right: wait for the batch to be processed
viewComponent.setProperty('level', 5);
await env.syncWait();
assertSomethingAboutTheShadowObject();
```

This matters most in tests and in imperative glue code. Inside Shadow Objects you rarely notice it, because everything there reacts anyway.

---

## 7. ECS Composition Patterns

Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them. The power comes from stacking multiple Shadow Objects on a single entity -- each one is focused, testable, and replaceable.

### One Entity, Multiple Behaviors

Register multiple tokens pointing at different Shadow Objects, then compose them on a single entity with a `routes` entry. `define` maps one token to exactly one constructor; composition is what `routes` is for:

```javascript
// my-module.js
export const shadowObjects = {
  define: {
    'physics-body': PhysicsBodyLogic,
    'health-component': HealthLogic,
    'render-mesh': RenderLogic,
  },
  routes: {
    // Composite: a 'player' entity gets all three. 'player' needs no
    // define entry of its own -- the route is the whole definition.
    'player': ['physics-body', 'health-component', 'render-mesh'],
  }
};
```

Each Shadow Object on the entity is independent. They communicate via the entity's event bus:

```typescript
// HealthLogic.ts
export function HealthLogic({ createSignal, emit, onViewEvent }: ShadowObjectCreationAPI) {
  const health = createSignal(100);

  onViewEvent((type, data) => {
    if (type === 'damage') {
      health.set(health.value - data.amount);
      if (health.value <= 0) {
        emit('player-died');
      }
    }
  });
}

// RenderLogic.ts
export function RenderLogic({ on, createEffect }: ShadowObjectCreationAPI) {
  on('player-died', () => {
    // play death animation
  });
}
```

### Avoid Fat Shadow Objects

A Shadow Object that handles physics, rendering, UI, and networking is hard to test and hard to reason about. Split concerns. If a function is getting long, it is doing too much.

### Use Context for Shared Subsystems

When multiple entities need to talk to the same subsystem (a physics world, a Three.js scene, an audio context), provide it via context from a root entity rather than passing it as a property to each child:

```typescript
export function GameRoot({ provideContext }: ShadowObjectCreationAPI) {
  const physicsWorld = new CANNON.World();
  provideContext('physicsWorld', physicsWorld);
}

export function RigidBody({ useContext }: ShadowObjectCreationAPI) {
  const getWorld = useContext('physicsWorld');
  // useContext hands back a signal reader, so call it: getWorld() is the
  // same instance for all children, and reading it inside an effect or a
  // memo tracks the dependency
}
```

---

## 8. Memory Cleanup Checklist

Signals, effects, memos, and `on()` subscriptions created through the `ShadowObjectCreationAPI` are all cleaned up automatically when the entity is destroyed. You do not need to manage them manually.

You do need `onDestroy` for anything outside the framework:

| Resource type | Cleanup pattern |
|---|---|
| `setInterval` / `setTimeout` | `onDestroy(() => clearInterval(id))` |
| External event listeners (`addEventListener`) | `onDestroy(() => el.removeEventListener(...))` |
| External store subscriptions (Redux, Zustand, etc.) | `onDestroy(() => unsubscribe())` |
| WebSocket connections | `onDestroy(() => socket.close())` |
| Three.js / WebGL objects | Use `createResource` with a cleanup function |
| Physics bodies | Use `createResource` with a cleanup function |

```typescript
export function MyLogic({ onDestroy }: ShadowObjectCreationAPI) {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(/* ... */);

  onDestroy(() => controller.abort());
}
```

### The `createResource` Alternative

For anything that has a clear create/destroy lifecycle and depends on reactive state, prefer `createResource` over `onDestroy`. It handles both the initial creation and cleanup automatically whenever dependencies change, not just at destruction time.

---

## 9. Testing Shadow Objects

Shadow Objects are plain functions or classes. You do not need a browser or a running framework to test them. The key is to inject a mock `ShadowObjectCreationAPI`.

### Unit Test Approach

Test the logic in isolation by constructing a minimal API mock:

```typescript
// player-logic.test.ts
import { expect, test, vi } from 'vitest';
import { PlayerLogic } from './PlayerLogic';

function makeMockApi(overrides = {}) {
  const signals: Record<string, { value: unknown }> = {};
  const effects: Array<() => void> = [];
  const destroyCallbacks: Array<() => void> = [];

  return {
    useProperty: (name: string) => {
      signals[name] = signals[name] ?? { value: undefined };
      return () => signals[name].value;
    },
    // Mirror the real Signal: an object, not callable, and set() stores
    // whatever it is given -- it never treats a function as an updater.
    createSignal: (initial: unknown) => {
      let val = initial;
      return {
        get: () => val,
        get value() { return val; },
        set: (next: unknown) => { val = next; },
      };
    },
    createEffect: (fn: () => void) => { effects.push(fn); fn(); },
    onDestroy: (fn: () => void) => destroyCallbacks.push(fn),
    dispatchMessageToView: vi.fn(),
    onViewEvent: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    // helpers exposed for assertions
    _signals: signals,
    _effects: effects,
    _destroy: () => destroyCallbacks.forEach(fn => fn()),
    ...overrides
  };
}

test('PlayerLogic dispatches score-updated when score changes', () => {
  const api = makeMockApi();
  PlayerLogic(api);

  // Simulate the 'score' property arriving from the view
  api._signals['score'].value = 10;
  // Re-run effects (simplified -- a real signal system tracks this automatically)
  api._effects.forEach(fn => fn());

  expect(api.dispatchMessageToView).toHaveBeenCalledWith(
    'score-updated',
    expect.objectContaining({ value: 10 })
  );
});

test('PlayerLogic cleans up on destroy', () => {
  const api = makeMockApi();
  PlayerLogic(api);

  expect(() => api._destroy()).not.toThrow();
});
```

### What to Test

- Effects fire with the right data when signals change
- `dispatchMessageToView` is called with the expected type and payload
- `onDestroy` callbacks are registered and run without errors
- Context is consumed or provided correctly
- Edge cases: missing properties, null values, rapid signal changes

### Integration Testing

For integration tests that need a real Shadow Environment, use `LocalShadowObjectEnv` with `disableStructuredClone = true`. This gives you a fully running Kernel on the main thread without a worker, so you can import modules and assert on entity state directly:

```typescript
import {
  ComponentContext,
  ShadowEnv,
  LocalShadowObjectEnv
} from '@spearwolf/shadow-objects';

const env = new ShadowEnv();
const localProxy = new LocalShadowObjectEnv();
localProxy.disableStructuredClone = true;

env.view = ComponentContext.get('test');
env.envProxy = localProxy;

await localProxy.importModule(myModule);
await env.ready();

// Create a component, sync, assert on entity state
```

This style of test is slower than unit tests but verifies that the whole wiring -- Registry (Component Manifest), Kernel (ECS System Runner), entities, and Shadow Objects -- works together correctly.
