# Welcome to _shadow-ents_ :wave:

shadow-objects is a JavaScript library that's all about making your life easier when dealing with components and web workers. It's like having a superpower for your web development! :muscle:

![architecture overview](./docs/architecture@2x.png)

> _ents_ is short for latin _"entitatis"_, which translates to _"shadow entities"_


## Quick Tour

### Offloading to Web Workers :construction_worker:

shadow-objects takes the heavy lifting off your main thread and moves it to web workers. This means your components stay light and breezy, just like a hibiscus flower in the wind. :hibiscus:

### Entities :ghost:

Yes, we've got entities too! In shadow-objects, an _entity_ belongs to a _view-component_, but it lives in a _web worker_. That's why we call them _shadow-entities_. They're like the secret agents of your app, working behind the scenes in their own separate world.

### Shadow Objects :package:

The _shadow-objects_ are simple functions or classes created by the user (you!) and form logical units of code  in which the real work is done behind the scenes.

Shadow-objects reside within the context of an entity and have access to the entity's properties and events, which mirror the properties and events of the view-components.

Any number of independent shadow-objects can be attached to an entity.

Shadow-objects can also provide any _context_ to other shadow-objects:
- a _context_ has a name and can consist of any JavaScript value or object.
- a _context_ is inherited by subtrees through the hierarchy of entities.


### View Components :eyes:


A `<view-component/>` is a virtual component in the view that serves as an access point for the entities.

The _shadow-ents_ package provides the custom element `<shadow-objects>` as view component. As a HTML element in the DOM, these might form their own hierarchy.
This hierarchy is mirrored by the entities in the worker, keeping everything in sync.

In the future, implementations as _react_ or _angular_ components are also conceivable.


### Component Context :brain:

The _component-context_ is the root of a view-component hierarchy. It's like the conductor of an orchestra, creating a web worker and making sure the entities and their components are in harmony.

### Kernel :nut_and_bolt:

Inside the worker, there's the _kernel_. It's the counterpart to the component-context, taking care of the lifecycle of the entities and their _shadow-objects_.

### Tokens :label:

When a view-component is created, you can apply a string-based token. The kernel uses these to decide which shadow-objects to create within each entity. It's like giving your components a secret handshake!

### Event and Property Synchronization :arrows_counterclockwise:

View-components can send events to their entities, which are then passed on to the shadow-objects. This also works the other way around. However, property synchronization only goes one way, from view-components to entities.

- - -

So, that's a quick tour of shadow-objects! It's all about making your web ui faster and more responsive, and assembling your code in a more structured and streamlined way. Give it a try and see the difference it can make in your projects! :rocket:

More in-depth documentation here:
- [ShadowEnv](./src/view/README.md)
- [ComponentContext](./src/view/ComponentContext.md)
- [ViewComponent](./src/view/ViewComponent.md)

> _but dear adventurer, be warned: everything here is highly experimental and in active development and constant flux!_
