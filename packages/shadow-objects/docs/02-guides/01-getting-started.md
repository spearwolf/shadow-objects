# Getting Started

This guide will walk you through setting up a minimal Shadow Objects project. You will create a simple interactive component that demonstrates the separation between the **View Layer** and the **Shadow World**.

## Prerequisites

*   Node.js (LTS version recommended)
*   A package manager (npm, pnpm, or yarn)
*   Basic knowledge of HTML and JavaScript

## 1. Installation

First, install the `shadow-objects` package.

```bash
npm install @spearwolf/shadow-objects
# or
pnpm add @spearwolf/shadow-objects
```

## 2. Setting up the View Layer

In your HTML file, you need to set up the environment. The `shadow-objects` framework runs its logic in a separate context (often a Web Worker). We use the `<shae-worker>` component to bootstrap this environment.

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Shadow Objects Hello World</title>
    <script type="module">
        // Import the necessary Web Components
        import "@spearwolf/shadow-objects/elements";
    </script>
</head>
<body>

    <!-- 
      1. Initialize the Environment 
      src: Points to your logic module (the Shadow World entry point)
    -->
    <shae-worker src="./my-logic.js">
        
        <!-- 
          2. Define an Entity (View Component)
          token: Matches a definition in your logic module
        -->
        <shae-ent token="counter-component">
            <!-- Initial Property Value -->
            <shae-prop name="count" value="0"></shae-prop>
            
            <!-- Simple UI for the user -->
            <button id="btn">Click me</button>
            <span id="display">Count: 0</span>
        </shae-ent>

    </shae-worker>

    <script>
        // Glue code to forward DOM events to the Entity
        // In a real app, you might wrap this in a custom Web Component
        const ent = document.querySelector('shae-ent');
        const btn = document.querySelector('#btn');
        const display = document.querySelector('#display');

        // Forward click event to the Shadow World
        btn.addEventListener('click', () => {
            // "viewEvent" is the standard channel for custom interactions
            ent.component.dispatchEvent('viewEvent', { type: 'increment' });
        });

        // Listen for property updates from the Shadow World
        // <shae-prop> handles this automatically, but here is how to do it manually:
        ent.addEventListener('shae-prop:count', (e) => {
             display.textContent = `Count: ${e.detail.value}`;
        });
    </script>
</body>
</html>
```

> [!NOTE]
> Under the hood, `<shae-ent>` creates a **ViewComponent** and registers it with the **ComponentContext** provided by `<shae-worker>`.

## 3. Creating the Shadow Logic

Now, let's create the logic file that runs in the "Shadow World". This file defines the behavior of your entities.

### `my-logic.js`

```javascript
/**
 * The Logic Function for our Counter
 */
function CounterLogic({ useProperty, createEffect, createSignal, on, entity }) {
    
    // 1. Inputs: Read the 'count' property from the View
    const countProp = useProperty('count'); // Returns a signal reader
    
    // 2. State: Create local state for logic
    // We initialize it with the value from the view
    const [count, setCount] = createSignal(countProp() || 0);

    // 3. Reactivity: React to changes
    createEffect(() => {
        console.log("Current count in Shadow World:", count());
    });

    // 4. Events: Listen for interactions from the View
    on(entity, 'onViewEvent', (type, data) => {
        if (type === 'increment') {
            setCount(c => c + 1);
        }
    });
}

/**
 * Module Definition
 * This exports the configuration for the Registry.
 */
export default {
    define: {
        // Map the token "counter-component" to our logic function
        "counter-component": CounterLogic
    }
};
```

## 4. How it Works

1.  **Boot:** The browser loads `<shae-worker>`. It starts a Web Worker and loads `my-logic.js`.
2.  **Mount:** The `<shae-ent>` element connects. It creates a `ViewComponent` and adds it to the `ComponentContext`.
3.  **Sync:** The `ComponentContext` sends a message to the Kernel in the worker: "Create an entity with token `counter-component`".
4.  **Instantiation:** The Kernel consults the Registry, finds `CounterLogic`, and executes it.
5.  **Interaction:**
    *   User clicks "Click me".
    *   Browser sends `viewEvent` -> `increment`.
    *   `CounterLogic` receives `onViewEvent`.
    *   `setCount` updates the signal.
    *   `createEffect` runs.
    *   **Events:** The Shadow Object uses `entity.dispatchMessageToView` to communicate back (see View Integration).

## Next Steps

*   Learn how to structure complex logic in [Creating Shadow Objects](./02-creating-shadow-objects.md).
*   Understand how to build robust UIs in [View Integration](./03-view-integration.md).
