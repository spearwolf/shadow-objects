[TOC]

### ShaeOffscreenCanvas

Represents an offscreen canvas. However, a _canvas rendering context_ is not created. The [Canvas2D](#canvas2d) and [CanvasBitmapRenderer]() shadow objects should be used for this purpose.

#### provide context

| context name | type | description |
|------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the offscreen canvas connected to the canvas element in the main document |
| `canvasSize` | [**width**: _number_, **height**: _number_, **pixelRatio**: _number_] | the size of the canvas element in _device pixels_. i.e. the pixelRatio is already included in the width and height specification. if you want the _css pixels_, divide the width and height by the pixelRatio |
| `ShaeOffscreenCanvas` | [ShaeOffscreenCanvas](./ShaeOffscreenCanvas.js) | the shadow object itself |


#### local entity events

The _ShaeOffscreenCanvas_ shadow object publishes the `onFrame` event to the entity and its children. 

The `onFrame` event comes with a data object:

| property | type | description |
|----------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the offscreen canvas object, which is also offered as context |
| `now` | _number_ | the current time in seconds. see [performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) |
| `frameNo` | _number_ | a frame counter. starts at 0.


### Canvas2D

The _Canvas2D_ shadow object creates a [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) and provides it as a context. Usually used in conjunction with the [ShaeOffscreenCanvas](#shaeoffscreencanvas).

#### provide context

| context name | type | description |
|------|------|-------------|
| `CanvasRenderingContext2D` | [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) | the canvas rendering context |

#### use context

| context name | type | description |
|------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the canvas object |
| `ShaeOffscreenCanvas` | [ShaeOffscreenCanvas](#shaeoffscreencanvas) | _(optional)_ the offscreen canvas api |


### CanvasBitmapRenderer

The _CanvasBitmapRenderer_ shadow object creates an [ImageBitmapRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) and provides it as a context. Usually used in conjunction with the [ShaeOffscreenCanvas](#shaeoffscreencanvas).

#### provide context

| context name | type | description |
|------|------|-------------|
| `ImageBitmapRenderingContext` | [ImageBitmapRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) | the canvas rendering context |

#### use context

| context name | type | description |
|------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the canvas object |
| `ShaeOffscreenCanvas` | [ShaeOffscreenCanvas](#shaeoffscreencanvas) | _(optional)_ the offscreen canvas api |


### ThreeMultiViewRenderer

Creates an offscreen canvas and initializes a [THREE.WebGLRenderer](https://threejs.org/docs/index.html?q=webglrenderer#api/en/renderers/WebGLRenderer).
Provides an API to create and render multiple rendering views:

#### RenderView API

> `threeMultiViewRenderer.createView(width, height)` &rarr; _RenderView_

Creates a new _RenderView_ structure. Once created, the _view_ will be rendered automatically with the next frame. however, the user has to set a scene and a camera for this. the view structure can be adjusted at any time (e.g. `width` and `height` or `scene` and `camera` can be changed at any time if you want).

##### RenderView Structure

| property | type | description |
|----------|------|-------------|
| `width` | _number_ | canvas width (real pixels) |
| `height` | _number_ | canvas height (real pixels) |
| `viewport` | `[x: number, y: number, width: number, height: number]` | _(optional)_ the [WebGL viewport](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/viewport), default is `[0, 0, width, height]` |
| `scene` | [THREE.Scene]() | the scene to render |
| `camera` | [THREE.Camera]() | the camera to render |
| `viewId` | _number_ | the internal and unique view id _(do not overwrite)_ |

> `threeMultiViewRenderer.destroyView(view)`

Will destroy the _view_. Once destroyed, it will of course no longer be rendered.

#### provide context

| context name | type | description |
|------|------|-------------|
| `ThreeMultiViewRenderer` | [ThreeMultiViewRenderer](./ThreeMultiViewRenderer.js) | the shadow object itself, offers the **RenderView API** |
