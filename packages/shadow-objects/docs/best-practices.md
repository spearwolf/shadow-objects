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
const scene = useContext("three-scene"); // magic string, no type info
```

**Do this instead:**

```typescript
// three-scene.context.ts
import type { Scene } from "three";

export const ThreeSceneContext = (useContext: ContextReaders) =>
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

Shadow environments can run on the main thread (local) or in a web worker (remote). Both are first-class. Neither is a workaround.

### Use a local environment when:

- You are in development and want to debug with browser devtools (no worker boundary to cross)
- The application is simple and the logic overhead is low
- You need to pass non-transferable objects (DOM references, Canvas contexts) directly to the Shadow Object
- Web Workers are unavailable in the target environment
- You add `no-structured-clone` for extra performance when you own the data

### Use a remote environment (web worker) when:

- You are shipping to production
- Your Shadow Object logic is CPU-intensive (physics, pathfinding, game AI, simulations)
- You want to keep the UI thread free so animations and input handling stay smooth
- You have a lot of entities running complex effects

The rule of thumb: start local during development, switch to remote before shipping. The API is identical either way -- just swap `LocalShadowObjectEnv` for `RemoteWorkerEnv`, or remove the `local` attribute from `<shae-worker>`.

---

## 7. ECS Composition Patterns

Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them. The power comes from stacking multiple Shadow Objects on a single entity -- each one is focused, testable, and replaceable.

### One Entity, Multiple Behaviors

Register multiple tokens pointing at different Shadow Objects, then compose them on a single entity using the HTML structure or by choosing a "composite" token:

```javascript
// my-module.js
export default {
  define: {
    'physics-body': PhysicsBodyLogic,
    'health-component': HealthLogic,
    'render-mesh': RenderLogic,
    // Composite: creates all three
    'player': [PhysicsBodyLogic, HealthLogic, RenderLogic]
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
      health.set(h => h - data.amount);
      if (health() <= 0) {
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
  const world = useContext('physicsWorld');
  // world is the same instance for all children
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
import { PlayerLogic } from './PlayerLogic';

function makeMockApi(overrides = {}) {
  const signals = {};
  const effects = [];
  const destroyCallbacks = [];

  return {
    useProperty: (name) => {
      signals[name] = signals[name] ?? { value: undefined };
      return () => signals[name].value;
    },
    createSignal: (initial) => {
      let val = initial;
      const sig = () => val;
      sig.set = (next) => { val = typeof next === 'function' ? next(val) : next; };
      sig.get = () => val;
      return sig;
    },
    createEffect: (fn) => { effects.push(fn); fn(); },
    onDestroy: (fn) => destroyCallbacks.push(fn),
    dispatchMessageToView: jest.fn(),
    onViewEvent: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
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
