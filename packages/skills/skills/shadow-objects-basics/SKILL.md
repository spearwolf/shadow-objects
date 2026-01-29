---
name: shadow-objects-basics
description: Learn the fundamentals of the Shadow Objects Framework - a reactive library for decoupling business logic from UI. Use this skill when starting a new Shadow Objects project, understanding the architecture (Entities, Tokens, Shadow Objects, Kernel, Registry), or setting up Web Components like <shae-worker>, <shae-ent>, and <shae-prop>.
---

# Shadow Objects Basics

The Shadow Objects Framework separates your application logic from UI rendering. Think of it like a shadow theater: the audience sees the screen (UI), but the real action happens behind the scenes with the puppeteer (your logic).

## When to Use This Skill

Use this skill when:

- Starting a new Shadow Objects project
- Understanding the core architecture
- Setting up Web Components (`<shae-worker>`, `<shae-ent>`, `<shae-prop>`)
- Creating your first Shadow Object
- Configuring the Registry

## The Shadow Theater Model

| Concept | Role | Description |
|---------|------|-------------|
| **Screen** | View | The visible UI (DOM, Canvas) |
| **Puppets** | Entities | Abstract representations with hierarchical structure |
| **Puppeteer** | Shadow Objects | The logic that react on the puppets |

**Key insight**: "Don't script the screen directly. Script the Puppeteer, and the framework projects the state onto the screen automatically."

## The Two Worlds

### Light World (Browser/Main Thread)

- The user-facing UI
- Contains Web Components, DOM elements or other state structures created by the View Component API
- Should hold minimal state
- Sends data downstream, receives events upstream

### Shadow World (Web Worker or Main Thread)

- Where your application logic lives
- The source of truth for state
- Contains the Kernel, Entities, and Shadow Objects
- Runs independently from the UI thread

## Core Concepts

### Token

A string identifier linking View to Logic. Tokens describe *what* something is, not *which specific instance*.

```html
<shae-ent token="my-counter">...</shae-ent>
```

### Entity

The abstract representation of a component in the Shadow World. Entities:

- Form a tree structure (parent/child relationships)
- Hold Properties synced from the View
- Participate in the Context system
- Might have one or more Shadow Objects attached

### Shadow Object

A functional unit of logic attached to an Entity. Shadow Objects are:

- **Reusable**: Domain-specific, works across different UI components
- **Reactive**: Responds to property and context changes automatically
- **Composable**: Multiple Shadow Objects can attach to one Entity

```typescript
function MyShadowObject({ useProperty, createEffect }: ShadowObjectCreationAPI) {
  const count = useProperty('count');

  createEffect(() => {
    console.log('Count changed:', count());
  });
}
```

### Kernel

The engine of the Shadow World:

- Manages the Entity tree lifecycle
- Orchestrates Shadow Objects
- Schedules reactive update cycles

### Registry

The configuration that maps Tokens to Shadow Object constructors:

```typescript
export default {
  define: {
    'counter': CounterLogic,
    'analytics': AnalyticsTracker,
  },
  routes: {
    // Composition: 'counter' also loads 'analytics'
    'counter': ['analytics'],
  }
};
```

## HTML Setup

### Step 1: Import Web Components

```html
<script type="module">
  import "@spearwolf/shadow-objects/elements.js";
</script>
```

### Step 2: Create a Shadow Worker Environment

```html
<shae-worker src="./my-logic.js" ns="app">
</shae-worker>
```

| Attribute | Description |
|-----------|-------------|
| `src` | Path to your logic module (aka Shadow Objects Module) |
| `ns` | Optional Namespace (connects related components). If empty, the default namespace is used, which is fine when only one shadow objects environment (worker) is used. |
| `local` | Run on main thread instead of worker |
| `no-structered-clone` | (Only if `local`): Do NOT use `structeredClone()` helper to clone the property and event arguments. |
| `auto-sync` | Sync frequency: `frame`, `30fps`, `100` (ms, interval), `no` |

### Step 3: Create Entities

```html
<shae-ent token="counter" ns="app">
  <shae-prop name="count" value="0" type="int"></shae-prop>
  <button>Click me</button>
</shae-ent>
```

| Attribute | Description |
|-----------|-------------|
| `token` | Maps to a Registry entry |
| `ns` | Must match `<shae-worker>` namespace |
| `forward-custom-events` | Forward events from Shadow Objects Environment as DOM CustomEvents |

**Important**: `<shae-ent>` elements do NOT need to be DOM children of `<shae-worker>`. They connect via namespace.

### Step 4: Bind Properties

```html
<shae-prop name="score" value="100" type="int"></shae-prop>
<shae-prop name="active" value="true" type="boolean"></shae-prop>
<shae-prop name="config" value='{"level":1}' type="json"></shae-prop>
<shae-prop name="position" value="10 20 30" type="float32array"></shae-prop>
```

Supported types: `string`, `number`, `int`, `boolean`, `json`, `number[]`, `float32array`, `uint8array`

**Important**: `<shae-prop>` elements MUST BE be a DOM children of `<shae-ent>`.

## Creating Your First Shadow Object

See [references/basic-shadow-object.ts](references/basic-shadow-object.ts) for a complete example.

```typescript
export function Counter({
  useProperty,
  createSignal,
  createEffect,
  onViewEvent,
  dispatchMessageToView
}: ShadowObjectCreationAPI) {
  // Read property from View
  const initialCount = useProperty<number>('count');

  // Create local reactive state
  const count = createSignal(initialCount() ?? 0);

  // React to changes
  createEffect(() => {
    dispatchMessageToView('count-changed', { value: count() });
  });

  // Handle View events
  onViewEvent((type, data) => {
    if (type === 'increment') {
      count.set(count.value + (data?.amount ?? 1));
    }
  });
}
```

## The ShadowObjectCreationAPI

When a Shadow Object function is called, it receives these tools:

| API | Purpose |
|-----|---------|
| `useProperty(name)` | Read a reactive property from View |
| `useProperties(map)` | Read multiple properties at once |
| `createSignal(initial)` | Create local reactive state |
| `createEffect(fn)` | Run side effects on dependency changes |
| `createMemo(fn)` | Create computed/derived values |
| `createResource(factory, cleanup)` | Manage external resources |
| `onViewEvent(handler)` | Listen to events from View |
| `dispatchMessageToView(type, data)` | Send events to View |
| `provideContext(name, value)` | Provide context for descendants |
| `useContext(name)` | Consume context from ancestors |
| `onDestroy(cleanup)` | Register cleanup on destruction |
| `entity` | Reference to the Entity object |

## Registry Configuration

See [references/registry-config.ts](references/registry-config.ts) for advanced patterns.

### Basic Definition

```typescript
import type { ShadowObjectsModule } from '@spearwolf/shadow-objects';

const mod: ShadowObjectsModule = {
  define: {
    'counter': Counter,
    'logger': Logger,
  },
};

export default mod;
```

### Composition with Routes

```typescript
export default {
  define: {
    'counter': Counter,
    'logger': Logger,
    'analytics': AnalyticsTracker,
  },
  routes: {
    // Load 'logger' and 'analytics' whenever 'counter' is created
    'counter': ['logger', 'analytics'],
  },
};
```

### Conditional Routes

```typescript
export default {
  define: {
    'counter': Counter,
    'debug-panel': DebugPanel,
  },
  routes: {
    // 'counter' conditionally loads '@debug' route
    'counter': ['@debug'],
    // '@debug' resolves to 'debug-panel' only if 'debug' property is truthy
    '@debug': ['debug-panel'],
  },
};
```

## Best Practices

1. **Keep Shadow Objects focused**: One concern per Shadow Object
2. **Use composition**: Multiple Shadow Objects per Entity for complex behavior
3. **Let the Registry handle routing**: Don't instantiate Shadow Objects manually
4. **Tokens describe types, not instances**: The framework assigns unique IDs internally
5. **Namespace carefully**: Group related app domains with the same `ns` attribute

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Forgetting `ns` attribute | Ensure `<shae-ent>` and `<shae-worker>` share the same namespace |
| Modifying shared state | Data is cloned across Worker boundary. Use events for updates. |
| Direct DOM manipulation | Use `dispatchMessageToView` to send state to View |
| Missing cleanup | Use `onDestroy` for external resources (see lifecycle skill) |
| Synchronous expectations | The Shadow Objects Environment and the View generally run asynchronously to each other. Communication takes place exclusively from the View to the Shadow Objects Environment via property changes or events. Communication from the Shadow Object Environment to the View takes place only via events. |

## Complete Example

See [references/html-setup.html](references/html-setup.html) for a full working example.

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import "@spearwolf/shadow-objects/elements.js";
  </script>
</head>
<body>
  <shae-worker src="./counter-logic.js" ns="app"></shae-worker>

  <shae-ent token="counter" ns="app" forward-custom-events="count-changed">
    <shae-prop name="count" value="0" type="int"></shae-prop>
    <button id="inc">+1</button>
    <span id="display">0</span>
  </shae-ent>

  <script>
    const ent = document.querySelector('shae-ent');
    const display = document.querySelector('#display');

    document.querySelector('#inc').addEventListener('click', () => {
      ent.viewComponent?.dispatchShadowObjectsEvent('increment', { amount: 1 });
    });

    ent.addEventListener('count-changed', (e) => {
      display.textContent = e.detail.value;
    });
  </script>
</body>
</html>
```

## Next Steps

After mastering the basics, explore these related skills:

- **shadow-objects-context**: Share state between Entities with Provider/Consumer patterns
- **shadow-objects-signals**: Deep dive into reactive programming with Signals and Effects
- **shadow-objects-lifecycle**: Manage resources and understand the Shadow Object lifecycle
- **shadow-objects-events**: Advanced event communication patterns
