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
        import "@spearwolf/shadow-objects/elements";
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
        <!-- Initial property value, synced into the Shadow Environment -->
        <shae-prop name="count" value="0"></shae-prop>

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
    const count = createSignal(countProp() || 0);

    // 3. React to state changes
    createEffect(() => {
        console.log("Current count in Shadow Environment:", count());
    });

    // 4. Handle events dispatched from the View Layer
    onViewEvent((type, data) => {
        if (type === 'increment') {
            count.set(c => c + data.value);
        }
    });
}

/**
 * The module export maps Token (Component Tags) to Shadow Objects (ECS components).
 * This is the Registry (Component Manifest) for this module.
 */
export default {
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

## Local vs. Remote Environments

This example uses `<shae-worker>` to run logic in a web worker (remote). If you want to run the Shadow Environment on the main thread instead, you use a local environment setup. The Shadow Object code you write is identical in both cases -- only the bootstrap element changes. Both modes are first-class citizens of the framework.

## Next Steps

- Learn how to structure complex logic in [Creating Shadow Objects](./02-guides/02-creating-shadow-objects.md).
- Understand how to build robust UIs in [View Integration](./02-guides/03-view-integration.md).
- Read [Concepts](./concepts.md) for a deeper understanding of entities, context, and the architecture.
