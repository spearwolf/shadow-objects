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
| `parent` | [`ViewComponent`](./ViewComponent.ts) | A _view component_ can have a parent, otherwise it is automatically a _root component_ |
| `order` | _number_ | Specify the order in which to arrange a component in a children array of the parent view component. Items in a child array are sorted by ascending value and then by order of insertion. The default order is 0 |

## Custom properties

The _view component_ can contain any custom properties. The _shadow objects_ can read them and react to changes.

> **.setProperty( name:** string, **value:** any **)**

To set a property, use the `setProperty()` method.

> **.removeProperty( name:** string **)**

To remove a property, use the `removeProperty()` method.


## Two-way events

In addition to the properties, a _view component_ can send events to the _shadow objects_:

> **.dispatchShadowObjectsEvent( type:** string, **data:** any, **transferables?:** Object[] **)**

Events have a type and can contain arbitrary data.

However, it should be noted that the data is all cloned by default! this is unavoidable because the _shadow objects_ usually exist in a _remote_ environment (e.g. web worker). (The "local" environment is the exception here, but even here all data is cloned by default using the [`structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) function.

[If you want to avoid cloning for certain objects and instead transfer the object resources to the remote environment, you should also pass the objects using the transferables parameter.](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)

_TODO: explain how to receive events from shadow objects_
