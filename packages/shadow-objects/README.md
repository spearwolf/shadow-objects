# Shadow Objects

[![npm](https://img.shields.io/npm/v/@spearwolf/shadow-objects)](https://www.npmjs.com/package/@spearwolf/shadow-objects)

Shadow Objects is a reactive ECS (Entity Component System) library that decouples business logic from UI rendering. Entities are lightweight game objects; Shadow Objects are ECS components that attach behavior to them. Shadow environments can run on the main thread (local) or in a web worker (remote) -- both are first-class.

## Installation

```bash
npm install @spearwolf/shadow-objects
```

## Quick Example

```html
<!-- index.html -- the view layer -->
<script type="module">
  import '@spearwolf/shadow-objects/elements.js';
</script>

<shae-worker src="./my-logic.js"></shae-worker>

<shae-ent token="my-component">
  <shae-prop name="step" value="1" type="int"></shae-prop>
</shae-ent>
```

```javascript
// my-logic.js -- runs in the shadow environment
// A shadow object is an ECS component: its body runs once, then it just reacts.
function MyComponent({useProperty, createSignal, onViewEvent, dispatchMessageToView}) {
  const step = useProperty('step');
  const count = createSignal(0);

  onViewEvent((type) => {
    if (type === 'increment') {
      count.set(count() + (step() ?? 1));
      dispatchMessageToView('count-changed', {value: count()});
    }
  });
}

// The module default export is the registry (component manifest):
// a view node with the token 'my-component' gets this shadow object.
export default {
  define: {
    'my-component': MyComponent,
  },
};
```

Need to register a shadow object at runtime instead? Use `shadowObjects.define(token, constructor)` from `@spearwolf/shadow-objects/shadow-objects.js`.

## Documentation

- [Overview](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [Concepts](./docs/concepts.md)
- [Guides](./docs/guides.md)
- [API Reference](./docs/api-reference.md)
- [Cheat Sheet](./docs/cheat-sheet.md)
- [Best Practices](./docs/best-practices.md)
