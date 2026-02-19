# Shadow Objects Guides

Shadow Objects is the logic layer of your application. Entities are lightweight game objects; Shadow Objects are ECS components that attach behavior to them. This guide walks through the main patterns for writing that logic.

---

## 1. Writing Shadow Objects (Functional Style)

The recommended way to define a Shadow Object is a plain function. It runs exactly once per entity instance as a setup phase. Inside that function you declare your reactive graph, and the framework takes it from there.

```typescript
import { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects/shadow-objects.js";

export function UserProfileLogic({
  useProperty,
  createEffect
}: ShadowObjectCreationAPI) {

  // Setup phase: build the reactive graph once
  const userId = useProperty('userId');

  createEffect(() => {
    // Runs whenever userId changes
    console.log(`User ID changed to: ${userId()}`);
  });
}
```

> All exports you need for Shadow Objects live in the `@spearwolf/shadow-objects/shadow-objects.js` submodule.

### Reading Properties from the View Layer

`useProperty(name)` returns a signal reader -- a function you call to get the current value. Reading it inside an effect or memo tracks the dependency automatically.

```typescript
const title = useProperty('title');
// inside an effect: title() gives you the current value
```

Need several properties at once? Use `useProperties` to avoid repetition:

```typescript
const { x, y, visible } = useProperties<{ x: number; y: number; visible: boolean }>({
  x: 'position-x',
  y: 'position-y',
  visible: 'is-visible'
});
```

### Managing Internal State

Create reactive state with `createSignal`:

```typescript
const count = createSignal(0);

count();           // read
count.set(1);      // write
count.set(c => c + 1); // update based on previous value
```

Derive values from state with `createMemo`:

```typescript
const firstName = useProperty('firstName');
const lastName = useProperty('lastName');

const fullName = createMemo(() => `${firstName()} ${lastName()}`);
```

### Handling Side Effects

`createEffect` runs immediately and re-runs whenever any signal it reads changes:

```typescript
createEffect(() => {
  const id = userId();
  if (id) {
    fetchUserData(id).then(data => userData.set(data));
  }
});
```

### Writing Back to the View

The cleanest way to update the view layer is to dispatch events from the Shadow Environment. Keep data flow unidirectional.

```typescript
export function CounterLogic({ createSignal, createEffect, dispatchMessageToView }) {
  const count = createSignal(0);

  createEffect(() => {
    dispatchMessageToView('count-changed', { value: count() });
  });
}
```

On the view side, you listen on the `<shae-ent>` element:

```javascript
el.addEventListener('count-changed', (e) => {
  document.getElementById('display').innerText = e.detail.value;
});
```

### Listening to View Events

When the view layer calls `component.dispatchShadowObjectsEvent(...)`, the Shadow Object receives it via `onViewEvent`:

```typescript
export function FormLogic({ onViewEvent }: ShadowObjectCreationAPI) {
  onViewEvent((type, data) => {
    if (type === 'submit') {
      submitForm(data);
    }
  });
}
```

### Cleaning Up

Register cleanup logic with `onDestroy`. Signals and effects clean themselves up automatically -- you only need this for external resources like timers, subscriptions, or explicit event listeners.

```typescript
const timer = setInterval(() => tick(), 1000);

onDestroy(() => {
  clearInterval(timer);
});
```

### Registering with the Registry (Component Manifest)

Map your logic to a Token (Component Tag) in a module file:

```javascript
// my-module.js
import { UserProfileLogic } from './UserProfileLogic.js';

export default {
  define: {
    'user-profile': UserProfileLogic
  }
};
```

---

## 2. Class-Based Shadow Objects (OO Style)

If you prefer object-oriented patterns, the framework supports a class-based API. The constructor receives the same `ShadowObjectCreationAPI` as the functional approach.

```typescript
import {
  type ShadowObjectCreationAPI,
  onCreate,
  onDestroy,
  type OnCreate,
  type OnDestroy
} from '@spearwolf/shadow-objects/shadow-objects.js';

export class MyShadowObject implements OnCreate, OnDestroy {

  constructor(api: ShadowObjectCreationAPI) {
    const { useProperty, createEffect } = api;

    const title = useProperty('title');

    createEffect(() => {
      console.log('Title changed:', title());
    });
  }

  [onCreate](entity) {
    console.log('Shadow Object attached to entity:', entity.uuid);
  }

  [onDestroy](entity) {
    console.log('Cleaning up resources...');
  }
}
```

### Automatic Event Handling

The real advantage of classes is automatic event binding. If your class defines a method whose name matches an event name, it will be called when that event fires on the entity. The framework wires this up by calling `on(entity, shadowObjectInstance)` during initialization.

Handle view events with an `[onViewEvent]` method:

```typescript
import { onViewEvent } from '@spearwolf/shadow-objects';

export class MyShadowObject {
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

Handle custom entity events by matching the method name to the event:

```typescript
// Some other Shadow Object emits: emit(entity, 'onPowerUp', { power: 100 });

export class PlayerLogic {
  onPowerUp(data) {
    console.log('Power Up received!', data.power);
  }
}
```

No manual subscription needed -- the framework handles it.

### Context in Classes

The context API works exactly the same way inside the constructor:

```typescript
export class LevelManager {
  constructor({ provideContext, createSignal }: ShadowObjectCreationAPI) {
    const level = createSignal(1);
    provideContext('currentLevel', level);
  }
}
```

---

## 3. View Integration

Shadow Objects doesn't dictate your UI layer. You can use raw HTML with the provided web components, or drop down to the JavaScript API for framework integration.

### Using Web Components

Import the web components package once:

```javascript
import '@spearwolf/shadow-objects/elements.js';
```

**`<shae-worker>` -- The Container**

This element owns the Shadow Environment. It initializes the Kernel (ECS System Runner) and provides the Component Context for all entities inside the same namespace.

```html
<shae-worker src="./shadow-worker.js" ns="main-app">
  <!-- your app goes here -->
</shae-worker>
```

| Attribute | Description |
|---|---|
| `src` | Path to the module exporting your Shadow Object Registry (Component Manifest) |
| `ns` | Optional namespace for the Component Context |
| `local` | Run the Kernel on the main thread instead of a web worker |
| `auto-sync` | Sync frequency: `"frame"` (default), `"60fps"`, `"100"` (ms), or `"off"` |
| `no-structured-clone` | Disable cloning for local environments (performance optimization, local only) |

**`<shae-ent>` -- The Entity**

Each `<shae-ent>` element maps to an entity (game object) in the Shadow Environment. It spawns the corresponding Shadow Object (ECS Component) from the Registry.

```html
<shae-ent token="my-button">
  <button>Click Me</button>
</shae-ent>
```

| Attribute | Description |
|---|---|
| `token` | The Token (Component Tag) mapping to a Shadow Object in the Registry |
| `ns` | Connect this entity to a named Component Context |
| `forward-custom-events` | Re-dispatch Shadow Object events as DOM `CustomEvent`s (empty = all, or comma-separated list) |

Entities do not need to be inside the `<shae-worker>` in the DOM. They connect via the `ns` namespace. Nesting `<shae-ent>` elements creates a parent-child relationship in the Shadow Environment:

```html
<shae-ent token="solar-system">
  <shae-ent token="planet">
    <shae-ent token="moon"></shae-ent>
  </shae-ent>
</shae-ent>
```

**`<shae-prop>` -- Property Binder**

Declaratively set properties on the parent entity:

```html
<shae-ent token="player">
  <shae-prop name="score" value="100" type="int"></shae-prop>
  <shae-prop name="active" value="true" type="boolean"></shae-prop>
  <shae-prop name="config" value='{"difficulty": "hard"}' type="json"></shae-prop>
  <shae-prop name="position" value="10 20 30" type="float32array"></shae-prop>
</shae-ent>
```

Supported `type` values: `string`, `number`, `float`, `int`, `boolean`, `json`, `number[]`, `string[]`, `float32array`, `uint8array`, and more.

### Sending and Receiving Events via JavaScript

Send an event from the view to the Shadow Environment:

```javascript
const ent = document.querySelector('shae-ent');
ent.viewComponent.dispatchShadowObjectsEvent('my-action', { foo: 'bar' });
```

Receive events coming back from the Shadow Environment using `eventize`'s `on` helper, or by listening to forwarded DOM events:

```javascript
import { on } from '@spearwolf/eventize';

// Via eventize (always works)
on(ent.viewComponent, 'score-changed', (data) => {
  console.log('New score:', data.value);
});

// Via DOM events (requires forward-custom-events attribute on the element)
ent.addEventListener('score-changed', (e) => {
  console.log('New score:', e.detail.value);
});
```

### Using the ViewComponent API Directly

If you are integrating with a framework or a non-DOM renderer, you can create `ViewComponent` instances manually:

```javascript
import { ComponentContext, ViewComponent } from '@spearwolf/shadow-objects';

const context = ComponentContext.get('my-game');
const myComponent = new ViewComponent('my-token', { context });

myComponent.setProperty('title', 'New Title');

// When done
myComponent.destroy();
```

This is the approach to take when building React, Vue, or Svelte integrations, or when working with Canvas/WebGL game engines where DOM elements per entity would be overhead.

---

## 4. Multi-Environment Setup

Shadow Objects can run your logic in two places: the main thread (local) or a web worker (remote). Both are first-class citizens.

### Local Environment (Main Thread)

```javascript
import {
  ComponentContext,
  ShadowEnv,
  LocalShadowObjectEnv
} from '@spearwolf/shadow-objects';

const env = new ShadowEnv();
env.view = ComponentContext.get('my-game');
env.envProxy = new LocalShadowObjectEnv();

function animate() {
  env.sync();
  requestAnimationFrame(animate);
}
animate();
```

Or declaratively in HTML:

```html
<shae-worker src="./kernel.js" local></shae-worker>
```

**When to use local:**
- During development and debugging (easier to inspect state, no worker boundary)
- Simple applications where threading is not worth the overhead
- Environments that do not support web workers
- Add `no-structured-clone` for extra performance when you are confident about data ownership

### Remote Environment (Web Worker)

```javascript
import {
  ComponentContext,
  ShadowEnv,
  RemoteWorkerEnv
} from '@spearwolf/shadow-objects';

const env = new ShadowEnv();
env.view = ComponentContext.get('my-game');
env.envProxy = new RemoteWorkerEnv();

function animate() {
  env.sync();
  requestAnimationFrame(animate);
}
animate();
```

Or declaratively:

```html
<shae-worker src="./shadow-worker.js"></shae-worker>
```

**When to use remote (web worker):**
- Production applications with complex logic
- Any time you want to keep the UI thread free for rendering
- When your Shadow Object logic is CPU-intensive (physics, pathfinding, simulations)
- The default for `<shae-worker>` -- no attribute needed

### Multiple Isolated Shadow Environments

You can run multiple independent Shadow Environments on the same page using namespaces:

```html
<shae-worker src="./game.js" ns="game-world"></shae-worker>
<shae-worker src="./ui.js" ns="ui-overlay" local></shae-worker>

<shae-ent token="player-hud" ns="ui-overlay"></shae-ent>
<shae-ent token="player" ns="game-world"></shae-ent>
```

Each namespace is a completely isolated Shadow Environment with its own Kernel (ECS System Runner) and entity tree.

### Waiting for the Environment to be Ready

```javascript
await env.ready();
console.log('Environment is ready');

// Or use the event
import { on } from '@spearwolf/eventize';
on(env, ShadowEnv.ContextCreated, () => console.log('Ready!'));
```

---

## 5. Framework Integration Note

Shadow Objects does not replace React, Vue, or Svelte. It is the logic layer those frameworks render.

Think of it this way: if Redux or Zustand is global reactive state on one thread, Shadow Objects is reactive ECS state that can live on any number of threads. Your UI framework handles the DOM. Shadow Objects handles the behavior.

The typical integration looks like this:

1. Your React/Vue/Svelte component owns the DOM and renders based on local state.
2. It creates a `ViewComponent` (or uses `<shae-ent>`) to represent itself in the Shadow Environment.
3. Property changes flow in via `setProperty`.
4. Events come back from the Shadow Object and update local state, triggering a re-render.

```javascript
// React example (conceptual)
function PlayerCard({ userId }) {
  const [score, setScore] = useState(0);
  const componentRef = useRef(null);

  useEffect(() => {
    const ctx = ComponentContext.get();
    const vc = new ViewComponent('player-card', { context: ctx });
    vc.setProperty('userId', userId);

    const off = on(vc, 'score-updated', (data) => setScore(data.value));
    componentRef.current = { vc, off };

    return () => {
      off();
      vc.destroy();
    };
  }, [userId]);

  return <div>Score: {score}</div>;
}
```

The Shadow Object runs the score logic. React renders it. They stay decoupled. This pattern works equally well with Vue's `onMounted`/`onUnmounted` or Svelte's `onMount`/`onDestroy`.
