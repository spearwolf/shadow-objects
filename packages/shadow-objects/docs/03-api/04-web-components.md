# Web Components API

The Shadow Objects framework provides a suite of Custom Elements (Web Components) that allow you to declaratively construct your Shadow World directly in the HTML. These components handle the lifecycle, connection, and synchronization of the underlying `ViewComponent` and `ShadowEnv` classes.

## `<shae-worker>`

The root of any Shadow Objects application. It is responsible for initializing the environment (Worker or Local) and managing the synchronization loop.

### Attributes

#### `src`

The URL of the JavaScript file that contains your Shadow Object definitions (the "kernel").

- **Required** (unless you are managing the environment manually via code, which is rare for the declarative approach).

```html
<shae-worker src="./my-game-kernel.js"></shae-worker>
```

#### `local`

If present, the logic runs in the **Main Thread** instead of a Web Worker.

- **Default:** `false` (runs in a Worker).
- **Use case:** Debugging, simple applications where threading isn't needed, or environments that don't support Workers.

```html
<!-- Runs in the same thread (Main Thread) -->
<shae-worker src="./kernel.js" local></shae-worker>
```

#### `auto-sync`

Controls how often the View updates are sent to the Shadow World.

- **Values:**
  - `"frame"` / `"on"` / `"yes"` (Default): Syncs every animation frame (uses `requestAnimationFrame`).
  - `"60fps"` (or any number + `fps`): Syncs at a targeted frame rate.
  - `number` (e.g. `"100"`): Syncs every X milliseconds.
  - `"no"` / `"off"`: Disables automatic syncing. You must manually call `.syncShadowObjects()` on the element.

```html
<shae-worker auto-sync="30fps" ...></shae-worker>
```

#### `ns` (Namespace)

Defines the **Component Context** this worker manages.

- **Default:** Global Context.
- See [Namespacing & Contexts](#namespacing--contexts) below.

#### `no-structured-clone`

**Only applicable when `local` is present.**
By default, communication between the View and the Shadow World uses `structuredClone` to simulate the memory isolation of a Web Worker. This ensures your logic doesn't accidentally rely on shared mutable state.

- **If present:** Disables cloning. Objects are passed by reference.
- **Benefit:** Performance boost for local environments.
- **Risk:** Shared mutable state bugs. Use with caution.

```html
<shae-worker local no-structured-clone ...></shae-worker>
```

---

## `<shae-ent>`

Represents an **Entity** in the Shadow World. It corresponds to a `ViewComponent` instance.

### Attributes

#### `token`

The string identifier that matches a registered Shadow Object Constructor in your Kernel's Registry.

- **Required.**

```html
<shae-ent token="my-player"></shae-ent>
```

#### `ns` (Namespace)

The context this entity belongs to. Usually, you don't need to set this if you are using the default Global Context. If you are using named contexts, you must match this with the `ns` attribute of your `<shae-worker>`.

#### `forward-custom-events`

Allows re-dispatching events emitted by the internal Shadow Object (ViewComponent) as standard DOM `CustomEvent`s on the `<shae-ent>` element.

- **Value:**
  - Empty string or `true`: Forwards **all** events.
  - Comma-separated list of event names: Forwards only the specified events.
- **Payload:** The event data is passed as the `detail` property of the `CustomEvent`.

**Example 1: Forward All Events**

```html
<shae-ent token="game-level" forward-custom-events></shae-ent>

<script>
  const ent = document.querySelector('shae-ent');

  ent.addEventListener('level-complete', (e) => {
    console.log('Yippieee! Level completed!', e.detail);
  });
</script>
```

**Example 2: Forward Specific Events**

```html
<shae-ent token="game-level" forward-custom-events="score-changed,level-complete"></shae-ent>
```

> [!TIP]
> **Decoupled Placement:** `<shae-ent>` elements do not need to be children of `<shae-worker>`. You can place the worker anywhere (e.g., at the end of `<body>`) and scatter entities throughout your layout. As long as the `ns` matches (or both are default), they will connect.

### Hierarchy

Nesting `<shae-ent>` elements creates a parent-child relationship in the Shadow World.

```html
<shae-ent token="solar-system">
  <shae-ent token="planet">
    <shae-ent token="moon"></shae-ent>
  </shae-ent>
</shae-ent>
```

---

## `<shae-prop>`

Declaratively sets properties on the parent `<shae-ent>`.

### Attributes

#### `name`

The name of the property to set on the Shadow Object.

#### `value`

The value of the property.

#### `type`

Casts the string value from the attribute into a specific JavaScript type.

- **Supported types:**
  - `string`, `text` (Default)
  - `number`, `float`, `int`, `integer`
  - `boolean`, `bool`
  - `json` (Parses the value as a JSON string)
  - `array` variations: `number[]`, `string[]`, `int[]`, etc. (Splits by whitespace/comma)
  - Typed Arrays: `float32array`, `uint8array`, etc.

#### `no-trim`

By default, string values are trimmed. Add this attribute to preserve whitespace.

### Examples

```html
<shae-ent token="player">
  <shae-prop name="score" value="100" type="int"></shae-prop>
  <shae-prop name="active" value="true" type="boolean"></shae-prop>
  <shae-prop name="config" value='{"difficulty": "hard"}' type="json"></shae-prop>
  <shae-prop name="position" value="10 20 30" type="float32array"></shae-prop>
</shae-ent>
```

---

## Namespacing & Contexts

Shadow Objects supports running multiple isolated "worlds" on the same page. This is handled via **Component Contexts**, identified by a namespace string (`ns`).

### The Default Context

If you don't specify an `ns` attribute, components attach to the **Default Global Context**. This is sufficient for most single-app pages.

### Creating Named Contexts

To run independent simulations (e.g., two different games, or a game and a separate UI simulation), use the `ns` attribute.

```html
<!-- World A -->
<!-- Worker can be anywhere -->
<shae-worker src="./game-a.js" ns="world-A"></shae-worker>

<div id="ui-container">
  <!-- Entity connects to World A via namespace -->
  <shae-ent token="player-hud" ns="world-A"></shae-ent>
</div>

<!-- World B -->
<shae-worker src="./game-b.js" ns="world-B"></shae-worker>
<div id="container-b">
  <shae-ent token="hero" ns="world-B"></shae-ent>
</div>
```

### Context Resolution

1.  **Explicit:** The `ns` attribute on the element itself.
2.  **Inherited:** If not explicitly set, `shae-*` elements usually default to the global context unless manually configured via JavaScript to inherit. _Note: Currently, declarative inheritance relies on matching `ns` attributes. It is best practice to group elements or explicitly set `ns` if using multiple contexts._

### JavaScript Access

You can access these contexts via the `ComponentContext` API:

```typescript
import {ComponentContext} from '@spearwolf/shadow-objects/view';

const ctxA = ComponentContext.get('world-A');
const defaultCtx = ComponentContext.get(); // or GlobalNS
```
