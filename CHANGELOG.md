# Monorepo Changelog

Top-level changes that are not tied to a single published package — build system, monorepo orchestration, lint/format, dev workflow. Per-package runtime and API changes live in each package's own `CHANGELOG.md`.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-08-24 — the core package's dist output is held against a recorded expectation

- **`packages/shadow-objects/src/distContract.spec.ts`:** a new case in the package's existing
  `test` task reads the built `dist/` directory and compares the sorted file list and the shape
  of `dist/package.json` (top-level keys, entry points, `exports`, `sideEffects`, dependency
  names) against two checked-in expectation files. `turbo` already builds before it tests
  (`turbo.json#tasks.test.dependsOn`), so the case runs against a fresh build in the pipeline; a
  directly started `pnpm watch` needs a manual build first, and the case says so if `dist` is
  missing.
- **`packages/shadow-objects/src/distContract.files.txt`, `packages/shadow-objects/src/distContract.package.json`:**
  the two recorded expectations. `version` and dependency version ranges are deliberately not
  part of the `package.json` expectation — they change with every release, and an expectation
  that has to move on every release stops getting read.

## 2026-08-23 — the ci lint run fails on warnings

- **`package.json`:** `lint:ci` runs `biome check . --reporter=summary --error-on-warnings`. The
  five correctness rules that stay at `warn` in `biome.json` — `noUnusedVariables`,
  `noUnusedImports`, `noUnusedPrivateClassMembers`, `noVoidTypeReturn`, `useParseIntRadix` — used
  to let `biome check` exit 0 on a clean warning-only run; `lint:ci` is the last step of `pnpm run
  ci`, so a warning from any of them now fails the run instead of passing through unnoticed.

## 2026-08-23 — the shared test setup stops reading Node's storage accessor

- **`packages/shadow-objects/vitest.setup.ts`:** the check that decides whether to install
  happy-dom's `localStorage`/`sessionStorage` now reads
  `Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.get` instead of
  `typeof localStorage?.getItem`. Node exposes its own inert storage as an accessor on
  `globalThis`; reading through it triggers Node's `--localstorage-file` warning once per test
  process, and the `forks` pool gives each spec file its own process. happy-dom and a real
  browser install Storage as a plain data property, so the descriptor shape tells the two apart
  without ever invoking the getter. The file is shared by `packages/shadow-objects`,
  `packages/shae-offscreen-canvas` and `packages/shadow-objects-testing`, so all three test runs
  lose the warning.

## 2026-08-23 — the test process can force a collection

The runtime change behind this — the elements releasing their subscriptions when they leave the
document — is in
[`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md). What follows is
what it did to the test setup.

- **`packages/shadow-objects/vitest.config.ts`:** `test.pool` is `'forks'` and
  `test.execArgv` is `['--expose-gc']`, both at the top level under `test`. The flag puts
  `globalThis.gc` into the test process, which is what
  `src/elements/elementReachability.spec.ts` needs to force a collection instead of waiting for
  one; `execArgv` only reaches a spawned node process, which is what the `forks` pool gives each
  test file, so the pool is named explicitly rather than left to the default — a later change of
  that default would otherwise take the flag away silently. In vitest 4 both keys sit directly
  under `test`: `test.poolOptions` was removed, and a nested spelling is ignored without an error.
- **`packages/shadow-objects/src/elements/elementReachability.spec.ts`** (new): nine cases over
  the element lifecycle. Four hold a `WeakRef` to an element that was appended and removed and
  assert it is gone after a forced collection, the first of them a plain `HTMLElement` subclass as
  the control; five read the release directly — that an element which stays out is released, that
  a move within one task is not a release, that `<shae-ent>` and `<shae-prop>` come back while
  `<shae-worker>` stays down, that a `<shae-ent>` holds in signal and attribute what was written to
  it while it was released, and that one released by hand inside the document stops answering for
  what sits below it. A missing `--expose-gc` fails the suite rather than skipping it.
  `packages/shadow-objects` case count: 760 → 769.

## 2026-08-23 — the programmatic construction path is covered by tests

The runtime change behind this — the custom element constructors, and `display: contents` as a
stylesheet rule — is in
[`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md). What follows is
what it did to the test layers and the documents describing them.

- **`packages/shadow-objects-testing/test/create-element.test.js`** (new): ten cases for the
  construction path that does not go through the parser. `document.createElement()` for all three
  tags, the view component an appended `<shae-ent>` receives, and where `display: contents`
  arrives from — parsed markup, `createElement`, inside a shadow root, on a `ShaeEntElement`
  subclass registered under a tag of its own, and a rule of the consumer's own that takes the
  display over without `!important`. Real Chromium, because neither the upgrade abort nor the
  cascade is something happy-dom reproduces reliably.
- **`packages/shadow-objects-e2e/tests/create-element.spec.ts`** carries no `knownFailures` and no
  `allowConsoleErrors` any more: the four `document.createElement()` ids are ordinary cases, and
  the page provokes no error to allow. The spec therefore gains the harness case
  `no uncaught or logged errors`. e2e case count: 428 → 430 (one id × two browsers). The
  `knownFailures` mechanism itself stays in `runPageTests.ts` — no spec registers an entry now.
- **`packages/shadow-objects-e2e/KNOWN-DEFECTS.md`** lists no open defect. The file stays and
  describes how the next one is registered; the `Related gap` note about
  `autoDestructionOnParentRemoval` is untouched.
- **`packages/shadow-objects-e2e/src/create-element.js`:** the `shae-prop` case asserts
  `isShaePropElement`, the way its two neighbours assert their own markers, rather than a type
  test on `el.name` that holds for any object. **`src/dynamic-dom.js`**, **`src/sync-failure.js`**
  and **`src/worker-failure.js`** say why they build their fixtures from markup without pointing
  at a defect for it. **`pages/create-element.html`**, **`TEST-PLAN.md`** and **`README.md`**
  describe the page by what it checks.
- **`packages/shadow-objects-testing/src/mount.js`:** the docstring names the reason the helper
  uses `innerHTML` — one string describes a whole fixture — instead of a constraint that no
  longer exists.
- **`Backlog.md`:** the `document.createElement()` entry in §4.4 is gone, §4.1 carries the
  measured counts for `shadow-objects-testing` (27 files, 377 cases) and `shadow-objects-e2e`
  (215 per project, 430 total), and §4.4 no longer announces an open framework defect.

## 2026-08-22

- **`packages/shadow-objects/tsconfig.lib.json`:** `compilerOptions.types` is set to `[]`. This
  config drives the declaration emit for the published package (`emitDeclarationOnly`, into
  `dist/src/**`) and extends the package's own `tsconfig.json`, which carries no `types` entry of
  its own and so falls back to whatever `@types/*` packages happen to sit in `node_modules` --
  today none, since `packages/shadow-objects/package.json` declares no such devDependency. A later
  one -- added directly, or reaching this package's `node_modules` some other way, the way
  `@types/node` reaches `shadow-objects-e2e` today through `vite`'s own dependency on it (see the
  `2026-08-19` entry above) -- would otherwise be free to leak a global like `NodeJS.Timeout` into
  a `.d.ts` a consumer's own compiler then has to resolve. The empty array is a standing guard
  against that, at no cost today: a full `pnpm build` with and without the line produces a
  byte-identical `dist/src/**` and an unchanged file list, checked on the commit this guard was
  added.

## 2026-08-20

- **`.github/workflows/ci.yml`:** the `on:` block now triggers on both `push` and `pull_request`, and no longer skips Markdown files. Documentation is part of the API contract (AGENTS.md §4), so it must be checked. A pull request from a branch of this repository runs the workflow twice — once on the branch head and once on the merge commit — because the concurrency group keys off `github.ref` and both commits have different refs.
- **Coverage measurement:** `@vitest/coverage-v8` (pinned version-exact to the resolved `vitest`, see the comment in `pnpm-workspace.yaml`) reports for the two Node test suites. `pnpm test` in `packages/shadow-objects` and `packages/shae-offscreen-canvas` now runs `vitest --run --coverage` and writes a `text` summary to the console plus an HTML report to `<package>/coverage/`. `turbo.json` lists `coverage/**` as an output of the `test` task so a turbo cache hit restores the report, and the `ci` job uploads both directories as the `coverage-report` artifact. No thresholds are configured — the numbers are a map, not a gate. `packages/shadow-objects-testing` stays out: it runs as its own vitest project (browser mode, Chromium) with its own `reportsDirectory`, so measuring it would produce a second report over the same `packages/shadow-objects/src/` files as the core package's report; the two don't add up without a merge step, which this package doesn't do. The core number therefore understates what the workspace exercises.
- **`pnpm-workspace.yaml`:** the `vitest`, `@vitest/browser` and `@vitest/browser-playwright` catalog entries move from a caret range to an exact version and join `@vitest/coverage-v8`, which already stood there — all four now pinned together. Each satellite declares `peerDependencies: {vitest: "4.1.10"}`; vitest names `@vitest/browser-playwright` and `@vitest/coverage-v8` back as optional peers at that same exact version, and `@vitest/browser` is pinned to `4.1.10` by `@vitest/browser-playwright`'s hard dependency on it and by `@vitest/coverage-v8`'s optional peer. No range anywhere absorbs drift. Resolved versions stay at `4.1.10` for all four — only the specifiers change, and with them three `specifier:` lines in `pnpm-lock.yaml`.

## 2026-08-19 — the tools see what they are meant to see

- **`packages/shadow-objects-e2e/tsconfig.json`:** `include` gains `playwright.config.ts`,
  so the package's own `typecheck` task and its `build` (`tsc && vite build`) now check the
  file that configures the suite. It carries `compilerOptions.types: ["node"]` — without it
  the file's `process.env` accesses report "Cannot find name 'process'" rather than the
  `noPropertyAccessFromIndexSignature` diagnostic that motivated the change, because this
  workspace's TypeScript does not scan `node_modules/@types` for ambient types on its own.
  `@types/node` moves from a phantom, transitively-hoisted dependency (pulled in by `vite`'s
  own peer dependency on it) to a declared `"catalog:"` devDependency of the package, so the
  type package this config now names is one the package actually depends on rather than one
  that happened to be reachable.
- **`packages/shadow-objects-e2e/playwright.config.ts`:** the four `process.env.CI` reads
  become `process.env['CI']` — bracket notation, required once the file is type-checked
  because `process.env` is typed via an index signature. Each of the four carries a
  `biome-ignore lint/complexity/useLiteralKeys` comment: that rule prefers dot notation for a
  literal key, the opposite of what type-checking this file now requires.
- **`turbo.json`:** `playwright.config.ts` joins the `inputs` of the `build` and the
  `typecheck` task. A task's `inputs` list is the set of files whose contents decide whether
  turbo replays a cached result instead of running the task, so a file missing from it is a
  file whose edits go unnoticed — an error introduced into this config would be answered with
  a cache hit on the last green run until something else in the package happened to change.
- **`packages/shadow-objects/package.json`:** the `sideEffects` array drops its eight
  `build/src/…` entries — `build/` is a directory no stage of the current pipeline writes to,
  so nothing before this pointed at it. The ten `dist/…` entries stay, and the published
  package is unaffected: `scripts/makePackageJson.mjs` replaces the whole array with
  `package.override.json`'s `src/…`-relative list when it writes `dist/package.json`.
- **`packages/shadow-objects/build.mjs`:** the header comment now says why the `sideEffects`
  list exists twice — once in `package.json` for anyone importing the repository directly,
  once in `package.override.json` for the published package — and that the second fully
  replaces the first in the build's output rather than merging with it.
- **`pnpm-workspace.yaml`:** the `catalog:` block gains `@esm-bundle/chai` (pinned exact to
  `4.3.4-fix.0` — a prerelease tag above `4.3.4` that a caret range would not resolve to on
  its own) and `lil-gui` (`^0.21.0`). Both used to carry a plain version range directly in
  `packages/shadow-objects-testing/package.json` and `packages/shae-offscreen-canvas/package.json`,
  which the two now reference as `"catalog:"` instead — `@esm-bundle/chai`'s version stood in
  two files before this and could have drifted between them. `@biomejs/biome` moves
  `^2.5.8` → `^2.5.9`.
- **`biome.json`:** `linter.rules.complexity.noBannedTypes` moves from `"off"` to `"error"`.
  It found three wrapper-type declarations: `Map<String, …>` in
  `packages/shadow-objects/src/in-the-dark/Kernel.ts`, and two uses of the bare `Function`
  type in `packages/shadow-objects/src/utils/FrameLoop.ts` — all three fixed as part of this
  change (`Kernel.ts` to the primitive `string`; `FrameLoop.ts` to eventize's own
  `ListenerFuncType`, reused rather than hand-rolling a callback signature). A fourth banned
  type turned up in a publicly exported type — `ShadowObjectConstructor` in
  `packages/shadow-objects/src/types.ts` — and is described from the package's own side in
  `packages/shadow-objects/CHANGELOG.md`, since its emitted declaration changes.

## 2026-08-19 — the tooling catches up with what it actually reads and ships

- **`turbo.json`:** `tasks.build.inputs` gains `tests/**`, `vite.config.*`, `pages/**`,
  `public/**` and `index.html`; `tasks.test.inputs` gains `playwright.config.ts`, `pages/**`,
  `public/**` and `index.html`. `shadow-objects-e2e` builds via `tsc && vite build` — `tsc` reads
  `tests/**` too, per its own `tsconfig.json`, and `vite.config.mjs` reads `pages/**` to build the
  entry list; its Playwright suite then runs against that built preview, with its assertions
  living in the test pages themselves. A file missing from a task's `inputs` is a file whose
  edits go unnoticed — turbo hashes only what is listed, so a changed test file, an edited page,
  or a changed suite config used to be answered with a cache hit on the last green run instead of
  a fresh one. The two lists apply per task, across every package that has one, not per package —
  `@spearwolf/shae-offscreen-canvas` has an `index.html` and a `vite.config.js` of its own that
  neither of its tasks reads, so it now rebuilds and retests on a change to its demo page where a
  cache hit used to stand. Both tasks finish in under two seconds there, which is why the lists
  stay shared instead of splitting into one `turbo.json` per package.
- **`biome.json`:** `$schema` moves from `2.4.14` to `2.5.9`, matching the installed
  `@biomejs/biome` version. Editor completion only — the linter itself reads the installed
  package, not the schema URL.
- **`packages/shae-offscreen-canvas/vitest.config.ts`:** the `include` pattern drops the
  `specs` alternative — `src/**/*.{spec,specs,test}.{js,ts}` becomes
  `src/**/*.{spec,test}.{js,ts}`. No file in the workspace matches `*.specs.*`; the dropped
  alternative matched nothing.
- **`packages/shae-offscreen-canvas/package.json`:** `@esm-bundle/chai` and `sinon` drop out of
  `devDependencies`. Neither is imported anywhere in the package.
- **`packages/shae-offscreen-canvas/build.mjs`:** the `cp()` that copies `src/` into the
  publish-ready package root takes a `filter` that skips files ending in `.spec.js`,
  `.specs.js` or `.test.js`. The published package is a source distribution, and a spec file is
  not part of it.

## 2026-08-18 — the lint run covers what the project writes

- **`biome.json`:** `.claude/` is outside the checked file set. The directory holds tool
  configuration a coding agent writes and rewrites, and the rule that keeps it out of git
  lives in the user's global exclude file, which Biome does not read — `vcs.useIgnoreFile`
  reads the `.gitignore` files in the project. Excluding the directory in `files.includes`
  is what keeps `biome check` off it, and keeps `biome check --write` from editing a file
  that belongs to another tool. The exclusion carries no comment: Biome's configuration
  loader accepts `//` comments, but the lint run parses `biome.json` as strict JSON, and a
  comment there breaks the lint run.
- **`packages/shadow-objects-testing/vitest.globalSetup.ts`** (new): clears
  `test/__screenshots__` before every vitest run of the package, resolved against the file's
  own location rather than `process.cwd()` so a targeted single-file invocation clears it too.
  Wired in via `vitest.config.ts`'s `globalSetup`. `package.json`'s `test` and `watch` scripts
  drop their own `rimraf test/__screenshots__` step now that the config covers every run path;
  the `rimraf` devDependency stays, used by the new setup file instead.

## 2026-08-17 — the test plan and the backlog describe the state that is there

- **`packages/shadow-objects-e2e/TEST-PLAN.md`:** the head describes the suite as it stands — 402 tests, 201 per project, ten spec files with what each one verifies and which case ids belong to which proposal. The document had been carrying the numbers of a four-file suite (44 → 298 tests, "four spec files, 43 registered test cases"), a §1.2 about two ids that are registered, a harness table whose entries were fixed on 2026-08-02, a `tests/lookupTests.ts` that no longer exists, and a §2.2 describing the `<shae-prop>` host lookup as a `parentElement` walk gated behind `customElements.whenDefined('shae-ent')` — neither of which the code does any more. UPG-3 and UPG-8 are marked as answered rather than open, the still-open list is pulled against the tables, and §4 orders what is left instead of what is done.
- **`Backlog.md`:** every finding this repository knows about and has not fixed now stands in it with a code location — the `<slot>` that leaves an entity without telling it, `applyPropsChanges` writing into delivered change trails, the two `forward-custom-events` state bugs, `ComponentContext.clear()` leaving live components behind, the sender-less root re-request channel, the n²/2 ancestor ascent, `ShadowEnv.ns$`, the unexported `ViewComponentError`, the `RemoteWorkerEnv.destroy()` pair, the `ComponentMemory` re-export, the four unread `api-reference.md` sections, the fifteen undocumented element constants, the nine undocumented protocol exports, the "(Component Tag)" gloss, the shared 5000 ms in the e2e helpers, the shared context in `ComponentContext.test.js`, the two `biome.json` infos, and the `__screenshots__` directory no script clears. Struck in return: `syncWait()` after `destroy()`, `<shae-prop>` end-to-end coverage, an `attributeChangedCallback` gap naming an attribute that does not exist (`parent-id`), and the test-file inventory (13 → 14 core specs, 12 → 21 integration specs, case counts added).
- **`packages/shadow-objects-testing/test/ComponentContext.test.js`:** the shared `ComponentContext` is cleared between cases through `afterEach(() => unmountAll())`, the same pattern every other spec in the package follows.
- **`packages/shadow-objects-testing/package.json`:** `test` and `watch` clear `test/__screenshots__` before running, matching the `test-results` cleanup `packages/shadow-objects-e2e/package.json` does for Playwright. `devDependencies` lists `"rimraf": "catalog:"`.
- **`packages/shadow-objects-e2e/src/test-helpers/waitUntil.js`:** the default `timeout` is 4000 ms, below `testAsyncAction`'s default, so the inner deadline fires first and the report names the condition instead of the enclosing action.
- **`packages/shadow-objects-testing/test/worker-element-attributes.test.js`:** two cases for the
  deferred teardown of `<shae-worker>` on the entity level — one reconnects the element while it is
  still inside the deferral microtask and finds the kernel, the `Entity` instance and the
  `ViewComponent` unchanged, the other lets the task boundary pass and finds the entities gone with
  the kernel: `hasEntity()` false, `getEntity()` throws, reconnecting brings nothing back, `start()`
  rejects with `ShadowEnvDestroyedError` — while the `ComponentContext` on the view side keeps its
  entity. `packages/shadow-objects-e2e/TEST-PLAN.md` now lists only the equivalent against a real
  worker as open on this axis. Integration package case count: 312 → 314.
- **`Backlog.md` §4.1:** the vitest inventory counts 15 files and 349 cases and names
  `ConsoleLogger.storage.spec.ts`.

## 2026-08-16 — exclude generated audit reports and clear stale Playwright artifacts

- **`biome.json`:** audit reports (`*audit*.html`) are excluded from lint checks — they are generated snapshots of the audit process, not project code.
- **`packages/shadow-objects-e2e/`:** `preserveOutput: 'failures-only'` in Playwright config prevents stale failure contexts from lingering after a passing run and confusing later investigation. Test scripts clear `test-results/` before each run to ensure artifacts reflect the current execution only.
- **`packages/shadow-objects-e2e/pages/shae-worker.html`:** the page now asserts the entity structure it builds. Two `structure-observer` shadow objects (`public/mod-structure.js`, one per environment) report each worker's own entity graph back to the view; the page checks every parent-child relation, both slot projections, and the namespace boundary that keeps the isolated-namespace entities unreachable.
- **`packages/shadow-objects-testing/test/prop-element-types.test.js`:** a table-driven spec covers `ShaePropElement`'s type conversion — one case per type name, the `\W+`/`\s+` separator split, malformed input for the lenient types and for the four that can fail to convert, the `no-trim` attribute, the falsy-value edge cases, and what a value ends up as in the change trail. Drives every case through the markup path in real Chromium, since the conversion has no exported function to call in isolation and happy-dom does not reproduce Custom Elements upgrade timing reliably.
- **`packages/shadow-objects-testing/test/ent-element-attributes.test.js`** and **`test/ent-element-events.test.js`**: two new specs cover `ShaeEntElement` and `ShaeElement` — the `token`, `ns` and `forward-custom-events` attribute paths, the attach/detach/reattach lifecycle, and the `dispatchEvent` patch that forwards Shadow Object events to the DOM. `src/mount.js` and `src/withSwallowedErrors.js` are shared test helpers that every markup-driven spec in the package, including `prop-element-types.test.js`, uses to mount and tear down elements the same way.
- **`packages/shadow-objects-testing/test/worker-element-attributes.test.js`** (new): covers `ShaeWorkerElement`'s five observed attributes, the `autoSync` property setter, `shouldAutostart`, and the connect/disconnect/destroy lifecycle.
- **`packages/shadow-objects-testing/test/ent-element-upgrade.test.js`** (new): covers what happens to the entities below an element whose custom element definition arrives after the surrounding markup was parsed — a subclass of `ShaeEntElement`, one across a shadow boundary, the sibling order under the shared parent, a wrapper without an entity, a wrapper projecting through a `<slot>`, and one in a foreign namespace. `packages/shadow-objects-e2e/pages/upgrade-timing.html` gained the same scenario end to end: two islands whose wrapper elements are defined after the first sync, nine `upgrade-late-*` ids that follow the hierarchy from the DOM through to the worker.
- **`packages/shadow-objects-testing/test/ent-element-namespace.test.js`** (new): covers what a `ns` change at runtime does to the parent binding — the element's own, the entities that hung on it, and the way back. Also the two states in which an element ends up in a namespace without ever becoming an entity, the parent observation following a `moveBefore()`, which entities a change reaches and which it does not, an entity whose ancestor is taken out of the tree from under it, and two guards showing that the request loop settles instead of feeding itself. `ComponentContext.test.js` gained a case for the message that tells the children of a component to re-request their parents. `packages/shadow-objects-e2e/pages/multi-env.html` gained the same scenario with real workers: an island whose inner entity switches namespace mid-run, five `multi-env-ns-switch-*` ids following it out of one environment and back.
- **`packages/shadow-objects-testing/test/prop-element-lifecycle.test.js`** and **`test/view-component-context-switch.test.js`** (both new): thirteen cases covering the end of a property binding and what a view component carries into the context it joins. The first file reads the change trail for the mechanism and the kernel of a local environment for the result; the second runs without a DOM, because the element layer is one of two writers and `ViewComponent.setProperty()` is the other. `ent-element-namespace.test.js` gained a `namespace change and properties` block with two more cases. In the e2e suite, `pages/dynamic-dom.html` gained a `DOM-7` block with three ids for a `<shae-prop>` moving between entities, and `pages/multi-env.html` a sixth `multi-env-ns-switch-*` id for the property content after the move.
- **`packages/shadow-objects-testing/test/prop-element-host.test.js`**: seven more cases for the host binding of a `<shae-prop>` while it stays where it is — a host whose element is defined late, an entity upgrading between the property and its current host, a shadow root attached afterwards, a host that leaves the tree with and without an entity behind it, the report for a property with no entity above it at all, and a guard keeping that report at one per element. `packages/shadow-objects-e2e/pages/upgrade-timing.html` carries a `<shae-prop>` on its late-definition island, with two ids (`upgrade-late-prop-found-its-host`, `upgrade-late-prop-reached-the-worker`) following it from the DOM through to the worker.
- **`packages/shadow-objects-e2e/tests/dynamic-dom.spec.ts`** carries no `knownFailures` any more — `dynamic-dom-removed-prop-is-gone` is an ordinary case again. The mechanism itself stays in `runPageTests.ts`; at the time of this change, `create-element.spec.ts` is the one spec still registering an entry.
- **`packages/shadow-objects-testing/src/mount.js`**: `unmountAll()` now also clears every `ComponentContext` in `ComponentContext.getContextsMap()`, instead of only the global one, and destroys every `ShadowEnv` left in `globalThis.__shadowEnvs`, instead of relying on each spec's own `el.destroy()` call. A spec that mounts into its own namespace no longer has to clear it by hand, including when the spec throws before reaching its own cleanup — the two now-redundant `finally` blocks in `ent-element-attributes.test.js` and `ent-element-events.test.js` are removed.
- **`packages/shadow-objects/src/elements/propValueConverters.spec.ts`** (new): a unit spec for the converter table that replaces `ShaePropElement`'s type-conversion `switch` — one case per converter group, the alias-identity check, and the full 42-name key list, running without a DOM. Runtime behavior change and rationale are in [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md).
- **`packages/shadow-objects-testing/test/prop-element-registration-order.test.js`** (new): covers `shae-prop.ts` and `shae-ent.ts` registering independently of each other — importing the `shae-prop.js` subpath on its own defines the element, and a `<shae-prop>` upgraded before `<shae-ent>` still finds its host once `<shae-ent>` registers. The two cases build on one shared page in a fixed order, so the suite disables shuffling for that one `describe`. Runtime behavior change and rationale are in [`packages/shadow-objects/CHANGELOG.md`](packages/shadow-objects/CHANGELOG.md). **`packages/shadow-objects-e2e/src/upgrade-timing.js`** and **`tests/upgrade-timing.spec.ts`** lose the `upgrade-shae-prop-is-defined-after-shae-ent` case: the e2e page imports both registration modules together, so it cannot show either side of the ordering on its own — that lives in the new spec instead. e2e case count: 404 → 402 (one id × two browsers).
- **`packages/shadow-objects-testing/test/ent-element-attributes.test.js`** and **`test/ent-element-events.test.js`**: five more cases for the two attributes that reflect a signal — two for `removeAttribute("token")`, on an element that carries the property and on one that only ever had the attribute, and three for the ways an empty allow-list arrives at `forward-custom-events` (`set(new Set())`, `setAttribute(…, ',')`, and the patch that is then not installed at all).

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
