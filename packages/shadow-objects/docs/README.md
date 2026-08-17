# Shadow Objects Documentation

Shadow Objects is an Entity Component System (ECS) for the browser platform. Entities live in a Shadow Environment on the main thread or in a web worker, Shadow Objects attach behavior to them, and your View -- React, Vue, Svelte, plain DOM -- owns the structure and renders the result.

If you have not read it yet, the [project README](https://github.com/spearwolf/shadow-objects#the-five-domains) has the full introduction: the five domains, the three data flows, and the invariants that hold them together. Everything below goes into detail.

## Where to Start

| I want to... | Read this |
| :--- | :--- |
| ...get something running in ten minutes | [getting-started.md](./getting-started.md) |
| ...understand how the pieces fit together | [concepts.md](./concepts.md) |
| ...solve a concrete task | [guides.md](./guides.md) |
| ...look up a method or an attribute | [api-reference.md](./api-reference.md) |
| ...keep one page open while I code | [cheat-sheet.md](./cheat-sheet.md) |
| ...avoid the mistakes everyone makes once | [best-practices.md](./best-practices.md) |

## The Files

| File | What's in it |
| :--- | :--- |
| [getting-started.md](./getting-started.md) | Installation and first working example. |
| [concepts.md](./concepts.md) | The five domains, entity lifecycle, entity tree, context, events, invariants. |
| [guides.md](./guides.md) | Step-by-step recipes for common tasks. |
| [api-reference.md](./api-reference.md) | Complete API reference for every class, method, and web component. |
| [cheat-sheet.md](./cheat-sheet.md) | One-page quick reference. Print it out. |
| [best-practices.md](./best-practices.md) | Patterns from real-world projects: signals vs context, resource management, and more. |

## Related Packages

- [**@spearwolf/shae-offscreen-canvas**](../../shae-offscreen-canvas/README.md) -- Offscreen canvas integration for rendering in a worker alongside your Shadow Objects logic.
