# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the authoritative agent guide for architecture, mental model, and contribution rules — read it first. This file only adds Claude-Code-specific operational notes.

## Toolchain at a glance

| Concern | Tool |
|---|---|
| Package manager | `pnpm` (workspaces + `catalog:` for version SSOT) |
| Monorepo orchestrator | `turborepo` (`turbo.json` defines the pipeline) |
| TypeScript | `tsc` 6.x — only used to emit `.d.ts` |
| Bundler / transpiler | `esbuild` 0.28 (lib transpile + single-file bundle) |
| Unit / integration tests | `vitest` 4 (happy-dom for unit, `@vitest/browser` + Playwright provider for DOM-integration) |
| E2E | `@playwright/test` 1.59 |
| Lint + format | `biome` 2.4 (replaces eslint + prettier) |
| Dev server | `vite` (only `shae-offscreen-canvas` demo and `shadow-objects-e2e`) |

Versions live exclusively in `pnpm-workspace.yaml` (`catalog:` block). Reference them from each package as `"<dep>": "catalog:"` — never write a plain version range in a per-package `package.json`.

## Commands

Run from the repo root (turbo coordinates per-package scripts):

| Command | Purpose |
|---|---|
| `pnpm cbt` | Clean + build + test the whole workspace (full local cycle) |
| `pnpm build` / `pnpm test` / `pnpm typecheck` | `turbo run …` over all packages |
| `pnpm test:ci` | All tests except `shadow-objects-e2e` (Playwright) |
| `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome `check` / `check --write` / `format --write` |
| `pnpm dev` (alias `pnpm start`) | Dev server for the `shae-offscreen-canvas` demo |
| `pnpm clean` | `turbo run clean` + remove `dist/`, turbo cache |
| `pnpm make:todo` | Regenerate `TODO.md` from TODO comments — required if you add/change/remove a `TODO` |
| `pnpm publishNpmPkg` | Publish all packages with a `publishNpmPkg` script |

Per-package commands (`pnpm -F <pkg-name> <script>` or `cd` and `pnpm <script>`):

- **`packages/shadow-objects`** (core lib, TS):
  - `pnpm build` — runs `node build.mjs`. One script: esbuild transpile (`src/**` → `dist/src/**`) + tsc emit-only declarations (`tsconfig.lib.json`) + esbuild bundle with inline-worker (`dist/src/bundle.js` → `dist/bundle.js`) + `scripts/makePackageJson.mjs` (writes `dist/package.json`).
  - `pnpm test` — `vitest --run`. Specs are `*.spec.ts` next to source in `src/`; vitest reads them directly via vite/esbuild — **no precompile step**. Single test: `pnpm exec vitest src/path/to/File.spec.ts --run`. Watch: `pnpm watch`.
  - `pnpm typecheck` — `tsc -p tsconfig.json --noEmit` (whole tree, including specs).
- **`packages/shadow-objects-testing`** (functional/integration, vitest browser mode + Playwright provider): `pnpm test`, watch `pnpm watch`. Specs are `test/**/*.test.js` and run in real Chromium for accurate Custom Elements semantics. Chai assertion style is preserved (`@esm-bundle/chai`); `describe`/`it`/`beforeEach`/`afterEach` come from vitest globals (with `after`/`before` shimmed for legacy mocha specs).
- **`packages/shae-offscreen-canvas`** (vitest happy-dom): `pnpm test`. Dev server: `pnpm dev`. Build (publish bundle): `pnpm build`.
- **`packages/shadow-objects-e2e`** (Playwright + Vite): `pnpm test`, UI mode `pnpm test:ui`. **First-time setup requires** `pnpm exec playwright install chromium firefox` — browsers are not installed by `pnpm install`.

Vitest shares a single `setupFiles` between core, integration, and offscreen-canvas: `packages/shadow-objects/vitest.setup.ts`. It (a) replaces Node's inert `localStorage`/`sessionStorage` globals (Node 24+ ships these as no-op stubs that shadow happy-dom's working Storage), and (b) shims mocha's `after`/`before` to vitest's `afterAll`/`beforeAll` for migrated specs.

## Architecture pointers

The conceptual model (ECS, Kernel, Entities, Shadow Objects, View Layer, data-flow directions) is described in `AGENTS.md` §2 and the docs at `packages/shadow-objects/docs/`. Skim those before non-trivial changes — the terminology constraints are enforced (see `AGENTS.md` §4 "Terminology").

Code layout inside `packages/shadow-objects/src/` worth knowing up front:

- `view/` — main-thread side. `ShadowEnv` is the env facade; `LocalShadowObjectEnv` runs shadow objects in-process, `RemoteWorkerEnv` proxies them to a worker. `ComponentContext`, `ComponentMemory`, `ComponentChanges`, `ViewComponent` form the bridge from DOM/View to entities.
- `worker/` — `WorkerRuntime` + `MessageRouter` are the worker-side counterpart that drives entities and shadow objects when the env runs off-thread.
- `elements/` — custom elements (`<shae-ent>`, `<shae-prop>`, `<shae-worker>`) that wire DOM nodes into the shadow env.
- `index.ts` is the single public entry point — anything not re-exported from there is internal.

`view/` ↔ `worker/` are mirror images linked by an async message protocol. When changing one side, check the other. `IShadowObjectEnvProxy.ts` is the contract.

Reactivity is `@spearwolf/signalize` (signals/effects) and `@spearwolf/eventize` (event emitters). Both are first-party deps from the same author — prefer them over hand-rolled equivalents.

## Build pipeline notes (`packages/shadow-objects/build.mjs`)

Three stages, all in one Node script:

1. **Lib transpile** — esbuild with `bundle: false`, glob `src/**/*.{ts,js}` (specs excluded), `outdir: dist/src`. Preserves the source layout so deep imports like `@spearwolf/shadow-objects/shae-ent.js` resolve to `dist/src/shae-ent.js`.
2. **Types** — `tsc -p tsconfig.lib.json` with `emitDeclarationOnly: true`. Same outdir.
3. **Bundle** — esbuild with `bundle: true` on `dist/src/bundle.js` (the *transpiled* entry, not `src/bundle.ts`, so the package.json `sideEffects` array — which references `dist/src/*.js` paths — keeps the side-effect imports from being tree-shaken). Two custom resolvers swap `create-worker.js` → `create-worker.bundle.js` (the inlined-blob variant) and route the virtual `./bundle.worker.js` import to `dist/src/shadow-objects.worker.js`. The `esbuild-plugin-inline-worker` then bundles + base64-inlines that worker.
4. `scripts/makePackageJson.mjs` writes `dist/package.json` (resolves `workspace:*` and `catalog:` refs, applies `package.override.json`, strips the `dist/` prefix from `exports`/`main`/`module`/`types`).

The published `dist/` layout is part of the public API contract — its file list and `dist/package.json` shape must stay stable. Snapshots used for verification: `docs/superpowers/specs/dist-snapshot.txt` and `docs/superpowers/specs/dist-package.json.snapshot`.

## Changelogs and Backlog — keep them in sync

Two changelogs live in this repo and must be kept current as part of every change that touches them:

- **`CHANGELOG.md` (repo root)** — *monorepo-level* changes: build system, monorepo orchestrator, lint/format, dev workflow, CI, devDependencies that aren't shipped. Entries are dated (no version numbers — this isn't a published package).
- **`packages/shadow-objects/CHANGELOG.md`** — *package-level* changes: runtime API, runtime dependencies, behavior changes, output/contract changes for `@spearwolf/shadow-objects`. New work goes under `## [Unreleased]` until a release. Each released version gets a `## [X.Y.Z] - YYYY-MM-DD` section.

When you make a change, decide where it belongs:

| Change touches… | Goes in… |
|---|---|
| `src/`, runtime deps, `dist/` shape, public exports, behavior visible to consumers of `@spearwolf/shadow-objects` | `packages/shadow-objects/CHANGELOG.md` (Unreleased) |
| Build pipeline, test runner, lint config, turbo/pnpm setup, devDeps, monorepo scripts | root `CHANGELOG.md` (new dated section, or append to today's) |
| Both | both files — describe each side from its own perspective, don't duplicate |

Other affected packages (`shae-offscreen-canvas`, etc.) don't currently maintain their own changelog. If they start to be published independently, add one and follow the same split.

**Keep entries short and precise.** One bullet per change, name the symbol/file/feature, link to a commit if non-obvious. Don't restate the diff.

After updating the changelogs, **sync `Backlog.md`**: cross off or remove items the change resolved, update sections that became stale (e.g. dependency-version snapshots, tooling lists). The Backlog is a living working document, not an audit log — outdated items should leave, not just be marked "done".

## Conventions that bite

- **Documentation is part of the public API contract.** Public API changes must update `packages/shadow-objects/docs/`, the package `README.md`, **and** `packages/shadow-objects/CHANGELOG.md` in the same change. `AGENTS.md` §4 lists this; it is enforced.
- **Banned analogies**: "shadow theater", "puppet", "puppeteer", "light world", "screen". Use ECS terminology (Entity, Component, Kernel, View, Token).
- All docs and code comments in English, Markdown for docs.
- Lint + format are Biome only — config lives at repo root (`biome.json`). No per-package overrides.
- Dependency versions live in `pnpm-workspace.yaml` `catalog:`. Reference as `"<dep>": "catalog:"` from package.json. Don't pin versions per package.
- `.worktrees/` is gitignored and used for parallel work; don't clean it up casually.

## When unsure

- After modifying source or docs, re-check `AGENTS.md` for staleness — it's expected to be updated alongside the code, not retrofitted later.
- Turbo's task graph and caching is defined in `turbo.json`. If a build/test task seems to be reading stale artifacts, run with `--force` to bypass cache or `pnpm clean` to nuke.
