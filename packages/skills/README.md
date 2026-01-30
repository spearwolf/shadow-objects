# @spearwolf/shadow-objects Skills

Agent Skills for the **Shadow Objects Framework** - a reactive library for decoupling business logic from UI rendering.

## Installation

Install all skills:

```bash
npx skills add spearwolf/shadow-objects
```

Or install specific skills:

```bash
npx skills add spearwolf/shadow-objects --skill shadow-objects-basics
npx skills add spearwolf/shadow-objects --skill shadow-objects-context
```

## Available Skills

| Skill | Description |
|-------|-------------|
| [`shadow-objects-basics`](./skills/shadow-objects-basics/) | Fundamentals: Entities, Tokens, Shadow Objects, Kernel, Registry, Web Components setup |
| [`shadow-objects-context`](./skills/shadow-objects-context/) | Context patterns with Provider/Consumer and the type-safe Context Reader pattern |
| [`shadow-objects-signals`](./skills/shadow-objects-signals/) | Reactive programming with Signals, Effects, and Memos |
| [`shadow-objects-lifecycle`](./skills/shadow-objects-lifecycle/) | Lifecycle management, resource cleanup, and the createResource pattern |
| [`shadow-objects-events`](./skills/shadow-objects-events/) | Event communication between View and Shadow World |

## What is Shadow Objects?

Shadow Objects is a reactive library that runs your application logic "in the shadows" (typically a Web Worker), completely decoupled from your UI layer.

While many modern UI frameworks separate logic and view to some degree, **Shadow Objects goes a step further by implementing a full Entity Component System (ECS).**

Think of it like a shadow theater:

- **The Screen (View)**: What the audience sees - your DOM, Canvas, or any UI
- **The Puppets (Entities)**: Abstract representations with structure and properties
- **The Puppeteer (Shadow Objects)**: The logic (components) that controls everything

This architecture allows you to build complex logic systems that are entirely independent of the rendering target. It provides:
- **True Separation:** Deeply decoupled business logic from UI rendering.
- **ECS Architecture:** Compose behavior using Entities and Components instead of inheritance.
- **Performance:** Run heavy logic in a separate thread (Web Worker) without blocking the UI.
- **Reactivity:** State management powered by fine-grained Signals.

## Resources

- [Shadow Objects Documentation](https://github.com/spearwolf/shadow-objects/tree/main/packages/shadow-objects/docs)
- [Shadow Objects on npm](https://www.npmjs.com/package/@spearwolf/shadow-objects)
- [Agent Skills Specification](https://agentskills.io)

## License

Apache-2.0
