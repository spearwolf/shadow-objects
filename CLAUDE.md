# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the authoritative agent guide for architecture, mental model, and contribution rules — read it first. This file only adds Claude-Code-specific operational notes.

## Commands

Run from the repo root (nx coordinates per-package scripts):

| Command | Purpose |
|---|---|
| `pnpm cbt` | Clean + build + test the whole workspace (full local cycle) |
| `pnpm build` / `pnpm lint` / `pnpm test` | nx `run-many` over all packages |
| `pnpm test:ci` | All tests except `shadow-objects-e2e` (Playwright) |
| `pnpm test:affected` | nx `affected -t test` against `main` |
| `pnpm start` | Dev server for the `shae-offscreen-canvas` demo |
| `pnpm clear-cache` | `nx reset` + clean (use when nx cache acts up) |
| `pnpm make:todo` | Regenerate `TODO.md` from TODO comments — required if you add/change/remove a `TODO` |

Per-package commands (from inside the package dir, or via `pnpm nx run <project>:<target>`):

- **`packages/shadow-objects`** (core lib, `vitest`):
  - `pnpm test` runs `compile:tests` (tsc → `tests/`) then `vitest tests/src --run`. Specs live as `*.spec.ts` next to source in `src/`; vitest never sees the `.ts` directly — it runs the compiled `.js` under `tests/src/`. **A single test:** `pnpm compile:tests && pnpm exec vitest tests/src/path/to/File.spec.js --run`. Watch mode: drop `--run`.
  - Build pipeline (`pnpm build`) is multi-step: `compile:lib` (lib tsconfig) → `compile:bundle` (bundle tsconfig) → `bundle` (esbuild via `bundle.mjs`) → `makePackageJson` (writes `dist/package.json` via `scripts/makePackageJson.mjs`). Editing build behavior usually means touching one of those, not the package script.
- **`packages/shadow-objects-testing`** (functional/integration, `@web/test-runner`): `pnpm test`, watch via `pnpm watch`. Specs are `test/**/*.test.js`.
- **`packages/shae-offscreen-canvas`** (`@web/test-runner` on port 8001): `pnpm test`, dev server `pnpm dev`.
- **`packages/shadow-objects-e2e`** (Playwright): `pnpm test`, UI mode `pnpm test:ui`. **First-time setup requires** `pnpm exec playwright install chromium firefox` from inside this package — browsers are not installed by `pnpm install`.

Three different test runners coexist by design: vitest (core lib), web-test-runner (browser-side functional + canvas), Playwright (E2E). Don't try to unify them.

## Architecture pointers

The conceptual model (ECS, Kernel, Entities, Shadow Objects, View Layer, data-flow directions) is described in `AGENTS.md` §2 and the docs at `packages/shadow-objects/docs/`. Skim those before non-trivial changes — the terminology constraints are enforced (see `AGENTS.md` §4 "Terminology").

Code layout inside `packages/shadow-objects/src/` worth knowing up front:

- `view/` — main-thread side. `ShadowEnv` is the env facade; `LocalShadowObjectEnv` runs shadow objects in-process, `RemoteWorkerEnv` proxies them to a worker. `ComponentContext`, `ComponentMemory`, `ComponentChanges`, `ViewComponent` form the bridge from DOM/View to entities.
- `worker/` — `WorkerRuntime` + `MessageRouter` are the worker-side counterpart that drives entities and shadow objects when the env runs off-thread.
- `elements/` — custom elements (`<shae-ent>`, `<shae-prop>`, `<shae-worker>`) that wire DOM nodes into the shadow env.
- `index.ts` is the single public entry point — anything not re-exported from there is internal.

`view/` ↔ `worker/` are mirror images linked by an async message protocol. When changing one side, check the other. `IShadowObjectEnvProxy.ts` is the contract.

Reactivity is `@spearwolf/signalize` (signals/effects) and `@spearwolf/eventize` (event emitters). Both are first-party deps from the same author — prefer them over hand-rolled equivalents.

## Conventions that bite

- **Documentation is part of the public API contract.** Public API changes must update `packages/shadow-objects/docs/`, the package `README.md`, **and** `CHANGELOG.md` in the same change. `AGENTS.md` §4 lists this; it is enforced.
- **Banned analogies**: "shadow theater", "puppet", "puppeteer", "light world", "screen". Use ECS terminology (Entity, Component, Kernel, View, Token).
- All docs and code comments in English, Markdown for docs.
- ESLint is configured at the repo root (`.eslintrc.json` + `.eslintignore`). nx `lint` honors both — don't add per-package ESLint configs.
- `.worktrees/` is gitignored and used for parallel work; don't clean it up casually.

## When unsure

- For nx workspace questions, prefer `nx`/`nx_workspace`/`nx_project_details` over guessing config.
- After modifying source or docs, re-check `AGENTS.md` for staleness — it's expected to be updated alongside the code, not retrofitted later.
