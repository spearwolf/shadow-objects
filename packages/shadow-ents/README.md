# shadow-ents

> _ents_ is short for latin _"entitatis"_, which translates to _"shadow entities"_

![architecture overview](./docs/architecture@2x.png)

Each `Entity` belongs to a _html dom element_, but exists in a _web worker_ (therefore called _shadow entity_, because they are outside the main document, analogous to the elements in a _html shadow dom_).

A `<component>` inside in the browser window is a _custom element_ and serves as an access point for the entities.
These elements are our _view components_.
An _entity_ is always associated with exactly one `<component>` (aka _view component_)

Since the view components are native html elements in the dom, they form a hierarchy of their own (if you hide the other html elements).
This hierarchy is inherited exactly by the entities within the worker thread.
Any change to the component hierarchy is automatically reflected in the entities.
 
The root of a view component hierarchy is always the _component context_. The context creates a web worker and is responsible for synchronising the entities with their components.

Within the entity worker is the _entity kernel_, which is responsible for the entities and their lifecycles. This is the counterpart to the component context.

When a component is created, a string based token and/or multiple tags can be applied. Based on this data, the kernel decides what types of entities to create and associate with the component.

Multiple entities may be associated with a component.

The component itself does not know which entities are associated with it.
However, all properties (and their changes) of the components are passed on to the associated entities.
The components and entities can also communicate with each other via events.

The component properties are only passed to the entities in this direction (one-way binding), while the events can be sent and received by both sides.
