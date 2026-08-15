# Monorepo Changelog

Top-level changes that are not tied to a single published package — build system, monorepo orchestration, lint/format, dev workflow. Per-package runtime and API changes live in each package's own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
