# Getting Started

This guide walks you through setting up a minimal Shadow Objects project. You will build a simple interactive counter that demonstrates the separation between the **View Layer** (your UI) and the **Shadow Environment** (your logic).

Shadow environments can run on the **main thread** (local) or in a **web worker** (remote). Both are first-class. This guide uses a web worker via the `<shae-worker>` element, which is the most common setup, but everything you learn here applies equally to a local environment.

## Prerequisites

- Node.js (LTS version recommended)
- A package manager (npm, pnpm, or yarn)
- Basic knowledge of HTML and JavaScript

## 1. Installation

Install the `shadow-objects` package.

```bash
npm install @spearwolf/shadow-objects
# or
pnpm add @spearwolf/shadow-objects
```

## 2. Setting Up the View Layer

In your HTML file, use the Shadow Objects web components to bootstrap the environment and declare your entities.

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Shadow Objects Hello World</title>
    <script type="module">
        // Import the built-in Web Components
        import "@spearwolf/shadow-objects/elements.js";
    </script>
</head>
<body>

    <!--
      1. Initialize the Shadow Environment (web worker)
      src: Points to your logic module (the Shadow Environment entry point)
    -->
    <shae-worker src="./my-logic.js"></shae-worker>

    <!--
      2. Declare an Entity (Game Object)
      token: Matches a definition in your logic module (Component Tag)
    -->
    <shae-ent token="counter-component">
        <!-- Declares the 'count' property for as long as this element stands here,
             and writes every change through into the Shadow Environment.
             See api-reference.md, <shae-prop> -> Lifecycle. -->
        <shae-prop name="count" value="0" type="number"></shae-prop>

        <!-- The UI the user sees and interacts with -->
        <button id="btn">Click me</button>
        <span id="display">Count: 0</span>
    </shae-ent>

    <script>
        // Glue code to forward DOM events into the Shadow Environment.
        // In a real app you would typically wrap this in a custom Web Component.
        const ent = document.querySelector('shae-ent');
        const btn = document.querySelector('#btn');

        // Forward the click event to the Shadow Environment
        btn.addEventListener('click', () => {
            ent.viewComponent?.dispatchShadowObjectsEvent('increment', { value: 1 });
        });
    </script>
</body>
</html>
```

> **Note:** Under the hood, `<shae-ent>` creates a **ViewComponent** and registers it with the **ComponentContext** provided by `<shae-worker>`. The ViewComponent is the bridge between the DOM and the Shadow Environment.

`<shae-prop>` is a live binding, not a one-time seed: it keeps writing while it stands there, and the property is cleared when the binding ends. The three things that end it are listed in [`<shae-prop>` → Lifecycle](./api-reference.md#lifecycle). The `type` attribute decides what arrives on the other side -- without it the value stays the string it is in the attribute.

## 3. Creating the Shadow Logic

Now create the logic module that runs inside the Shadow Environment. This is where your ECS components (Shadow Objects) live.

### `my-logic.js`

```javascript
/**
 * CounterLogic is an ECS component (Shadow Object) that attaches behavior
 * to the "counter-component" entity.
 */
function CounterLogic({ useProperty, createEffect, createSignal, onViewEvent }) {

    // 1. Read the 'count' property sent down from the View Layer
    const countProp = useProperty('count');

    // 2. Create local reactive state, seeded from the property
    //    ?? and not || -- with type="number" a count of 0 is a valid seed
    const count = createSignal(countProp() ?? 0);

    // 3. React to state changes
    createEffect(() => {
        console.log("Current count in Shadow Environment:", count.get());
    });

    // 4. Handle events dispatched from the View Layer
    onViewEvent((type, data) => {
        if (type === 'increment') {
            count.set(count.value + data.value);
        }
    });
}

/**
 * The named export `shadowObjects` maps Token (Component Tags) to Shadow Objects
 * (ECS components). This is the Registry (Component Manifest) for this module, and
 * `shadowObjects` is the one name the loader looks for.
 */
export const shadowObjects = {
    define: {
        "counter-component": CounterLogic
    }
};
```

## 4. How It Works

Here is what happens from page load to interaction:

1. **Boot:** The browser loads `<shae-worker>`. It starts a web worker and loads `my-logic.js` inside it. Your Registry (Component Manifest) is registered with the Kernel (ECS System Runner).
2. **Mount:** The `<shae-ent>` element connects to the DOM. It creates a ViewComponent and registers it with the ComponentContext.
3. **Sync:** The ComponentContext sends a message to the Kernel: "Create an entity with token `counter-component`."
4. **Instantiation:** The Kernel (ECS System Runner) consults the Registry (Component Manifest), finds `CounterLogic`, and runs it. The Shadow Object is now active.
5. **Interaction:**
    - The user clicks "Click me."
    - The View Layer dispatches an `increment` event into the Shadow Environment.
    - `CounterLogic` receives it via `onViewEvent`.
    - `count.set(...)` updates the signal.
    - `createEffect` runs and logs the new value.
    - The Shadow Object can send data back to the View Layer using `dispatchMessageToView`.

The View Layer never holds business logic. The Shadow Environment never touches the DOM directly. That separation is the whole point.

### One Thing to Know Up Front

Changes do not travel immediately. Setting a property books it into a change trail, and the next sync ships the whole batch across. By default `<shae-worker>` syncs once per animation frame; you can change that with the `auto-sync` attribute or turn it off and call `sync()` yourself.

So this does **not** work:

```javascript
ent.viewComponent.setProperty('count', 42);
// The shadow object has not seen 42 yet. Not even in a local environment.
```

If you need to wait for it, ask the environment. In this declarative setup it hangs on the `<shae-worker>` element:

```javascript
await document.querySelector('shae-worker').shadowEnv.syncWait();
// now the shadow object has seen 42
```

Inside Shadow Objects you rarely have to think about this, because everything there reacts anyway. In imperative glue code and in tests, it bites. See [the change trail and the sync tempo](./concepts.md#the-change-trail-and-the-sync-tempo).

## Local vs. Remote Environments

This example uses `<shae-worker>` to run logic in a web worker (remote). If you want to run the Shadow Environment on the main thread instead, you use a local environment setup. The Shadow Object code you write is identical in both cases -- only the bootstrap element changes. Both modes are first-class citizens of the framework.

## Next Steps

- Learn how to structure complex logic in [Writing Shadow Objects](./guides.md#1-writing-shadow-objects-functional-style).
- Attach behavior without touching your markup: [Composing Behavior with Routes](./guides.md#composing-behavior-with-routes).
- Understand how to build robust UIs in [View Integration](./guides.md#3-view-integration).
- Read [Concepts](./concepts.md) for a deeper understanding of entities, context, and the architecture. If you read one section, read [the invariants](./concepts.md#5-invariants).
