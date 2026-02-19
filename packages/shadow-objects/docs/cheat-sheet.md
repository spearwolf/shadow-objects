# Shadow Objects Cheat Sheet

## If you remember nothing else, remember this

- Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them.
- The setup function runs once per entity. Everything reactive goes inside it.
- `useProperty` reads from the view. `dispatchMessageToView` writes back. Events connect them.
- Local = main thread (great for debugging). Remote = web worker (great for production).
- Shadow Objects is the logic layer. React/Vue/Svelte is the render layer. They work together.

---

## Defining a Shadow Object

```typescript
// Functional (recommended)
export function MyLogic({ useProperty, createEffect, onDestroy }: ShadowObjectCreationAPI) {
  const speed = useProperty('speed');
  createEffect(() => console.log('speed:', speed()));
  onDestroy(() => console.log('cleanup'));
}

// Class-based
export class MyLogic {
  constructor({ useProperty, createEffect }: ShadowObjectCreationAPI) {
    const speed = useProperty('speed');
    createEffect(() => console.log('speed:', speed()));
  }
  [onCreate](entity) { /* after attach */ }
  [onDestroy](entity) { /* before destroy */ }
}
```

Register in your module file (the Registry / Component Manifest):

```javascript
export default {
  define: { 'my-token': MyLogic }
};
```

---

## Creation API Methods

| Method | Signature | Description |
|---|---|---|
| `useProperty` | `(name) => SignalReader` | Reactive read of a view-layer property |
| `useProperties` | `(map) => { [key]: SignalReader }` | Batch property readers |
| `useContext` | `(name) => value` | Read context from nearest ancestor entity |
| `useParentContext` | `(name) => value` | Read context starting from parent (skip self) |
| `provideContext` | `(name, value) => void` | Provide value to all descendant entities |
| `provideGlobalContext` | `(name, value) => void` | Provide value to all entities everywhere |
| `createSignal` | `(initial) => Signal` | Create local reactive state |
| `createMemo` | `(fn) => SignalReader` | Derived/computed value, re-evaluates when deps change |
| `createEffect` | `(fn) => void` | Run side effect, re-runs when deps change |
| `createResource` | `(factory, cleanup?) => Signal` | Manage external resources with auto teardown |
| `on` | `(source?, event, cb) => void` | Subscribe to an event (auto-cleaned on destroy) |
| `once` | `(source?, event, cb) => void` | Subscribe once, auto-removed after first fire |
| `emit` | `(target?, event, ...args) => void` | Emit event on entity (or a target) |
| `onViewEvent` | `(cb) => void` | Shorthand: listen for events from the view layer |
| `dispatchMessageToView` | `(type, data?, transferables?, children?) => void` | Send event to the view layer |
| `onDestroy` | `(fn) => void` | Register cleanup callback |

---

## Reactivity Primitives

```typescript
// Signal: read/write reactive state
const count = createSignal(0);
count()           // read
count.set(5)      // write
count.set(n => n + 1) // update

// Memo: derived value
const doubled = createMemo(() => count() * 2);
doubled() // read

// Effect: runs immediately, re-runs when deps change
createEffect(() => {
  console.log('count is', count());
});

// Resource: manage external objects that need cleanup
createResource(
  () => {
    const mesh = new Mesh(getGeometry(), getMaterial());
    scene.add(mesh);
    return mesh;
  },
  (mesh) => {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
);
```

---

## Lifecycle Hooks

| Hook | When it fires |
|---|---|
| `constructor` / function body | Once, when the entity is first created. Build your reactive graph here. |
| `[onCreate](entity)` | After the Shadow Object is fully attached to the entity. Class-based only. |
| `[onDestroy](entity)` | Just before the entity is destroyed. Class-based only. |
| `onDestroy(fn)` | Same as above but callable from the functional API. |
| `createEffect(fn)` | Immediately on setup, then again whenever any signal it reads changes. |

---

## Context (Provider / Consumer)

```typescript
// Provider: make a value available to all descendants
export function GameRoot({ provideContext, createSignal }) {
  const level = createSignal(1);
  provideContext('currentLevel', level); // pass a signal for reactivity
}

// Consumer: read from nearest ancestor
export function Enemy({ useContext }) {
  const currentLevel = useContext('currentLevel');
  // if currentLevel is a signal: currentLevel() to read
}

// Skip self, start from parent
export function Middleware({ useParentContext, provideContext }) {
  const upstream = useParentContext('theme');
  provideContext('theme', { ...upstream, accent: 'red' });
}

// Global (available everywhere, regardless of hierarchy)
provideGlobalContext('appConfig', { debug: true });
```

---

## Event System

```typescript
// Listen to events on the entity (implicit source)
on('player-ready', (data) => { });

// Listen with explicit source
on(entity, 'player-ready', (data) => { });

// Listen once
once('init-complete', () => { });

// Emit on the entity
emit('player-ready', { health: 100 });

// Emit multiple events at once
emit(['score-changed', 'ui-update'], { score: 500 });

// Emit on a specific target
emit(childEntity, 'parent-command', { action: 'move' });

// Receive events from the view layer
onViewEvent((type, data) => {
  if (type === 'click') { /* ... */ }
});

// Send events to the view layer
dispatchMessageToView('login-success', { user: 'Alice' });
// With transferables (avoids clone overhead)
dispatchMessageToView('frame-data', buffer, [buffer]);
// Dispatch to this entity and all its children in the view
dispatchMessageToView('reset', {}, [], true);
```

---

## View Layer Event Wiring

```javascript
// View -> Shadow Environment
const ent = document.querySelector('shae-ent');
ent.viewComponent.dispatchShadowObjectsEvent('submit', { secret: '999' });

// Shadow Environment -> View (via eventize)
import { on } from '@spearwolf/eventize';
on(ent.viewComponent, 'login-success', (data) => console.log(data.user));

// Shadow Environment -> View (via DOM events, requires forward-custom-events)
ent.addEventListener('login-success', (e) => console.log(e.detail.user));
```

---

## Web Component Attributes

### `<shae-worker>`

| Attribute | Values | Description |
|---|---|---|
| `src` | URL string | Path to the Shadow Object Registry module. Required. |
| `local` | boolean (presence) | Run Kernel on main thread instead of web worker |
| `ns` | string | Namespace for the Component Context |
| `auto-sync` | `"frame"` / `"60fps"` / `"100"` / `"off"` | Sync frequency. Default: `"frame"` |
| `no-structured-clone` | boolean (presence) | Skip data cloning (local only, performance opt) |

### `<shae-ent>`

| Attribute | Values | Description |
|---|---|---|
| `token` | string | Token (Component Tag) matching a Registry entry. Required. |
| `ns` | string | Connect to a named Component Context |
| `forward-custom-events` | empty or comma-list | Re-dispatch Shadow Object events as DOM CustomEvents |

### `<shae-prop>`

| Attribute | Values | Description |
|---|---|---|
| `name` | string | Property name to set on the parent entity |
| `value` | string | The value (cast according to `type`) |
| `type` | see below | Type cast for the value attribute |
| `no-trim` | boolean (presence) | Preserve whitespace in string values |

**`type` values for `<shae-prop>`:**

| Type | Result |
|---|---|
| `string`, `text` | Plain string (default) |
| `number`, `float` | `parseFloat` |
| `int`, `integer` | `parseInt` |
| `boolean`, `bool` | `true` / `false` |
| `json` | `JSON.parse` |
| `number[]`, `string[]`, `int[]` | Split by whitespace/comma |
| `float32array`, `uint8array`, etc. | Typed array |

---

## Entity API (`entity.*`)

Inside a Shadow Object, `entity` gives you access to the underlying entity instance:

| Property / Method | Type | Description |
|---|---|---|
| `entity.uuid` | `string` | Unique ID, matches the ViewComponent uuid |
| `entity.order` | `number` | Sort order from the view layer |
| `entity.hasParent` | `boolean` | Whether this entity has a parent |
| `entity.parent` | `EntityApi or undefined` | Parent entity reference |
| `entity.children` | `readonly EntityApi[]` | Child entities |
| `entity.propKeys` | `string[]` | All property keys currently set |
| `entity.propEntries` | `[string, unknown][]` | All key-value property pairs |
| `entity.traverse(cb)` | `void` | Walk entity and all descendants |

```typescript
// Broadcast an event to all descendants
entity.traverse((e) => {
  emit(e, 'frame-update', { deltaTime: 0.016 });
});
```

---

## ViewComponent API (View Layer)

```typescript
import { ViewComponent, ComponentContext } from '@spearwolf/shadow-objects';

const ctx = ComponentContext.get('my-namespace'); // or .get() for default
const vc = new ViewComponent('my-token', { context: ctx, order: 0 });

vc.setProperty('score', 1000);
vc.setProperty('pos', newPos, (a, b) => a.equals(b)); // custom equality
vc.removeProperty('score');
vc.dispatchShadowObjectsEvent('jump', { force: 5.0 });
vc.destroy();
```

---

## ShadowEnv Quick Setup

```typescript
import {
  ComponentContext,
  ShadowEnv,
  LocalShadowObjectEnv,   // main thread
  RemoteWorkerEnv         // web worker
} from '@spearwolf/shadow-objects';

const env = new ShadowEnv();
env.view = ComponentContext.get('my-app');
env.envProxy = new LocalShadowObjectEnv(); // or new RemoteWorkerEnv()

await env.ready();

function loop() {
  env.sync();
  requestAnimationFrame(loop);
}
loop();
```

| `ShadowEnv` Event | When |
|---|---|
| `ShadowEnv.ContextCreated` | Environment is ready (view + proxy both connected) |
| `ShadowEnv.ContextLost` | Environment lost connection |
| `ShadowEnv.AfterSync` | After each sync cycle completes |
