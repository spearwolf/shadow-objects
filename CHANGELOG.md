# Monorepo Changelog

Top-level changes that are not tied to a single published package — build system, monorepo orchestration, lint/format, dev workflow. Per-package runtime and API changes live in each package's own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-08-16 — exclude generated audit reports and clear stale Playwright artifacts

- **`biome.json`:** audit reports (`*audit*.html`) are excluded from lint checks — they are generated snapshots of the audit process, not project code.
- **`packages/shadow-objects-e2e/`:** `preserveOutput: 'failures-only'` in Playwright config prevents stale failure contexts from lingering after a passing run and confusing later investigation. Test scripts clear `test-results/` before each run to ensure artifacts reflect the current execution only.

## 2026-08-15 — the eventize holdback is lifted

`@spearwolf/signalize@1.0.0-beta.0` peers on `@spearwolf/eventize@^6.0.0`, which is exactly the range widening the section below was waiting for. Both catalog entries move together; the runtime consequences for the published package are in [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md).

- **`pnpm-workspace.yaml` catalog:** `@spearwolf/eventize` `^5.1.0` → `^6.0.0`, `@spearwolf/signalize` `^0.31.1` → `1.0.0-beta.0`. The signalize entry is version-exact rather than a `^` range on purpose — `^1.0.0-beta.0` would also admit `1.0.0` final, and a beta is not a range you want to drift inside. The comment above the pair no longer records a holdback; it records that the two have to move together and why.
- **`minimumReleaseAgeExclude`** is new, holding `@spearwolf/signalize@1.0.0-beta.0`. pnpm 11 defaults `minimumReleaseAge` to one day and refuses anything younger; the beta was minutes old. pnpm writes the entry itself on install, and it is version-exact, so it expires with the next bump rather than rotting silently. The cooling-off exists to keep a freshly compromised third-party release out of the tree — the `@spearwolf` packages are first-party, so it buys nothing here and only blocks the install.
- **One copy of each, verified.** Both libraries key their internal slots with realm-wide symbols (`Symbol.for('eventize')`, the `@spearwolf/signalize/` keys), so a second major resolved alongside is not a duplicate-code problem but a broken-identity one. `pnpm why -r` reports a single version of each across all five workspace projects.
- **Verified:** typecheck across all packages, `dist/` diffed against a build of the previous commit (same 190 files, `dist/package.json` differing only in the two intended dependency ranges), 294 unit tests in the core package, 41 integration tests, 324 e2e tests in Chromium and Firefox — all green.

## 2026-08-15 — toolchain update: pnpm 11, TypeScript 7, CI/Deployment rework

Package manager, dependency catalog and both GitHub workflows brought up to current versions. Baseline before the change: 13 spec files / 292 tests in the core package, 41 integration tests, 324 e2e tests, all green — the same counts hold after it.

**pnpm 9.15.4 → 11.21.0.** Two majors, and the defaults moved underneath the repository.

- **`package.json`:** `packageManager` is `pnpm@11.21.0`, `engines.pnpm` is `>=11.0.0`. From pnpm 10 on, `managePackageManagerVersions` is on by default, so the `packageManager` field is what actually decides which pnpm runs, locally and on a runner.
- **`pnpm-workspace.yaml`:** new `allowBuilds` block. pnpm 11 removed `onlyBuiltDependencies` and friends outright and defaults `strictDepBuilds` to `true`, so an install aborts on any dependency that wants to run a build script. Exactly one does: `esbuild`, whose `postinstall` fetches the platform binary.
- **`minimumReleaseAge` defaults to one day** in pnpm 11, and the supply-chain step re-applies it to every lockfile entry on each install — a lockfile that pins a release younger than the cutoff fails `--frozen-lockfile` on a clean runner even though it installed fine locally. The catalog therefore holds `turbo` at `^2.10.9` rather than the `^2.10.10` that was published 22 hours earlier; pinning the newest patch would have required a `minimumReleaseAgeExclude` entry that rots within a day.
- **`.npmrc` is auth/registry only** from pnpm 11 on. The repository has none, so nothing had to move; the `.npmrc` copy in `scripts/publishNpmPkg.mjs` was already guarded by an existence check and stays a no-op.
- `pnpm-lock.yaml` regenerated from a fresh resolution. `lockfileVersion` stays at `9.0`.

**Dependency catalog.** `typescript` 6.0.3 → 7.0.2, `turbo` 2.9.18 → 2.10.9, `@biomejs/biome` 2.4.14 → 2.5.8, `vitest` and `@vitest/*` 4.1.5 → 4.1.10, `playwright` 1.59.1 → 1.62.1, `sinon` 19 → 22 with `@types/sinon` 17 → 22, `happy-dom` 20.9.0 → 20.11.2, `esbuild` 0.28.0 → 0.28.2, `three` 0.179.1 → 0.185.1, `rimraf` 6.1.2 → 6.1.3, `lit-html` 3.3.2 → 3.3.3.

- **`jsdom` and `@types/react` removed** from the catalog, `jsdom` also from the root `devDependencies`. Neither is imported anywhere in the workspace.
- **`@types/node` stays on the 24.x line** (24.10.12 → 24.13.3 resolved) rather than following to 26. It describes the runtime named in `engines.node`, and that is `>=24.13.0`.
- **`@spearwolf/eventize` stays on 5.x** (5.0.0 → 5.1.0). `@spearwolf/signalize@0.31.1` declares `peerDependencies: {"@spearwolf/eventize": "^5.0.0"}`, so moving to 6.0.0 resolves a second eventize copy into the tree and breaks emitter identity. Blocked until signalize widens the range.
- **`typescript` 7 verified against the published output**, since `dist/` is part of the API contract: same 190 files, 45 of 47 `.d.ts` byte-identical, `dist/package.json` differing only in the two intended dependency ranges. The two that differ are `create-worker.d.ts` and `create-worker.bundle.d.ts`, where TS 7 emits `declare function _default(): Worker` where TS 6 emitted `declare const _default: () => Worker` — the same type, written differently, in a module the `exports` map does not expose.

**`vite` held at 7.3.6, not 8.** Vite 8 replaced esbuild with Rolldown/Oxc, and Oxc does not lower native decorators yet ("waiting for the specification to progress", per the Vite 8 migration guide). `src/in-the-dark/SignalsPath.ts` and `src/view/ShadowEnv.ts` use `@signal … accessor` from `@spearwolf/signalize/decorators`; under Vite 8 that syntax reaches node untransformed and 5 spec files die with `SyntaxError: Invalid or unexpected token` before a single test runs. `vitest` declares `vite: ^6 || ^7 || ^8` and resolves 8.x on its own regardless of the catalog, so `pnpm-workspace.yaml` carries an `overrides: {vite: ^7.3.6}` to hold the whole workspace on 7. Drop the override once Oxc lowers decorators.

**`.github/workflows/ci.yml`.**

- `pnpm/action-setup` moved ahead of `actions/setup-node`, which now caches the pnpm store (`cache: pnpm`) — that ordering is required, the cache path is resolved through the pnpm binary. `run_install: true` is gone in favour of an explicit `pnpm install --frozen-lockfile`, since the implicit install ran before any cache could apply.
- Node version comes from a new `.nvmrc` instead of being written into three places.
- Added a top-level `permissions: contents: read`, a `timeout-minutes` on the `ci` job, and a `concurrency` group that cancels superseded runs — except on `main`, where cancelling a CI run would also drop the Deployment that keys off its completion.

**`.github/workflows/deploy.yml`.** The file keeps its name: npm trusted publishing matches the OIDC claim against the exact registered workflow filename, and it validates the *calling* workflow, so the publish step cannot move into a reusable workflow invoked from `ci.yml`.

- **Publishes the commit CI actually validated.** `actions/checkout` in a `workflow_run` job resolves to the default branch HEAD when no `ref` is given, so two pushes in quick succession could publish a commit that was never tested. It now checks out `github.event.workflow_run.head_sha`.
- The job condition gained `github.event.workflow_run.event == 'push'`, so nothing but a branch push can reach the registry.
- Same pnpm/setup-node ordering and store cache as `ci.yml`, plus an explicit frozen install and a `timeout-minutes`.

**`turbo.json`:** `$schema` follows turbo to `v2-10-9`.

## 2026-08-15 — npm publish over OIDC trusted publishing

The last three `Deployment` runs died after 25 seconds with `ENEEDAUTH`, so `@spearwolf/shadow-objects` sits at `0.32.0` on npm while the repository is at `0.33.0`. Two independent causes, either of which was enough on its own.

- **`.github/workflows/deploy.yml`:** publishes through npm trusted publishing instead of a long-lived token. The repository has no `NPM_TOKEN` secret, so `${{ secrets.NPM_TOKEN }}` expanded to an empty string and `NODE_AUTH_TOKEN` arrived empty. The `id-token: write` permission the file already declared is now what actually carries the authentication: `always-auth` and the `NODE_AUTH_TOKEN` env are gone, `actions/setup-node` moved from `v5` to `v6` to match `ci.yml`, and a preflight step upgrades npm if the runner ever ships something below the 11.5.1 that trusted publishing requires.
- **`turbo.json`:** the `publishNpmPkg` task declares `passThroughEnv`. turbo runs its tasks in strict environment mode, which stripped `ACTIONS_ID_TOKEN_REQUEST_URL` / `_TOKEN`, `NPM_CONFIG_USERCONFIG` (written by `actions/setup-node`) and `NODE_AUTH_TOKEN` before `npm publish` ever saw them. The token route would have failed identically with the secret in place.
- **`scripts/publishNpmPkg.mjs`:** refuses to publish when neither an OIDC id-token request nor a token reaches the process, and names the two setups that can be missing instead of leaving a bare `ENEEDAUTH` in the log. npm's own output is inherited rather than swallowed, and the diagnostics no longer print the first six characters of the token into the build log.
- **`packages/shae-offscreen-canvas/package.json`:** gained `repository`, `homepage` and `publishConfig.registry`. Trusted publishing generates provenance attestations without being asked, and provenance without a `repository` field aborts the publish — the package would have broken on the very step that fixed the other one.

**One manual step is left and cannot be done from the repository:** each package needs a trusted publisher on npmjs.com — GitHub Actions, repository `spearwolf/shadow-objects`, workflow `deploy.yml`. Until that entry exists, `deploy.yml` fails at the OIDC exchange.

## 2026-08-15 — removed the stale `dist/` snapshots

`docs/superpowers/specs/dist-snapshot.txt` and `dist-package.json.snapshot` are gone. They were written for the 2026-05-09 toolchain renewal to prove the published output survived it byte-for-byte, and served that purpose. Since then they were read by no task, no test and no CI job, and both had drifted away from the build: the file list still carried a `tsconfig.lib.tsbuildinfo` the pipeline stopped emitting, and the package snapshot still described version `0.30.2` with `@spearwolf/signalize@^0.29.0` against a build of `0.33.0` and `^0.30.0`. A reference that nothing enforces and that quietly goes wrong is worse than no reference.

- **`CLAUDE.md`:** the `dist/` layout is still part of the public API contract. The paragraph now says what actually holds — nothing asserts it automatically — and how to diff the output against a previous build instead of pointing at two files that no longer describe it.
- **`biome.json`:** dropped the two `files.includes` exclusions that existed only for those snapshots.
- `docs/superpowers/specs/2026-05-09-build-system-renewal-design.md` stays. It is a dated design record, linked from this changelog and from `Backlog.md`, not a verification artifact.

## 2026-08-14 — strictNullChecks

- **`tsconfig.json`:** `strictNullChecks` is `true`, alongside the other `strict`-family flags the file spells out.
- **`packages/shadow-objects-e2e/package.json`:** new `typecheck` script. Its TypeScript sources and Playwright tests inherit the root config but had no task running `tsc` over them, so `pnpm typecheck` now covers both TypeScript packages instead of one, and `pnpm ci` runs the same check for the e2e package without pulling its Playwright suite into the `ci` job.
- **`turbo.json`:** the `typecheck` task counts `test/**` and `tests/**` among its inputs — the e2e config type-checks its tests, and a change there has to invalidate the cache.
- `shae-offscreen-canvas` and `shadow-objects-testing` needed no change: their sources are `.js`, pulled in via `allowJs` but not checked.

## 2026-08-13 — E2E suite in CI

- **`.github/workflows/ci.yml`:** new `e2e` job, parallel to the existing `ci` job, running `pnpm exec turbo run test --filter=shadow-objects-e2e` against both Playwright projects (Chromium and Firefox).
- **Deployment gate:** `.github/workflows/deploy.yml` triggers on the `Continuous Integration` workflow's `conclusion == 'success'`, which now requires the `e2e` job to pass alongside `ci` before an npm publish.
- On failure, the job uploads the Playwright HTML report (`packages/shadow-objects-e2e/playwright-report/`) as a build artifact for 7 days.

## 2026-08-13 — Test-harness corrections

Follow-up to a code review of the view-layer hardening and the E2E rework. The library fixes are in [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md); what follows only concerns the test harnesses.

- **`runPageTests`:** the `toHaveCount(1)` assertion that turns "the page never wrote this result" into a readable failure was not awaited. Playwright's retrying assertions return a promise — unawaited it neither blocks nor fails, so a page that died during setup reported the generic `expected 'ok', received null` instead of its abort reason, and the floating assertion rejected outside the test.
- **`testCustomEvent`:** split into `watchCustomEvent(el, eventName)`, which arms the listener, and the returned function, which waits. Arming and timing in one call meant the 5 s budget started at subscription time, not at the `await` — on the `shae-worker` page four sequential awaits sat in between, so a cold worker start could blow the budget for an event that arrived on time. `testCustomEvent` remains for the call sites that await immediately.
- **`create-element`:** the markup-upgrade case asserted `isShaeEntElement` on a `<shae-prop>`, which only passed because of the copy-pasted flag on `ShaePropElement` (now removed). Asserts `isShaePropElement`.
- **New integration specs** in `shadow-objects-testing`: `worker-element-teardown` (a destroyed environment must not leave an unhandled rejection) and `prop-element-host` (`<shae-prop>` must walk past a nested `<shae-prop>` to its host entity).

## 2026-08-02 — E2E suite extended

Analysis in [`packages/shadow-objects-e2e/TEST-PLAN.md`](packages/shadow-objects-e2e/TEST-PLAN.md), defects in [`packages/shadow-objects-e2e/KNOWN-DEFECTS.md`](packages/shadow-objects-e2e/KNOWN-DEFECTS.md). The suite grew from 44 to 298 tests (Chromium + Firefox).

- **New pages:** `multi-env` (three environments in parallel: property sync, message routing, namespace isolation, cross-namespace nesting), `dynamic-dom` (runtime insert/move/remove of entities and property elements), `upgrade-timing` (markup parsed before the definitions), `async-events` (message round-trips, `traverseChildren`, `forward-custom-events`, what `auto-sync` actually controls), `create-element` (reproduces DEFECT-1).
- **`bundle.html`** now asserts the tree, the property type parsing and a functional round-trip through the inlined worker, instead of only checking that two elements exist.
- **Harness:** single `runPageTests` helper replaces three copies of `lookupTests`; a `data-testsuite` marker (`runTestSuite`) makes a page that dies during setup fail with its stack instead of one locator timeout per expected id; `data-testoutput` now reaches the report as the failure message; page errors and `console.error` fail a dedicated test; timeouts reject with a real `Error` instead of `undefined`.
- **Known failures:** specs can register test ids that document a defect (`knownFailures`), so the suite stays green while the defect exists and turns red when it is fixed.
- **Two framework defects found** — see `KNOWN-DEFECTS.md`: the custom elements cannot be built with `document.createElement()` (their constructors assign attributes, so the upgrade is aborted and an `HTMLUnknownElement` comes back), and removing a `<shae-prop>` does not remove the property.
- **Two orphaned tests activated:** `worker0-env-contextCreated` / `worker1-env-contextCreated` were written by the page but never registered in the spec.

## 2026-08-02 — Documentation corrections

- **Root `README.md`:** the "Project Structure" section still credited `nx` as the monorepo orchestrator. Corrected to `turborepo` + pnpm workspaces (the switch happened in the 2026-05-09 build-system renewal).
- **Root `README.md`:** now carries the full introduction — what the framework is, the five domains (View, Environment, Kernel, Composition, Shadow Object) with what each owns and must not touch, the three data-flow directions, and the six invariants. Worked out in a German scratch document (`docs/die-säulen-der-shadow-objects.md`, added and removed the same day) whose content now lives in the README, `packages/shadow-objects/docs/` and `AGENTS.md`. Replaces the old "The Mental Model" section; removed the duplicated experimental-warning callout. The three entry points no longer repeat each other: the root README is the long form, `packages/shadow-objects/README.md` is the npm landing (description, install, quick example, domain table), and `docs/README.md` is navigation with a "where to start" table.
- **`AGENTS.md`:** §4 Documentation gained a binding-terms table (`RemoteWorkerEnv` not `RemoteShadowObjectEnv`, Entity not Shadow Entity, Entity Tree not Shadow Entity Graph, Token not Component Tag) and the note that "context" denotes two unrelated concepts.

## 2026-05-09 — CI action versions bumped

- **GitHub Actions:** upgraded `actions/checkout` v4 → v6, `actions/setup-node` v4 → v6, and `pnpm/action-setup` v4 → v6 in both `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`. Node version pinned at `24` (latest).

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
