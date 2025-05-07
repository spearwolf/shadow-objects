_hi! welcome to .._
# shadow-objects 🧛

## Introduction

_Shadow-objects_ is a standalone, reactive entity&larr;component framework 🔥

The original idea is visualized in this overview:

![architecture overview](https://raw.githubusercontent.com/spearwolf/shadow-objects/main/packages/shadow-objects/docs/architecture%402x.png)

> _ents_ is short for latin _"entitatis"_, which translates to _"shadow entities"_

> [!IMPORTANT]
> _Dear adventurer, be warned: everything here is highly experimental and in active development and constant flux!_

The components are created in the view space. Hierarchical. In your browser. There is a JavaScript API for this. But to keep things simple, there are also ready-to-use web components.

```html
<shae-worker-env local? src="./my-personal-shadow-objects.js" />

<shae-ent ns? token="foo">
  <shae-ent ns? token="bar">
    <shae-prop name="myNumbers" value="1 2 3" type="integer[]" />
  </shae-ent>
</shae-ent>
```

In the shadows, the _shadow objects_ come and go with the entities. An entity can cover many shadows. But all are united by the entity _token_. That token, which is specified by the _view components_.

The _shadow object module_ stores which shadow objects are hidden behind a token. Either a _function_ or a _class_.

```js
shadowObjects.define('token', function() {
  console.log('The simplest shadow object ever.');
});

@ShadowObject('token')
class Foo {
  constructor({
    entity,
    provideContext,
    useContext,
    useProperty,
    onDestroy,
  }: ShadowObjectParams) {
    console.log('hello');    
    
    onDestroy(() => {
      console.log('bye');
    });
  }
}
```

> [!WARNING]
> Sorry, at this point there should be a precise and crisp introduction to the concepts of the framework, but unfortunately this is not currently available.
> Instead of that, a few insights into the implementation will follow

## 📖 Shadow Objects CHEAT SHEET

There are two ways to create a _shadow object component_: either as a _function_ or as a _class_:

### Create Shadow Object by FUNCTION

```js
import { onDestroy, type ShadowObjectParams, type Entity } from "@spearwolf/shadow-objects/shadow-objects.js";

function MyShadowObject(params: ShadowObjectParams) {
  //
  // ... PUT YOUR IMPLEMENTATION HERE ...
  //
 
  // Return an object. This step is optional.
  return {
    // All methods here are reactive and correspond to entity events of the same name!

    [onDestroy](entity: Entity) {
      // Called when the shadow object is destroyed.
      // This is one of the predefined events that a shadow object can receive.

      // This can happen when the entity is destroyed or the shadow object component
      // is removed from the entity (e.g., by changing the entity token, view properties, and/or routing)
    },

    fooBar(plah) {
      /* is called when the entity receives a 'fooBar' event */
    },
  };
}
```

### Create Shadow Object by CLASS

Essentially the same as above, but as a `class`:

```js
import { onDestroy, type ShadowObjectParams, type Entity } from "@spearwolf/shadow-objects/shadow-objects.js";

class MyShadowObject {
  constructor(params: ShadowObjectParams) {
    //
    // ... INITIALIZE SHADOW OBJECT ...
    //
  }

  [onDestroy](entity: Entity) {
    // ...
  }

  fooBar(plah) {
    // ...
  }
}
```

### Shadow Object Construction API

The parameters that a shadow object receives when it is created contain all the important API methods for exchanging data and events with the _view_ and also with the _shadow entity hierarchy and context_.

[The interface `ShadowObjectsParams` is defined here](./src/types.ts)

#### Properties

__entity__: The shadow entity.

#### Methods

| Name | Call Signature | Description |
|------|----------------|-------------|
| __useProperty__ | `useProperty(name, isEqual?): SignalReader` | Read access to the property value from the view |
| __useContext__ | `useContext(name, isEqual?): SignalReader` | Get the value for a named context. The context is derived from the shadow entity hierarchy and the shadow object's position within it. |
| __useParentContext__ | `useParentContext(name, isEqual?): SignalReader` | Unlike the `useContext` method, this method skips the context of the _current_ shadow entity and directly requests the context of the parent entity. This is useful when you want to provide a custom context that depends on the parent context. |
| __provideContext__ | `provideContext(name, initialValue?, isEqual?): Signal` | Specify a context. This context overrides (if set) the context of the same name from the entity's parent hierarchy. The context applies to the current entity and all child entities. |
| __provideGlobalContext__ | `provideGlobalContext(name, initialValue?, isEqual?): Signal` | Define a context that applies to _all_ entities, regardless of hierarchy. |
| __createEffect__ | `createEffect(...): Effect` | see [@spearwolf/signalize#createEffect()](https://github.com/spearwolf/signalize) |
| __createSignal__ | `createSignal(...): Signal` | see [@spearwolf/signalize#createSignal()](https://github.com/spearwolf/signalize) |
| __createMemo__ | `createMemo(...): SignalReader` | see [@spearwolf/signalize#createMemo()](https://github.com/spearwolf/signalize) |
| __on__ | `on(...): UnsubscribeCallback` | see [@spearwolf/eventize#on()](https://github.com/spearwolf/eventize) |
| __once__ | `once(...): UnsubscribeCallback` | see [@spearwolf/eventize#once()](https://github.com/spearwolf/eventize) |
| __onDestroy__ | `onDestroy(callback)` | Called when the shadow object is destroyed. |


## Documentation

TODO ... add documentation here ... !

Here is the big class graph overview:
![class graph overview](https://raw.githubusercontent.com/spearwolf/shadow-objects/main/packages/shadow-objects/src/view/ClassGraphOverview.drawio.svg)

More in-depth docs here:
- [ShadowEnv](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/src/view/README.md)
- [ComponentContext](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/src/view/ComponentContext.md)
- [ViewComponent](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/src/view/ViewComponent.md)
