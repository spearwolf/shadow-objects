# Shadow Objects

[![npm](https://img.shields.io/npm/v/@spearwolf/shadow-objects)](https://www.npmjs.com/package/@spearwolf/shadow-objects)

Shadow Objects is a reactive ECS (Entity Component System) library that decouples business logic from UI rendering. Entities are lightweight game objects; Shadow Objects are ECS components that attach behavior to them. Shadow environments can run on the main thread (local) or in a web worker (remote) -- both are first-class.

## Installation

```bash
npm install @spearwolf/shadow-objects
```

## Quick Example

```typescript
import { Registry } from '@spearwolf/shadow-objects';

// Define a shadow object -- an ECS component with behavior
function MyComponent({ entity, useSignals }) {
  const [count, setCount] = useSignals('count', 0);

  entity.on('increment', () => setCount(count.get() + 1));

  return () => {
    // cleanup on destroy
  };
}

// Register it: when a view node has the token 'my-component',
// this shadow object runs in the shadow environment
Registry.define('my-component', MyComponent);
```

## Documentation

- [Overview](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [Concepts](./docs/concepts.md)
- [Guides](./docs/guides.md)
- [API Reference](./docs/api-reference.md)
- [Cheat Sheet](./docs/cheat-sheet.md)
- [Best Practices](./docs/best-practices.md)
