# Shadow Objects Guides

Shadow Objects is the logic layer of your application. Entities are lightweight game objects; Shadow Objects are ECS components that attach behavior to them. This guide walks through the main patterns for writing that logic.

---

## 1. Writing Shadow Objects (Functional Style)

The recommended way to define a Shadow Object is a plain function. It runs once as a setup phase, and not a second time for as long as this shadow object stays on its entity. An entity can carry several: a token change or a `'@propName'` route switch sets up only the ones that arrive and tears down only the ones that leave, and the rest are untouched. Inside that function you declare your reactive graph, and the framework takes it from there.

```typescript
import type { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects/shadow-objects.js";

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

count.get();                // read -- subscribes the surrounding effect
count.value;                // read without subscribing
count.set(1);               // write
count.set(count.value + 1); // update based on the previous value
```

> **`set()` takes a value, never an updater.** `count.set(c => c + 1)` does not call your function — it stores it as the signal's value. Read the previous value yourself, via `count.value` so the write does not subscribe the surrounding effect to its own signal.

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
    dispatchMessageToView('count-changed', { value: count.get() });
  });
}
```

On the view side you listen on the `<shae-ent>` element -- but only if the element asks for it. Without the `forward-custom-events` attribute no DOM event is dispatched at all, and the listener below never fires:

```html
<shae-ent token="counter" forward-custom-events></shae-ent>
```

```javascript
el.addEventListener('count-changed', (e) => {
  document.getElementById('display').innerText = e.detail.value;
});
```

The attribute takes a comma-separated allow list too; empty means all types. Without the attribute the message still arrives on the ViewComponent as an eventize event -- see [Sending and Receiving Events via JavaScript](#sending-and-receiving-events-via-javascript).

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

export const shadowObjects = {
  define: {
    'user-profile': UserProfileLogic
  }
};
```

The export has to be named `shadowObjects`. That is the one name the loader reads out of the module.

### Composing Behavior with Routes

`define` is only half the story. The module is also where you decide *which* Shadow Objects end up on an entity, and that decision lives nowhere else. The View Layer never makes it: it only supplies a token.

Say profile entities should also get logging and analytics, and anything carrying a `debug` property should get a debug overlay on top:

```javascript
// my-module.js
export const shadowObjects = {
  define: {
    'user-profile': UserProfileLogic,
    'logging': LoggingLogic,
    'analytics': AnalyticsLogic,
    'debug-overlay': DebugOverlayLogic,
  },
  routes: {
    // A 'user-profile' entity now gets three shadow objects, not one.
    // The token itself is always included, so you only list the additions.
    'user-profile': ['logging', 'analytics'],

    // Property-based route: any entity with a truthy 'debug' property
    // gets the overlay, no matter which token it carries.
    '@debug': ['debug-overlay'],
  },
};
```

Nothing in your HTML changed. No `<shae-ent>` learned a new token. You added cross-cutting behavior by editing one configuration object, and you can remove it the same way.

This is the second decoupling of the framework: the first separates the View Layer from the logic, this one separates the *composition* of logic from the place it is used. Routing decides about existence, not about behavior -- what those three Shadow Objects do with each other afterwards is written inside them, and they talk over the shared entity event bus.

Two more keys round it out:

- `extends: [CoreModule]` pulls in another module, so you can ship reusable bundles of definitions and routes.
- `initialize` runs asynchronously at load time and may add definitions later, for example after a feature flag request resolves.

Full syntax in the [Registry reference](./api-reference.md#registry-component-manifest).

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
import { onViewEvent } from '@spearwolf/shadow-objects/shadow-objects.js';

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
| `src` | Path to the module whose `shadowObjects` export is your Registry (Component Manifest) |
| `ns` | Optional namespace for the Component Context |
| `local` | Run the Kernel on the main thread instead of a web worker |
| `no-autostart` | Do not create the Shadow Environment on connect -- call `start()` yourself |
| `auto-sync` | Sync frequency: every animation frame (`"frame"`, the default, also `"on"`/`"yes"`/`"true"`/`"auto-sync"`), every `1000/N` ms (`"60fps"`), every N ms (`"100"`), or off (`"off"`/`"no"`/`"false"`) |
| `no-structured-clone` | Disable cloning for local environments (performance optimization, local only) |
| `load-timeout`, `configure-timeout`, `change-trail-timeout`, `destroy-timeout` | How long the worker environment waits for the load handshake, a module import, a change trail confirmation and the teardown acknowledgement -- in milliseconds, from 1 to 2147483647 |

The full rules -- which of these read a truthy value rather than mere presence, and what an unparseable `auto-sync` does -- are in the [`<shae-worker>` reference](./api-reference.md#shae-worker).

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

Declaratively set properties on the closest entity above it. That is the closest `<shae-ent>` in the flattened tree, regardless of namespace, so a `<shae-prop>` may sit arbitrarily deep and still find its host -- through shadow roots, slot projections and closed boundaries alike. See [`<shae-prop>` → Finding the Host Entity](./api-reference.md#finding-the-host-entity).

```html
<shae-ent token="player">
  <shae-prop name="score" value="100" type="int"></shae-prop>
  <shae-prop name="active" value="true" type="boolean"></shae-prop>
  <shae-prop name="config" value='{"difficulty": "hard"}' type="json"></shae-prop>
  <shae-prop name="position" value="10 20 30" type="float32array"></shae-prop>
</shae-ent>
```

Every supported `type` name, what it maps onto, and what `no-trim` does are listed once in the [`<shae-prop>` reference](./api-reference.md#shae-prop) and in the [cheat sheet](./cheat-sheet.md). Without a `type` the value arrives as the string it is in the attribute.

A missing or empty `value` attribute counts as no value at all: no property is set, and the name never appears on the entity. Whitespace is not nothing, though -- it survives into the converter and comes out of the trim as the empty string, so `type="number"` turns `value=" "` into `0`.

A value that cannot be converted into the requested type -- malformed JSON, for instance -- arrives as an error in the console and clears the property. Clearing is not the same as never setting it: the name stays visible in `propKeys()` and reads `undefined` from there on.

### Registering Your Own Entity Elements

Sooner or later you wrap the built-in elements in one of your own: a subclass of `ShaeEntElement` that carries a token of its own, or a component with a shadow root that is no entity at all but has `<shae-ent>` and `<shae-prop>` inside it. Both arrive through `customElements.define()`, and both arrive late -- after your markup already stands, out of a lazily loaded chunk.

**The order you register your tags in does not decide the shape of the Entity Tree.** An element that becomes an entity while the markup around it already stands announces itself to everything below it: `<shae-ent>` children look for their parent once more, `<shae-prop>` children for their host. The answer they get is the tree as it is now, not the tree as it was when they first asked. So a wrapper defined after its contents ends up with the same Entity Tree as one defined before -- and a wrapper that is not an entity is simply skipped on the way up.

**The one thing to know is that the timing is split.** The entities below have re-bound by the time `customElements.define()` returns -- that channel is a synchronous event. The properties follow one microtask later, because their channel waits for the tree to stop moving before it looks again. If you assert on an entity's properties right after registering a tag, `await Promise.resolve()` first.

The registration modules themselves are independent and can be imported one at a time; the mechanics of the lookup, the exported request function, and the three event names are in [`<shae-ent>` → Driving the Lookup by Hand](./api-reference.md#driving-the-lookup-by-hand).

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

### When the Worker Dies

A remote environment can lose its worker: an unhandled error inside one of your Shadow Objects modules, a module that fails to import, or a message the structured clone algorithm cannot read back. The proxy reports that loss, and `ShadowEnv` passes it on:

```javascript
import { on } from '@spearwolf/eventize';
import { ShadowEnv, RemoteWorkerEnv } from '@spearwolf/shadow-objects';

on(env, ShadowEnv.ProxyFailed, (reason) => {
  console.warn('the shadow environment went away:', reason);

  // start over — the next sync restores the entities from the Component Memory
  env.envProxy = new RemoteWorkerEnv();
});
```

Without a listener the failure is still logged, and `env.isReady` drops to `false` -- just quietly.

With the declarative setup the same thing arrives as a DOM event: `<shae-worker>` dispatches `proxyfailed` on itself, with `reason` and `shadowEnv` in the `detail`.

---

## 5. Framework Integration Note

Shadow Objects does not replace React, Vue, or Svelte. It is the logic layer those frameworks render.

Think of it this way: if Redux or Zustand is global reactive state on one thread, Shadow Objects is reactive ECS state that can live on any number of threads. Your UI framework handles the DOM. Shadow Objects handles the behavior.

The typical integration looks like this:

1. Your React/Vue/Svelte component owns the DOM and renders based on local state.
2. It creates a `ViewComponent` (or uses `<shae-ent>`) to represent itself in the Shadow Environment.
3. Property changes flow in via `setProperty`.
4. Events come back from the Shadow Object and update local state, triggering a re-render.

```jsx
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
