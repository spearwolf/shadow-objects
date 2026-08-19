# CHANGELOG

All notable changes to [@spearwolf/shae-offscreen-canvas](https://github.com/spearwolf/shadow-objects/tree/main/packages/shae-offscreen-canvas) will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Build-system, monorepo, lint/format, and dev-workflow changes that don't affect the shipped package are tracked in the top-level [`CHANGELOG.md`](../../CHANGELOG.md).

## [Unreleased]

> **Next release: minor.** The package is below `1.0.0`, so the breaking change below bumps the
> minor position — `0.6.0` → `0.7.0`. It reaches only consumers that hand their own template to the
> constructor of `ShaeOffscreenCanvasElement`; the namespace lands on whatever element in that
> template carries the `entity` id, so a template without a placeholder is all it takes.

- `<shae-offscreen-canvas>` builds its shadow root from a detached template and hands the `ns` attribute to the entity element with `setAttribute()`. A namespace containing `"`, `<` or `>` arrives as the string it is; previously it ended the attribute it was spliced into and the remainder of its value was written into the shadow root as markup, which made anyone binding `ns` from application data reachable through an XSS vector.
- The `initialHTML` argument of the constructor no longer knows a `%NS%` placeholder. A template that still writes `%NS%` into the start tag of the entity element gets an empty attribute of that name out of the HTML parser (`%ns%` in the browsers, `ns` under happy-dom). The namespace reaches the entity element through `setAttribute()` either way, so every template whose entity element carries the `entity` id keeps its namespace, placeholder or not.
