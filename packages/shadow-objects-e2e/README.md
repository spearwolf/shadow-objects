# shadow-objects-e2e

Playwright end-to-end test suite for the shadow-objects ecosystem.

This package is not published to npm. It runs full browser tests against a Vite-served app, covering scenarios that require a real page load -- remote worker environments, bundle integrity, and multi-entity interactions.

## What lives here

- **Remote worker environment tests** -- spinning up a shadow environment in a web worker and verifying it communicates correctly with the view layer
- **Bundle smoke tests** -- loading the published build artifacts in a real browser to catch packaging mistakes early
- **Worker and canvas integration tests** -- exercising the full path from view-layer entities through the worker to rendered output

## Prerequisites

Playwright browsers must be installed before running the tests:

```bash
pnpm exec playwright install chromium firefox
```

## How to run

From the monorepo root:

```bash
pnpm nx run shadow-objects-e2e:e2e
```

Or from inside this package:

```bash
pnpm test
```

To run with the Playwright UI:

```bash
pnpm test:ui
```
