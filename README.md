# shadow-objects

A reactive Entity-Component Framework for running app logic in a shadow environment.

> [!WARNING]
> This is a highly experimental framework that is slowly maturing. Use at your own risk.

---

## The Mental Model: ECS for Web Apps

Think of shadow-objects like a **game engine for your application state**:

- **Your UI (React, Vue, Svelte, Canvas)** is the renderer — it just draws what it's told.
- **Entities** are lightweight game objects in the shadow environment. No logic, just identity.
- **Shadow Objects** are ECS components that attach behavior to entities — signals, effects, event handlers.
- **The Kernel** runs the show: it manages entity lifecycle and schedules updates.

Your UI is the renderer. Shadow Objects is the game world.

The shadow environment can run on the **main thread** (local mode, zero overhead) or in a **web worker** (remote mode, parallel execution). Both are first-class citizens.

**Shadow Objects doesn't replace React, Vue, or Svelte.** It's the logic layer those frameworks render. When your app state gets complex enough that you're fighting your UI framework's reactivity, shadow-objects gives you a clean separation: business logic over here, rendering over there.

If Redux and Zustand are global state on one thread, shadow-objects is reactive ECS state across any number of threads.

---

> [!WARNING]
> 🚀 This is a highly experimental framework that is slowly maturing. Use at your own risk. 🔥

---

## Documentation

**The complete and authoritative documentation is in [`packages/shadow-objects/docs/`](packages/shadow-objects/docs/).**

| File | What's inside |
| :--- | :--- |
| [**getting-started.md**](packages/shadow-objects/docs/getting-started.md) | Hello World, your first shadow object |
| [**concepts.md**](packages/shadow-objects/docs/concepts.md) | ECS mental model, architecture, lifecycle, entity tree |
| [**guides.md**](packages/shadow-objects/docs/guides.md) | Writing shadow objects, view integration, multi-env setup |
| [**api-reference.md**](packages/shadow-objects/docs/api-reference.md) | Full API reference |
| [**cheat-sheet.md**](packages/shadow-objects/docs/cheat-sheet.md) | At-a-glance tables and snippets |
| [**best-practices.md**](packages/shadow-objects/docs/best-practices.md) | Patterns, composition, cleanup, testing |

---

## Project Structure (Monorepo)

This repository is a monorepo managed with [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).

| Package | npm name | Description |
| :--- | :--- | :--- |
| [**`shadow-objects`**](packages/shadow-objects/) | `@spearwolf/shadow-objects` | The core framework library |
| [**`shae-offscreen-canvas`**](packages/shae-offscreen-canvas/) | `@spearwolf/shae-offscreen-canvas` | Custom element for offscreen canvas rendering — demonstrates shadow-objects for graphics |
| [**`shadow-objects-testing`**](packages/shadow-objects-testing/) | — (not published) | Functional and integration tests |
| [**`shadow-objects-e2e`**](packages/shadow-objects-e2e/) | — (not published) | End-to-end tests using [Playwright](https://playwright.dev/) |

---

## Available Scripts

Run these commands from the root directory:

| Command | Description |
| :--- | :--- |
| `pnpm cbt` | **Clean, Build, Test.** Runs a full cycle: clean, build, and test the entire workspace. |
| `pnpm start` | Starts the **shae-offscreen-canvas** demo server. |
| `pnpm test` | Runs all tests (Unit, Integration, E2E) across all packages. |
| `pnpm test:ci` | Runs tests excluding E2E (faster, for CI pipelines). |
| `pnpm build` | Builds all packages. |
| `pnpm lint` | Runs linter across the entire workspace. |
| `pnpm clean` | Deletes all build artifacts (`dist`, `build` folders). |

---

## Development Setup

1. **Prerequisites:** Node.js >=20.12.2, pnpm >=9.1.2
2. **Install Dependencies:**
    ```sh
    pnpm install
    ```
3. **Install Playwright Browsers (for E2E Tests):**
    ```sh
    cd packages/shadow-objects-e2e
    pnpm exec playwright install chromium firefox
    cd ../..
    ```
