---
name: shadow-objects-context
description: Best practices for using Context in Shadow Objects - hierarchical dependency injection with Provider/Consumer patterns. Use this skill when sharing state between Entities, avoiding prop drilling, implementing the type-safe Context Reader pattern, or providing global application state.
---

# Shadow Objects Context

Context is Shadow Objects' answer to prop drilling. It provides hierarchical dependency injection, allowing ancestor Entities to share state with all their descendants without passing data through every level.

## When to Use This Skill

Use this skill when:

- Sharing state between multiple Entities (theme, user settings, game state)
- Avoiding prop drilling through deeply nested Entity trees
- Implementing type-safe Context with the Context Reader pattern
- Providing global application state to all Entities
- Building reusable Shadow Objects that depend on shared services

## How Context Works

1. **Provider**: A Shadow Object calls `provideContext(name, value)`
2. **Scope**: Value is available to all Shadow Objects on the same Entity AND all descendant Entities
3. **Consumer**: A Shadow Object calls `useContext(name)` to read the value

```
Entity Tree:
├── GameApp (provides 'game-state')
│   ├── Player (consumes 'game-state')
│   │   └── Inventory (consumes 'game-state')
│   └── Enemy (consumes 'game-state')
```

## Basic Provider/Consumer Pattern

### Provider (Ancestor Entity)

```typescript
export type Theme = {
  primary: string;
  secondary: string;
  mode: 'light' | 'dark';
};

export function ThemeProvider({ provideContext }: ShadowObjectCreationAPI) {
  const theme: Theme = {
    primary: '#007bff',
    secondary: '#6c757d',
    mode: 'light',
  );

  // Make theme available to entity and their descendants
  provideContext('theme', theme);
}
```

### Consumer (Descendant Entity)

```typescript
export function ThemedButton({
  useContext,
  createEffect,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  // Read context provided by ancestor
  const theme = useContext<Theme>('theme');

  createEffect(() => {
    const currentTheme = theme();
    if (currentTheme) {
      dispatchMessageToView('theme-update', currentTheme);
    }
  });
}
```

## The Context Reader Pattern (Best Practice)

Avoid magic strings by creating typed "Context Reader" functions. This provides:

- Type safety
- IDE autocompletion
- Single source of truth for context names
- Easier refactoring

### Bad: Magic Strings

```typescript
// Scattered across files, no type safety
const scene = useContext('three-scene');      // What type is this?
const camera = useContext('three-camera');    // Easy to typo
const renderer = useContext('three-renderer'); // No autocomplete
```

### Good: Context Reader Pattern

```typescript
// three-scene.context.ts
import type { Scene } from 'three';
import type { ShadowObjectCreationAPI } from "@spearwolf/shadow-objects/shadow-objects.js";

type ContextReaders =
  | ShadowObjectCreationAPI["useContext"]
  | ShadowObjectCreationAPI["useParentContext"];

export const ThreeSceneContext = (useContext: ContextReaders) =>
  useContext<Scene>('three-scene');  // returns a SignalReader<Scene | undefined>

export const ThreeCameraContext = (useContext: ContextReaders) =>
  useContext<PerspectiveCamera>('three-camera');

export const ThreeRendererContext = (useContext: ContextReaders) =>
  useContext<WebGLRenderer>('three-renderer');
```

```typescript
// Consumer.ts
import { ThreeSceneContext, ThreeCameraContext } from './three.context';

export function MyMesh({ createEffect, useContext }: ShadowObjectCreationAPI) {
  // Type-safe! IDE knows getScene returns a SignalReader<Scene | undefined>
  const getScene = ThreeSceneContext(useContext);
  const getCamera = ThreeCameraContext(useContext);

  createEffect(() => {
    // Use with confidence
    const scene = getScene();
    if (scene) {
      const mesh = new THREE.Mesh(...);
      scene.add(mesh);
      // Tidying up is good manners
      return () => {
        mesh.removeFromParent();
      };
    }
  });
}
```

See [references/context-reader.ts](references/context-reader.ts) for complete examples.

## Context vs Parent Context

| Method | Behavior |
|--------|----------|
| `useContext(name)` | Searches from current Entity upward |
| `useParentContext(name)` | Skips current Entity, starts from parent |

### When to Use `useParentContext`

Use `useParentContext` for middleware or wrapper components that need to pass through context:

```typescript
// A wrapper that adds logging but needs to access parent's context
export function LoggingWrapper({
  useParentContext,  // Skip self, look at parent
  provideContext,    // Re-provide to children
}: ShadowObjectCreationAPI) {
  // Get context from parent (not from self)
  const parentTheme = useParentContext<Theme>('theme');

  // Wrap and re-provide with logging
  const loggedTheme: Theme = {
    get primary(): string {
      console.log('Theme accessed:', theme);
      return parentTheme.primary;
    }
    set primary(val: string) {
      console.log('Theme accessed:', theme);
      parentTheme.primary = val;
    }
    // ...
  };

  provideContext('theme', loggedTheme);
}
```

## Global Context

For application-wide state accessible to ALL Entities (not just descendants):

```typescript
export function AppBootstrap({ provideGlobalContext }: ShadowObjectCreationAPI) {
  const appSettings = {
    apiUrl: 'https://api.example.com',
    locale: 'en-US',
    featureFlags: { newUI: true },
  };

  // Available to ALL Entities, regardless of tree position
  provideGlobalContext('app-settings', appSettings);
}
```

```typescript
// Any Entity, anywhere in the tree
export function ApiClient({ useContext }: ShadowObjectCreationAPI) {
  // Global context is found even without ancestor relationship
  const settings = useContext('app-settings');
}
```

## Context Reactivity

Context values are **Signals** - when the provider updates the value, all consumers automatically re-run their effects:

```typescript
// Provider
export function GameState({ provideContext }: ShadowObjectCreationAPI) {
  const level = provideContext('game-level', 1);
  const score = provideContext('game-score', 0);

  // When this runs, ALL consumers update automatically
  return {
    // call with emit("nextLevel") from another shadow-object attached to the same entity
    nextLevel: () => level.set(level.value + 1),
    // emit("addScore", 2)
    addScore: (points) => score.set(score.value + points),
  };
}

// Consumer - effect re-runs when level changes
export function LevelDisplay({ useContext, createEffect }) {
  const level = useContext<number>('game-level');

  createEffect(() => {
    console.log('Level is now:', level()); // Automatically tracked!
  });
}
```

## Context Patterns

### Pattern 1: Service Provider

Provide shared services or utilities:

```typescript
export function AudioServiceProvider({
  provideContext,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const audioContext = new AudioContext();

  const audioService = {
    play: (url: string) => { /* ... */ },
    stop: () => { /* ... */ },
    setVolume: (vol: number) => { /* ... */ },
  };

  provideContext('audio-service', audioService);

  onDestroy(() => {
    audioContext.close();
  });
}
```

### Pattern 2: State Container

Centralized state management:

```typescript
export function StoreProvider({ createSignal, provideContext }) {
  // State
  const state = createSignal({
    user: null,
    items: [],
    loading: false,
  });

  // Actions
  const actions = {
    setUser: (user) => state.set({ ...state.value, user }),
    addItem: (item) => state.set({
      ...state.value,
      items: [...state.value.items, item]
    }),
    setLoading: (loading) => state.set({ ...state.value, loading }),
  };

  // Provide both state and actions
  provideContext('store-state', state);
  provideContext('store-actions', actions);
}
```

### Pattern 3: Feature Flags

Conditional feature loading:

```typescript
export function FeatureFlagsProvider({
  useProperty,
  provideContext,
}: ShadowObjectCreationAPI) {
  const flags = useProperty<Record<string, boolean>>('feature-flags');

  const isEnabled = (feature: string) => {
    return flags()?.[feature] ?? false;
  };

  provideContext('feature-flags', { isEnabled });
}
```

## Best Practices

1. **Use Context Reader Pattern**: Always create typed context readers for type safety
2. **Keep Context Granular**: Provide specific values, not monolithic objects
3. **Signals for Reactivity**: Provide Signals if consumers need to react to changes
4. **Document Your Contexts**: List all contexts a Shadow Object provides or consumes
5. **Avoid Circular Dependencies**: Don't have context A depend on context B and vice versa

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Magic strings everywhere | Use Context Reader pattern |
| Context not found | Ensure provider is an ancestor, not sibling |
| Stale context values | Provide Signals, not plain values |
| Memory leaks | Clean up resources in `onDestroy` |
| Tight coupling | Use interfaces, not concrete implementations |

## Complete Example

See [references/provider-consumer.ts](references/provider-consumer.ts) for a full working example with:

- Theme provider with dark mode toggle
- Multiple consumers at different tree levels
- Context Reader pattern implementation
- Global context for app settings

## Related Skills

- **shadow-objects-basics**: Understanding Entities and Shadow Objects
- **shadow-objects-signals**: Deep dive into Signals for reactive context values
- **shadow-objects-lifecycle**: Cleaning up context resources properly
