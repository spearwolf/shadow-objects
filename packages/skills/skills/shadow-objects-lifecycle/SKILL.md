---
name: shadow-objects-lifecycle
description: Understand the Shadow Object lifecycle and resource management. Use this skill when managing external resources (Three.js objects, WebSocket connections, timers), implementing cleanup logic with onDestroy, using createResource for managed resources, or understanding the Setup/Runtime/Teardown phases.
---

# Shadow Objects Lifecycle

Every Shadow Object goes through a predictable lifecycle. Understanding this lifecycle is crucial for proper resource management, avoiding memory leaks, and building robust applications.

## When to Use This Skill

Use this skill when:

- Managing external resources (Three.js objects, WebGL contexts, WebSockets)
- Setting up timers or intervals that need cleanup
- Understanding when Shadow Objects are created and destroyed
- Using `createResource` for dependency-tracked resource management
- Implementing proper cleanup with `onDestroy`
- Debugging lifecycle-related issues

## The Three Phases

### 1. Setup Phase

The Shadow Object function body runs **once** when the Entity is created.

```typescript
export function MyObject({ createSignal, createEffect }: ShadowObjectCreationAPI) {
  // SETUP PHASE: This code runs once

  const count = createSignal(0);          // Initialize state
  const timer = setInterval(() => {}, 1000); // Create resources

  createEffect(() => {                     // Register effects
    console.log(count());
  });

  // Setup phase ends when function returns
}
```

### 2. Runtime Phase

Effects and memos re-run automatically when their dependencies change.

```typescript
// This effect is REGISTERED during setup
// But it RUNS during runtime whenever count() changes
createEffect(() => {
  console.log('Count is now:', count());
});
```

### 3. Teardown Phase

When the Entity is destroyed, cleanup happens:

1. All registered `onDestroy` callbacks run
2. Effects are disposed
3. Signals are cleaned up
4. Event listeners are removed

```typescript
onDestroy(() => {
  // TEARDOWN PHASE: Clean up external resources
  clearInterval(timer);
  socket.close();
  mesh.geometry.dispose();
});
```

## What's Automatically Cleaned Up

The framework automatically manages these resources - you don't need `onDestroy`:

| Resource | Automatically Cleaned |
|----------|----------------------|
| Signals created with `createSignal` | Yes |
| Effects created with `createEffect` | Yes |
| Memos created with `createMemo` | Yes |
| Event listeners from `onViewEvent` | Yes |
| Event listeners from `on(entity, ...)` | Yes |
| Context provided with `provideContext` | Yes |

## What YOU Must Clean Up

Use `onDestroy` for external resources not managed by the framework:

| Resource | Needs Manual Cleanup |
|----------|---------------------|
| `setInterval` / `setTimeout` | Yes |
| WebSocket connections | Yes |
| Event listeners on `window` / `document` | Yes |
| Three.js objects (geometries, materials, textures) | Yes |
| Canvas contexts | Yes |
| Web Audio nodes | Yes |
| Fetch abort controllers | Yes |

## Using `onDestroy`

### Basic Cleanup

```typescript
export function Timer({
  createSignal,
  createEffect,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const elapsed = createSignal(0);

  // External resource: interval timer
  const intervalId = setInterval(() => {
    elapsed.set(elapsed.value + 1);
  }, 1000);

  // Clean up when Entity is destroyed
  onDestroy(() => {
    clearInterval(intervalId);
  });
}
```

### Multiple Cleanup Functions

```typescript
export function ComplexResource({
  onDestroy,
}: ShadowObjectCreationAPI) {
  const socket = new WebSocket('wss://api.example.com');
  const timer = setInterval(() => {}, 1000);
  const controller = new AbortController();

  // You can call onDestroy multiple times
  onDestroy(() => clearInterval(timer));
  onDestroy(() => socket.close());
  onDestroy(() => controller.abort());

  // Or combine in one call
  onDestroy(() => {
    clearInterval(timer);
    socket.close();
    controller.abort();
  });
}
```

### Conditional Resources

```typescript
export function ConditionalResource({
  useProperty,
  createEffect,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const enabled = useProperty<boolean>('enabled');
  let connection: WebSocket | null = null;

  createEffect(() => {
    if (enabled()) {
      // Create resource when enabled
      connection = new WebSocket('wss://api.example.com');
    } else if (connection) {
      // Clean up when disabled
      connection.close();
      connection = null;
    }
  });

  // Final cleanup on destroy
  onDestroy(() => {
    connection?.close();
  });
}
```

## Using `createResource`

`createResource` is the recommended way to manage external resources that depend on reactive state. It handles both creation and cleanup automatically.

### Basic Usage

```typescript
export function ManagedMesh({
  useContext,
  createResource,
}: ShadowObjectCreationAPI) {
  const getScene = useContext<() => THREE.Scene>('three-scene');
  const getColor = useProperty<string>('color');

  // createResource(factory, cleanup)
  const mesh = createResource(
    // Factory: runs when dependencies change
    () => {
      const scene = getScene?.();
      const color = getColor();

      if (!scene || !color) return undefined; // Guard clause

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      return mesh; // Return the resource
    },
    // Cleanup: runs before re-creation or on destroy
    (mesh) => {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  );

  createEffect(() => {
    const m = mesh();
    if (m) {
      m.position.set(0, 1, 0);
    }
  });
}
```

### How createResource Works

1. **Initial Creation**: Factory runs immediately if all dependencies are available
2. **Dependency Change**: When any Signal read in factory changes:
   - Cleanup function runs with old resource
   - Factory runs again to create new resource
3. **Entity Destruction**: Cleanup runs one final time

```
Timeline:
┌─────────────────────────────────────────────────────────────┐
│ Setup      │ Runtime                        │ Teardown     │
├─────────────────────────────────────────────────────────────┤
│ factory()  │ dependency changes → cleanup() │ cleanup()    │
│            │                    → factory() │              │
│            │ dependency changes → cleanup() │              │
│            │                    → factory() │              │
└─────────────────────────────────────────────────────────────┘
```

### Resource with Multiple Dependencies

```typescript
export function DynamicSprite({
  useProperty,
  createResource,
}: ShadowObjectCreationAPI) {
  const textureUrl = useProperty<string>('texture');
  const width = useProperty<number>('width');
  const height = useProperty<number>('height');

  const sprite = createResource(
    () => {
      const url = textureUrl();
      const w = width() ?? 100;
      const h = height() ?? 100;

      if (!url) return undefined;

      // Create sprite with current dimensions
      const sprite = new Sprite(url, w, h);
      return sprite;
    },
    (sprite) => {
      sprite.destroy();
    }
  );

  // Sprite is automatically recreated when:
  // - textureUrl changes
  // - width changes
  // - height changes
}
```

## Lifecycle Patterns

### Pattern 1: Initialization Sequence

```typescript
export function GameScene({
  createSignal,
  createEffect,
  provideContext,
  dispatchMessageToView,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const isInitialized = createSignal(false);
  const renderer = createSignal<WebGLRenderer | null>(null);

  // Async initialization
  (async () => {
    const canvas = await requestCanvas();
    const gl = canvas.getContext('webgl2');
    const r = new WebGLRenderer({ canvas, context: gl });

    renderer.set(r);
    provideContext('renderer', renderer);
    isInitialized.set(true);

    dispatchMessageToView('scene-ready', {});
  })();

  onDestroy(() => {
    renderer.get()?.dispose();
  });
}
```

### Pattern 2: Lazy Resource Creation

```typescript
export function LazyLoader({
  useProperty,
  createSignal,
  createEffect,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const shouldLoad = useProperty<boolean>('load');
  const resource = createSignal<HeavyResource | null>(null);

  createEffect(() => {
    if (shouldLoad() && !resource.get()) {
      // Create only when needed
      resource.set(new HeavyResource());
    }
  });

  onDestroy(() => {
    resource.get()?.dispose();
  });
}
```

### Pattern 3: Resource Pool

```typescript
export function ObjectPool({
  createSignal,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const pool = createSignal<Poolable[]>([]);
  const active = createSignal<Set<Poolable>>(new Set());

  const acquire = () => {
    const available = pool.get().find(obj => !active.get().has(obj));
    if (available) {
      active.set(new Set([...active.value, available]));
      return available;
    }
    const newObj = new Poolable();
    pool.set([...pool.value, newObj]);
    active.set(new Set([...active.value, newObj]));
    return newObj;
  };

  const release = (obj: Poolable) => {
    const newActive = new Set(active.value);
    newActive.delete(obj);
    active.set(newActive);
    obj.reset();
  };

  onDestroy(() => {
    pool.get().forEach(obj => obj.dispose());
  });

  return { acquire, release };
}
```

## Best Practices

1. **Always clean up external resources**: Timers, connections, DOM listeners
2. **Use createResource for reactive resources**: Automatic cleanup on dependency changes
3. **Guard createResource factories**: Return `undefined` when dependencies aren't ready
4. **Keep onDestroy focused**: One cleanup concern per callback
5. **Test destruction**: Verify resources are properly released

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Memory leaks from timers | Always `clearInterval`/`clearTimeout` in `onDestroy` |
| Orphaned event listeners | Remove `window`/`document` listeners in `onDestroy` |
| Three.js memory leaks | Dispose geometries, materials, textures |
| WebSocket leaks | Close connections in `onDestroy` |
| createResource without guard | Return `undefined` when deps not ready |

## Debugging Lifecycle Issues

```typescript
export function DebugLifecycle({
  entity,
  onDestroy,
}: ShadowObjectCreationAPI) {
  console.log(`[${entity.token}] Setup phase started`);

  onDestroy(() => {
    console.log(`[${entity.token}] Teardown phase started`);
  });
}
```

## Complete Example

See [references/lifecycle-phases.ts](references/lifecycle-phases.ts) for a complete walkthrough of all lifecycle phases.

See [references/resource-management.ts](references/resource-management.ts) for `createResource` patterns.

See [references/cleanup-patterns.ts](references/cleanup-patterns.ts) for cleanup best practices.

## Related Skills

- **shadow-objects-basics**: Understanding Entities and Shadow Objects
- **shadow-objects-signals**: Signals that createResource depends on
- **shadow-objects-context**: Providing resources via Context
