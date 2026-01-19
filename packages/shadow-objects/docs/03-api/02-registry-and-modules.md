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

## `define`

The `define` object maps **Tokens** (strings) to **Shadow Object Constructors**.

**Use Case:** This is the primary place where you register your logic. It links the abstract "Token" used in your HTML to the concrete JavaScript class or function that implements the behavior.

*   **Key:** The token string (e.g., `'my-button'`). This matches the `token` attribute on `<shae-ent>`.
*   **Value:** A Shadow Object definition (Function or Class).

```javascript
define: {
    'hero-section': HeroLogic,
    'nav-bar': NavbarLogic
}
```

## `routes`

The `routes` object defines how Tokens relate to each other.

**Use Case:** Allows for **Composition** and **Conditional Logic** without modifying the View Layer. You can create complex entities by combining multiple Shadow Objects or enable features based on properties.

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

## `extends`

The `extends` array allows you to include other modules.

**Use Case:** Essential for modular architecture. It allows you to split your configuration into multiple files, share common configurations across different apps, or import third-party module libraries.

```javascript
import { CoreModule } from './core-module.js';

export default {
    extends: [CoreModule],
    define: {
        'my-feature': MyFeature
    }
};
```

## `initialize`

The `initialize` function is an optional async hook that runs when the module is loaded. It receives an object with `define`, `kernel`, and `registry` properties.

**Use Case:** Perform asynchronous setup tasks before the application starts. This is useful for:
*   Fetching remote configurations or feature flags.
*   Conditionally registering Shadow Objects based on the runtime environment (e.g., development tools).
*   Initializing global services or connections.

```javascript
export default {
    async initialize({ define, kernel, registry }) {
        // Dynamic setup or async operations
        const config = await fetchConfig();
        if (config.featureEnabled) {
            define('feature', FeatureLogic);
        }
    }
};
```

## Best Practices

1.  **Atomic Logic:** Keep your Shadow Objects small and focused (Single Responsibility Principle). Use routes to compose complex behaviors.
2.  **Generic Features:** Use Conditional Routing for cross-cutting concerns like Debugging, Logging, or Experimental features flags.
3.  **Namespace:** If your app grows large, consider namespacing your tokens (e.g., `ui:button`, `data:user`) to avoid collisions.
