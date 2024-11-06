# shadow-objects

A view-decoupled component framework for games and other complex in-browser applications.

> [!WARNING]
> A highly experimental component framework that is slowly maturing.
## Introduction 👀

The components are generated within the main document of the browser.

The components are created and utilized through the use of the custom HTML elements `<shae-ent />` and `<shae-prop/>` or alternatively, through the direct application of the JavaScript API.

The components are therefore arranged in a hierarchy that is analogous to the DOM structure.

It should be noted, however, that the components are merely lightweight containers for data in the form of properties.
This data structure is synchronized with the worker runtime, which is outsourced to a web worker. 

The component structure within the Document Object Model (DOM) is converted into an entity hierarchy within the worker. Additionally, any JavaScript objects, which are referred to as "shadow objects," can be created within the context of an entity.

The *shadow objects* represent the fundamental aspect of the framework. The underlying concept is straightforward: the developer creates shadow objects, either through a `function` or a `class`, according to their preference.

The shadow objects are then entered into a registry using a unique identifier.

The routing determines which shadow objects are created within which entity.

[If you want to know more, just follow this link &rarr;](./packages/shadow-objects/README.md)

## ⚙️ Local Dev Setup

This is a monorepo based on [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).


Just use ...

```sh
$ pnpm install
```

... to install or refresh all the dependencies. After that you can simply build and test all packages with ..

```sh
$ pnpm cbt  # => clean build test
```

> 🔎 This project does not currently use a separate issue tracking system; instead, TODO, FIXME, and XXX issues are written directly as comments in the source code, without any further indirection.
> An overview of open issues can be found in [TODO.md](TODO.md).

## 📖 Content

| package | description |
|-|-|
| [`shadow-objects`](packages/shadow-objects/) | the slightly different component framework |
| [`shae-offscreen-canvas`](packages/shae-offscreen-canvas/) | a **offscreen canvas** as custom html **element** based on shadow-objects |
| [`shadow-objects-testing`](packages/shadow-objects-testing/) | functional tests |
| [`shadow-objects-e2e`](packages/shadow-objects-e2e/) | blackbox / e2e tests |

---

<figure>

![spearwolf](spearwolf.svg)

<figcaption><small>Thank you and have a nice day 😄</small></figcaption>
</figure>
