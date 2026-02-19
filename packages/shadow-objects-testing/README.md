# shadow-objects-testing

Functional and integration test suite for the `@spearwolf/shadow-objects` core library.

This package is not published to npm. It exists solely to exercise the shadow-objects internals in a real browser environment using `@web/test-runner`.

## What lives here

- **Entity and component lifecycle tests** -- verifying that entities are created, destroyed, and re-parented correctly
- **Token and registry tests** -- confirming that tokens connect view nodes to the right shadow objects
- **Change propagation tests** -- covering how property and token changes flow through the shadow environment
- **Event routing tests** -- ensuring that events sent from the view layer reach the correct shadow objects

## How to run

From the monorepo root:

```bash
pnpm nx run shadow-objects-testing:test
```

Or from inside this package:

```bash
pnpm test
```

To run in watch mode:

```bash
pnpm watch
```
