# Shadow Object API Reference

This document serves as a comprehensive reference for the `ShadowObjectCreationAPI`, which is the primary interface developers interact with when defining Shadow Objects.

## The API Object

Whether you define a Shadow Object as a function or a class, the first argument received is the `ShadowObjectCreationAPI` object. This object provides methods to hook into the Entity's lifecycle, manage state, and communicate with the View Layer.

```typescript
import type { ShadowObjectCreationAPI } from '@spearwolf/shadow-objects/shadow-objects.js';

export function MyLogic(api: ShadowObjectCreationAPI) {
    const { useProperty, createSignal, on } = api;
    // ...
}
```

---

## 1. Inputs (Properties)

These methods allow the Shadow Object to "read" data coming from the View Layer (properties set on `<shae-ent>` or via `component.setProperty`).

### `useProperty(name)`

Creates a reactive signal that tracks the value of a specific property on the Entity.

*   **Signature:** `useProperty<T>(name: string): () => T`
*   **Returns:** A signal reader function (getter). Calling it returns the current value.
*   **Reactivity:** When the property changes in the View, any effect or computed value reading this signal will re-run.

```typescript
const title = useProperty('title');

createEffect(() => {
    console.log(`The title is now: ${title()}`);
});
```

### `useProperties(map)`

A convenience helper to create multiple property signals at once.

*   **Signature:** `useProperties<T extends Record<string, unknown>>(map: {[K in keyof T]: string}): {[K in keyof T]: SignalReader<Maybe<T[K]>>}`
*   **Returns:** An object where keys match the input map, and values are signal readers.

```typescript
const { x, y, title } = useProperties{ x: number; y: number, title: string }>({ x: "x", y: "y", title: "title" });
// x() and y() are now number|undefined values
// title is now a signal-reader with a string value
```

---

## 2. Context (Dependency Injection)

The Shadow Objects framework provides a hierarchical Dependency Injection system. Entities can provide values to their descendants.

### `useContext(name)`

Consumes a context value provided by the nearest ancestor Entity that provides it.

*   **Signature:** `useContext<T>(name: string): T | undefined`
*   **Returns:** The context value (which can be a static value, a signal, or an object).
*   **Reactivity:** If the provided value is a signal, reading it makes the current computation reactive.

### `useParentContext(name)`

Similar to `useContext`, but skips the current Entity and starts searching from the parent. Useful for "middleware" components that want to wrap or extend a context value with the same name.

*   **Signature:** `useParentContext<T>(name: string): T | undefined`

### `provideContext(name, value)`

Makes a value available to all descendant Entities in the subtree.

*   **Signature:** `provideContext(name: string, value: any): void`
*   **Note:** The value is often a signal or a store object to allow reactive communication.

### `provideGlobalContext(name, value)`

Makes a value available to **all** Entities in the entire application, regardless of hierarchy.

*   **Signature:** `provideGlobalContext(name: string, value: any): void`

---

## 3. Reactivity Primitives

The framework re-exports reactivity primitives (via `@spearwolf/signalize`). These are the building blocks of your logic.

### `createSignal(initialValue)`

Creates a local reactive state.

*   **Signature:** `createSignal<T>(initial: T): Signal<T>`
*   **Returns:** A signal object `{ value, set(val), ... }`. Since `Signal` is also a function, calling it directly returns the value.

```typescript
const count = createSignal(0);
count.set(c => c + 1);
```

### `createEffect(callback)`

Runs a side effect immediately, and re-runs it whenever any signal accessed within it changes.

*   **Signature:** `createEffect(fn: () => void): void`

### `createMemo(factory)`

Creates a derived signal (computed value). It only re-evaluates when its dependencies change.

*   **Signature:** `createMemo<T>(fn: () => T): () => T`

```typescript
const doubleCount = createMemo(() => count() * 2);
```

### `createResource(factory, cleanup?)`

Advanced primitive for managing external resources (like Three.js objects, subscriptions, etc.) that depend on reactive state.

*   **Signature:** `createResource((val) => Resource, (val, resource) => void)`
*   **Behavior:** When dependencies in the factory change, the `cleanup` function is called for the *previous* resource, and then `factory` is called to create a *new* one.

```typescript
createResource(() => {
    // Factory: Runs when 'id()' changes
    return loadModel(id());
}, (model) => {
    // Cleanup: Runs before the next load, or on destroy
    model.dispose();
});
```

---

## 4. Events

Shadow Objects can communicate via an event system that mirrors standard DOM events but runs within the Shadow World.

### `on(source, eventName, callback)`

Listens for an event on a source.

*   **Signature:**
    *   `on(source: object, event: string, callback: () => any): void`
    *   `on(event: string | symbol | (string|symbol)[], callback: () => any): void` (implicitly uses `entity` as source)
    *   all other arguments from the [@spearwolf/eventize](https://github.com/spearwolf/eventize) package are also supported
*   **Event Source:** Usually `entity` (the current entity instance).
*   **Automatic Cleanup:** Subscriptions created via `on()` are automatically removed when the Shadow Object is destroyed.

#### Listening to View Events

### `on(entity, onViewEvent, callback)`
### `onViewEvent(callback)`

To listen to events dispatched from the DOM (View Layer), listen to the special event name `onViewEvent` on the `entity` target.

```typescript
import { ShadowObjectCreationAPI, onViewEvent as viewEvent } from "@spearwolf/shadow-objects";

function ShadowObject({ on, onViewEvent }: ShadowObjectCreationAPI) {

    // use the convenient wrapper from the shadow-object creation api
    onViewEvent((type, data) => {
        // ...
    });

    // Implicitly listens on the entity (equivalent to above)
    on(viewEvent, (type, data) => {
        if (type === 'click') {
            console.log('Clicked!', data);
        }
    });

    // Explicit event source (equivalent to above)
    on(entity, viewEvent, (type, data) => {
    // ...
    });
}

```

### `once(source, eventName, callback)`

Same as `on`, but the listener is automatically removed after the first trigger. Like `on`, if the first argument is a string, symbol, or array of strings/symbols, the `entity` is used as the event source.

---

## 5. View Integration

Shadow Objects can communicate directly with the View Layer (the DOM) by dispatching messages.

### `dispatchMessageToView(type, data?, transferables?, traverseChildren?)`

Sends an event **from** the Shadow World **to** the View Layer. The `<shae-ent>` DOM element will dispatch a `CustomEvent`.

*   **Signature:** `dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren?: boolean): void`

**Parameters:**
*   `type`: The name of the custom event to dispatch on the `<shae-ent>` element.
*   `data`: (Optional) Data to send as `event.detail`.
*   `transferables`: (Optional) Array of transferable objects (like `ArrayBuffer`, `MessagePort`) to transfer ownership of, instead of cloning.
*   `traverseChildren`: (Optional) If `true`, the event will be dispatched to the corresponding view component and all its descendants in the view hierarchy. Defaults to `false`.

```typescript
// Shadow World
dispatchMessageToView('login-success', { user: 'Alice' });

// View Layer (DOM)
el.addEventListener('login-success', (e) => console.log(e.detail.user));
```

---

## 6. Lifecycle


### `onDestroy(callback)`

Registers a cleanup function. This is critical for preventing memory leaks when using non-framework resources (like `setInterval`).

*   **Signature:** `onDestroy(fn: () => void): void`

```typescript
const interval = setInterval(tick, 1000);
onDestroy(() => clearInterval(interval));
```

---

## 7. The `entity` Instance

The API provides direct access to the underlying `EntityApi` instance via the `entity` property. This gives access to entity metadata like `uuid`, `order`, hierarchy info (`parent`, `children`), and property inspection (`propKeys`, `propEntries`).

The `order` property reflects the sort order defined in the View Layer. This is useful for systems that need to process entities in a specific sequence (e.g. rendering layers), even though the Shadow World itself doesn't enforce a DOM-like structure.

> [!NOTE]
> `dispatchMessageToView` is now a top-level method on the API object and is no longer available on the `entity` instance.
