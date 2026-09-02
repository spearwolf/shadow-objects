# @spearwolf/shae-offscreen-canvas

Offscreen canvas rendering in a web worker -- zero main thread blocking.

This package provides custom HTML elements that set up a Shadow Objects environment in a dedicated web worker, giving you GPU-bound canvas rendering (including Three.js) without stalling your UI thread. Shadow Objects doesn't replace React, Vue, or Svelte -- it's the logic layer those frameworks render.

## Installation

```bash
npm install @spearwolf/shae-offscreen-canvas three
```

`three` is a peer dependency of this package, installed by the application so
exactly one copy of it sits in the dependency tree -- two instances mean two
registries for WebGL resources, and `instanceof` checks stop working across
the boundary between them. The peer is not optional: the entry point
`./shadow-objects.js` names `ThreeMultiViewRenderer` in its `define` object
and loads it statically, so `three` belongs in the tree even for an
application that only uses `Canvas2D` or `CanvasBitmapRenderer`. The required
range is `>=0.180.0`.

The same one-copy rule holds for `@spearwolf/signalize` and
`@spearwolf/eventize`, for a different reason: both key their marker slots with
realm-wide symbols, so two majors of either share one slot per object and fail
at the boundary between them. This package declares both in its own
`dependencies`, and those are the ranges that count. signalize needs no line of
its own -- the reactivity primitives reach a Shadow Object as arguments. eventize
does, as soon as your code imports one of its free functions -- in the view or in
a Shadow Object -- because that surface is reached through them directly, and
under an isolated `node_modules` a transitive package is not a resolvable import
path. Install it against the range declared here. The sharp edge is a direct
`npm install @spearwolf/signalize`: its `latest` tag points at the 0.x line for
as long as 1.0 is in beta, and that line is disjoint from the range declared
here. `npm ls @spearwolf/signalize` or `pnpm why @spearwolf/signalize` says
whether it stayed at one copy.

## Usage Example

```html
<shae-worker src="my-logic.js">

  <shae-offscreen-canvas>
    <!-- Your entities here -->
    <shae-ent token="my-scene"></shae-ent>
  </shae-offscreen-canvas>

</shae-worker>
```

The `src` attribute points to your shadow environment entry file -- the script that runs inside the worker and defines your shadow objects. The `<shae-ent>` elements are entities in the view layer; their tokens connect them to shadow objects running in the worker.

## Attributes

`<shae-offscreen-canvas>` reads three attributes:

- **`ns`** -- the namespace of the entity in its shadow root. Read once when the element is constructed; changing it afterwards has no effect.
- **`fps`** -- the upper bound on the frame rate the element reports to its shadow object, as a whole number. Absent, it reports `60`. Present but unusable (not a number, or below `1`), it reports `0`.
- **`pixel-zoom`** -- divides the pixel ratio the element reports, as a whole number, so a low-resolution canvas can be scaled up and rendered pixelated. Absent or unusable (not a number, or at or below `1`) falls back to `1`, at which point it has no effect.

## Extending the element

```js
import {ShaeOffscreenCanvasElement} from '@spearwolf/shae-offscreen-canvas/ShaeOffscreenCanvasElement.js';
```

This entry point hands out the class and nothing else. The
`customElements.define('shae-offscreen-canvas', …)` call lives in
`@spearwolf/shae-offscreen-canvas/shae-offscreen-canvas.js`, the module the
bundle entry point imports for its side effect.

A subclass with its own template:

```js
class MyCanvas extends ShaeOffscreenCanvasElement {
  constructor() {
    super(myTemplate);
  }
}

customElements.define('my-canvas', MyCanvas);
```

`super()` takes an `initialHTML` argument -- markup containing a
`<canvas id="display">` and a `<shae-ent id="entity" token="ShaeOffscreenCanvas">`.
Both ids are required; the constructor throws and names whichever is absent.
The token on the entity element connects it to the shadow object this package
registers under `./shadow-objects.js` -- a subclass that sets a different
token trades in the shadow object on the other end.

The namespace of the host element reaches the entity element through
`setAttribute()`, so it applies even to a template without a placeholder for
it.

A subclass that declares its own `static observedAttributes` without
spreading the superclass's list loses `fps` and `pixel-zoom`.

## Documentation

- [Package API](https://github.com/spearwolf/shadow-objects/blob/main/packages/shae-offscreen-canvas/docs/01-shadow-objects-api.md)
- [Shadow Objects Core Docs](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/docs/README.md)

## Development

- **Start Demo Server:** `pnpm start` (from root) or `pnpm dev` (inside this package)
- **Run Tests:** `pnpm test` -- `vitest --run --coverage`; the v8 report lands in `coverage/` (console summary plus an HTML report), no thresholds configured
