# Build System Renewal — Design

> **Status: Historical.** Written 2026-05-09, archived 2026-08-27. This document is the design as it was approved, kept as the record of what was planned. It is not a plan anyone is still working through, and nothing in it is maintained: the tool versions, the directory tree and the verification commands below describe that plan, not the repository. `CLAUDE.md` describes the toolchain as it stands and is the source to go by; where the two disagree, `CLAUDE.md` is right.
>
> One line of the plan went another way: the library build is `packages/shadow-objects/build.mjs` on esbuild rather than tsdown. The fallback this document proposes for its own first risk — keep an esbuild step for the inlined worker — became the whole build, and tsdown appears in no other file of the repository.

## Goal

Renew the entire build/test/lint/orchestrator stack of the shadow-objects monorepo. Make it simpler to maintain, faster to run, and unified around modern tools. Replace eslint+prettier with Biome. Establish a single source of truth for dependency versions. Preserve the published `@spearwolf/shadow-objects` package output bit-compatibly.

## Non-goals

- No source-code changes to the framework itself (only build wiring + tests).
- No API changes.
- No migration of dependents away from current entry points.

## Tooling decisions

| Concern | Old | New |
|---|---|---|
| Monorepo orchestrator | nx 19 + per-package `project.json` + `targetDefaults` | **turborepo 2.9** |
| Library build (multi-entry + .d.ts + inline-worker bundle) | tsc (lib) + tsc (bundle) + esbuild + custom `bundle.mjs` + `makePackageJson.mjs` + `run-s` chain | **tsdown 0.22** (rolldown + oxc), single config |
| Unit / integration tests | vitest 1 (with TS precompile step) + `@web/test-runner` | **vitest 4** (browser mode w/ playwright provider for DOM specs) |
| E2E | playwright 1.58 | **playwright 1.59** |
| Lint + format | eslint 8 + prettier 3 + 9 plugins | **Biome 2.4** |
| Versions SSOT | duplicated in every `package.json` | **pnpm `catalog:`** |
| Dev server | vite 5/6 | vite (latest, only where needed) |
| TypeScript | 5.9 + 4 tsconfigs in shadow-objects | TS 6 + `tsconfig.base.json` + 1 per package |

## Repo-level layout

```
/
├── biome.json                    # NEW: lint + format config
├── turbo.json                    # NEW: pipeline definitions
├── tsconfig.base.json            # NEW: shared TS settings
├── pnpm-workspace.yaml           # UPDATED: catalog: block w/ all dep versions
├── package.json                  # SLIM: only orchestration scripts + dev tools (catalog:)
├── packages/
│   ├── shadow-objects/
│   │   ├── tsconfig.json         # extends ../../tsconfig.base.json
│   │   ├── tsdown.config.ts      # NEW: build pipeline (replaces 4 tsconfigs + bundle.mjs + makePackageJson)
│   │   ├── vitest.config.ts      # NEW
│   │   ├── package.json          # uses catalog: refs
│   │   └── src/                  # unchanged
│   ├── shadow-objects-testing/
│   │   ├── vitest.config.ts      # NEW (browser mode)
│   │   └── tests/                # MOVED: test/**/*.test.js → tests/**/*.test.ts
│   ├── shae-offscreen-canvas/
│   │   ├── vitest.config.ts      # NEW (browser mode)
│   │   ├── tsdown.config.ts      # NEW (just publishes src/* + bundle)
│   │   └── src/                  # unchanged
│   └── shadow-objects-e2e/
│       ├── playwright.config.ts  # bumped
│       └── tests/                # unchanged
├── scripts/
│   └── makeTODO.mjs              # KEPT
├── .biomeignore                  # NEW
└── (REMOVED: nx.json, .eslintrc.json, .eslintignore, .prettierrc, .prettierignore, root tsconfig.json, all project.json, scripts/makePackageJson.mjs, scripts/makeBanner/, scripts/publishNpmPkg.mjs replaced)
```

## Build contract for `@spearwolf/shadow-objects`

`dist/` MUST contain the exact same surface as today (verified by snapshot of dist file tree + dist/package.json):

- `dist/package.json` with current `main`, `module`, `types`, `exports`, `sideEffects`, `dependencies`.
- `dist/src/**/*.{js,d.ts,d.ts.map,js.map}` preserving the source folder structure (so deep imports like `@spearwolf/shadow-objects/shae-ent.js` keep resolving to `dist/src/shae-ent.js`).
- `dist/bundle.js` — single-file ESM bundle with the worker inlined.
- `dist/src/shadow-objects.worker.js` — the standalone worker entry (NOT inlined here, this is the bundled worker source for users who want their own worker URL).

This is the only hard constraint. The other packages may change layout.

## Phasing

1. **Catalog + Biome** (low-risk SSOT + lint/format swap). Verify: `pnpm install`, `pnpm format`, `pnpm lint` work.
2. **Unified tests on vitest 4**. Verify: all existing specs pass under vitest. Drop `@web/test-runner` usage.
3. **shadow-objects build → tsdown**. Verify: byte-equivalent `dist/` (compare file list + `dist/package.json` + a checksum spot-check on bundle.js exports).
4. **nx → turborepo**. Verify: `turbo run build test lint` produces identical results, with caching.
5. **Cleanup**: remove dead files/devDeps, regenerate lockfile, update `AGENTS.md` + `CLAUDE.md` + `packages/shadow-objects/docs/`.

## Risks & mitigations

- **tsdown can't inline a worker the way `esbuild-plugin-inline-worker` does.** Mitigation: tsdown supports rolldown plugins; if not workable, keep a tiny `bundle.mjs` (esbuild) just for that one entry; everything else stays on tsdown.
- **Biome doesn't cover `.astro`.** No `.astro` files exist in this repo — confirmed.
- **vitest browser mode + custom elements (shae-*).** Use playwright provider; pre-warm with `happy-dom` fallback for non-CE specs.
- **TS 6 breaking changes.** Already on TS 5.9 with strict; expected delta is small. Type-check during Phase 3.

## Verification commands per phase

```bash
# Phase 1
pnpm install
pnpm biome check .
pnpm biome format . --write

# Phase 2
pnpm -F @spearwolf/shadow-objects test
pnpm -F shadow-objects-testing test
pnpm -F @spearwolf/shae-offscreen-canvas test

# Phase 3
pnpm -F @spearwolf/shadow-objects build
diff <(cd packages/shadow-objects/dist && find . -type f | sort) <(cat docs/superpowers/specs/dist-snapshot.txt)

# Phase 4
turbo run build test lint --dry=json | jq '.tasks | length'

# Phase 5
pnpm cbt   # full clean / build / test cycle
```
