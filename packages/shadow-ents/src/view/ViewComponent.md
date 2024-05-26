# ViewComponent

*View components* are simply created by instantiating the [`ViewComponent`](./ViewComponent.ts) class. each *view component* is always assigned to a [component context](./ComponentContext.md), if this is not specified, then it is automatically the default context.

In addition to a context, a *view component* always has a _token_ (a string).

```js
const vc0 = new ViewComponent('my-token');

vc0.context === ComponentContext.get() // => true

// ---

const myCtx = ComponentContext.get('my-ctx');
const vc1 = new ViewComponent('first', {context: myCtx});

vc1.context === myCtx // => true
```

## Mandatory properties of a view component

| property | type | description |
|----------|------|-------------|
| `context` | [`ComponentContext`](./ComponentContext.ts) | The context of this _view component_ |
| `uuid` | _string_ | Every _view component_ automatically has such an ID, and it is, as the name suggests, unique |
| `token` | _string_ | Each _view component_ has a _token_, which can be anything and does not have to be unique (unlike the `uuid`) |
