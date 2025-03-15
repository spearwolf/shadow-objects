# shadow-objects

A standalone entity&larr;component framework that feels home in the shadows 🧛

> [!WARNING]
> 🚀 This is a highly experimental framework that is slowly maturing. Use at your own risk.

## Introduction 👀

TODO ..

## ⚙️ Local Dev Setup

This is a monorepo based on [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).

First, install dependencies with ...

```sh
$ pnpm install
```
You will also need to install the _playwright_ browser bundles _chromium_ and _firefox_ once in the [./packages/shadow-objects-e2e/](./packages/shadow-objects-e2e/) directory

```sh
$ cd packages/shadow-objects-e2e
packages/shadow-objects-e2e$ pnpm exec playwright install chromium
packages/shadow-objects-e2e$ pnpm exec playwright install firefox
```

After that you can build the framework and run all the tests with ..

```sh
$ pnpm cbt  # => clean build test
```

A first demo can simply be started with `pnpm start`. This is very useful to see if everything works. The demo shows functions from the optional `shae-offscreen-canvas` library.

## 📖 Packages

| package | description |
|-|-|
| [`shadow-objects`](packages/shadow-objects/) | the main framework |
| [`shae-offscreen-canvas`](packages/shae-offscreen-canvas/) | an **offscreen canvas** as custom html **element** based on shadow-objects |
| [`shadow-objects-testing`](packages/shadow-objects-testing/) | functional tests |
| [`shadow-objects-e2e`](packages/shadow-objects-e2e/) | blackbox / e2e tests |

- - -

> 🔎 This project does not currently use a separate issue tracking system; instead, TODO, FIXME, and XXX issues are written directly as comments in the source code, without any further indirection.
> An overview of open issues can be found in [TODO.md](TODO.md).
