# ComponentContext

![ConmponentContext](./ComponentContext.drawio.svg)

The [`ComponentContext`](./ComponentContext.ts) class is the state store for the [view components](./ViewComponent.md).

The contexts are each assigned to a *namespace*. The context for a namespace is simply queried using the *get* method:

```js
const ctx = ComponentContext.get('my-namespace');
```

If you do not specify a namespace, the default namespace will be returned:

```js
const ctx = ComponentContext.get();
```

The [view components](./ViewComponent.md) are stored hierarchically in a tree structure. It is possible to have multiple roots (view components) in a context.
