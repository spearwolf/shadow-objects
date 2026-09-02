# Shadow Objects

[![npm](https://img.shields.io/npm/v/@spearwolf/shadow-objects)](https://www.npmjs.com/package/@spearwolf/shadow-objects)

*a reactive entity-component framework that feels at home in the shadows*

Shadow Objects is an Entity Component System (ECS) for the browser platform. It separates application logic from its presentation, and not just logically: the logic runs in a Shadow Environment, which lives either on the main thread (`LocalShadowObjectEnv`) or inside a web worker (`RemoteWorkerEnv`). Your Shadow Object code is identical in both cases. Only the proxy gets swapped.

Entities are lightweight nodes in a tree. Shadow Objects are ECS components that attach behavior to them. The View is authoritative for structure, not for behavior: it decides which entities exist and which properties they carry, while the Registry decides which Shadow Objects land on them.

## Installation

```bash
npm install @spearwolf/shadow-objects
```

Exactly one copy of `@spearwolf/signalize` and one of `@spearwolf/eventize` may stand in the dependency tree. Both key their marker slots with realm-wide symbols, so two majors of either share one slot per object and fail at the boundary between them. You do not have to install signalize for this: the reactivity primitives reach a Shadow Object as arguments — `createSignal`, `createEffect` and `createMemo` come in through the creation API, and nothing here asks you to import them yourself. eventize is the other way round: its surface is reached through that package's free functions — `on`, `once`, `off`, `emit` — imported from it directly, so code that imports those functions, in the view or in a Shadow Object, needs eventize in your own manifest, at the range this package declares. Whoever does put signalize next to this package takes the range this package declares, `^1.0.0`. The `latest` tag of signalize sits inside that range today, so a plain `npm install @spearwolf/signalize` currently lands on the one copy — and stops doing so the day a signalize 2.0 takes the tag over, without anything in your manifest changing. `npm ls @spearwolf/signalize` — or `pnpm why @spearwolf/signalize` — says whether it stayed at one.

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

All three elements take their subscriptions up when they first connect, not when they are built —
an element created with `document.createElement()` and never put into a document holds no effect and
no event subscription, so nothing on the module level points at it and it can be collected. A
`<shae-worker>` does own its `ShadowEnv` from the moment it is built; what it does not own is
anything that listens.

`<shae-ent>` and `<shae-prop>` release their subscriptions again one microtask after they leave the
document, which makes them collectable once more. A move within a single task never reaches that
point, so a re-render costs nothing. And the release is reversible: an element put back into the
document takes its subscriptions up again and carries the same `ViewComponent` and the same uuid it
left with. `destroy()` does it by hand, `isDestroyed` reads the current state.

What a released element is written in the meantime is where the two part company. `<shae-ent>` keeps
it — `token`, `ns` and `forward-custom-events` stand in the signals and are written out to the
attributes as the element reconnects. `<shae-prop>` re-reads its attributes and looks its host up
again on every connect, released or not, so a `prop.value` written in that window is replaced rather
than applied.

`<shae-worker>` uses the same two names for something stronger. Its teardown takes the Shadow
Environment with it, and an environment cannot be rebuilt — a released `<shae-worker>` stays
released, and a new one is the way back. See the
[API Reference](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/api-reference.md#web-components) for all three in detail.

## The Five Domains

| # | Domain | Responsibility | Where it lives |
|---|---|---|---|
| 1 | **View** | Structure, properties, input | always the main thread |
| 2 | **Environment** | Place of execution, transport | main thread or worker |
| 3 | **Kernel** | Lifecycle, entity tree | inside the environment |
| 4 | **Composition** | Registry, token, routing | inside the environment |
| 5 | **Shadow Object** | Application logic, reactivity, communication | inside the environment |

Each domain, what it owns, what it must not touch, and the invariants that hold the whole thing together are written up in the [project README](https://github.com/spearwolf/shadow-objects#the-five-domains) and in [Concepts](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/concepts.md).

## Security

The `src` of a `<shae-worker>` is a module URL, resolved against the document and run with a dynamic `import()`; the loaded module acts as the application's origin. Set it only from values the application trusts, and constrain it in production with a Content Security Policy delivered on every response of the origin — a policy scoped to only the document's response, or set through `<meta>`, never reaches a worker script loaded from a network URL.

```
Content-Security-Policy: script-src 'self'; worker-src 'self' blob:
```

Full detail — why `worker-src` needs `blob:` for the `@spearwolf/shadow-objects/bundle.js` entry point, and which response has to carry the header for every other one — is in the [API Reference](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/api-reference.md#security).

## Documentation

- [Overview](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/README.md)
- [Getting Started](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/getting-started.md)
- [Concepts](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/concepts.md)
- [Guides](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/guides.md)
- [API Reference](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/api-reference.md)
- [Cheat Sheet](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/cheat-sheet.md)
- [Best Practices](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/best-practices.md)
