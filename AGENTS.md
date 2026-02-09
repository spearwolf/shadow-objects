# Shadow Objects Framework - Agent Guide

This document provides context and guidelines for AI agents working on the **Shadow Objects Framework**.

## 1. Project Overview

The **Shadow Objects Framework** is a reactive library designed to decouple business logic and state management from the UI rendering layer. It runs application logic "in the dark" (e.g., in a web worker), mirroring the view hierarchy of the application.

**Goal:** Separate concerns by running logic in a separate thread/context from the UI, using a reactive architecture.

## 2. Architecture & Core Concepts

### Mental Model (The Shadow Theater)
- **View (Screen):** The visible UI (DOM, Canvas). Minimal state, pure projection.
- **Entities (Puppets):** Abstract representation of components in the Shadow World.
- **Shadow Objects (Puppeteer):** Functional units of logic attached to Entities.
- **Token:** String identifier linking View components to Logic.

### Key Components
- **Kernel:** The engine. Manages Entity lifecycle, orchestrates Shadow Objects, and schedules updates.
- **Registry:** Maps **Tokens** to **Shadow Object Constructors**. Defines routing and composition rules.
- **Message Dispatch:** Bridges the gap between Light World (UI) and Shadow World (Worker) via asynchronous messages.

### Reactivity
- Uses Signals and Effects (via `@spearwolf/signalize`).
- **Data Flow:**
  - **Downstream (Props):** View -> Kernel -> Entity -> Shadow Object Signal.
  - **Upstream (Events):** Shadow Object -> Entity -> Kernel -> View.
  - **Lateral (Context):** Hierarchical dependency injection (Provider/Consumer) between Entities.

## 3. Monorepo Structure

- **`packages/shadow-objects/`**: The main framework library. Deployment package: `@spearwolf/shadow-objects`.
- **`packages/shadow-objects/docs/`**: **The authoritative source of documentation.** Contains Fundamentals, Guides, and API references.
- **`packages/shae-offscreen-canvas/`**: An offscreen canvas as custom HTML element based on shadow-objects.
- **`packages/shadow-objects-testing/`**: Functional tests.
- **`packages/shadow-objects-e2e/`**: Blackbox / E2E tests.

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
You don’t add extra emojis or em dashes.
You write to developers as if they are your buddy.
You are technical and aren’t afraid of including code samples.
Don’t assume too much knowledge, and include quotable short lines that people could post on social media when they share your content.

**Documentation Strategy:**
- The new documentation is located at `packages/shadow-objects/docs/`.
- Every change to the source code or public API must be reflected in this documentation folder.
- If concepts change or are introduced, update the docs immediately.
- After modifying source files or docs, review `AGENTS.md` (this file) to ensure it remains accurate. Remove obsolete info, add new info.
- After modifying TODO comments, run `pnpm make:todo`.
