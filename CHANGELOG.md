# Monorepo Changelog

Top-level changes that are not tied to a single published package — build system, monorepo orchestration, lint/format, dev workflow. Per-package runtime and API changes live in each package's own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-05-09 — Build-system renewal

- **Monorepo orchestrator:** replaced `nx` 19 with `turborepo` 2.9. Removed `nx.json` and all per-package `project.json` files. Pipeline now in `turbo.json`.
- **Lint + format:** replaced `eslint` 8 + `prettier` 3 (and 9 plugins) with `biome` 2.4. Single config at `biome.json`. Removed `.eslintrc.json`, `.eslintignore`, `.prettierrc`, `.prettierignore`.
- **Dependency-version SSOT:** introduced pnpm `catalog:` (in `pnpm-workspace.yaml`). All workspace `package.json` files reference shared deps via `"<dep>": "catalog:"`. The `makePackageJson.mjs` publish helper resolves `catalog:` refs alongside `workspace:*`.
- **TypeScript:** bumped to 6.0. Dropped deprecated `baseUrl` and `downlevelIteration` from the root `tsconfig.json`.
- **Build:** unified `packages/shadow-objects` build into a single `build.mjs` (esbuild transpile + tsc emit-only declarations + esbuild inline-worker bundle + makePackageJson). Removed `tsconfig.bundle.json`, `tsconfig.tests.json`, `bundle.mjs`, the `run-s`/`rimraf` script chain, and the intermediate `build/` directory.
- **Test runners:** consolidated on `vitest` 4.
  - Core lib (`shadow-objects`): vitest reads `*.spec.ts` directly (no precompile step). Removed the generated `tests/` tree.
  - Integration (`shadow-objects-testing`): switched from `@web/test-runner` to `vitest` browser mode with the Playwright provider (real Chromium for accurate Custom Elements semantics). Chai assertion style preserved via `@esm-bundle/chai`.
  - Canvas (`shae-offscreen-canvas`): switched from `@web/test-runner` to `vitest` + happy-dom.
  - Shared `vitest.setup.ts` patches Node 24+'s inert `localStorage`/`sessionStorage` globals (which shadow happy-dom's working Storage) and shims mocha's `after`/`before` to vitest's `afterAll`/`beforeAll` for migrated specs.
- **Tooling bumps:** `esbuild` 0.27 → 0.28, `@playwright/test` 1.58 → 1.59, `happy-dom` 14 → 20, added `jsdom` 29 as backup env.
- **Dropped devDeps:** `nx`, `@nx/*`, `eslint*`, `@typescript-eslint/*`, `prettier*`, `npm-run-all`, `@rollup/plugin-node-resolve`, `react`, `@types/react`, `@web/test-runner` (workspace-wide).

### Verification

- `dist/` of `@spearwolf/shadow-objects` is byte-compatible with the previous version (file list identical except for the removal of an accidentally-published `tsconfig.lib.tsbuildinfo`; `dist/package.json` byte-identical). Snapshots: `docs/superpowers/specs/dist-snapshot.txt`, `docs/superpowers/specs/dist-package.json.snapshot`.
- Cold full cycle (`pnpm cbt`): ~7.6 s for clean + build + test + e2e (7 turbo tasks, 191 unit/integration + 32 e2e). Warm cache: ~70 ms (FULL TURBO).
- Design doc: `docs/superpowers/specs/2026-05-09-build-system-renewal-design.md`.
