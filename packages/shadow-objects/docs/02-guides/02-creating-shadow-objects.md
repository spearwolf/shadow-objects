# Creating Shadow Objects

This guide focuses on the "Brain" of your application: The **Shadow Object**. You will learn how to write clean, reactive logic using the `ShadowObjectCreationAPI`.

## The Shadow Object Function

The recommended way to define a Shadow Object is a simple function. This function acts as the **Setup Phase** of your component logic. It runs exactly once per Entity instance.

```typescript
import { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects/shadow-objects.js";

export function UserProfileLogic({
  useProperty,
  createEffect
}: ShadowObjectCreationAPI) {

  // 1. Setup Phase: Define your reactive graph here
  const userId = useProperty('userId');

  createEffect(() => {
    // 2. Runtime Phase: This runs whenever userId changes
    console.log(`User ID changed to: ${userId()}`);
  });
}
```

> [!NOTE]
> All necessary exports for the shadow objects can be found in the `@spearwolf/shadow-objects/shadow-objects.js` submodule

## Reading Data (Inputs)

### `useProperty`

To read data passed down from the View Component, use `useProperty`.

*   **Returns:** A `SignalReader` (a function that returns the current value).
*   **Behavior:** It is reactive. Accessing it inside `createEffect` or `createMemo` tracks the dependency.

```typescript
const title = useProperty('title');
// access value: title()
```

### `useContext` and `useParentContext`

Shadow Objects exist in an **Entity Tree**, managed by the Kernel. You can access data provided by ancestor Entities using Context.

*   `useContext`: Looks for a provider in the parent chain (including the current entity, though usually used for ancestors).
*   `useParentContext`: Starts looking from the *parent*, skipping the current entity.

```typescript
const theme = useContext('theme');
const navigation = useParentContext('navigationController');
```

## Managing State (Internal)

To store state within your Shadow World logic, use **Signals**.

### `createSignal`

Creates a read/write signal.

```typescript
const count = createSignal(0);

// Read
console.log(count());

// Write
count.set(1);
count.set(c => c + 1); // Update based on previous value
```

### `createMemo`

Creates a derived signal (computed value). It only re-evaluates when its dependencies change.

```typescript
const firstName = useProperty('firstName');
const lastName = useProperty('lastName');

const fullName = createMemo(() => {
  return `${firstName()} ${lastName()}`;
});
```

## Handling Side Effects

### `createEffect`

Use effects to perform actions when state changes. This is where you trigger API calls, log data, or write back to the Entity.

```typescript
createEffect(() => {
  const id = userId();
  if (id) {
    fetchUserData(id).then(data => {
      // update some internal state
      userData.set(data);
    });
  }
});
```

> [!NOTE]
> `createEffect` automatically tracks any signal read during its execution.

## Writing Back to the View

To update the **View Component**, you should use events. This keeps the data flow unidirectional and explicit.

```typescript
export function CounterLogic({ createSignal, createEffect, dispatchMessageToView }) {
  const count = createSignal(0);

  // Notify View of changes
  createEffect(() => {
    dispatchMessageToView('count-changed', { value: count() });
  });
}
```

## Handling Events

Communication isn't just data syncing; it's also about events.

### Listening to View Events

When the View Component dispatches an event (e.g., via `component.dispatchShadowObjectsEvent('submit', { secret: '999' })`), you receive it on the entity.

```typescript
import { onViewEvent } from '@spearwolf/shadow-objects/shadow-objects.js';

// entity is used as event source by default
on(onViewEvent, (type, data) => {
  if (type === 'submit') {
    submitForm(data);
  }
});
```

### Emitting Events to the View

You can also send events *up* to the View.

```typescript
dispatchMessageToView('loginSuccess', { user: 'Alice' });
```

In the View Layer, you would listen for this event on the component.

## Lifecycle Management

### `onDestroy`

Register cleanup logic for when the Entity is destroyed.

```typescript
const timer = setInterval(() => tick(), 1000);

onDestroy(() => {
  clearInterval(timer);
});
```

> [!WARNING]
> Framework resources (signals, effects) are cleaned up automatically. Only use `onDestroy` for external resources like timers, subscriptions to external stores, or DOM events (if running on the main thread).

## Module Definition

Finally, map your logic to a Token in your module file.

```javascript
// my-module.js
import { UserProfileLogic } from './UserProfileLogic.js';

export default {
  define: {
    'user-profile': UserProfileLogic
  }
};
```
