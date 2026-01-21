# The Mental Model

The **Shadow Objects Framework** is built upon a strict separation of concerns, designed to address the limitations of traditional browser-based application architectures.

## The Challenge: Orthogonal Hierarchies

Traditional UI frameworks (like React, Angular, or Vue) typically run on the browser's **Main Thread** and are tightly coupled to the **DOM hierarchy**. This works well for document-centric applications, but friction arises in complex, rich interactions like 3D configurators, game engines, or data-intensive tools.

In addition, more complex applications are sometimes divided into different modules (UI components) based on different UI frameworks, which are then composed in the browser DOM. Web components often serve as a bridge to connect these micro UI apps with each other—but the application state often loses out, or worse, behavior differences arise between the different components (often managed by different developer teams).

In these applications, we encounter two distinct perspectives that are often **orthogonal** to each other:

1.  **The Visual Interface:** The hierarchical, tree-based structure of the DOM (Visual Interface Architecture).
2.  **The Application State:** The logical structure of the data and behavior.

These two models are rarely in perfect sync. For example, a game engine managing thousands of sprites operates on a flat or spatial data structure that has little in common with the nested HTML elements of the UI.

Forcing this heavy, domain-specific state into the UI component tree—and constraining it to the single Main Thread—creates performance bottlenecks and architectural complexity.

## The Solution: Shadow Objects

Shadow Objects solves this by decoupling the **Behavior/Logic** from the **UI/Representation**.

*   **View Components** act as a bridge. They sit in the DOM and handle user interaction.
*   **Entities & Shadow Objects** live in the "Shadow World" (often a Web Worker). They manage the state and logic completely independently of the UI.

This architecture enables:

*   **Concurrency:** Heavy application logic runs in parallel, distributed across Workers, keeping the Main Thread responsive.
*   **ECS-like Reusability:** Similar to an **Entity Component System (ECS)**, behavior is modular. A "Shadow Object" is a reusable component of logic that can be attached to any Entity simply by configuring it without having to customize any code.
*   **Interchangeability:** Because logic is isolated, you can swap implementations without affecting the UI. You could replace a JavaScript-based physics simulation with a high-performance **WebAssembly (WASM)** module transparently. The UI simply syncs the minimal input data (like player controls), while the WASM Shadow Object handles the heavy lifting.

## Analogy: The Shadow Theater

To help you visualize how this works, let's use a simple analogy.

Imagine a **Shadow Theater** (Wayang Kulit).

*   **The Screen (The View):** The audience watches the screen. They see moving shapes and stories unfolding. This is your UI (HTML/CSS).
*   **The Puppets (The Entities):** Behind the screen are the puppets. They are the actual objects with structure and form.
*   **The Puppeteer (The Logic/Shadow Object):** The puppeteer manipulates the puppets, deciding how they move and react based on the script.

In Shadow Objects:
*   You don't script the screen directly (no `document.querySelector` to update text).
*   You script the **Puppeteer** (Shadow Object).
*   The framework projects the state of the puppets onto the screen automatically.

## The Two Worlds

This analogy maps to two distinct realms in your application, as shown in the architecture diagram:

![Shadow Objects Architecture](../architecture@2x.png)

### 1. Browser Window (your Components)
This is what the user sees and interacts with. It consists of the DOM, Web Components, and the rendering layer.
*   **Role:** Pure projection and user input.
*   **State:** Minimal / Transient. Ideally, the view should not hold business logic state.
*   **Environment:** The Main Thread.
*   **Context:** Can be partitioned into multiple **Namespaces** (e.g. `main-game`, `ui-overlay`) to run isolated simulations side-by-side.

### 2. Web Worker (your Entities)
This is where your application actually "lives". It contains the business logic, state management, and side effects.
*   **Role:** Processing logic, managing state, handling data.
*   **State:** The source of truth.
*   **Environment:** Typically a **Web Worker** (the "Dark"), but can also run on the Main Thread (Local Context) for simple setups.
*   **Isolation:** Each Context has its own Kernel and Entity Tree.

## Core Concepts

To bridge these two worlds, we use four fundamental concepts:

### 1. Entity (The Puppet)
An **Entity** is the abstract representation of a component. It exists in the Shadow World but mirrors a node in the View hierarchy.
*   Forms a tree structure (Parent/Child).
*   Holds **Properties** (data syncing from View).
*   Participates in the **Context** system.

### 2. Shadow Object (The Brain)
A **Shadow Object** is a functional unit of logic attached to an Entity. This design encourages **Composition over Inheritance**.
*   **Reusable:** Designed to be domain-specific and reusable across different parts of the UI.
*   **Reactive:** It listens to property changes and triggers effects.
*   **Interchangeable:** Can be implemented in JavaScript or even **WASM**.
*   It can talk to other Shadow Objects via Context.

### 3. Token (The Name)
A **Token** is a simple string identifier (e.g., `"my-button"`, `"user-profile"`) that links the View to the Logic.
*   In the View: `<shae-ent token="my-button">`
*   In the Registry: `"my-button"` maps to `MyButtonShadowObject`.

> [!NOTE]
> **Token vs. ID:** A `Token` describes *what* the object is (like a class name). The framework assigns unique IDs internally to distinguish specific instances.

### 4. Events (The Signals)
While Properties flow down (from View to Logic), **Events** allow for dynamic communication in both directions.

*   **Inbound (View → Logic):** Entities receive events from the View (like `click`, `submit`, or custom DOM events). Your Shadow Object can listen to these events to trigger actions.
*   **Outbound (Logic → View):** Shadow Objects can emit their own events. These travel back to the View, allowing the UI layer to react to logic decisions (e.g., playing an animation, showing a toast, or navigating).
