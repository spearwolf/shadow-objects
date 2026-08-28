The entry point `@spearwolf/shae-offscreen-canvas/shadow-objects.js` defines five Shadow Objects:

- [ShaeOffscreenCanvas](#shaeoffscreencanvas)
- [Canvas2D](#canvas2d)
- [CanvasBitmapRenderer](#canvasbitmaprenderer)
- [ThreeMultiViewRenderer](#threemultiviewrenderer)
- [ThreeRenderView](#threerenderview)

### ShaeOffscreenCanvas

Represents an offscreen canvas. However, a _canvas rendering context_ is not created. The [Canvas2D](#canvas2d) and [CanvasBitmapRenderer](#canvasbitmaprenderer) shadow objects should be used for this purpose.

#### provide context

| context name | type | description |
|------|------|-------------|
| `canvas` | [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | the offscreen canvas connected to the canvas element in the main document |
| `canvasSize` | [**width**: _number_, **height**: _number_, **pixelRatio**: _number_] | the size of the canvas element in _device pixels_. i.e. the pixelRatio is already included in the width and height specification. if you want the _css pixels_, divide the width and height by the pixelRatio |
| `ShaeOffscreenCanvas` | [ShaeOffscreenCanvas](../src/shadow-objects/ShaeOffscreenCanvas.js) | the shadow object itself |

The shadow object handed out through the `ShaeOffscreenCanvas` context requests no canvas any more once its entity is destroyed.

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

This shadow object works against the `three` version of the application, which the package requires as a peer dependency.

Creates an offscreen canvas and initializes a [THREE.WebGLRenderer](https://threejs.org/docs/index.html?q=webglrenderer#api/en/renderers/WebGLRenderer).
Provides an API to create and render multiple rendering views:

#### RenderView API

> `threeMultiViewRenderer.createView(width, height)` &rarr; _RenderView_

Creates a new _RenderView_ structure. Once created, the _view_ is rendered automatically with one of the next frames. however, the user has to set a scene and a camera for this. the view structure can be adjusted at any time (e.g. `width` and `height` or `scene` and `camera` can be changed at any time if you want).

##### RenderView Structure

| property | type | description |
|----------|------|-------------|
| `width` | _number_ | canvas width (real pixels) |
| `height` | _number_ | canvas height (real pixels) |
| `viewport` | `[x: number, y: number, width: number, height: number]` | _(optional)_ the [WebGL viewport](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/viewport), default is `[0, 0, width, height]` |
| `scene` | [THREE.Scene](https://threejs.org/docs/index.html?q=scene#api/en/scenes/Scene) | the scene to render |
| `camera` | [THREE.Camera](https://threejs.org/docs/index.html?q=camera#api/en/cameras/Camera) | the camera to render |
| `viewId` | _number_ | the internal and unique view id _(do not overwrite)_ |

> `threeMultiViewRenderer.destroyView(view)`

Will destroy the _view_. Once destroyed, it will of course no longer be rendered. Takes the _view_ structure or its bare `viewId`; handed `undefined` or `null` it destroys nothing.

> `threeMultiViewRenderer.updateSize()`

Sizes the shared canvas so that it holds the largest view of this renderer, and never below 320x240. `renderView()` calls it before it draws, so a view whose `width` or `height` was changed is drawn at its new size with the next render either way.

Every view of one renderer draws with the same `WebGLRenderer` onto the same canvas, and reading a drawn frame back off that canvas is asynchronous. `renderView()` takes its turn accordingly: one view is drawn and read out at a time, in the order the calls arrived.

When the entity ends, the renderer releases its WebGL context. `renderView()` answers `undefined` from that point on, and `updateSize()` returns without sizing anything.

#### provide context

| context name | type | description |
|------|------|-------------|
| `ThreeMultiViewRenderer` | [ThreeMultiViewRenderer](../src/shadow-objects/ThreeMultiViewRenderer.js) | the shadow object itself, offers the **RenderView API** |

[ThreeRenderView](#threerenderview) is what drives this API for a single entity: it takes one view, keeps it at the size of the canvas and has it rendered again with the next frame after the previous frame of that view has come back.


### ThreeRenderView

The _ThreeRenderView_ shadow object owns one _RenderView_ of a [ThreeMultiViewRenderer](#threemultiviewrenderer) and transfers what that renderer draws into the [ImageBitmapRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) a [CanvasBitmapRenderer](#canvasbitmaprenderer) provides. It publishes the view as a context, so that other shadow objects on the same entity or below it set its `scene` and `camera`.

The renderer is not part of the entity: it has to be in reach through the context, on the same entity or above it, and one renderer serves any number of render views. The rendering context comes with the token: the package routes `ThreeRenderView` to `CanvasBitmapRenderer` and `ThreeRenderView` together, so an entity carrying that token has both.

#### provide context

| context name | type | description |
|------|------|-------------|
| `ThreeRenderView` | [RenderView](#renderview-structure) | the render view of this entity. `undefined` for as long as no renderer or no canvas size is in reach |

#### use context

| context name | type | description |
|------|------|-------------|
| `ThreeMultiViewRenderer` | [ThreeMultiViewRenderer](#threemultiviewrenderer) | the renderer that creates, draws and destroys the view |
| `ImageBitmapRenderingContext` | [ImageBitmapRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmapRenderingContext) | the rendering context the drawn frame is transferred into |
| `canvasSize` | [**width**: _number_, **height**: _number_, **pixelRatio**: _number_] | the view takes its width and height from here, in _device pixels_, and follows every change |

#### local entity events

The shadow object listens to the `onFrame` event of its entity at `Priority.Low`, so that a shadow object setting `scene` and `camera` for this frame has run before it. It renders the view, transfers the resulting [ImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap) into the `ImageBitmapRenderingContext` and closes it. A frame the renderer answers with no image transfers nothing. One frame per view is in flight at a time: a frame that arrives while the render of the previous one is still open passes without rendering.

The view goes back to the renderer through `destroyView()` exactly once — when the shadow object is torn down, and when the renderer leaves the context.
