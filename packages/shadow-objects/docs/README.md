# Shadow Objects

**Your UI is the renderer. Shadow Objects is the game world.**

Shadow Objects is an Entity Component System (ECS) for web applications. Entities are lightweight game objects. Shadow Objects are ECS components that attach behavior to them. The Kernel is the system runner that orchestrates it all. Your framework -- React, Vue, Svelte, plain DOM -- just renders what the game world says.

Shadow Objects doesn't replace React, Vue, or Svelte. It's the logic layer those frameworks render. Think of your UI as a real-time renderer for a running simulation. The components on screen are displays of state that lives somewhere else -- in a Shadow Environment, on a dedicated thread, running at its own pace.

If Redux or Zustand is global state on one thread, Shadow Objects is reactive ECS state across any number of threads. Shadow environments can run on the main thread (local) or in a web worker (remote). Both are first-class citizens. You can run multiple parallel environments side-by-side, mix local and worker instances, and namespace them so they never step on each other.

## Documentation

| File | What's in it |
| :--- | :--- |
| [README.md](./README.md) | This file -- overview and navigation. |
| [getting-started.md](./getting-started.md) | Installation and first working example. |
| [concepts.md](./concepts.md) | Core mental model: entities, components, environments, and how they connect. |
| [guides.md](./guides.md) | Step-by-step recipes for common tasks. |
| [api-reference.md](./api-reference.md) | Complete API reference for every class, method, and web component. |
| [cheat-sheet.md](./cheat-sheet.md) | One-page quick reference. Print it out. |
| [best-practices.md](./best-practices.md) | Patterns from real-world projects: signals vs context, resource management, and more. |

## Quick Example

```html
<!-- Declare your Shadow Environment -->
<shae-worker src="./game-logic.js"></shae-worker>

<!-- Declare entities (game objects) -->
<shae-ent token="player">
  <shae-prop name="speed" value="5.0" type="float"></shae-prop>
</shae-ent>
```

```javascript
// game-logic.js -- runs in a Web Worker
export default {
  define: {
    'player': function PlayerLogic({ useProperty, createEffect, dispatchMessageToView }) {
      const speed = useProperty('speed');

      createEffect(() => {
        // Reactive: re-runs whenever speed changes
        dispatchMessageToView('speed-changed', { speed: speed() });
      });
    }
  }
};
```

## Related Packages

- [**@spearwolf/shae-offscreen-canvas**](../../shae-offscreen-canvas/README.md) -- Offscreen canvas integration for rendering in a worker alongside your Shadow Objects logic.
