# Class-Based Shadow Objects

While the functional API is the recommended way to define Shadow Objects, the framework also supports a **Class-based API**. This is particularly useful for developers who prefer object-oriented patterns.

## Defining a Shadow Object Class

To define a Shadow Object as a class, you simply export a class. The `constructor` receives the same `ShadowObjectCreationAPI` object as the functional API.

```typescript
import { type ShadowObjectCreationAPI, onCreate, onDestroy, type OnCreate, type onDestroy } from '@spearwolf/shadow-objects';

export class MyShadowObject implements OnCreate, OnDestroy {

  constructor(api: ShadowObjectCreationAPI) {
    const { useProperty, createEffect, on } = api;

    // 1. Setup Reactive State
    const title = useProperty('title');

    createEffect(() => {
      console.log('Title changed:', title());
    });

    // 2. Setup Lifecycle Hooks
  }

  /**
   * Called when the Shadow Object is fully initialized and attached to the Entity.
   * @param entity The underlying Entity instance
   */
  [onCreate](entity) {
    console.log('Shadow Object Created!', entity.uuid);
  }

  /**
   * Called when the Shadow Object is about to be destroyed.
   * Use this to clean up timers, event listeners, or external resources.
   */
  [onDestroy](entity) {
    console.log('Cleaning up...');
  }
}
```

## Automatic Event Handling

One of the key features of the Class-based approach is **automatic event binding**. The framework automatically subscribes your class instance to events emitted by the Entity.

If your class defines a method with the same name as an event, that method will be called when the event is triggered.

### Handling View Events

To handle events sent from the View Layer (via `component.dispatchShadowObjectsEvent` or standard DOM events forwarded to the entity), you can define an `[onViewEvent]` method:

```typescript
import { onViewEvent, type onViewEvent } from '@spearwolf/shadow-objects';

export class MyShadowObject implements onViewEvent {
  // ... constructor ...

  /**
   * Automatically called when the Entity receives an 'onViewEvent'
   * (Standard channel for View -> Shadow communication)
   */
  [onViewEvent](type: string, data: any) {
    if (type === 'click') {
      console.log('View was clicked!', data);
    } else if (type === 'submit') {
      this.handleSubmit(data);
    }
  }

  handleSubmit(data) {
    // ...
  }
}
```

### Handling Custom Entity Events

If other Shadow Objects (or the Kernel) emit custom events on your Entity, you can handle them by matching the method name:

```typescript
// Somewhere else:
// emit(entity, 'onPowerUp', { power: 100 });

export class PlayerLogic {

  onPowerUp(data) {
    console.log('Power Up received!', data.power);
  }

}
```

> [!NOTE]
> This automatic binding is powered by [`@spearwolf/eventize`](https://github.com/spearwolf/eventize). The framework effectively calls `on(entity, shadowObjectInstance)` during initialization.
> So there is no need for you to manually subscribe to the event: `on(entity, 'onPowerUp', ...)`

## Dependency Injection (Context)

You use the context API exactly the same way as in the functional approach, typically inside the `constructor`.

```typescript
export class LevelManager {
  constructor({ provideContext, createSignal }: ShadowObjectCreationAPI) {
    const level = createSignal(1);

    // Provide the level to all children
    provideContext('currentLevel', level);
  }
}
```
