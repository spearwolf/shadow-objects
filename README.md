# shadow-objects

A reactive entity&larr;component framework that feels home in the shadows 🧛

> [!WARNING]
> 🚀 This is a highly experimental framework that is slowly maturing. Use at your own risk. 🔥

## Documentation 📚

**The complete and authoritative documentation is located in the [`packages/shadow-objects/docs/`](packages/shadow-objects/docs/) directory.**

*   [**Fundamentals**](packages/shadow-objects/docs/01-fundamentals/): Understand the mental model, architecture, and lifecycle.
*   [**Guides**](packages/shadow-objects/docs/02-guides/): Step-by-step instructions.
*   [**API Reference**](packages/shadow-objects/docs/03-api/): Detailed API docs.

## 🏗️ Project Structure

This repository is a monorepo managed with [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).

| Package | Description |
| :--- | :--- |
| **[`shadow-objects`](packages/shadow-objects/)** | The core framework library. |
| **[`shae-offscreen-canvas`](packages/shae-offscreen-canvas/)** | A custom HTML element implementing an **offscreen canvas**. |
| **[`shadow-objects-testing`](packages/shadow-objects-testing/)** | Functional and integration tests. |
| **[`shadow-objects-e2e`](packages/shadow-objects-e2e/)** | End-to-end tests using [Playwright](https://playwright.dev/). |

## ⚡ Available Scripts

Run these commands from the root directory:

| Command | Description |
| :--- | :--- |
| `pnpm cbt` | **Clean, Build, Test.** Runs a full clean build and test cycle for the entire workspace. |
| `pnpm start` | Starts the **shae-offscreen-canvas** demo server. |
| `pnpm test` | Runs all tests (Unit, Integration, E2E) across all packages. |
| `pnpm test:ci` | Runs tests excluding E2E (faster, for CI pipelines). |
| `pnpm build` | Builds all packages. |
| `pnpm lint` | Runs linting across the workspace. |
| `pnpm clean` | Cleans all build artifacts (`dist`, `build` folders). |

## ⚙️ Development Setup

1.  **Prerequisites:** Node.js >=20.12.2, pnpm >=9.1.2
2.  **Install dependencies:**
    ```sh
    pnpm install
    ```
3.  **Install Playwright browsers (for E2E):**
    ```sh
    cd packages/shadow-objects-e2e
    pnpm exec playwright install chromium firefox
    cd ../..
    ```
