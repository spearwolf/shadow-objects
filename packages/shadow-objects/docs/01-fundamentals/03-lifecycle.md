# Lifecycle

Understanding the lifecycle of an Entity and its Shadow Objects is crucial for managing resources, side effects, and subscriptions correctly.

## The Entity Lifecycle

An Entity's life is controlled by the **ViewComponent API**.

### View Components & Component Context

The underlying machinery involves two key classes:
1.  **`ViewComponent`**: Represents a single node in the View Layer.
2.  **`ComponentContext`**: Orchestrates a group of ViewComponents, manages their hierarchy, and batches changes (Change Trails) to be sent to the Kernel.

While most developers use the provided Web Components, it's helpful to understand how they map to this API:

*   **`<shae-ent>` (The Entity):** When this Web Component is connected to the DOM, it internally creates a new `ViewComponent` instance and mounts it.
*   **`<shae-worker>` (The Environment):** This Web Component (or similar environment wrappers) manages the `ComponentContext`. It ensures that all `<shae-ent>` children are registered within the same context, allowing them to form a cohesive tree structure that is then synced to the Shadow World.

### Lifecycle Phases

1.  **Mount (View Layer):** The View Component is initialized and registered with its Context.
    *   *Web Components:* `<shae-ent>` connects, finds its nearest `ComponentContext` (provided by parent `<shae-ent>` or root `<shae-worker>`), and registers itself.
    *   *Manual:* You create a `ViewComponent` and call `context.addComponent(component)`.
2.  **Creation (Shadow):** The `ComponentContext` sends a message to the Kernel describing the new component. The Kernel creates an `Entity` node.
3.  **Instantiation:** The Kernel resolves the Token and creates the associated Shadow Object(s).
4.  **Active:** The Shadow Object runs its logic, sets up signals, and reacts to changes.
5.  **Unmount (View Layer):** The View Component is disposed.
    *   *Web Components:* `<shae-ent>` disconnects and calls `component.destroy()`.
    *   *Manual:* You call `component.destroy()` or `context.destroyComponent(component)`.
6.  **Destruction (Shadow):** The Kernel destroys the `Entity` and triggers the cleanup of all associated Shadow Objects.

## The Shadow Object Lifecycle

Shadow Objects are functional units. Their lifecycle is simple: **Setup** and **Teardown**.

### 1. Setup Phase (The Function Body)
The code inside your function (or constructor) runs **once** when the object is instantiated. This is where you connect your logic to the framework.

*   **Goal:** Define your reactive graph.
*   **Actions (The ShadowObjectCreationAPI):**

    *   **Inputs (Properties):**
        *   `useProperty(name)`: Create a reactive signal for a single property.
        *   `useProperties(map)`: Create signals for multiple properties at once.
    *   **Context (Dependency Injection):**
        *   `useContext(name)`: Consume a context value from the nearest ancestor provider.
        *   `useParentContext(name)`: Consume a context value starting from the parent (skipping self).
        *   `provideContext(name, value)`: Provide a value to descendants.
        *   `provideGlobalContext(name, value)`: Provide a value globally to all entities.
    *   **Reactivity:**
        *   `createSignal(initial)`: Create a local state signal.
        *   `createEffect(fn)`: Create a side effect that runs when dependencies change.
        *   `createMemo(fn)`: Create a derived signal (computed value).
        *   `createResource(factory, cleanup)`: Manage an external resource (like a 3D object) with lifecycle management.
    *   **Events:**
        *   `on(target, event, callback)`: Listen for events (from View or other objects).
        *   `once(target, event, callback)`: Listen for an event exactly once.
    *   **Lifecycle:**
        *   `onDestroy(callback)`: Register a cleanup function to run when the object is destroyed.
    *   **Access:**
        *   `entity`: Direct access to the underlying `EntityApi` (advanced usage), including properties like `order` (sort index from View).

```typescript
export function MyLogic({ 
  useProperty, 
  createEffect, 
  createSignal,
  on, 
  entity, // Access to the entity instance
  onDestroy 
}) {
  // SETUP: Runs once
  const title = useProperty('title');
  const [count, setCount] = createSignal(0);
  
  createEffect(() => {
    // RUNTIME: Runs whenever 'title' or 'count' changes
    console.log(`Title: ${title()}, Count: ${count()}`);
  });

  // SETUP: Listen for View events
  // Events dispatched from the View are received on the entity instance as 'onViewEvent'.
  // The first argument is the type (name) of the event, the second is the data.
  on(entity, 'onViewEvent', (type, data) => {
      if (type === 'click') {
          setCount(c => c + 1);
          console.log('View was clicked!', data);
      }
  });

  onDestroy(() => {
    // TEARDOWN: Runs once when destroyed
    console.log('Cleaning up...');
  });
}
```

### 2. Runtime Phase (Reactivity & Events)
After setup, the Shadow Object is "alive". It doesn't re-run the main function. Instead, it reacts to changes in the environment.

#### A. Reactive Updates
Effects and Computed values (Memos) re-run whenever their dependencies change.
*   **Drivers:** Property updates (from View), Context updates (from Parent), or internal Signal changes.

#### B. Event Flow
The Runtime phase is also driven by **Events**, which can flow in multiple directions:

1.  **View → Entity:** The View Layer triggers standard DOM events (like `click`, `input`) or custom events. These are sent to the Entity as events.
    *   **Mechanism:** The `ViewComponent` captures the DOM event and sends a message to the Shadow World.
    *   **Reaction:** The Shadow Object listens to these events on the `entity` instance using `on(entity, 'onViewEvent', (type, data) => ... )`. The specific event name (e.g., 'click') is passed as the first argument.
2.  **Entity → View:** The Shadow Object can emit events. The View Layer receives these messages and can trigger UI updates (e.g., navigation, playing sound).
3.  **Entity Tree (Inter-Object):** Shadow Objects can communicate with each other via events. Because Entities form a tree, events can be dispatched through the hierarchy, allowing decoupled communication between logic units (e.g. a child item signaling a selection to a parent list).

### 3. Teardown Phase (Cleanup)
When the Entity is destroyed (or if the specific route that created this object is disabled), the Teardown phase begins.

*   **Automatic:** All framework-managed signals, effects, and event listeners (`createEffect`, `on`) are automatically disposed of.
*   **Manual:** Use `onDestroy` to clean up *external* resources, such as:
    *   `setInterval` / `setTimeout`
    *   Global event listeners (e.g. on `window`)
    *   WebSockets or network connections

> [!WARNING]
> **Memory Leaks:** Always ensure you clean up non-framework resources in `onDestroy`. Failing to clear a `setInterval` will keep the closure alive indefinitely!
