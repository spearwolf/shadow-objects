# Registry and Modules

The **Registry** is the routing table of the Shadow Objects framework. It tells the Kernel which code to run for a given Entity Token. This configuration is organized into **Modules**.

## Defining a Module

A module is a simple JavaScript object that exports a configuration. This is the entry point referenced by the `src` attribute of your `<shae-worker>`.

```javascript
// my-logic.js
import { MyCounter } from './MyCounter.js';
import { Analytics } from './Analytics.js';

export default {
    define: {
        // Direct Mapping
        'counter': MyCounter,
        'analytics': Analytics,
    },
    routes: {
        // Composition
        'counter': ['analytics'],
    }
};
```

## The `define` Block

The `define` object maps **Tokens** (strings) to **Shadow Object Constructors**.

*   **Key:** The token string (e.g., `'my-button'`). This matches the `token` attribute on `<shae-ent>`.
*   **Value:** A Shadow Object definition (Function or Class).

```javascript
define: {
    'hero-section': HeroLogic,
    'nav-bar': NavbarLogic
}
```

## The `routes` Block

The `routes` object defines how Tokens relate to each other. It allows for **Composition** and **Conditional Logic** without modifying the View Layer.

### 1. Composition (Mixin Pattern)

You can map one token to a list of other tokens. When an Entity is created with the main token, the Kernel will instantiate Shadow Objects for *all* tokens in the route list (in addition to the main one).

```javascript
routes: {
    // When <shae-ent token="user-profile"> is created,
    // instances of UserProfile, Logger, and ThemeSubscriber are created.
    'user-profile': ['logger', 'theme-subscriber']
}
```

This allows you to attach reusable behaviors (like logging, analytics, or layout management) to entities without changing the HTML.

### 2. Conditional Routing

Routes can be dynamic. You can specify conditions based on the Entity's properties. If the condition is met (truthy), the additional token is included.

Syntax: `'@propertyName'`

```javascript
routes: {
    // If the entity has a "debug" property that is truthy,
    // add the "debug-overlay" behavior.
    'game-canvas': ['@debug'],
    
    // Explicit mapping for the condition
    '@debug': ['debug-overlay']
}
```

**Example HTML:**

```html
<!-- Loads GameCanvas + DebugOverlay -->
<shae-ent token="game-canvas">
    <shae-prop name="debug" value="true"></shae-prop>
</shae-ent>

<!-- Loads only GameCanvas -->
<shae-ent token="game-canvas"></shae-ent>
```

### 3. Nested Routing

Routes are recursive. If Token A routes to Token B, and Token B routes to Token C, an entity with Token A will get A, B, and C.

```javascript
routes: {
    'page': ['header', 'footer'],
    'header': ['menu', 'logo'],
}
// 'page' -> ['header', 'menu', 'logo', 'footer']
```

## Best Practices

1.  **Atomic Logic:** Keep your Shadow Objects small and focused (Single Responsibility Principle). Use routes to compose complex behaviors.
2.  **Generic Features:** Use Conditional Routing for cross-cutting concerns like Debugging, Logging, or Experimental features flags.
3.  **Namespace:** If your app grows large, consider namespacing your tokens (e.g., `ui:button`, `data:user`) to avoid collisions.
