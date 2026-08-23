# Shadow Objects

[![npm](https://img.shields.io/npm/v/@spearwolf/shadow-objects)](https://www.npmjs.com/package/@spearwolf/shadow-objects)

*a reactive entity-component framework that feels at home in the shadows*

Shadow Objects is an Entity Component System (ECS) for the browser platform. It separates application logic from its presentation, and not just logically: the logic runs in a Shadow Environment, which lives either on the main thread (`LocalShadowObjectEnv`) or inside a web worker (`RemoteWorkerEnv`). Your Shadow Object code is identical in both cases. Only the proxy gets swapped.

Entities are lightweight nodes in a tree. Shadow Objects are ECS components that attach behavior to them. The View is authoritative for structure, not for behavior: it decides which entities exist and which properties they carry, while the Registry decides which Shadow Objects land on them.

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
// A shadow object is an ECS component: the body is the setup phase, after that it only reacts.
// It runs once, for as long as this shadow object stays on the entity.
function MyComponent({useProperty, createSignal, onViewEvent, dispatchMessageToView}) {
  const step = useProperty('step');
  const count = createSignal(0);

  onViewEvent((type) => {
    if (type === 'increment') {
      count.set(count.value + (step() ?? 1));
      dispatchMessageToView('count-changed', {value: count.value});
    }
  });
}

// The module exports the registry (component manifest) under the name `shadowObjects` --
// the loader reads exactly that named export. A view node with the token 'my-component'
// gets this shadow object.
export const shadowObjects = {
  define: {
    'my-component': MyComponent,
  },
};
```

Need to register a shadow object at runtime instead? `@spearwolf/shadow-objects/shadow-objects.js` exports a helper object of the same name for that, with a `define(token, constructor)` method. It is a separate thing from the registry a module exports: the helper writes into a `Registry`, the export declares one.

`@spearwolf/shadow-objects/FrameLoop.js` is the same kind of subpath: it carries the `FrameLoop` class without the view layer, for code that runs inside a worker.

## Element Lifecycle

The custom elements clean up after themselves — no teardown call for you to make, because a
framework re-rendering a subtree would not make one either.

`<shae-ent>` and `<shae-prop>` release their subscriptions one microtask after they leave the
document, which makes them collectable. A move within a single task never reaches that point, so a
re-render costs nothing. And the release is reversible: an element put back into the document takes
its subscriptions up again and carries the same `ViewComponent` and the same uuid it left with.
`destroy()` does it by hand, `isDestroyed` reads the current state.

What a released element is written in the meantime is where the two part company. `<shae-ent>` keeps
it — `token`, `ns` and `forward-custom-events` stand in the signals and are written out to the
attributes as the element reconnects. `<shae-prop>` re-reads its attributes and looks its host up
again on every connect, released or not, so a `prop.value` written in that window is replaced rather
than applied.

`<shae-worker>` uses the same two names for something stronger. Its teardown takes the Shadow
Environment with it, and an environment cannot be rebuilt — a released `<shae-worker>` stays
released, and a new one is the way back. See the
[API Reference](./docs/api-reference.md#web-components) for all three in detail.

## The Five Domains

| # | Domain | Responsibility | Where it lives |
|---|---|---|---|
| 1 | **View** | Structure, properties, input | always the main thread |
| 2 | **Environment** | Place of execution, transport | main thread or worker |
| 3 | **Kernel** | Lifecycle, entity tree | inside the environment |
| 4 | **Composition** | Registry, token, routing | inside the environment |
| 5 | **Shadow Object** | Application logic, reactivity, communication | inside the environment |

Each domain, what it owns, what it must not touch, and the invariants that hold the whole thing together are written up in the [project README](https://github.com/spearwolf/shadow-objects#the-five-domains) and in [Concepts](./docs/concepts.md).

## Documentation

- [Overview](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [Concepts](./docs/concepts.md)
- [Guides](./docs/guides.md)
- [API Reference](./docs/api-reference.md)
- [Cheat Sheet](./docs/cheat-sheet.md)
- [Best Practices](./docs/best-practices.md)
