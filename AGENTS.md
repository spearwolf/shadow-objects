# Shadow Objects Framework - Agent Guide

This document provides context and guidelines for AI agents working on the **Shadow Objects Framework**.

## 1. How It Works (3 lines)

Shadow Objects is an ECS framework where **Entities** (game objects) live in a **Shadow Environment** (main thread or web worker), and **Shadow Objects** (ECS components) attach behavior to them. The **View Layer** (DOM, Canvas) renders entity state and dispatches events back into the shadow environment. The **Kernel** orchestrates the entity lifecycle and schedules updates.

## 2. Architecture & Core Concepts

### Mental Model (ECS Game Engine)

Shadow Objects is an Entity-Component System (ECS) applied to web app state management:

- **View / Renderer:** The visible UI (DOM, Canvas). Minimal state, pure rendering.
- **Entities (Game Objects):** Lightweight containers in the shadow environment — no logic of their own.
- **Shadow Objects (ECS Components):** Functional units of logic attached to Entities. This is where behavior lives.
- **Token:** String identifier linking View nodes to their shadow logic.

### Key Components

- **Kernel (ECS System Runner):** Manages Entity lifecycle, orchestrates Shadow Objects, schedules updates.
- **Registry (Component Manifest):** Maps **Tokens** to **Shadow Object Constructors**. Defines routing and composition rules.
- **Message Dispatch:** Bridges View Layer and Shadow Environment via asynchronous messages.

### Reactivity

Uses Signals and Effects (via `@spearwolf/signalize`).

**Data Flow:**
- **Downstream (Props):** View -> Kernel -> Entity -> Shadow Object Signal.
- **Upstream (Events):** Shadow Object -> Entity -> Kernel -> View.
- **Lateral (Context):** Hierarchical dependency injection (Provider/Consumer) between Entities.

**Dispatching a notification.** Every fan-out the framework sends to code it does not own goes out
through eventize's guarded dispatch, never the plain `emit()`: a listener that throws costs itself
and nothing else. Which of the two applies follows from who reports the failure. Where the caller
holds context worth naming — an entity uuid, the display name of a Shadow Object — it is
`emitStrict()` inside a `runGuarded()`, so the failures come back and the report goes through the
`ConsoleLogger` with that context. Where there is no logger and nothing to add (`FrameLoop`,
`ViewComponent`, `SignalsPath`), it is `emitSafe()` and eventize's own `console.warn`. A plain
`emit()` stays right for a Shadow Object's own outbound events, where the author owns every
listener — the creation API's `emit()` is one. The choice is not free: eventize wires the guarded
step in process-wide the first time either variant is called, and every `emit()` in that process
pays for it. Paid once, it is paid for all of them.

## 3. Monorepo Structure

| Package | npm name | Purpose |
|---------|----------|---------|
| `packages/shadow-objects/` | `@spearwolf/shadow-objects` | Core framework library |
| `packages/shae-offscreen-canvas/` | `@spearwolf/shae-offscreen-canvas` | Offscreen canvas custom element (example impl) |
| `packages/shadow-objects-testing/` | — (not published) | Functional/integration tests |
| `packages/shadow-objects-e2e/` | — (not published) | Playwright E2E tests |

**Docs location:** `packages/shadow-objects/docs/` is the authoritative source of documentation. It uses a flat 7-file structure:

| File | Purpose |
|------|---------|
| `docs/README.md` | Overview and navigation |
| `docs/getting-started.md` | Hello World, first shadow object |
| `docs/concepts.md` | ECS mental model, architecture, lifecycle, entity tree |
| `docs/guides.md` | Writing shadow objects, view integration, multi-env setup |
| `docs/api-reference.md` | Full API reference (all methods, options, types) |
| `docs/cheat-sheet.md` | At-a-glance tables and snippets |
| `docs/best-practices.md` | Patterns, composition, cleanup, testing |

## 4. Coding Guidelines

### General
- **Clean Code:** Follow standard clean code principles. Keep functions small, focused, and well-named.
- **Consistency:** Orient yourself to the existing source code style and patterns.
- **Language:** Use TypeScript for the core library.

### Documentation
- **Authoritative Source:** The documentation lives in `packages/shadow-objects/docs/`. Any reference to "shadow-objects developer documentation" always refers to this directory.
- **Public API Changes:** Any change to the public API of `@spearwolf/shadow-objects` must be reflected in:
    1. `packages/shadow-objects/docs/` (Update relevant Markdown files).
    2. `packages/shadow-objects/README.md`.
    3. `packages/shadow-objects/CHANGELOG.md`.

    A public API change in another published package documents itself the same way, in that package's
    own `docs/`, `README.md` and `CHANGELOG.md` — `@spearwolf/shae-offscreen-canvas` is the second one.
- **Concepts:** When a concept changes or a new one arrives, `packages/shadow-objects/docs/` changes in the same commit.
- **Language:** Always use **English**.
- **Format:** Use **Markdown**.
- **Terminology:** Use ECS terms. Never use: "shadow theater", "puppet", "puppeteer", "light world", "screen" (as analogy).

#### Binding Terms

Documentation that invents plausible-sounding names is the most dangerous kind. The left column is binding:

| Use this | Not this | Why |
|---|---|---|
| `RemoteWorkerEnv` | `RemoteShadowObjectEnv` | The class is not called that. |
| Entity | Shadow Entity | ECS term, and "Shadow" is already in "Shadow Environment". |
| Entity Tree | Shadow Entity Graph | It is a tree, every node has exactly one parent. `getEntityGraph()` stays as a method name. |
| Namespace / `ComponentContext` | Shadow Context | See the context note below. |
| Token | Component Tag | The code knows only `token`, and no gloss renames it. |

**The word "context" means two unrelated things.** `ComponentContext` is the View-side registry of a namespace, i.e. the connection to an environment. `provideContext` / `useContext` are dependency injection along the entity tree. They never interact. Keep them apart at every occurrence: write `ComponentContext` in full, and say "Entity Context" for the other one.

`pnpm lint:terms` checks the documentation against this section — every package's `docs/` directory and every `README.md`. Its list of terms lives in `scripts/checkTerminology.mjs`, so a row added to the table above belongs there as well, or nothing checks it. The list leaves out "screen" on purpose: the word is literal in a workspace that ships `shae-offscreen-canvas`, and only its use as an analogy is banned.

### Development Workflow
- **TODOs:** If you add, modify, or delete a TODO comment, run `pnpm make:todo` to update `TODO.md`.
- **This guide:** After a change to source files or docs, read this file again and bring it back in line — take out what no longer holds, add what is new.
- **Testing:**
    - Check `packages/shadow-objects-testing/` for functional/integration tests.
    - Check `packages/shadow-objects-e2e/` for end-to-end tests.
    - Public API changes must be tested in E2E if possible.
    - Coverage: all three vitest suites (`packages/shadow-objects`, `packages/shadow-objects-testing`, `packages/shae-offscreen-canvas`) run with `--coverage`; `pnpm coverage` merges their raw reports into one under `coverage/` at the repo root, and `pnpm test` runs that merge automatically. No thresholds. `packages/shadow-objects-e2e` is Playwright, not vitest, and stays out of the merge.
    - Each package's own `test` task holds its published-package layout against a recorded expectation: `packages/shadow-objects` checks `dist/` — file list and `dist/package.json` shape (`src/distContract.spec.ts`) — and `packages/shae-offscreen-canvas` checks `.npm-pkg/` the same way (`src/distContract.spec.js`).

# Toolchain (post-2026-renewal)

| Concern | Tool |
|---|---|
| Package manager | `pnpm` 11 (workspaces + `catalog:` for dependency-version SSOT) |
| Monorepo orchestrator | `turborepo` 2.10 — pipeline in `turbo.json` |
| TypeScript | `tsc` 7 — only emits `.d.ts` (declaration-only) |
| Bundler / transpiler | `esbuild` 0.28 (lib transpile + single-file inline-worker bundle) |
| Unit / integration tests | `vitest` 4 (happy-dom for unit, `@vitest/browser` + Playwright provider for DOM-integration, `@vitest/coverage-v8` for coverage) |
| E2E | `@playwright/test` 1.62 |
| Lint + format | `biome` 2.5 (replaces eslint + prettier) |
| Dev server | `vite` 7 (only `shae-offscreen-canvas` demo and `shadow-objects-e2e`) |

**Dependency versions:** never write a plain version range in a per-package `package.json`. Add the version to the `catalog:` block of `pnpm-workspace.yaml` and reference it from each package as `"<dep>": "catalog:"`. A range that is not an install pin — today only the `three` peer of `shae-offscreen-canvas` — lives in a named catalog under `catalogs:` and is referenced as `"<dep>": "catalog:<name>"`.

**Deliberate holdbacks.** `vite` (override at 7.x — Oxc does not lower the `@signal … accessor` decorators) and `turbo` (catalog entry — pnpm's one-day `minimumReleaseAge`) are pinned below latest on purpose. Each carries its reason as a comment in `pnpm-workspace.yaml`; `CLAUDE.md` has the long form. Bumping one without reading the comment breaks the test suite or the install.

**`@spearwolf/eventize` and `@spearwolf/signalize` move as a pair**, never one at a time: signalize peers on a single eventize major. Both key their internal slots with realm-wide symbols, so two majors of either in one tree share a slot per object and fail at the boundary rather than merely duplicating code. After any bump, `pnpm why -r @spearwolf/eventize` has to report exactly one version.

**Run tasks via turbo (`pnpm build`, `pnpm test`, …) instead of invoking the underlying tools directly** — the cache and the cross-package dependency graph are defined there. See `CLAUDE.md` for the full command reference.
