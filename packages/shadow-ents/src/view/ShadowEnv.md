# ShadowEnv

![ShadowEnv](./ShadowEnv.drawio.svg)

The _ShadowEnv_ class creates an environment that references the _view_ and provides a connection to the _shadow worker environment_.

The _view_ consists of the [ComponentContext](./ComponentContext.md) and the [view components](./ViewComponent.md) contained within it.

The _worker environment_ is the runtime environment for all _shadow objects_ and consists of the _MessageRouter_, the _Kernel_, and the _Registry_.
