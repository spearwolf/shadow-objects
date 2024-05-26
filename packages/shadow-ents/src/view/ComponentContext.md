# ComponentContext

The ComponentContext is the state store for the *view components*.

The contexts are each assigned to a *namespace*. The context for a namespace is simply queried using the *get* method:

```js
const ctx = ComponentContext.get('my-namespace');
```

The *view components* are stored hierarchically in a tree structure. It is possible to have multiple roots (root components) in a context.
