# Proposal: A Testing Utility for Shadow Objects

- **Status:** implemented -- shipped on 2026-09-06 into the unreleased `@spearwolf/shadow-objects`, in the commits between `a01fb6c` (this proposal) and `3f86c68` (the last fix of the whole-branch review, this record's own update excepted); §13 holds what is open
- **Date:** 2026-09-06, written before the code and brought in line with it the same day
- **Scope:** `@spearwolf/shadow-objects` -- a new subpath export `./testing.js`, plus the documentation and the dist contract that come with it
- **Reads before:** `AGENTS.md` §2, `packages/shadow-objects/docs/best-practices.md` §9 *Testing Shadow Objects*, §6 *When to Use Local vs. Remote Environments*
- **Reads after:** `packages/shadow-objects/docs/api-reference.md`, section *Testing* -- the reference of record for the API this document designs

## 0. Where this stands

Everything §1 promises exists and is tested: the six modules under `src/testing/`, the barrel `src/testing.ts`, and nine spec files beside them. The work went in as eleven tasks, each reviewed on its own, followed by a whole-branch review whose seven findings were fixed in one wave; the package changelog records what the subpath adds.

This document is the design record -- why the utility sits on the real Kernel rather than on a mock, why it is a subpath and not a package, why the mount is asynchronous, why a swallowed Kernel error fails a teardown -- and the map of what the design leaves open (§13). Where the code settled a detail differently from the first draft, the text says so in place, marked *as built*; the reference documentation, not this file, is where a detail is looked up.

Three things the implementation decided against the draft:

- **`instanceOf()` is called `shadowObjectOf()`.** §13 held the name open; it was closed against the shorter one, because `instanceof` in JavaScript is a boolean test and this method returns an object.
- **The View messages are recorded per Kernel, not per Entity.** §13 held that open too, and the first form shipped -- then dropped every message dispatched for a uuid no handle existed for yet. §13 records why it changed.
- **The mount's two settles do not buy what §6.1 first said they bought.** A single `settle()` drains the whole cascade, so the second one alone carries every context value into every effect. The first buys something narrower and real: a `useParentContext()` read inside a constructor body. §6.1 is corrected in place.

## 1. Summary

A consumer of this library -- an application, or a library that ships Shadow Objects of its own -- has no cheap way to unit-test a Shadow Object today. What the documentation offers is a hand-written mock of `ShadowObjectCreationAPI` that reimplements a reactive system badly, and what the library offers underneath is a Kernel that is already headless but needs eight small pieces of ceremony before a single assertion can be written.

This proposal adds a testing utility behind `@spearwolf/shadow-objects/testing.js`, built on the real Kernel rather than on a mock:

1. **`createTestKernel()`** -- an isolated Kernel with its own Registry, an object-shaped property API, recorded View messages, recorded Kernel errors and a `settle()` that drains the microtask cascade.
2. **`TestEntity`** -- one handle per Entity: properties, contexts, View events, children, the Shadow Object instances, teardown.
3. **`mountShadowObject()`** -- the one-object case on top of both, in the shape a Testing-Library user expects.

§9 of `best-practices.md` is rewritten against it, and the mock example is deleted rather than improved.

## 2. Motivation

### 2.1 The mock in the guide is a second implementation

§9 of `best-practices.md` currently shows a `makeMockApi()` that hands out fake signals, collects effects in an array and re-runs them by hand. Its own comment states the defect:

```js
// Re-run effects (simplified -- a real signal system tracks this automatically)
api._effects.forEach(fn => fn());
```

A test written this way asserts against the mock's semantics, not against `@spearwolf/signalize`'s. Dependency tracking, batching, `createMemo`, `createResource`, the four lifecycle hooks, the teardown order and every context call are outside what the mock can reach -- `useContext` and `provideContext` are not even stubbed in the example, and a Shadow Object that uses them cannot be run through it at all.

The mock also cannot fail in the ways the real Kernel fails. `Kernel.destroyEntity()` runs every teardown step through `runGuarded()`, which reports to `kernel.logger.error` and carries on. A Shadow Object whose `onDestroy` throws is a green test under the mock, a green test under a naive real-Kernel test, and a leak in production.

### 2.2 The Kernel is already the test environment

Nothing about a unit test needs a `ShadowEnv`, a `ComponentContext`, a `ViewComponent`, a DOM or a worker. `new Kernel(new Registry())` runs in bare Node and gives real signals, real effects, real contexts, real routing and real teardown. This repository's own suite is the proof: `src/in-the-dark/Kernel.creation-api.spec.ts` and its neighbours test the creation API exactly that way.

So the gap is not capability. It is ceremony.

### 2.3 What stands between a headless Kernel and a written test

| Friction | What a consumer writes today |
| :--- | :--- |
| Registry isolation | `@ShadowObject` without a registry writes into the default Registry, which is process-wide; every suite needs `Registry.get().clear()` in an `afterEach`, and parallel files still collide |
| Entity uuids | import `generateUUID()`, keep the string, thread it through every call |
| Properties | `[['score', 10]]`, a `ComponentPropertiesType` tuple list, where the test means `{score: 10}` |
| Reaching the instance | `kernel.findShadowObjects(uuid)[0]`, untyped, and ambiguous once an Entity carries more than one |
| Reading a signal | import `value()` from `@spearwolf/signalize` for every assertion |
| Timing | context values settle one microtask later, `dispatchMessageToView()` one microtask later, and a change trail applied through `Kernel.run()` batches its effects where a direct `changeProperties()` does not |
| View messages | wire `on(kernel, MessageToView, …)` by hand and collect into an array |
| Swallowed errors | every `runGuarded()` report goes to `kernel.logger.error` and nowhere a test looks |

Eight items, each small, each solved slightly differently in every project that ever tries.

### 2.4 Goals

- A Shadow Object under test runs against the real reactive system, the real Registry resolution and the real lifecycle.
- The common case -- one Shadow Object, a few properties, an assertion on what it sent towards the View -- is under ten lines with no imports beyond the utility and the test runner.
- Composition is reachable: several Shadow Objects on one Entity through `routes`, parent and child Entities, Entity Contexts, token changes, property routing.
- Errors the Kernel swallows are visible, and by default they fail the test.
- No test runner is a dependency. The utility works under vitest, jest, `node:test` and the browser mode alike.

### 2.5 Non-goals

- The View side. No `ShadowEnv`, no `LocalShadowObjectEnv`, no `ComponentContext`, no `ViewComponent`, no custom elements. §11 says what a later proposal would have to add.
- A worker. A remote environment is an integration concern and has `packages/shadow-objects-testing` for it.
- Replacing this repository's own specs. They test the Kernel and will keep addressing it directly; the utility is for consumers, and it may use the same Kernel the specs do without either side owning the other.
- Snapshot testing, custom matchers, assertion helpers. Those belong to the test runner the consumer chose.

## 3. Shape of the delivery

A subpath export of the core package, built the way `model-context.js` already is: its own entry, not re-exported from `index.ts`, absent from the `sideEffects` list, absent from the worker bundle.

```
src/testing.ts                        the barrel -- the whole public surface
src/testing/createTestKernel.ts
src/testing/TestEntity.ts
src/testing/mountShadowObject.ts
src/testing/settle.ts
src/testing/recordKernelErrors.ts
src/testing/types.ts
```

A separate package was considered and turned down. The utility reads Kernel and Registry closely enough that a version of it that is one release behind the core is a version that is wrong; a subpath cannot drift. The cost is that the files ship in the tarball for every consumer, which is a few kilobytes that no bundler pulls in unless the subpath is imported.

## 4. `createTestKernel()`

```ts
import {createTestKernel} from '@spearwolf/shadow-objects/testing.js';

const t = createTestKernel();
afterEach(() => t.dispose());

t.define('player', PlayerLogic);
t.route('hero', ['player', 'health']);
await t.importModule(myShadowObjectsModule);

const ent = t.createEntity('player', {score: 0});
```

```ts
export interface TestKernelOptions {
  /**
   * The Registry to build on. Default: a fresh `new Registry()`, isolated from the default
   * Registry and from every other test kernel. Pass `Registry.get()` to test Shadow Objects
   * that registered themselves through `@ShadowObject` without a registry of their own.
   */
  registry?: Registry;
  /** Fail `dispose()` when unacknowledged Kernel errors were recorded. Default: `true`. */
  failOnKernelErrors?: boolean;
  /** Keep the Kernel's own logger output on the console as well as recording it. Default: `false`. */
  echoKernelErrors?: boolean;
}

export interface TestKernel {
  /** The Kernel itself -- the way out for everything this facade does not cover. */
  readonly kernel: Kernel;
  readonly registry: Registry;
  /** What the Kernel reported through its logger since the last `clearErrors()`. */
  readonly errors: readonly KernelErrorRecord[];

  define(token: string, constructa: ShadowObjectConstructor | ShadowObjectConstructorFunc): void;
  route(token: string, targets: string[]): void;
  importModule(module: ShadowObjectsModule): Promise<void>;

  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity;
  /**
   * The handle for a uuid, or `undefined` when the Kernel holds no such Entity. A uuid a Shadow
   * Object created through `entity.kernel.createEntity()` gets a handle here on first ask, so an
   * Entity a test did not create itself is still reachable through the same surface.
   */
  entity(uuid: string): TestEntity | undefined;

  settle(): Promise<void>;
  clearErrors(): void;
  dispose(): void;
}

export interface CreateEntityOptions {
  uuid?: string;
  order?: number;
  parent?: TestEntity;
  autoDestructionOnParentRemoval?: boolean;
}
```

`define()`, `route()` and `importModule()` are `Registry.define()`, `Registry.appendRoute()` and the Kernel's own `importModule()` with this test kernel's Registry filled in. They exist so that a test never has to decide which of the two objects a definition belongs to.

`kernel` and `registry` are exposed on purpose. A test facade that walls off the object underneath is a facade that gets thrown away at the first unusual case; this one is a convenience layer, not a boundary.

`createTestKernel()` is synchronous and takes no module list. Importing a module is asynchronous, so it is `await t.importModule(m)` and stays visible as such.

## 5. `TestEntity`

One handle per Entity, handed out by `createEntity()`, `createChild()` and `entity()`. The same uuid always yields the same handle.

```ts
export interface TestEntity {
  readonly uuid: string;
  readonly token: string;
  /** The Entity itself -- the way out, as `TestKernel.kernel` is. */
  readonly entity: Entity;
  /** Everything this Entity sent towards the View since the last `clearViewMessages()`. */
  readonly viewMessages: readonly ViewMessageRecord[];

  createChild(token: string, props?: Record<string, unknown>, options?: Omit<CreateEntityOptions, 'parent'>): TestEntity;

  setProps(props: Record<string, unknown>): void;
  removeProps(...names: string[]): void;
  readProp<T = unknown>(name: string): T | undefined;
  readContext<T = unknown>(name: string | symbol): T | undefined;

  setToken(token: string): void;
  setParent(parent: TestEntity | undefined, order?: number): void;

  /** Deliver a View event. Synchronous, as the Kernel's own delivery is. */
  sendViewEvent(type: string, data?: unknown): void;
  /** Emit on the Entity's event bus, the channel Shadow Objects talk to each other on. */
  emit(eventName: string | symbol, ...args: unknown[]): void;

  shadowObjects(): ShadowObjectType[];
  shadowObjectOf<C extends ShadowObjectConstructor | ShadowObjectConstructorFunc>(constructa: C): ShadowObjectInstance<C>;
  describe(): ShadowObjectDescription[];

  clearViewMessages(): void;
  destroy(): void;
}

export interface ViewMessageRecord {
  type: string;
  data: unknown;
  traverseChildren?: boolean;
}
```

Five of these are worth a sentence each.

**`readProp()` and `readContext()`** read what the Entity holds and call the reader, so a test needs no `value()` import and no `@spearwolf/signalize` dependency of its own. *As built:* `readProp()` goes through `Entity.getProperty()` and `readContext()` wraps `Entity.useContext()` in signalize's `value()`, so a read inside an effect does not subscribe the effect to the context. Reading a context still creates the context entry on the Entity if it does not exist yet, and that is not free of consequence the way this draft assumed: the entry's effective value passes the Entity's microtask collector, so the read that creates the entry is one settle too early however long the provider has been standing. The reference documentation states the rule, and a spec pins it.

**`shadowObjectOf()`** resolves a constructor to the one Shadow Object built from it on this Entity, and throws with the display name when there is none or more than one. `instanceOf()` was the shorter candidate and was turned down: it reads like a predicate, because JavaScript's `instanceof` is one, and this method returns an object. §13 records the decision.

*As built,* two rules decide in order, because one does not cover both constructor shapes. Identity is asked first -- a class instance answers `instanceof`, the `@ShadowObject` decorator's subclass included, and so does the object of a function constructor that returns nothing -- and where anything answers it, it decides alone. Only where identity matched nothing does the display name decide, over the index-aligned `describe()` list. A name is not an identity, so it is a fallback and never a second rule beside it: two constructors are free to share one display name, and an `||` between the two would count the other one's Shadow Object as a match and report an ambiguity that is not there. What no rule separates is two *function* constructors of one name on one Entity; the throw names that and points at `shadowObjects()`.

The return type is one signature with a conditional type behind it, because the two constructor shapes differ:

```ts
type ShadowObjectInstance<C> =
  C extends new (...args: any[]) => infer R ? R :
  C extends (...args: any[]) => infer R ? (R extends object ? R : object) :
  object;
```

A function constructor that returns nothing yields `object`, which is honest: there is an eventized instance, and it carries nothing the test can name.

**`describe()`** hands `Kernel.describeShadowObjects()` straight through. It costs nothing and opens a class of test nobody writes today: that a Shadow Object uses the properties and contexts it is supposed to use, and implements the hooks it is supposed to implement. A refactor that silently drops a `useProperty()` call is invisible to every other assertion.

**`viewMessages`** is a view, not a store. *As built:* the test kernel keeps one array per uuid and appends to it for every message the Kernel emits, whether or not a handle for that uuid exists; the handle reads and clears through it. §13 says why the per-Entity form this draft assumed did not survive.

## 6. `mountShadowObject()`

```ts
const so = await mountShadowObject(PlayerLogic, {
  props: {score: 0},
  contexts: {'three-scene': scene},
});

so.setProps({score: 10});
await so.settle();

// as built: a message dispatched through the creation API always carries `traverseChildren`,
// because both layers of the dispatch declare the parameter as `traverseChildren = false`
expect(so.viewMessages).toEqual([{type: 'score-updated', data: {value: 10}, traverseChildren: false}]);
expect(so.instance.currentScore).toBe(10);

so.dispose();
```

```ts
export interface MountOptions {
  props?: Record<string, unknown>;
  /** Entity Contexts a synthetic parent Entity provides to the object under test. */
  contexts?: Record<string | symbol, unknown>;
  /** The token to register the constructor under. Default: a generated one. */
  token?: string;
  registry?: Registry;
  failOnKernelErrors?: boolean;
  echoKernelErrors?: boolean;
}

export interface MountedShadowObject<C> extends Omit<TestEntity, 'createChild' | 'destroy'> {
  readonly instance: ShadowObjectInstance<C>;
  readonly testKernel: TestKernel;
  settle(): Promise<void>;
  dispose(): void;
}

export function mountShadowObject<C extends ShadowObjectConstructor | ShadowObjectConstructorFunc>(
  constructa: C,
  options?: MountOptions,
): Promise<MountedShadowObject<C>>;
```

### 6.1 Why it is asynchronous

`contexts` are provided by a synthetic parent Entity: the mount registers a private token whose Shadow Object calls `provideContext(name, value)` once per entry, creates that Entity, and hangs the object under test below it.

A context value does not reach a reader in the task it was written in. `Entity.#findOrCreateContext()` routes the resolved value of the `SignalsPath` through `deferContextValueUpdate()`, a `MicrotaskCollector`, so `useContext()` answers `undefined` until the next microtask; `useParentContext()` reads the parent's own context signal and therefore waits on the same collector one level up.

The mount settles twice: once after the parent Entity is created, once after the object under test is created below it. *As built,* the two do not buy what this draft claimed. `settle()` is a macrotask hop and drains the whole cascade, so the second settle alone already carries every context value down into every effect -- the "two hops, not one" argument was written before that was measured, and it does not hold.

What the first settle buys is narrower and real. It lets the parent's own context signal fill before the object under test is built, so a `useParentContext()` read inside a constructor body answers with the value instead of `undefined`. That reader is a direct link to the parent and does not pass the Entity's collector, which is exactly why it can answer inside a constructor at all and exactly why it needs the parent to have settled. A spec pins it, and taking the first settle out is what makes that spec fail.

What this does **not** buy is a context value inside the constructor body. `useContext()` hands out a signal reader, and the value behind it arrives after the constructor has returned -- in a mounted test as much as in a running application. A Shadow Object reads a context inside an effect or a memo, which then re-runs when the value lands:

```ts
const getScene = useContext<Scene>('three-scene');
createEffect(() => {
  const scene = getScene();
  if (!scene) return;      // the first run, before the value has landed
  scene.add(mesh);
});
```

`useParentContext()` is the exception: it reads the `inherited` signal, which the link writes without going through the collector.

So the promise the mount makes is precise: when it resolves, every context has reached every reader and every effect that depends on one has re-run. That is the same lesson §6 of `best-practices.md` teaches about the sync tempo, and the testing utility has no business building the trap it warns about.

The `await` costs one keyword. A `mountShadowObject()` without `contexts` still returns a promise, because a factory whose return type depends on an option is a factory nobody can wrap.

A function handed in as a context value is read by `provideContext()` as a signal reader, not as the value. That is `provideContext()`'s own contract and the documentation names it here rather than letting a test discover it.

### 6.2 The values are not cloned

Nothing here goes through a change trail, so no `structuredClone` stands between the test and the Shadow Object. A DOM node, a canvas context, a `WebGLRenderingContext`, a Three.js `Scene`, a physics world: all of them can be handed in as a property or as a context and arrive by identity. That is more than a local `ShadowEnv` gives without `disableStructuredClone`, and it is exactly what a unit test wants.

The consequence belongs in the documentation next to it: a test that passes a non-cloneable value proves nothing about whether the same code survives a remote environment. `packages/shadow-objects-testing` is where that question is answered.

## 7. `settle()`

```ts
export function settle(): Promise<void>;
```

Also reachable as `t.settle()` and `so.settle()`, which are the same function.

What has to drain is a cascade, not a single generation of microtasks. `Kernel.dispatchMessageToView()` queues a microtask. `deferContextValueUpdate()` batches into a `MicrotaskCollector` whose delivery is documented to be able to write to the same collector again, which schedules the next round. A single `await Promise.resolve()` clears one generation and lies about the rest.

The implementation is therefore a macrotask hop, which drains the whole microtask queue including everything it grows while draining:

```ts
const settle = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof MessageChannel === 'function') {
      const {port1, port2} = new MessageChannel();
      port1.onmessage = () => { port1.close(); resolve(); };
      port2.postMessage(undefined);
      port2.close();
    } else {
      setTimeout(resolve, 0);
    }
  });
```

`MessageChannel` first, `setTimeout` only as a fallback. Fake timers are the reason: `vi.useFakeTimers()` freezes `setTimeout`, and a `settle()` that hangs forever the moment a test reaches for fake timers is an afternoon of debugging per consumer. `MessageChannel` is not a timer and is untouched by them. It exists in every browser, in Node since 15, and in `happy-dom`; the fallback covers whatever is left.

## 8. Kernel errors

```ts
export interface KernelErrorRecord {
  level: 'error' | 'warn';
  /** The arguments the Kernel logged, in order. `runGuarded()` puts its message first and the error last. */
  args: readonly unknown[];
  /** The last argument, when it is an `Error`. The common case, and the one an assertion wants. */
  error?: Error;
}
```

`createTestKernel()` replaces `error` and `warn` on the `ConsoleLogger` instance behind `kernel.logger` with recorders. The methods live on the prototype, so an own-property assignment shadows them and `dispose()` deletes the own properties again. *As built,* the recorder notes per method whether the instance carried an own property before it wrote, and puts that one back instead of deleting, so two recorders over one logger unwind in order. `warn` is recorded even though the real method is gated behind `ConsoleLogger.isWarn`, which is off outside a loopback host: a test wants the report whatever host it runs on. The console stays quiet by default, because a suite that deliberately provokes a failing teardown should not print it; `echoKernelErrors: true` forwards to the original for the case where it should.

**`dispose()` throws when unacknowledged reports of level `error` were recorded.** Warnings are recorded and readable but never fail a run: `importModule()` warns about a module two `extends` chains have in common, which is a shape of the module graph and not a mistake. This is the default, and it is the point of the whole section. The Kernel's teardown path never rethrows -- `runGuarded()` reports and carries on, and `AGENTS.md` and `docs/api-reference.md` both write that down as a promise, not an accident. The consequence for a test is that a Shadow Object with a broken `onDestroy`, a context cleanup that throws or a `createResource` teardown that fails passes every assertion and still leaks. Making the teardown of the test kernel the place where that becomes visible costs one line in the tests that provoke it on purpose:

```ts
expect(t.errors).toHaveLength(1);
expect(t.errors[0].error).toBeInstanceOf(RangeError);
t.clearErrors();          // acknowledged -- dispose() is satisfied
```

`failOnKernelErrors: false` switches the whole behaviour off for a suite that wants none of it.

The thrown error names how many reports there were and prints the first, so the failure message says what happened rather than that something did.

## 9. Isolation and teardown

Each `createTestKernel()` builds its own `new Registry()`. `t.define()` and `t.route()` write there, `t.importModule()` resolves there, and nothing reaches the default Registry.

What the facade cannot repair is a Shadow Object that registers itself. `@ShadowObject({token: 'player'})` without a `registry` option writes into the process-wide default Registry at module evaluation time, before any test has run. The utility does not try to snapshot and restore that -- a global mutation restored around a test is magic with side effects on every suite running in parallel in the same worker. It documents the situation and offers the deliberate bridge:

```ts
const t = createTestKernel({registry: Registry.get()});
```

with the warning that `dispose()` then leaves the Registry alone, because clearing the default one would take every other suite's definitions with it. `LocalShadowObjectEnv` already draws exactly this line and for exactly this reason; the utility follows it rather than inventing a second rule.

*As built,* `dispose()` does six things, in order: `kernel.destroy()`, unsubscribe from the Kernel's `MessageToView`, clear the Registry **only when the test kernel created it**, read the recorded errors, unhook the logger recorders, and release the handles, the View-message log and the imported-module set. Then it throws if §8 says it should. The order is what it reads as: the errors are read before the unhook, because unhooking does not clear the records but a later read has no reason to reach the recorder again.

That the unsubscribe and the release are synchronous is the reason `viewMessages` can never hold a message a teardown dispatched during `dispose()` -- that message is still sitting in a microtask when the log goes. A test that wants a Shadow Object's farewell message destroys the Entity and settles first, and the reference documentation says so next to the array.

Ownership decides the clearing rather than `Registry.isDefault()`: a Registry the caller handed in is the caller's, default or not, and a test kernel that empties it would take with it whatever the caller registered for the rest of the suite.

*As built,* `mountShadowObject()` disposes its own test kernel when it throws. Five statements stand between `createTestKernel()` and the return, and a Shadow Object constructor propagating through `createEntity()` or a `shadowObjectOf()` that matched nothing ends the call on any of them -- with the caller holding an error and no handle on the kernel behind it. Nothing would ever destroy that Kernel, and with the `{registry: Registry.get()}` bridge of this section the generated token and the synthetic provider's token would stay in the process-wide Registry for the rest of the run. The teardown is guarded in turn: a `dispose()` that throws over the very report the failure produced must not take the place of the error that explains it.

## 10. Files, exports and the dist contract

- `package.json` gains an `exports` entry `./testing.js` pointing at `./dist/src/testing.js`, with its `types`, in the shape `./model-context.js` already has.
- `src/distContract.files.txt` gains the seven emitted `.js` files and their `.d.ts` neighbours.
- `src/distContract.package.json` gains the new export entry.
- `sideEffects` is not touched. Nothing under `src/testing/` registers anything at import time.
- `bundle.ts` is not touched. The utility is not part of the worker bundle and must not be.
- No new runtime dependency. `@spearwolf/eventize` and `@spearwolf/signalize` are already dependencies of the package.

The build needs no change: the lib transpile globs `src/**` and the declaration emit follows `tsconfig.lib.json`.

## 11. Documentation

| File | Change |
| :--- | :--- |
| `docs/best-practices.md` §9 | Rewritten end to end. The `makeMockApi()` example is deleted, not repaired. The new section shows `mountShadowObject()` first, `createTestKernel()` for composition, the `settle()` rule and the error default. The *Integration Testing* subsection stays and gains a sentence saying where the line between it and the unit utility runs. |
| `docs/api-reference.md` | A new section for the testing API: the three entry points, the two option objects, the two record types, and the timing rule. This becomes the reference of record. |
| `docs/cheat-sheet.md` | One block, the ten-line `mountShadowObject()` case. |
| `README.md` | One line in the export list. |
| `CHANGELOG.md` (package) | An entry under `[Unreleased]`. |

The root `CHANGELOG.md` stays untouched: this is package API, not build system.

`AGENTS.md` §4 binds the vocabulary of the documentation and `pnpm lint:terms` enforces it over `packages/*/docs/**`. The new sections use Entity, Kernel, Shadow Object, Token, Registry and View, and the word "mock" only where it names the thing being removed.

## 12. Testing the utility

Specs under `src/testing/*.spec.ts`, in the core package's vitest suite, covering:

- Registry isolation: two test kernels do not see each other's definitions; the default Registry is untouched by a default `createTestKernel()`; a test kernel built on `Registry.get()` does not clear it on dispose.
- `settle()` drains a cascade: a context whose reader provides a second context settles both in one call; `viewMessages` are there after one `settle()` and not before it.
- `settle()` under `vi.useFakeTimers()` resolves.
- `shadowObjectOf()` throws with the display name for zero and for two matches.
- `readProp()` and `readContext()` answer what the Entity holds, including `undefined` for a property set without a value.
- Composition: a `route()` puts three Shadow Objects on one Entity, `shadowObjects()` lists them, `describe()` names their properties and hooks.
- `mountShadowObject()` with `contexts`: the object under test reads them. *As built,* the spec pins where -- inside an effect or a memo, which have run by the time the mount resolves, and inside a constructor body only through `useParentContext()`. A `useContext()` read in a constructor body answers `undefined` in a mounted test exactly as in a running application, and no settle can change that.
- The error default: a Shadow Object with a throwing `onDestroy` makes `dispose()` throw, `clearErrors()` satisfies it, `failOnKernelErrors: false` disables it, `echoKernelErrors` reaches the console.
- Non-cloneable values survive as identities through properties and contexts.

Three more came out of the reviews and are worth naming, because each one pins a defect that was in the code:

- A message dispatched for a uuid the facade holds no handle for is on the handle a later `t.entity(uuid)` builds.
- A refused `createEntity()` restores the handle of the uuid it collided with, rather than evicting it.
- Every one of the mount's sixteen forwarders is driven once and compared against the Entity underneath. `Omit<TestEntity, …>` checks that none is missing; nothing but that spec checks that each calls the member it is named after.

## 13. Open questions

Two of the three were decided during the implementation. What they were decided to, and why, stays here: a design record that drops its own questions once it has answered them leaves the next reader to rediscover the reasoning.

- **`instanceOf()` versus `shadowObjectOf()` -- decided: `shadowObjectOf()`.** The first is shorter, and shortness lost. `instanceof` in JavaScript is a boolean test, and this method returns an object; a name that promises a predicate and hands back an instance costs every reader of a test one double-take. It shipped as `instanceOf()` first and was renamed in `795de55`.
- **A `t.run(changeTrail)` escape hatch -- still open.** `Kernel.run()` batches its effects where the individual calls do not, so a consumer testing effect-coalescing behaviour has a reason to want it. Left out: `t.kernel.run()` is one property away, and adding it later breaks nothing.
- **Recording per Entity versus per Kernel -- decided: per Kernel.** This draft had `viewMessages` as an array on each `TestEntity`, on the argument that a Kernel-wide list only serves a test about ordering across Entities. That argument missed the case that broke it. A Shadow Object that calls `entity.kernel.createEntity()` dispatches messages for a uuid the facade holds no handle for, the per-Entity recorder had nowhere to put them, and a `t.entity(uuid)` afterwards -- act, settle, then ask, the order a test author writes by reflex -- answered with an empty array. A green assertion over a message that was never recorded is the one class of defect a testing library cannot ship. The test kernel now keeps one array per uuid and appends for every uuid the Kernel emits for; the handle is a view onto it. A Kernel-wide `t.viewMessages` in dispatch order is still not exposed, and the storage that would back it is now there.
