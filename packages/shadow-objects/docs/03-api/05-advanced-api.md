# Advanced API Reference

This document covers advanced APIs for developers who need more control over the Shadow Objects framework. These APIs are typically used for:

- Building custom integrations or frameworks
- Dynamic registration of Shadow Objects at runtime
- Advanced debugging and introspection

> [!NOTE]
> Most applications should use the standard [Shadow Object API](./01-shadow-object-api.md) and [Module Configuration](./02-registry-and-modules.md). The APIs documented here are for advanced use cases.

---

## Programmatic Registration

### `shadowObjects.define()`

Registers a Shadow Object constructor with a token programmatically. This is an alternative to the module `define` object.

```typescript
import { shadowObjects } from '@spearwolf/shadow-objects/shadow-objects.js';

function MyLogic({ useProperty, createEffect }: ShadowObjectCreationAPI) {
  // ...
}

// Register the Shadow Object
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
|-----------|------|-------------|
| `token` | `string` | The token to associate with this constructor |
| `constructor` | `ShadowObjectConstructor` | A function or class |
| `registry` | `Registry` (optional) | A custom Registry instance. Defaults to the global registry. |

**Use Cases:**

- Conditional registration based on runtime conditions
- Plugin systems where Shadow Objects are loaded dynamically
- Testing scenarios where you need to mock Shadow Objects

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

## The `@ShadowObject` Decorator

The `@ShadowObject` decorator provides a declarative way to register class-based Shadow Objects. It automatically registers the class with the specified token.

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
|--------|------|-------------|
| `token` | `string` | The token to register this class with |
| `registry` | `Registry` (optional) | A custom Registry instance |

> [!WARNING]
> The decorator automatically calls `eventize(this)` on the instance, making it compatible with the event system. You don't need to call `eventize` manually.

---

## The Registry Class

The `Registry` manages the mapping between tokens and Shadow Object constructors. It also handles routing rules for composition.

### Getting the Registry

```typescript
import { Registry } from '@spearwolf/shadow-objects/shadow-objects.js';

// Get the default (global) registry
const defaultRegistry = Registry.get();

// Get a specific registry (or default if undefined)
const registry = Registry.get(customRegistry);
```

### Registry Methods

#### `define(token, constructor)`

Registers a constructor with a token. If the token already exists, the constructor is added to the list (allowing multiple Shadow Objects per token).

```typescript
registry.define('my-token', MyLogic);
registry.define('my-token', AnotherLogic); // Both will be instantiated
```

#### `appendRoute(token, routes)`

Adds routing rules for a token. When an Entity with this token is created, the specified routes are also resolved.

```typescript
// When 'game-object' is created, also create 'physics' and 'renderer'
registry.appendRoute('game-object', ['physics', 'renderer']);

// Conditional route: '@debug' activates when 'debug' property is truthy
registry.appendRoute('@debug', ['debug-overlay']);
```

#### `clearRoute(route)`

Removes a routing rule.

```typescript
registry.clearRoute('game-object');
```

#### `findConstructors(token, truthyProps?)`

Resolves all constructors for a token, including routed tokens.

```typescript
const constructors = registry.findConstructors('game-object', new Set(['debug']));
// Returns constructors for: game-object, physics, renderer, debug-overlay
```

#### `hasToken(token)`

Checks if a token is registered.

```typescript
if (registry.hasToken('player')) {
  // ...
}
```

#### `hasRoute(route)`

Checks if a route exists.

```typescript
if (registry.hasRoute('game-object')) {
  // ...
}
```

#### `clear()`

Removes all registrations and routes.

```typescript
registry.clear();
```

---

## The Kernel Class

The `Kernel` is the core engine that manages Entities and Shadow Objects. It processes change trails from the View Layer and orchestrates the lifecycle of all objects.

> [!WARNING]
> Direct Kernel usage is rarely needed. The framework manages the Kernel automatically through `ShadowEnv` and the Web Components.

### Creating a Kernel

```typescript
import { Kernel, Registry } from '@spearwolf/shadow-objects/shadow-objects.js';

// Create with default registry
const kernel = new Kernel();

// Create with custom registry
const customRegistry = new Registry();
const kernel = new Kernel(customRegistry);
```

### Kernel Properties

| Property | Type | Description |
|----------|------|-------------|
| `registry` | `Registry` | The Registry instance used by this Kernel |
| `logger` | `ConsoleLogger` | Logger for debugging |

### Kernel Methods

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

Retrieves an Entity by its UUID.

```typescript
const entity = kernel.getEntity('abc-123');
```

#### `hasEntity(uuid)`

Checks if an Entity exists.

```typescript
if (kernel.hasEntity('abc-123')) {
  // ...
}
```

#### `traverseLevelOrderBFS(reverse?)`

Returns all Entities in breadth-first order.

```typescript
// Root to leaves
const entities = kernel.traverseLevelOrderBFS();

// Leaves to root (useful for cleanup)
const reversed = kernel.traverseLevelOrderBFS(true);
```

#### `getEntityGraph()`

Returns the complete Entity tree as a hierarchical structure. Useful for debugging.

```typescript
const graph = kernel.getEntityGraph();
console.log(JSON.stringify(graph, null, 2));
```

#### `upgradeEntities()`

Re-evaluates all Entities against the current Registry. Use this after dynamically adding new Shadow Object definitions.

```typescript
// Register a new Shadow Object
shadowObjects.define('new-feature', NewFeature);

// Upgrade existing entities to pick up new definitions
kernel.upgradeEntities();
```

#### `findShadowObjects(uuid)`

Returns all Shadow Object instances attached to an Entity.

```typescript
const shadowObjects = kernel.findShadowObjects('abc-123');
```

#### `destroy()`

Destroys the Kernel and all its Entities.

```typescript
kernel.destroy();
```

### Kernel Events

The Kernel emits events that can be listened to using the eventize API:

| Event | Description |
|-------|-------------|
| `MessageToView` | Emitted when a Shadow Object calls `dispatchMessageToView` |

```typescript
import { on } from '@spearwolf/eventize';
import { MessageToView } from '@spearwolf/shadow-objects';

on(kernel, MessageToView, (message) => {
  console.log('Message to view:', message);
});
```

---

## Lifecycle Event Symbols

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
|--------|-----------|-------------|
| `onCreate` | `OnCreate` | Called after the Shadow Object is fully initialized |
| `onDestroy` | `OnDestroy` | Called before the Shadow Object is destroyed |
| `onParentChanged` | `OnParentChangedEvent` | Called when the Entity's parent changes |
| `onViewEvent` | `OnViewEvent` | Called when the View dispatches an event |

### Example: Class with Lifecycle Methods

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
    // Setup phase
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

## Debugging

### Console Logger

The Kernel includes a logger that can be enabled for debugging:

```typescript
kernel.logger.enabled = true;
kernel.logger.logLevel = 'debug'; // 'debug' | 'info' | 'warn' | 'error'
```

### Entity Graph Inspection

```typescript
// Get a snapshot of the entire entity hierarchy
const graph = kernel.getEntityGraph();

// Each node contains:
// - token: string
// - entity: Entity
// - props: Record<string, unknown>
// - children: EntityGraphNode[]
```
