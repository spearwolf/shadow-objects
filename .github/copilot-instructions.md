# Shadow Objects Framework

The **Shadow Objects Framework** is a library designed to decouple business logic and state management from the UI rendering layer. It runs application logic "in the dark" (e.g., in a web worker), mirroring the view hierarchy of the application.

## Core Concepts

### Entities
An **Entity** is the fundamental unit representing a node in the hierarchy, mirroring a view component (like a DOM element or Web Component). Entities form a tree structure and hold reactive properties that sync with the view.

### Shadow Objects
A **Shadow Object** is a functional unit of logic attached to an Entity. It contains state, effects, and business logic. Shadow Objects are automatically created and destroyed based on the Entity's lifecycle and configuration.

### The Kernel
The **Kernel** manages the lifecycle of Entities and Shadow Objects. It handles the creation, destruction, and hierarchy updates, and orchestrates communication between the View (UI) and the Shadow World.

### The Registry
The **Registry** maps **Tokens** (strings identifying logic) to **Shadow Object Constructors**. It defines how Entities are associated with specific logic and supports routing rules.

## API Overview

Shadow Objects are defined as functions or classes receiving a `ShadowObjectParams` object. Key methods include:

- **`useProperty(name)`**: Read a reactive property from the View.
- **`useContext(name)`**: Consume a context value provided by a parent Entity.
- **`provideContext(name, value)`**: Provide a context value to descendant Entities.
- **`useResource(factory, cleanup)`**: Manage resources with automatic cleanup.
- **`createEffect(callback)`**: Run side effects when signals change.
- **`on(event, callback)`**: Listen for events on the Entity.

## Project Structure

- **`packages/shadow-objects/`**: The main framework library. Deployment package: `@spearwolf/shadow-objects`.
- **`packages/shae-offscreen-canvas/`**: An offscreen canvas as custom HTML element based on shadow-objects.
- **`packages/shadow-objects-testing/`**: Functional tests.
- **`packages/shadow-objects-e2e/`**: Blackbox / E2E tests.

## Documentation Guidelines

When generating or modifying documentation:
- Always use **English**.
- Always use **Markdown** format.
- Use simple sentences and a clear writing style, consistent with standard technical documentation practices.

