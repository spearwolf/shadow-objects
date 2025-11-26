# shadow-objects

A reactive entity&larr;component framework that feels home in the shadows 🧛

> [!WARNING]
> 🚀 This is a highly experimental framework that is slowly maturing. Use at your own risk. 🔥

## Introduction 👀

The **Shadow Objects Framework** is a reactive library designed to decouple business logic and state management from the UI rendering layer. It runs application logic "in the dark" (e.g., in a web worker), mirroring the view hierarchy of your application.

Key features include:

-   **Decoupled Logic**: Business logic resides in "Shadow Objects" separate from UI components.
-   **Entity-Component System**: Mirrors the view hierarchy (DOM) with a tree of Entities.
-   **Reactivity**: Built on signals and effects for automatic state synchronization.
-   **Context System**: Hierarchical dependency injection similar to React Context.

For a detailed deep dive into the architecture and API, please refer to the [**Shadow Objects Documentation**](packages/shadow-objects/README.md).

## 🏗️ Project Structure

This repository is a monorepo managed with [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).

| Package | Description |
| :--- | :--- |
| **[`shadow-objects`](packages/shadow-objects/)** | The core framework library. |
| **[`shae-offscreen-canvas`](packages/shae-offscreen-canvas/)** | A custom HTML element implementing an **offscreen canvas**, built with shadow-objects. |
| **[`shadow-objects-testing`](packages/shadow-objects-testing/)** | Functional and integration tests for the framework. |
| **[`shadow-objects-e2e`](packages/shadow-objects-e2e/)** | End-to-end tests using [Playwright](https://playwright.dev/). |

## ⚙️ Development Setup

### Prerequisites

- **Node.js**: >=20.12.2
- **pnpm**: >=9.1.2

### Installation

1.  **Install dependencies:**

    ```sh
    pnpm install
    ```

2.  **Install Playwright browsers:**

    The E2E tests require Playwright browsers to be installed manually.

    ```sh
    cd packages/shadow-objects-e2e
    pnpm exec playwright install chromium firefox
    cd ../..
    ```

### Common Tasks

-   **Build & Test All:**
    Run a clean build and all tests (unit, functional, e2e) across the workspace.

    ```sh
    pnpm cbt
    ```
    *(Alias for `pnpm run-s clean build test`)*

-   **Start Demo:**
    Launch the `shae-offscreen-canvas` demo to see the framework in action.

    ```sh
    pnpm start
    ```

-   **Run Tests:**
    ```sh
    pnpm test        # Run all tests
    pnpm test:ci     # Run tests excluding E2E (faster)
    ```

-   **Linting:**
    ```sh
    pnpm lint
    ```

- - -

> 🔎 **Note:** This project tracks tasks directly in the source code using `TODO`, `FIXME`, and `XXX` comments. See [TODO.md](TODO.md) for an auto-generated overview.
