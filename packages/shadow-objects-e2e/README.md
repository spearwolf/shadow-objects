# shadow-objects-e2e

Playwright end-to-end test suite for the shadow-objects ecosystem.

This package is not published to npm. It runs full browser tests against a Vite-served app, covering scenarios that require a real page load -- remote worker environments, bundle integrity, and multi-entity interactions.

## What lives here

Each page in `pages/` runs its own checks and records them as `data-testresult` nodes; the specs
in `tests/` turn those into one Playwright test per id via `runPageTests`. See
[`TEST-PLAN.md`](TEST-PLAN.md) for the coverage analysis and [`KNOWN-DEFECTS.md`](KNOWN-DEFECTS.md)
for the mechanism to track framework defects as expected failures.

| Page | Covers |
|---|---|
| `multi-env` | three environments in parallel — property sync, message routing, namespace isolation, cross-namespace nesting |
| `dynamic-dom` | entities and property elements inserted, moved and removed at runtime |
| `upgrade-timing` | markup parsed before the custom element definitions load |
| `async-events` | message round-trips in both directions, `traverseChildren`, `forward-custom-events`, what `auto-sync` controls |
| `remote-worker-env` | the programmatic `ShadowEnv` + `RemoteWorkerEnv` path |
| `shae-worker` | `<shae-worker>` in remote and local flavour, context lifecycle events |
| `auto-destruct` | `autoDestructionOnParentRemoval` cascade over a real worker |
| `bundle` | the single-file build: entity tree, property type parsing, round-trip through the inlined worker |
| `create-element` | both construction paths: parsed markup and `document.createElement` |
| `worker-failure` | a worker that dies mid-run: proxy failure, lost context, recovery through a new proxy |
| `sync-failure` | a change trail the worker's kernel refuses: `syncfailed`, the lost trail, an environment that keeps running |

### Writing a new page

Wrap the setup in `runTestSuite()` so a crash is reported with its stack instead of timing out,
record results with `testAsyncAction` / `testBooleanAction` / `testCustomEvent`, and register the
ids in a spec with `runPageTests`. When asserting that something did *not* happen, put a
round-trip through the worker in front of it as a barrier — a sync cycle alone only confirms the
change trail went out, not that the answers came back.

## Prerequisites

Playwright browsers must be installed before running the tests:

```bash
pnpm exec playwright install chromium firefox
```

## How to run

From inside this package:

```bash
pnpm test
```

To run with the Playwright UI:

```bash
pnpm test:ui
```
