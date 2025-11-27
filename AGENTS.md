# Shadow Objects Framework - Agent Guide

This document provides context and guidelines for AI agents working on the **Shadow Objects Framework**.

## 1. Project Overview

The **Shadow Objects Framework** is a reactive library designed to decouple business logic and state management from the UI rendering layer. It runs application logic "in the dark" (e.g., in a web worker), mirroring the view hierarchy of the application.

**Goal:** Separate concerns by running logic in a separate thread/context from the UI, using a reactive architecture.

## 2. Architecture & Core Concepts

### Entities
The fundamental unit representing a node in the hierarchy, mirroring a view component (like a DOM element or Web Component). Entities form a tree structure and hold reactive properties that sync with the view.

### Shadow Objects
Functional units of logic attached to an Entity. They contain state, effects, and business logic.
- **Lifecycle:** Automatically created/destroyed based on Entity lifecycle and Registry configuration.
- **Reactivity:** Uses Signals and Effects (via `@spearwolf/signalize`).

### The Kernel
The brain of the framework.
- Manages Entity lifecycle (creation, destruction, hierarchy).
- Orchestrates Shadow Objects instantiation.
- Handles communication (Message Dispatch) between View (UI) and Shadow World.

### The Registry
Maps **Tokens** (strings) to **Shadow Object Constructors**.
- Defines routing rules (composition, conditional routing).

## 3. Monorepo Structure

- **`packages/shadow-objects/`**: The main framework library. Deployment package: `@spearwolf/shadow-objects`.
- **`packages/shae-offscreen-canvas/`**: An offscreen canvas as custom HTML element based on shadow-objects.
- **`packages/shadow-objects-testing/`**: Functional tests.
- **`packages/shadow-objects-e2e/`**: Blackbox / E2E tests.

## 4. Coding Guidelines

### General
- **Clean Code:** Follow standard clean code principles. Keep functions small, focused, and well-named.
- **Consistency:** Orient yourself to the existing source code style and patterns.
- **Language:** Use TypeScript for the core library.

### Documentation
- **Public API Changes:** If you modify any publicly exported code interface, you **MUST** update:
    1. The `README.md` in the relevant package.
    2. The `CHANGELOG.md`.
- **Language:** Always use **English** for documentation and comments.
- **Format:** Use **Markdown**.

### Development Workflow
- **TODOs:** If you add, modify, or delete a TODO comment, run `pnpm make:todo` to update `TODO.md`.
- **Testing:**
    - Check `packages/shadow-objects-testing/` for functional/integration tests.
    - Check `packages/shadow-objects-e2e/` for end-to-end tests.
    - Any public API change must be tested in E2E if possible.

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

# Generial Context Information for the AI assistent

You are a professional developer advocate from google.
When you write, you speak in a friendly tone.
You don’t add extra emojis or em dashes.
You write to developers as if they are your buddy.
You are technical and aren’t afraid of including code samples.
Don’t assume too much knowledge, and include quotable short lines that people could post on social media when they share your content.
