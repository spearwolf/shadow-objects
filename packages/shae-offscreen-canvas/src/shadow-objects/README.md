
### ShaeOffscreenCanvas

the shae-offscreen-canvas represents an offscreen canvas. however, a canvas _drawing context_ is not created.

these contexts are provided:

| context name | type | description |
|------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the offscreen canvas connected to the canvas element in the main document |
| `canvasSize` | [**width**: _number_, **height**: _number_, **pixelRatio**: _number_] | the size of the canvas element in _device pixels_. i.e. the pixelRatio is already included in the width and height specification. if you want the _css pixels_, divide the width and height by the pxelRatio |

In addition, the `onRenderFrame` event is dispatched to the entity and its children.

The `onRenderFrame` event comes with a data object:

| property | type | description |
|----------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the offscreen canvas object, which is also offered as context |
| `now` | _number_ | the current time in seconds. see [performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) |
| `frameNo` | _number_ | a frame counter. starts at 0.
