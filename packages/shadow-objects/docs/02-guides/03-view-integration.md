# View Integration

This guide explains how to integrate Shadow Objects into your application's View Layer. While the framework is agnostic, it provides first-class support for Web Components.

## The View Component API

At its core, the View Layer interacts with the Shadow World via the **ViewComponent API**.

*   **`ComponentContext`**: The manager that handles the connection to the Kernel (Worker).
*   **`ViewComponent`**: Represents a single interactive element.

Most of the time, you will not use these classes directly. Instead, you will use the provided Custom Elements.

## Using Web Components

The package `@spearwolf/shadow-objects/elements` provides ready-to-use Web Components.

### 1. `shae-worker` (The Container)

This element acts as the boundary for your Shadow World. It initializes the Worker (or Main Thread kernel) and provides the `ComponentContext`.

```html
<shae-worker src="./shadow-worker.js">
  <!-- Your app goes here -->
</shae-worker>
```

*   **`src`**: Path to the JavaScript module that exports your Shadow Objects definitions (the Registry configuration).
*   **`name`**: (Optional) Name for the context/worker.

### 2. `shae-ent` (The Entity)

This element represents a **View Component**. When placed inside a `shae-worker`, it automatically registers itself and spawns a corresponding Entity in the Shadow World.

```html
<shae-ent token="my-button">
  <button>Click Me</button>
</shae-ent>
```

*   **`token`**: The string identifier that maps to a Shadow Object in your Registry.

### 3. `shae-prop` (Property Binder)

This element is a helper to declare properties declaratively in HTML. It syncs the `value` attribute to the parent Entity.

```html
<shae-ent token="user-card">
  <shae-prop name="username" value="Alice"></shae-prop>
  <shae-prop name="role" value="admin"></shae-prop>
</shae-ent>
```

*   **`name`**: The property name key.
*   **`value`**: The value to pass (string).

## Handling Events & Interaction

Since `shae-ent` is just a DOM element, you interact with it using standard DOM APIs.

### Sending Events to Shadow World

To send an event to the logic:

```javascript
const ent = document.querySelector('shae-ent');

// The underlying ViewComponent instance is available as .component
ent.component.dispatchEvent('viewEvent', {
  type: 'my-custom-action',
  payload: { foo: 'bar' }
});
```

The Shadow Object receives this via `on(entity, 'onViewEvent', ...)`.

### Receiving Events from Shadow World

When a Shadow Object calls `dispatchMessageToView('my-event', data)`, the `<shae-ent>` element dispatches a CustomEvent.

```javascript
ent.addEventListener('my-event', (e) => {
  console.log('Received from Shadow World:', e.detail);
});
```

To update the UI based on state changes in the Shadow Object, you should emit events from the Shadow Object.

```javascript
// Shadow Object
createEffect(() => {
   // Whenever count changes, notify the view
   dispatchMessageToView('count-changed', { value: count() });
});
```

To update the UI based on state changes in the Shadow Object, you should emit events from the Shadow Object.

```javascript
// Shadow Object
createEffect(() => {
   // Whenever count changes, notify the view
   dispatchMessageToView('count-changed', { value: count() });
});

// View Layer
ent.addEventListener('count-changed', (e) => {
   document.getElementById('count-display').innerText = e.detail.value;
});
```

## Advanced: Custom View Components

If you don't want to use `<shae-ent>`, you can implement your own view layer using the API directly.

```javascript
import { ComponentContext, ViewComponent } from '@spearwolf/shadow-objects/view';

// 1. Get the global context (or create one)
const context = ComponentContext.get('global');

// 2. Create a component
const myComponent = new ViewComponent('my-token', {
  context: context
});

// 3. Add to hierarchy (optional, defaults to root)
context.addComponent(myComponent);

// 4. Send updates
myComponent.setProperty('title', 'New Title');

// 5. Cleanup
myComponent.destroy();
```

> [!TIP]
> This approach is useful if you are integrating with a framework like React, Vue, or a Game Engine (Canvas/WebGL), where DOM elements for every entity might be overhead.
