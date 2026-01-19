# @spearwolf/shae-offscreen-canvas

> A multi-threaded renderer 🚀 for your browser using Web Workers and shared OffscreenCanvas.

This package provides custom HTML elements to create a **Shadow Objects** scenario supporting:
*   General offscreen canvas rendering
*   Shared Three.js offscreen renderer

**👉 [Read the Package Documentation](./docs/01-shadow-objects-api.md)**

For the core concepts, see the [Main Shadow Objects Documentation](../shadow-objects/docs/).

## Usage Example

```html
<shae-offscreen-canvas-ctx src="my-logic.js">
  
  <shae-offscreen-canvas>
    <!-- Your entities here -->
    <shae-ent token="my-scene"></shae-ent>
  </shae-offscreen-canvas>

</shae-offscreen-canvas-ctx>
```

## Development

*   **Start Demo Server:** `pnpm start` (from root) or `pnpm dev` (inside this package)
*   **Run Tests:** `pnpm test`
