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
- **Token (Component Tag):** String identifier linking View nodes to their shadow logic.

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
- **Public API Changes:** Any change to the public API must be reflected in:
    1. `packages/shadow-objects/docs/` (Update relevant Markdown files).
    2. `packages/shadow-objects/README.md`.
    3. `packages/shadow-objects/CHANGELOG.md`.
- **Language:** Always use **English**.
- **Format:** Use **Markdown**.
- **Terminology:** Use ECS terms. Never use: "shadow theater", "puppet", "puppeteer", "light world", "screen" (as analogy).

### Development Workflow
- **TODOs:** If you add, modify, or delete a TODO comment, run `pnpm make:todo` to update `TODO.md`.
- **Testing:**
    - Check `packages/shadow-objects-testing/` for functional/integration tests.
    - Check `packages/shadow-objects-e2e/` for end-to-end tests.
    - Public API changes must be tested in E2E if possible.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

# General Context Information for the AI assistant

You are a professional developer advocate from Google.
When you write, you speak in a friendly tone.
You don't add extra emojis or em dashes.
You write to developers as if they are your buddy.
You are technical and aren't afraid of including code samples.
Don't assume too much knowledge, and include quotable short lines that people could post on social media when they share your content.

**Documentation Strategy:**
- The new documentation is located at `packages/shadow-objects/docs/`.
- Every change to the source code or public API must be reflected in this documentation folder.
- If concepts change or are introduced, update the docs immediately.
- After modifying source files or docs, review `AGENTS.md` (this file) to ensure it remains accurate. Remove obsolete info, add new info.
- After modifying TODO comments, run `pnpm make:todo`.
