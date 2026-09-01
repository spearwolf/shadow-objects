# shadow-objects-e2e

Playwright end-to-end test suite for the shadow-objects ecosystem.

This package is not published to npm. It runs full browser tests against a Vite-served app, covering scenarios that require a real page load -- remote worker environments, bundle integrity, multi-entity interactions, and the two error paths: a worker that dies mid-run and a change trail the worker's kernel refuses.

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
| `auto-destruct-dom` | the same flag, set from markup: what reaches the entity, what a DOM removal does, and what the kernel's cascade does |
| `bundle` | the single-file build: entity tree, property type parsing, round-trip through the inlined worker |
| `create-element` | both construction paths: parsed markup and `document.createElement` |
| `worker-failure` | a worker that dies mid-run: proxy failure, lost context, recovery through a new proxy |
| `sync-failure` | a change trail the worker's kernel refuses: `syncfailed`, the refused trail, an environment that keeps running |

### Writing a new page

Wrap the setup in `runTestSuite()` so a crash is reported with its stack instead of timing out,
record results with `testAsyncAction` / `testBooleanAction` / `testCustomEvent`, and register the
ids in a spec with `runPageTests`. When asserting that something did *not* happen, put a
round-trip through the worker in front of it as a barrier — a sync cycle alone only confirms the
change trail went out, not that the answers came back.

## Prerequisites

Playwright browsers must be installed before running the tests:

```bash
pnpm exec playwright install chromium firefox webkit
```

### WebKit on a non-Debian Linux

Playwright ships one Linux WebKit build and it is linked against Ubuntu 24.04 sonames — `libicu`
74 and `libflite` 1. On Arch, Fedora or openSUSE the download succeeds and the browser then
refuses to start, behind a host-dependency banner naming apt packages that do not exist there.

One command settles it:

```bash
pnpm setup:webkit
```

It takes the missing libraries out of `mcr.microsoft.com/playwright:v<version>-noble` — the same
image CI's Ubuntu runner effectively is — and puts them in the browser bundle's own `sys/lib`,
which its launcher already has on `LD_LIBRARY_PATH`. Nothing outside the Playwright browser cache
is touched and no root is needed. Re-run it after `playwright install` replaces the bundle, and
after a `@playwright/test` bump: a new WebKit build may ask for a different ICU major.

`pnpm test` checks the same thing before it starts and names this command instead of letting
Playwright report apt packages. On Ubuntu, macOS and in CI both are a no-op.

## How to run

From inside this package:

```bash
pnpm test
```

To run with the Playwright UI:

```bash
pnpm test:ui
```
