# Shadow Objects Framework Documentation 🧛

Welcome to the official developer documentation for **Shadow Objects**.

> [!TIP]
> **New here?** Start with the [Mental Model](./01-fundamentals/01-mental-model.md) to understand the core concepts in 5 minutes.

## 📚 Table of Contents

### 1. Fundamentals

Core concepts, architecture, and the theory behind the framework.

*   [**Mental Model**](./01-fundamentals/01-mental-model.md)
    *   The "Shadow Theater" analogy.
    *   Separation of View (Light World) and Logic (Shadow World).
*   [**Architecture**](./01-fundamentals/02-architecture.md)
    *   The Kernel, Registry, and Message Router.
    *   How the View and Shadow World communicate.
*   [**Lifecycle**](./01-fundamentals/03-lifecycle.md)
    *   Entity creation, updates, and destruction.
    *   Shadow Object setup and teardown phases.

### 2. Guides

Step-by-step instructions for building applications.

*   [**Getting Started**](./02-guides/01-getting-started.md)
    *   Installation and "Hello World" setup.
*   [**Creating Shadow Objects**](./02-guides/02-creating-shadow-objects.md)
    *   Writing logic using the functional API (Recommended).
    *   Using Reactivity (`createSignal`, `createEffect`).
*   [**View Integration**](./02-guides/03-view-integration.md)
    *   Connecting the DOM to Shadow Objects.
    *   Syncing properties and events.
*   [**Class-Based Shadow Objects**](./02-guides/04-class-based-shadow-objects.md)
    *   Using the alternative Class-based syntax.
    *   Automatic event registration.

### 3. API Reference

Detailed technical documentation for the framework's interfaces.

*   [**Shadow Object API**](./03-api/01-shadow-object-api.md)
    *   The `ShadowObjectCreationAPI`.
    *   Inputs (`useProperty`), Context (`useContext`, `provideContext`), and Events.
*   [**Registry & Modules**](./03-api/02-registry-and-modules.md)
    *   Defining modules and routing rules.
*   [**View Components (JS API)**](./03-api/03-view-components.md)
    *   The underlying `ViewComponent` and `ComponentContext` classes.
    *   Manual integration for custom renderers (Canvas, WebGL).
*   [**Web Components (HTML)**](./03-api/04-web-components.md)
    *   `<shae-worker>`, `<shae-ent>`, `<shae-prop>`.
    *   Attributes and configuration.

---

### Related Packages

*   [**@spearwolf/shae-offscreen-canvas**](../../shae-offscreen-canvas/README.md)
    *   Documentation for the offscreen canvas integration.
