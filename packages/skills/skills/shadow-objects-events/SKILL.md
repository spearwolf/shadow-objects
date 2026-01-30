---
name: shadow-objects-events
description: Event communication patterns in Shadow Objects - View to Shadow, Shadow to View, and inter-Shadow Object messaging
---

# Event Communication in Shadow Objects

The Shadow Objects framework provides a powerful event system for communication between the View Layer (DOM) and the Shadow World (logic layer). Events flow in multiple directions, enabling decoupled, reactive architectures.

## Event Flow Overview

```
View Layer (DOM)                    Shadow World (Worker)
     |                                      |
     |  dispatchShadowObjectsEvent()  ----> |  onViewEvent()
     |                                      |
     |  <---- dispatchMessageToView()       |  emit()
     |                                      |
     |                              Shadow Object A <---> Shadow Object B
     |                                      |
     |                              entity.traverse() (broadcast)
```

## 1. View to Shadow Events

When something happens in the DOM (user clicks, form submits, etc.), you send events to the Shadow World.

### Dispatching from the View

```typescript
// Get the <shae-ent> element
const ent = document.querySelector('shae-ent[token="my-form"]');

// Dispatch an event to the Shadow Object
ent.viewComponent.dispatchShadowObjectsEvent('submit', {
  email: 'alice@example.com',
  password: 'secret123'
});
```

Or with click handlers directly in HTML:

```html
<shae-ent token="counter" id="counter-ent">
  <button onclick="document.getElementById('counter-ent').viewComponent.dispatchShadowObjectsEvent('increment', { value: 1 })">
    +1
  </button>
</shae-ent>
```

### Receiving in the Shadow Object

Use `onViewEvent()` from the creation API:

```typescript
export function MyForm({ onViewEvent }: ShadowObjectCreationAPI) {
  onViewEvent((type, data) => {
    if (type === 'submit') {
      console.log('Form submitted:', data.email);
      // Process the form...
    }
  });
}
```

Or use the event symbol with `on()`:

```typescript
import { onViewEvent as viewEvent } from '@spearwolf/shadow-objects';

export function MyForm({ on }: ShadowObjectCreationAPI) {
  on(viewEvent, (type, data) => {
    console.log(`Received ${type} event:`, data);
  });
}
```

### Transferable Objects

For large data (ArrayBuffers, ImageBitmaps), use transferables to avoid cloning:

```typescript
// View Layer - transfer ownership of the buffer
const imageData = canvas.getContext('2d').getImageData(0, 0, 100, 100);
const buffer = imageData.data.buffer;

ent.viewComponent.dispatchShadowObjectsEvent(
  'process-image',
  { width: 100, height: 100, buffer },
  [buffer]  // Transfer the ArrayBuffer
);
```

## 2. Shadow to View Events

Shadow Objects can send events back to the View Layer using `dispatchMessageToView()`.

### Dispatching from the Shadow Object

```typescript
export function GameLogic({ dispatchMessageToView }: ShadowObjectCreationAPI) {
  // Notify the View when score changes
  function updateScore(newScore: number) {
    dispatchMessageToView('score-changed', { score: newScore });
  }

  // Notify when level is complete
  function completeLevel() {
    dispatchMessageToView('level-complete', {
      time: Date.now(),
      bonus: calculateBonus()
    });
  }
}
```

### Receiving in the View Layer

**Option 1: Using eventize (recommended)**

```typescript
import { on } from '@spearwolf/eventize';

const ent = document.querySelector('shae-ent[token="game"]');

on(ent.viewComponent, 'score-changed', (data) => {
  document.getElementById('score').textContent = data.score;
});

on(ent.viewComponent, 'level-complete', (data) => {
  showModal('Level Complete! Bonus: ' + data.bonus);
});
```

**Option 2: Using forward-custom-events (DOM events)**

Add the `forward-custom-events` attribute to automatically dispatch DOM CustomEvents:

```html
<!-- Forward all events -->
<shae-ent token="game" forward-custom-events></shae-ent>

<!-- Forward specific events only -->
<shae-ent token="game" forward-custom-events="score-changed,level-complete"></shae-ent>
```

Then use standard DOM event listeners:

```typescript
const ent = document.querySelector('shae-ent[token="game"]');

ent.addEventListener('score-changed', (e) => {
  console.log('Score:', e.detail.score);
});

ent.addEventListener('level-complete', (e) => {
  console.log('Level complete with bonus:', e.detail.bonus);
});
```

### Broadcasting to Children

Use `traverseChildren: true` to dispatch to all descendants:

```typescript
export function RootController({ dispatchMessageToView }: ShadowObjectCreationAPI) {
  // This event reaches the view component AND all child view components
  dispatchMessageToView('theme-changed', { theme: 'dark' }, undefined, true);
}
```

## 3. Shadow Object to Shadow Object Events

Shadow Objects on the same Entity can communicate via the Entity's event bus.

### Using emit() and on()

```typescript
import { emit } from '@spearwolf/eventize';

// Producer Shadow Object
export function DataLoader({ entity }: ShadowObjectCreationAPI) {
  async function loadData() {
    const data = await fetch('/api/data').then(r => r.json());
    emit(entity, 'data-loaded', data);
  }
}

// Consumer Shadow Object (same Entity via routing)
export function DataDisplay({ on }: ShadowObjectCreationAPI) {
  on('data-loaded', (data) => {
    console.log('Data received:', data);
  });
}
```

### Broadcasting Down the Entity Tree

Use `entity.traverse()` to send events to all descendant Entities:

```typescript
import { emit } from '@spearwolf/eventize';

export function GameLoop({ entity, on }: ShadowObjectCreationAPI) {
  on('tick', (deltaTime) => {
    // Broadcast frame update to entire subtree
    entity.traverse((e) => {
      emit(e, 'frame-update', { deltaTime });
    });
  });
}

// Any child Shadow Object can listen
export function Sprite({ on }: ShadowObjectCreationAPI) {
  on('frame-update', ({ deltaTime }) => {
    // Update sprite position, animation, etc.
  });
}
```

## Event Patterns & Best Practices

### Pattern: Request/Response

```typescript
// Requester
export function UI({ dispatchMessageToView, onViewEvent }: ShadowObjectCreationAPI) {
  onViewEvent((type, data) => {
    if (type === 'save-request') {
      const result = saveData(data);
      dispatchMessageToView('save-response', { success: true, id: result.id });
    }
  });
}
```

### Pattern: State Synchronization

```typescript
export function Counter({ createSignal, createEffect, dispatchMessageToView }: ShadowObjectCreationAPI) {
  const count = createSignal(0);

  // Automatically notify View when count changes
  createEffect(() => {
    dispatchMessageToView('count-changed', { value: count.get() });
  });
}
```

### Pattern: Event Filtering

```typescript
export function EventRouter({ onViewEvent }: ShadowObjectCreationAPI) {
  const handlers = {
    'user-action': handleUserAction,
    'system-event': handleSystemEvent,
    'debug': handleDebug,
  };

  onViewEvent((type, data) => {
    const handler = handlers[type];
    if (handler) {
      handler(data);
    } else {
      console.warn(`Unknown event type: ${type}`);
    }
  });
}
```

## Reference Files

- `references/view-to-shadow.ts` - Complete example of View to Shadow communication
- `references/shadow-to-view.ts` - Complete example of Shadow to View communication with DOM forwarding
- `references/inter-shadow.ts` - Shadow Object to Shadow Object communication patterns
