# @spearwolf/shae-offscreen-canvas

Offscreen canvas rendering in a web worker -- zero main thread blocking.

This package provides custom HTML elements that set up a Shadow Objects environment in a dedicated web worker, giving you GPU-bound canvas rendering (including Three.js) without stalling your UI thread. Shadow Objects doesn't replace React, Vue, or Svelte -- it's the logic layer those frameworks render.

## Installation

```bash
npm install @spearwolf/shae-offscreen-canvas
```

## Usage Example

```html
<shae-offscreen-canvas-ctx src="my-logic.js">

  <shae-offscreen-canvas>
    <!-- Your entities here -->
    <shae-ent token="my-scene"></shae-ent>
  </shae-offscreen-canvas>

</shae-offscreen-canvas-ctx>
```

The `src` attribute points to your shadow environment entry file -- the script that runs inside the worker and defines your shadow objects. The `<shae-ent>` elements are entities in the view layer; their tokens connect them to shadow objects running in the worker.

## Documentation

- [Package API](./docs/01-shadow-objects-api.md)
- [Shadow Objects Core Docs](../shadow-objects/docs/README.md)

## Development

- **Start Demo Server:** `pnpm start` (from root) or `pnpm dev` (inside this package)
- **Run Tests:** `pnpm test`
