# CHANGELOG

All notable changes to [@spearwolf/shae-offscreen-canvas](https://github.com/spearwolf/shadow-objects/tree/main/packages/shae-offscreen-canvas) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Build-system, monorepo, lint/format, and dev-workflow changes that don't affect the shipped package are tracked in the top-level [`CHANGELOG.md`](../../CHANGELOG.md).

## [Unreleased]

> **Next release: minor.** The package is below `1.0.0`, so the breaking changes below bump the
> minor position — `0.6.0` → `0.7.0`. One reaches only consumers that hand their own template to the
> constructor of `ShaeOffscreenCanvasElement`; the namespace lands on whatever element in that
> template carries the `entity` id, so a template without a placeholder is all it takes. The other
> — `three` moving to `peerDependencies` — reaches every consumer.

- `<shae-offscreen-canvas>` builds its shadow root from a detached template and hands the `ns` attribute to the entity element with `setAttribute()`. A namespace containing `"`, `<` or `>` arrives as the string it is; previously it ended the attribute it was spliced into and the remainder of its value was written into the shadow root as markup, which made anyone binding `ns` from application data reachable through an XSS vector.
- The `initialHTML` argument of the constructor no longer knows a `%NS%` placeholder. A template that still writes `%NS%` into the start tag of the entity element gets an empty attribute of that name out of the HTML parser (`%ns%` in the browsers, `ns` under happy-dom). The namespace reaches the entity element through `setAttribute()` either way, so every template whose entity element carries the `entity` id keeps its namespace, placeholder or not.
- `<shae-offscreen-canvas>` and its `ShaeOffscreenCanvas` shadow object run on the `FrameLoop` of `@spearwolf/shadow-objects` — the element on the shared loop of the process, the shadow object on one of its own, capped by the `fps` attribute as before. The package carried its own second implementation of the class until now, with an event identity of its own (`Symbol.for('onFrame')`), and it kept asking the browser for frames from the first subscriber until the page ended. The loop now stops as soon as no layer listens any more — the shadow object hands its subscription back when it is destroyed, so a torn-down layer stops costing frames — and the first frame after a start reports `deltaTime === 0` instead of `NaN`.
- The published package carries two files less: the second frame loop implementation and its spec are gone. Neither was reachable through the `exports` object of the package.
- The published package carries no spec files at all any more. Its `build.mjs` used to copy `src/` wholesale into the publish-ready package root, so every `*.spec.js` and `*.specs.js` in `src/` shipped alongside the code it tests.
- `ThreeRenderView` hands its render view back exactly once when it is destroyed or its entity changes token. `createView()` and `destroyView()` on `ThreeMultiViewRenderer` now run once apiece per render view, on both paths.
- `ShaeOffscreenCanvas` gives back its view channel when its entity is destroyed. `requestOffscreenCanvas()` called on a destroyed shadow object does nothing — no request reaches a view that is no longer there.
- `<shae-offscreen-canvas>` carries its listeners on the view component only while it is part of the document. An element outside the document answers neither a canvas request nor a lost context; both come back once the element is put back in.
- `[FrameLoop.OnFrame]()` reads no layout. The display size comes from a `ResizeObserver` on the canvas, `devicePixelRatio` from a `matchMedia` query with a change listener, and `fps`/`pixel-zoom` from `attributeChangedCallback` — the frame itself only compares the values these already hold and forwards them.
- `fps` and `pixel-zoom` are observed attributes (`static observedAttributes`); the element reacts to a change the moment it is written, not on the next frame.
- A size change reaches the entity one frame after the browser reports it, not in the same frame as the layout change that caused it.
- The display size that reaches the entity is the content box a `ResizeObserver` reports, not the border box `getBoundingClientRect()` reports. The two differ on a canvas that carries its own border or padding, and on a canvas whose ancestor carries a CSS `transform: scale()` — the reported size is then the untransformed layout box. The canvas element the bundled stylesheet builds carries neither border nor padding, so only the transform case applies to it; a template supplied through the constructor's `initialHTML` argument can style its canvas either way.
- A destroyed `ThreeMultiViewRenderer` calls `dispose()` on its `WebGLRenderer`, gives up `renderer` and `canvas`, and clears its render view collection. `renderView()` answers `undefined` afterwards.
- The subscriptions of `<shae-offscreen-canvas>` belong to the element, whoever put it into the document. `connectedCallback()` runs outside the caller's reactive context, so an `append()` from inside a `createEffect()` of the application no longer hands the view-component effect it sets up to that foreign effect, whose next run used to release it again. That context is suspended, not ignored: a `batch()` the caller has open is flushed before the connect runs, so in `batch(() => { someSignal.set(1); container.append(el); })` the effects of that write now run before the element is appended rather than after the batch closes.
- The `CubeScene` and `TestImage2OnCanvas2D` sample Shadow Objects run their cleanup under the `[onDestroy]` symbol from `@spearwolf/shadow-objects/shadow-objects.js` instead of a plain `onDestroy` method, so it runs.
- `three` is a peer dependency of the package (`>=0.180.0`), installed by the application, so exactly one copy of it stands in the dependency tree. A `npm install @spearwolf/shae-offscreen-canvas` without `three` next to it ends with an unmet peer dependency, and this holds even for a purely `Canvas2D` application: the entry point `./shadow-objects.js` loads `ThreeMultiViewRenderer` statically.
