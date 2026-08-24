# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the authoritative agent guide for architecture, mental model, and contribution rules — read it first. This file only adds Claude-Code-specific operational notes.

## Toolchain at a glance

| Concern | Tool |
|---|---|
| Package manager | `pnpm` 11 (workspaces + `catalog:` for version SSOT) |
| Monorepo orchestrator | `turborepo` 2.10 (`turbo.json` defines the pipeline) |
| TypeScript | `tsc` 7.x — only used to emit `.d.ts` |
| Bundler / transpiler | `esbuild` 0.28 (lib transpile + single-file bundle) |
| Unit / integration tests | `vitest` 4 (happy-dom for unit, `@vitest/browser` + Playwright provider for DOM-integration, `@vitest/coverage-v8` for coverage) |
| E2E | `@playwright/test` 1.62 |
| Lint + format | `biome` 2.5 (replaces eslint + prettier) |
| Dev server | `vite` 7 (only `shae-offscreen-canvas` demo and `shadow-objects-e2e`) |

Versions live exclusively in `pnpm-workspace.yaml` (`catalog:` block). Reference them from each package as `"<dep>": "catalog:"` — never write a plain version range in a per-package `package.json`. A range that is not an install pin — today only the `three` peer dependency of `shae-offscreen-canvas` — lives in a named catalog under a `catalogs:` block and is referenced as `"<dep>": "catalog:<name>"`.

Two entries in that file are deliberate holdbacks, each with the reason in a comment above it. Don't "fix" them by bumping to latest:

- **`overrides: {vite: ^7.3.6}`** — Vite 8 swapped esbuild for Rolldown/Oxc, and Oxc does not lower native decorators. `SignalsPath.ts` and `ShadowEnv.ts` use `@signal … accessor`, so under Vite 8 five spec files fail with `SyntaxError: Invalid or unexpected token`. vitest resolves its own vite (`^6 || ^7 || ^8`) regardless of the catalog, hence an override rather than a catalog pin.
- **`turbo: ^2.10.9`** — pnpm 11 defaults `minimumReleaseAge` to one day and re-applies it to every lockfile entry on install, so a lockfile pinning a release younger than that fails `--frozen-lockfile` on a clean runner.

**`@spearwolf/eventize` and `@spearwolf/signalize` are bumped together, never separately.** signalize peers on exactly one eventize major (`1.0.x` on `^6.0.0`), and both key their internal slots with realm-wide symbols — `Symbol.for('eventize')` and the `@spearwolf/signalize/` keys. Two majors of either resolved side by side therefore share one slot per object: eventize 6 throws a `TypeError` naming both protocols, signalize 1.0 builds two graphs that recognise nothing of each other. After a bump, `pnpm why -r @spearwolf/eventize` must report exactly one version. The signalize entry is pinned version-exact while it is a beta, and `minimumReleaseAgeExclude` carries whatever release is younger than pnpm's one-day cutoff.

**pnpm 11 specifics.** Dependency build scripts are refused unless listed in `allowBuilds` (`strictDepBuilds` is on by default) — currently just `esbuild`. `.npmrc` is auth/registry only; every pnpm setting belongs in `pnpm-workspace.yaml`. The `packageManager` field in `package.json` decides which pnpm actually runs.

## Commands

Run from the repo root (turbo coordinates per-package scripts):

| Command | Purpose |
|---|---|
| `pnpm cbt` | Clean + build + test the whole workspace (full local cycle) |
| `pnpm build` / `pnpm test` / `pnpm typecheck` | `turbo run …` over all packages |
| `pnpm test:ci` | All tests except `shadow-objects-e2e` (Playwright) |
| `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome `check` / `check --write` / `format --write` |
| `pnpm lint:ci` | Biome `check` with `--error-on-warnings` — exits 1 on any warning, unlike `pnpm lint` |
| `pnpm dev` (alias `pnpm start`) | Dev server for the `shae-offscreen-canvas` demo |
| `pnpm clean` | `turbo run clean` + remove `dist/`, turbo cache |
| `pnpm make:todo` | Regenerate `TODO.md` from TODO comments — required if you add/change/remove a `TODO` |
| `pnpm publishNpmPkg` | Publish all packages with a `publishNpmPkg` script |

Per-package commands (`pnpm -F <pkg-name> <script>` or `cd` and `pnpm <script>`):

- **`packages/shadow-objects`** (core lib, TS):
  - `pnpm build` — runs `node build.mjs`. One script: esbuild transpile (`src/**` → `dist/src/**`) + tsc emit-only declarations (`tsconfig.lib.json`) + esbuild bundle with inline-worker (`dist/src/bundle.js` → `dist/bundle.js`) + `scripts/makePackageJson.mjs` (writes `dist/package.json`).
  - `pnpm test` — `vitest --run --coverage`. Specs are `*.spec.ts` next to source in `src/`; vitest reads them directly via vite/esbuild — **no precompile step**. The v8 coverage report lands in `packages/shadow-objects/coverage/` — a text summary in the console, an HTML report on disk. `pnpm watch` and a single-file run leave it out. Single test: `pnpm exec vitest src/path/to/File.spec.ts --run`. Watch: `pnpm watch`. `src/distContract.spec.ts` needs a built `dist/` — `turbo` provides it via `tasks.test.dependsOn`, a direct `pnpm watch` needs a manual build first.
  - `pnpm typecheck` — `tsc -p tsconfig.json --noEmit` (whole tree, including specs).
- **`packages/shadow-objects-testing`** (functional/integration, vitest browser mode + Playwright provider): `pnpm test`, watch `pnpm watch`. Specs are `test/**/*.test.js` and run in real Chromium for accurate Custom Elements semantics. Chai assertion style is preserved (`@esm-bundle/chai`); `describe`/`it`/`beforeEach`/`afterEach` come from vitest globals (with `after`/`before` shimmed for legacy mocha specs).
- **`packages/shae-offscreen-canvas`** (vitest happy-dom): `pnpm test` — `vitest --run --coverage`, report in `packages/shae-offscreen-canvas/coverage/`. Dev server: `pnpm dev`. Build (publish bundle): `pnpm build`. `src/distContract.spec.js` needs a built `.npm-pkg` — `turbo` provides it via `tasks.test.dependsOn`, a direct `pnpm watch` needs a manual build first.
- **`packages/shadow-objects-e2e`** (Playwright + Vite): `pnpm test`, UI mode `pnpm test:ui`. **First-time setup requires** `pnpm exec playwright install chromium firefox` — browsers are not installed by `pnpm install`.

**Coverage.** `@vitest/coverage-v8` measures `packages/shadow-objects` and `packages/shae-offscreen-canvas`; the report lands in `coverage/` inside each of them. No thresholds are configured — read the number, don't gate on it. `packages/shadow-objects-testing` is left out: it runs as its own vitest project, with its own browser-mode Chromium run and its own `reportsDirectory`. A coverage run there would produce a second report over the same `packages/shadow-objects/src/` files as the core package's report — the two don't add up on their own, and merging them into one number is work this package doesn't do. The core package's number understates what the workspace actually exercises by exactly that suite. `packages/shadow-objects-e2e` is Playwright, not vitest, and needs a different mechanism entirely.

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
4. `scripts/makePackageJson.mjs` writes `dist/package.json` (resolves `workspace:*`, `catalog:` and `catalog:<name>` refs, applies `package.override.json`, strips the `dist/` prefix from `exports`/`main`/`module`/`types`).

The published `dist/` layout is part of the public API contract — its file list and `dist/package.json` shape must stay stable. `src/distContract.spec.ts` holds both against a recorded expectation, `src/distContract.files.txt` (the sorted file list) and `src/distContract.package.json` (top-level keys, entry points, `exports`, `sideEffects`, dependency names); a change that adds, removes or renames a file under `dist/`, or reshapes `dist/package.json`, has to update both expectation files and a `CHANGELOG.md` entry in the same change. To see what a change does to the output, diff `find packages/shadow-objects/dist -type f | sort` and `packages/shadow-objects/dist/package.json` against a build of the previous commit.

## Changelogs and Backlog — keep them in sync

Three changelogs live in this repo and must be kept current as part of every change that touches them:

- **`CHANGELOG.md` (repo root)** — *monorepo-level* changes: build system, monorepo orchestrator, lint/format, dev workflow, CI, devDependencies that aren't shipped. Entries are dated (no version numbers — this isn't a published package).
- **`packages/shadow-objects/CHANGELOG.md`** — *package-level* changes: runtime API, runtime dependencies, behavior changes, output/contract changes for `@spearwolf/shadow-objects`. New work goes under `## [Unreleased]` until a release. Each released version gets a `## [X.Y.Z] - YYYY-MM-DD` section.
- **`packages/shae-offscreen-canvas/CHANGELOG.md`** — *package-level* changes: runtime API, runtime dependencies, behavior changes, output/contract changes for `@spearwolf/shae-offscreen-canvas`. Same layout: new work under `## [Unreleased]`, a `## [X.Y.Z] - YYYY-MM-DD` section per release.

When you make a change, decide where it belongs:

| Change touches… | Goes in… |
|---|---|
| `src/`, runtime deps, `dist/` shape, public exports, behavior visible to consumers of `@spearwolf/shadow-objects` | `packages/shadow-objects/CHANGELOG.md` (Unreleased) |
| `packages/shae-offscreen-canvas/src/`, behavior visible to consumers of `@spearwolf/shae-offscreen-canvas` | `packages/shae-offscreen-canvas/CHANGELOG.md` (Unreleased) |
| Build pipeline, test runner, lint config, turbo/pnpm setup, devDeps, monorepo scripts | root `CHANGELOG.md` (new dated section, or append to today's) |
| More than one of them | every file it touches — describe each side from its own perspective, don't duplicate |

The remaining workspace packages (`shadow-objects-testing`, `shadow-objects-e2e`) are `private` and keep no changelog. A package that starts to be published gets one and follows the same split.

**Keep entries short and precise.** One bullet per change, name the symbol/file/feature, link to a commit if non-obvious. Don't restate the diff.

After updating the changelogs, **sync `Backlog.md`**: cross off or remove items the change resolved, update sections that became stale (e.g. dependency-version snapshots, tooling lists). The Backlog is a living working document, not an audit log — outdated items should leave, not just be marked "done".

## Conventions that bite

- **Documentation is part of the public API contract.** A public API change must update the `docs/`, the `README.md` **and** the `CHANGELOG.md` of the package it belongs to, in the same change — `packages/shadow-objects/` for the core library, `packages/shae-offscreen-canvas/` for the canvas element. `AGENTS.md` §4 lists this; it is enforced.
- **Banned analogies**: "shadow theater", "puppet", "puppeteer", "light world", "screen". Use ECS terminology (Entity, Component, Kernel, View, Token).
- All docs and code comments in English, Markdown for docs.
- Lint + format are Biome only — config lives at repo root (`biome.json`). No per-package overrides.
- Dependency versions live in `pnpm-workspace.yaml` `catalog:`. Reference as `"<dep>": "catalog:"` from package.json. Don't pin versions per package. A range that is not an install pin lives in a named catalog under `catalogs:` and is referenced as `"<dep>": "catalog:<name>"`.
- `.worktrees/` is gitignored and used for parallel work; don't clean it up casually.

## When unsure

- After modifying source or docs, re-check `AGENTS.md` for staleness — it's expected to be updated alongside the code, not retrofitted later.
- Turbo's task graph and caching is defined in `turbo.json`. If a build/test task seems to be reading stale artifacts, run with `--force` to bypass cache or `pnpm clean` to nuke.
- Two packages carry their own `turbo.json` (`shadow-objects-testing`, `shadow-objects-e2e`). Each is a package configuration with `extends: ["//"]` that overrides a single field — the `test` task's `outputs`, because neither writes the `coverage/**` the root task declares. Field-level merge applies: `dependsOn` and `inputs` still come from the root. A task whose outputs are declared but never written makes turbo print `no output files found for task …`; a task that writes files it never declares silently loses them on a cache hit.
