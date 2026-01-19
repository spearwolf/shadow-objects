# View Component API

This section documents the underlying JavaScript classes that power the View Layer. While most users will rely on the provided Web Components (`<shae-ent>`, etc.), this API is essential for:

1.  Integrating with non-DOM rendering engines (Canvas, WebGL, Game Engines).
2.  Building custom integrations with frameworks like React, Vue, or Svelte.
3.  Understanding the "Magic" behind the Web Components.

## `ViewComponent`

Represents a single node in the view hierarchy that maps to a Shadow Entity.

```typescript
import { ViewComponent } from '@spearwolf/shadow-objects/view';
```

### Constructor

```typescript
new ViewComponent(token: string, options?: ViewComponentOptions)
```

*   **`token`**: The identifier string matching a Registry entry.
*   **`options`**:
    *   `context`: The `ComponentContext` instance this component belongs to.
    *   `parent`: (Optional) The parent `ViewComponent`.
    *   `props`: (Optional) Initial properties map.
    *   `order`: (Optional) Initial sort order (number).

### Properties

*   **`id`**: Unique identifier (UUID) assigned by the system.
*   **`token`**: The token string.
*   **`parent`**: Reference to the parent component.
*   **`children`**: Array of child components.
*   **`context`**: Reference to the managing context.
*   **`order`**: Numeric value defining the sorting order within the parent's children list.
    *   Items are sorted by ascending `order` value, then by insertion order.
    *   Default is `0`.
    *   Useful for controlling execution order or layout in non-DOM renderers (e.g. Canvas layers).

### Methods

#### `setProperty(name, value)`
Updates a property value. This change is batched and sent to the Shadow World.

```typescript
component.setProperty('score', 1000);
```

#### `setProperties(map)`
Updates multiple properties at once.

```typescript
component.setProperties({ x: 10, y: 20 });
```

#### `dispatchEvent(type, detail)`
Sends a custom event to the Shadow Object.

```typescript
component.dispatchEvent('playerJump', { force: 5.0 });
```

#### `destroy()`
Removes the component from the hierarchy and signals destruction to the Shadow World.

---

## `ComponentContext`

The orchestrator. It manages a group of `ViewComponent`s and handles the communication channel (Worker or Local) to the Kernel. This enables **Namespacing**, allowing multiple independent Shadow Worlds to exist on the same page.

```typescript
import { ComponentContext } from '@spearwolf/shadow-objects/view';
```

### Static Methods

#### `ComponentContext.get(name)`
Retrieves or creates a named context singleton. If `name` is omitted, it returns the **Default Global Context**.

```typescript
const defaultCtx = ComponentContext.get();
const level1Ctx = ComponentContext.get('level-1');
```

### Namespacing & Contexts

A **Context** represents an isolated instance of a Shadow World (Kernel + Entities).
- **Default Context:** Used when no namespace is specified. Ideal for single-canvas applications.
- **Named Contexts:** Created by passing a string namespace (e.g., `'ui-overlay'`, `'minimap'`). This allows you to have completely separate logical threads (or local environments) for different parts of your application.

Each `ViewComponent` belongs to exactly one Context.

### Instance Methods

#### `addComponent(component)`
Manually registers a component with the context. (Usually handled automatically by `ViewComponent` constructor if context is passed).

#### `connect()`
Establishes the connection to the Kernel/Worker.

#### `destroy()`
Shuts down the context and the associated Shadow World kernel.

---

## Custom Integration Example

Here is how you might map a simple Game Engine object to a Shadow Entity manually:

```typescript
class GameEntity {
    constructor(game, token) {
        this.viewComponent = new ViewComponent(token, {
            context: game.shadowContext
        });

        // Sync position to Shadow World
        this.viewComponent.setProperties({
            x: this.x,
            y: this.y
        });
    }

    update() {
        // Send updates every frame (or optimally, only on change)
        if (this.moved) {
            this.viewComponent.setProperties({ x: this.x, y: this.y });
        }
    }
    
    onDamage() {
        this.viewComponent.dispatchEvent('damage', { amount: 10 });
    }

    destroy() {
        this.viewComponent.destroy();
    }
}
```
