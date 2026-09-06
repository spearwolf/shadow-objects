# Proposal: Typed Entity Events on the Creation API

- **Status:** implemented -- shipped on 2026-09-06 into the unreleased `@spearwolf/shadow-objects`, in the three commits `a03fe19`, `2500364` and `7fdcc97`; §8 holds what is open
- **Date:** 2026-09-06, written after the code as the record of the design
- **Scope:** `@spearwolf/shadow-objects` -- `ShadowObjectCreationAPI`, `ShadowObjectCreationScope`
- **Reads before:** `AGENTS.md` §2, `packages/shadow-objects/docs/concepts.md` §4 *Events*
- **Reads after:** `packages/shadow-objects/docs/api-reference.md`, section *4. Events* and *Typed events* -- the reference of record for the API this document designs

## 0. Where this stands

Everything §1 promises exists and is tested. The document is the design record -- why the members stay method declarations, why the map is a per-Shadow-Object view of a shared bus, why one subscription form stays out of reach on the Entity -- and the map of what it leaves open (§8). The reference documentation, not this file, is where a detail is looked up.

## 1. Summary

`on()`, `once()` and `emit()` on the creation API are `@spearwolf/eventize`'s standalone functions with the Entity filled in as the emitter and the subscription tied to the Shadow Object. Before this proposal their declared types neither matched eventize nor the runtime: the target form turned down a typed emitter, a plain object and an `EntityApi`; the entity form admitted the catch-all and priority-first forms that the runtime then handed to eventize as if the first argument were the target, where every one of them threw; and no event map could reach the Entity bus at all, while eventize has typed its own three surfaces since v6.0.0.

Three changes, one commit each:

1. **Routing** -- the scope reads the shape of the arguments the way eventize does, one argument earlier: an object followed by more is the target; an event name, a priority, a listener function or an object standing alone means the Entity.
2. **Types** -- `ShadowObjectCreationAPI<TEvents extends EventMap = DefaultEventMap>` types the entity-implicit forms against an eventize event map, the target forms against the target's own map, and takes any other object the way eventize does. `EventsOf<T>` derives a map from a Shadow Object: every method is an event of that name carrying the method's parameters as its tuple.
3. **Documentation** -- the events section of the reference puts the entity-implicit forms first, the function-style guide shows a returned object as the listener, and the rules of the map stay with eventize, linked rather than repeated.

## 2. Motivation

The Kernel attaches every Shadow Object to its Entity with `on(entity, shadowObject)`: a method named like an event is called when that event fires, on a class instance and on the object a function returns alike. That makes a Shadow Object's methods its inbound event surface -- and it made the question natural that started this proposal: if `PlayerLogic.onPowerUp(power: number)` receives the event, why can `emit('onPowerUp', 'lots')` not be turned down at compile time, the way `eventize<MyEvents>()` turns down a wrong argument?

The audit that preceded the answer found the three defects of §1. Two of them were type-versus-runtime disagreements a user would meet as a throw at a call the compiler had accepted, or as a compile error at a call the runtime handled; they had to go before a map could be layered on top.

### Goals

- The declared forms are the runtime forms. Every subscription form eventize's standalone `on()` takes is taken here, and none is declared that throws.
- The target form is as wide as eventize's: any object, checked against its own map where it has one.
- An opt-in event map on the entity bus, in eventize's shape, so that a receiver's methods and an emitter's calls can be checked against each other.
- Without the map, nothing changes for existing code.

### Non-goals

- A runtime check of the map. The Entity bus stays untyped at runtime, as eventize's is.
- A per-call generic, `emit<PlayerLogic>('onPowerUp', 42)`. §4.2 says why.
- Typing the view-side events (`dispatchMessageToView`, `onViewEvent`). A different channel, a different proposal.

## 3. The routing rule

eventize's `_subscribeTo()` tells its eleven argument forms apart by shape: the first argument is an event name or a list of them, a number (priority), a function (catch-all listener) or an object (listener object). The creation API sits one argument in front of that and has to decide whether that first argument is a *target* or already the start of eventize's form.

The decision, in `subscribeOn()` of `ShadowObjectCreationScope.ts`:

| First argument | Followed by | Means |
| :--- | :--- | :--- |
| `string`, `symbol`, array | anything | the Entity |
| `number` | anything | the Entity -- a priority |
| `function` | anything | the Entity -- a catch-all listener, optionally with a context object |
| object | nothing | the Entity -- a listener object, the Kernel's own form |
| object | anything | the target |

The one form this leaves unreachable on the Entity is a listener object together with a context object: `[object, object]` reads as a target and its listener, and the target reading is the one the Kernel and every existing caller rely on. The Entity form does not need it -- a listener object on the Entity is its own receiver. The type does not declare it, the documentation names it.

A function as the *target* -- eventize accepts function targets since v6.0.0 -- reads as a catch-all listener here. Nothing in this repository subscribes on a function, and the target reading would cost the far more common `on(fn)`.

## 4. The type design

### 4.1 Mirror eventize, do not wrap it

The generic is `eventize<TEvents>()`'s generic moved onto the interface. Every building block is imported from eventize rather than re-derived: `EventMap`, `DefaultEventMap`, `EventKeysOf`, `ArgsFor`, `ListenerFor`, `MultiArgsFor`, `EventListenerMethods`, `NonTypedEmitter`, `SubscribeArgs`, `UnsubscribeFunc`. Two guards are local because eventize does not export them, and each is one line: `IsLooseMap<T>` and, built on it, `LooseSubscribeArgs<T>` / `LooseEmitNames<T>` -- a rest parameter of `never` closes the loose overload for a typed map, the way eventize closes its own.

The entity-implicit forms are declared one by one for a typed map -- name and listener, with priority, the multi-name list with `[name, priority]` tuples, the method-name form, the listener object with and without priority, and the catch-all forms that name no event and therefore stay open. For a loose map the single `on(...args: SubscribeArgs)` overload covers all eleven forms at once.

The target forms are four typed overloads on `EventizedObject<M>` -- name and listener, with priority, the multi-name list, the listener object -- and one loose overload on `NonTypedEmitter<T>` with eventize's `SubscribeArgs`. A typed target therefore has four forms where eventize's standalone `on()` has sixteen; the four are the ones that occur, and a caller needing an exotic form on a typed target still has eventize's own `on()`, at the cost of the automatic cleanup.

### 4.2 Why not a per-call generic

`emit<PlayerLogic>('onPowerUp', 42)` reads well and does not work: an explicit type argument switches inference off for every remaining type parameter of the call, so the event name `K` would have to be spelled out too -- `emit<PlayerLogic, 'onPowerUp'>('onPowerUp', 42)` -- or take a default that is the union of all keys, against which no positional check of the arguments is possible. The interface generic checks the same thing once, at the parameter list of the constructor, and reads there as the declaration of what this Shadow Object talks to.

### 4.3 Members stay methods

The one constraint that decides the shape of the declaration: a constructor written against a narrowed map -- `({emit}: ShadowObjectCreationAPI<EventsOf<PlayerLogic>>) => …` -- has to be assignable to `ShadowObjectConstructorFunc`, whose parameter is the loose `ShadowObjectCreationAPI`. Under `strictFunctionTypes` that comparison is contravariant in the parameter, and `ShadowObjectCreationAPI<DefaultEventMap>` is not assignable to `ShadowObjectCreationAPI<PlayerEvents>` when `on`, `once` and `emit` are properties with call-signature types. Declared as methods, their parameters are compared bivariantly, and the assignment holds. A first draft with `on: StandaloneSubscribeFunc & EntityForms<TEvents>` failed exactly there; the shipped declaration is method overloads throughout, and `src/types.spec.ts` holds the assignment as a check.

### 4.4 `EventsOf<T>`

```ts
type EventsOf<L> = {
  [K in keyof L as L[K] extends (...args: any[]) => any ? (K extends EventName ? K : never) : never]:
    L[K] extends (...args: infer A) => any ? A : never;
};
```

Every method of `L` becomes a key, its parameters the tuple. Every method takes part, the ones nobody meant as an event included -- which is what the dispatch does, too: an `emit('handleSubmit')` on the Entity calls `handleSubmit()` on a Shadow Object that has one. The type is the runtime read back, not a curated subset. `symbol`-keyed methods, the lifecycle hooks among them, are kept out by `K extends EventName`, and eventize treats a symbol name as the escape hatch anyway.

### 4.5 The map is a view, not a contract of the bus

Several Shadow Objects share one Entity, and each declares the map it wants to see. Nothing holds them to the same one, and nothing should: the bus is untyped at runtime, and a map is what one Shadow Object knows about its neighbours. Two receivers make `EventsOf<A> & EventsOf<B>`; a hand-written map works as well as a derived one.

## 5. What did not change

- The runtime of `emit()`: the plain, unguarded dispatch, for the reason `AGENTS.md` §2 gives.
- `ShadowObjectConstructor` and `ShadowObjectConstructorFunc` still take the loose `ShadowObjectCreationAPI`.
- `dist/`: the file list and the shape of `dist/package.json` are unchanged; the declarations grew.
- `ShadowObjectCreationScope implements ShadowObjectCreationAPI` with the default map; the implementations keep their `...args: any[]` signature under the overloads.

## 6. Testing

- `ShadowObjectCreationScope.spec.ts`, *where a subscription goes*: each of the six argument shapes of §3, for `on` and `once`, through `createAPI()`; written first, red with the two eventize errors of §1, green with `subscribeOn()`.
- `src/types.spec.ts`: the type checks under `pnpm typecheck` -- `expectTypeOf` for what holds, `@ts-expect-error` for what has to fail, so a directive that stops erroring fails the build -- plus one runtime case through the Kernel showing the map is a contract over the dispatch that already existed.

## 7. Documentation

The reference (`api-reference.md` §4) lists the forms and the routing rule, and gained a *Typed events* subsection. The rules of the map itself -- a tuple per key, the symbol escape hatch, the index signature that reopens everything, what the multi-name forms check -- are eventize's and are linked, not repeated; duplicated on purpose are `EventsOf<T>` and one example per style. The function-style guide gained *Listening to Entity Events*, the first place in the documentation that says a returned object is attached as a listener. The class guide's example passed the Entity where the plain form was meant; fixed.

## 8. Open

- **Typed target forms are four, not sixteen** (§4.1). Widening them is mechanical once a use turns up.
- **A function as a target** reads as a catch-all listener (§3). Should a Shadow Object ever need to subscribe on a function target, the disambiguation would look at the second argument.
- **The view channel** -- `dispatchMessageToView()` and `onViewEvent()` -- carries `unknown` data on both sides. A map for it would be a second generic on the same interface, or a separate one; not designed here.
