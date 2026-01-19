# Shadow Objects Framework 🧛

The **Shadow Objects Framework** is a reactive library designed to decouple business logic and state management from the UI rendering layer. It allows your application logic to run "in the dark" (typically in a Web Worker), mirroring the view hierarchy of your application.

> [!WARNING]
> 🚀 This is a highly experimental framework that is slowly maturing. Use at your own risk. 🔥

## Documentation

**👉 The complete and authoritative documentation is located in the [docs/](./docs/) directory.**

*   [**Fundamentals**](./docs/01-fundamentals/): Understand the mental model, architecture, and lifecycle.
*   [**Guides**](./docs/02-guides/): Step-by-step instructions for getting started and building with Shadow Objects.
*   [**API Reference**](./docs/03-api/): Detailed API documentation for Shadow Objects and the Registry.

## Overview

### What is it?

Shadow Objects creates a strict separation between the **View** (what the user sees) and the **Logic** (how the application behaves).

*   **View (Browser Window):** Handles rendering and user input. It remains lightweight and "dumb".
*   **Logic (Web Worker):** Manages state, side effects, and business rules. It is organized as "Shadow Objects" that are attached to abstract "Entities".

### Installation

The framework is available as an npm package:

```bash
npm install @spearwolf/shadow-objects
```

### Integration

To integrate Shadow Objects into your project, you connect the View to your Logic using tokens.

1.  **Define Logic**: Write your Shadow Objects (logic units) using the functional API.
2.  **Register**: Map your Shadow Objects to **Tokens** in a module definition.
3.  **Connect View**: Use the provided Web Components to load your module and build your UI hierarchy.

```html
<!-- 1. Initialize the Environment & Load Logic -->
<shae-worker src="./my-logic-module.js"></shae-worker>

<!-- 2. Create Entities in the View -->
<shae-ent token="my-feature">
    <!-- The framework automatically instantiates the Shadow Object mapped to "my-feature" in the worker -->
</shae-ent>
```

For detailed setup instructions, please refer to the [Getting Started](./docs/02-guides/01-getting-started.md) guide.
