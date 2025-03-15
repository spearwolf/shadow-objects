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

TODO ... add documentation here ... !

Here is the big class graph overview:
![class graph overview](https://raw.githubusercontent.com/spearwolf/shadow-objects/main/packages/shadow-objects/src/view/ClassGraphOverview.drawio.svg)

More in-depth docs here:
- [ShadowEnv](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/src/view/README.md)
- [ComponentContext](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/src/view/ComponentContext.md)
- [ViewComponent](https://github.com/spearwolf/shadow-objects/blob/main/packages/shadow-objects/src/view/ViewComponent.md)
