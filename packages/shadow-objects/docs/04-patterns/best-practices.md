# Best Practices & Patterns

This guide collects idiomatic patterns and best practices for developing with the Shadow Objects Framework. These patterns have been distilled from real-world usage in the `shadow-worlds` project and verified against the framework's internal architecture.

## 1. Shadow Object Structure

Shadow Objects should be pure functions that define their reactive graph and side effects synchronously.

### The Functional Pattern

Always prefer the functional API over class-based definitions. It forces a clear separation between setup (synchronous) and reaction (asynchronous effects).

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

## 2. State Management

### Signals vs. Context

*   **Use Signals (`createSignal`, `useProperty`)** for local state that only this object or its direct view component needs.
*   **Use Context (`provideContext`)** for shared state that needs to be accessible by child entities (Dependency Injection).

### Context Reader Pattern

Avoid using raw strings for context keys throughout your codebase. Instead, create "Context Reader" functions that encapsulate the key and the type.

**Bad:**
```typescript
// Consumer.ts
const scene = useContext("three-scene") as Scene; // Magic string, type casting
```

**Good:**
1. Create a definition file (e.g., `three-scene.context.ts`):
```typescript
import type { Scene } from "three";
import { ShadowObjectContext } from "../../constants";

export const ThreeSceneContext = (useContext: ContextReaders) =>
  useContext<Scene>("three-scene");
```

2. Use it in your Shadow Object:
```typescript
// Consumer.ts
import { ThreeSceneContext } from "./three-scene.context";

export function MyObject({ useContext }: ShadowObjectCreationAPI) {
  const getScene = ThreeSceneContext(useContext); // Type-safe!
}
```

## 3. Resource Management

When integrating external libraries (like Three.js, Physics engines, or WebSocket connections) that have their own lifecycle methods (create/dispose), use `createResource`.

### The `createResource` Pattern

`createResource` automatically handles the teardown and recreation of objects when their dependencies change.

```typescript
const myMeshResource = createResource(
  // Factory: Runs when dependencies change
  () => {
    const scene = getScene();
    const color = getColor();

    // Safety check: Don't create if deps are missing
    if (!scene || !color) return;

    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    scene.add(mesh);
    return mesh;
  },
  // Cleanup: Runs before re-creation or on destruction
  (mesh) => {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
);
```

> [!NOTE]
> `createResource` returns a signal. You can access the current instance via `myMeshResource()`.

## 4. View Integration

### Declarative vs. Imperative Properties

*   **Declarative (`<shae-prop>`):** Use for primitive data (numbers, strings, booleans, arrays). The framework handles the syncing automatically.
    ```html
    <shae-ent token="my-token">
      <shae-prop name="speed" value="10" type="number"></shae-prop>
    </shae-ent>
    ```

*   **Imperative (`setProperty`):** Use for complex objects (like DOM references, Canvas elements) that cannot be serialized easily in HTML. Call `setProperty` on the view component instance.
    ```typescript
    // In your Web Component
    firstUpdated() {
      this.viewComponent.setProperty("canvasElement", this.canvasRef);
    }
    ```

### Batch Property Access

If you need multiple properties, avoid calling `useProperty` multiple times. Use `useProperties` to get a structured object of signals.

```typescript
const { x, y, visible } = useProperties<{ x: number; y: number; visible: boolean }>({
  x: "position-x",
  y: "position-y",
  visible: "is-visible",
});
```

## 5. Naming Conventions

Consistency is key for maintainability.

*   **Shadow Objects:** `src/shadow-objects/<domain>/<name>.shadow-object.ts`
*   **Context Readers:** `src/shadow-objects/<domain>/<name>.context.ts`
*   **Web Components:** `src/elements/<name>.element.ts`
*   **Directories:** Group by domain/feature (e.g., `three/`, `physics/`, `ui/`) rather than by file type.
