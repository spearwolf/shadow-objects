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

## Documentation

- [Package API](./docs/01-shadow-objects-api.md)
- [Shadow Objects Core Docs](../shadow-objects/docs/README.md)

## Development

- **Start Demo Server:** `pnpm start` (from root) or `pnpm dev` (inside this package)
- **Run Tests:** `pnpm test` -- `vitest --run --coverage`; the v8 report lands in `coverage/` (console summary plus an HTML report), no thresholds configured
