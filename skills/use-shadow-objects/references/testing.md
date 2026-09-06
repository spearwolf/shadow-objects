# Testing

```javascript
import {createTestKernel, mountShadowObject, settle, recordKernelErrors} from '@spearwolf/shadow-objects/testing.js';
```

A **real Kernel** with its own `Registry`, object-shaped properties, recorded View messages and
recorded Kernel errors. No DOM, no `ShadowEnv`, no worker, no `structuredClone`. Nothing here
imports a test runner and nothing runs at import time — vitest, jest, `node:test` and browser
runners are served alike. Assertions are on plain arrays and objects.

Three test layers, and they answer different questions:

| Layer | Answers |
|---|---|
| `createTestKernel()` / `mountShadowObject()` | What does this Shadow Object do? |
| `ShadowEnv` + `LocalShadowObjectEnv` with `disableStructuredClone = true` | Does the View reach it — change trail, sync tick, proxy? |
| Playwright / E2E | Does it survive a worker boundary? |

## `mountShadowObject(constructa, options?)`

One test kernel, one token, one entity, and — where `contexts` are given — a synthetic parent that
provides them.

```typescript
const so = await mountShadowObject(PlayerLogic, {props: {score: 0}, contexts: {physicsWorld}});

so.instance;                        // the object the constructor produced, typed from constructa
so.viewMessages;                    // [{type, data, traverseChildren}]
so.setProps({score: 10});
await so.settle();
so.sendViewEvent('damage', {amount: 5});   // synchronous
so.readProp('score');
so.readContext('physicsWorld');     // the very object — nothing cloned it
so.describe();
so.dispose();
```

Options: `props`, `contexts`, `token`, `registry`, `failOnKernelErrors` (default `true`),
`echoKernelErrors` (default `false`). The handle is every `TestEntity` member except `createChild()`
and `destroy()`, plus `instance`, `testKernel`, `settle()`, `dispose()`.

**A function handed in as a context value is read as a signal reader**, not as the value — that is
`provideContext()`'s own contract. Wrap it: `{fn}`.

**Why the mount settles twice.** The second settle alone already carries every context into every
effect. The first runs after the synthetic parent is created and before the object under test is
built, so a `useParentContext()` read inside a constructor body sees a value instead of `undefined`.
Neither settle can hand a context to a constructor through `useContext()` — that reader passes the
entity's collector and lands after the constructor returned, in a test exactly as in production.

## `createTestKernel(options?)`

Options: `registry` (default a fresh `new Registry()`), `failOnKernelErrors`, `echoKernelErrors`.

| Member | Meaning |
|---|---|
| `kernel`, `registry` | The way out for anything the facade does not cover |
| `errors` | `readonly KernelErrorRecord[]` since the last `clearErrors()` |
| `define(token, constructa)` | Class or function |
| `route(token, targets)` | Composition, as a module's `routes` entry does it |
| `importModule(module)` | `Promise<void>`; `extends` chains and `initialize` included |
| `createEntity(token, props?, options?)` | `options`: `{uuid?, order?, parent?, autoDestructionOnParentRemoval?}` |
| `entity(uuid)` | The handle, also for a uuid a Shadow Object created itself. Same uuid → same handle |
| `settle()`, `clearErrors()`, `dispose()` | `dispose()` is idempotent and throws over unacknowledged `error` records |

A constructor that throws costs its entity: `createEntity()` re-throws and leaves no handle behind
(unless the uuid already had one, which the failed call restores). A handle stays readable after its
entity is destroyed — `token` gives the last known one, `shadowObjects()`/`describe()` answer empty.

### `TestEntity`

`uuid`, `token`, `entity`, `viewMessages`, `createChild(token, props?, options?)`, `setProps(props)`
(goes through the Kernel, so a `token@prop` route is re-resolved and can add or drop a Shadow
Object), `removeProps(...names)`, `readProp(name)`, `readContext(name)`, `setToken(token)`,
`setParent(parent, order?)`, `sendViewEvent(type, data?)`, `emit(name, ...args)`, `shadowObjects()`,
`shadowObjectOf(constructa)`, `describe()`, `clearViewMessages()`, `destroy()`.

`shadowObjectOf()` matches by **identity first** (`instanceof`, the `@ShadowObject` subclass
included, and the object of a function constructor that returns nothing); only where nothing matched
does the display name decide over the index-aligned `describe()` list. It throws on no match and on
several matches — two *function* constructors sharing a display name on one entity are genuinely
inseparable, so use `shadowObjects()` there.

`describe()` returns `{displayName, definedUnder, hooks, usesProperties, usesContexts,
usesParentContexts, providesContexts, providesGlobalContexts}` per object, index-aligned with
`shadowObjects()`. `definedUnder` answers "why is this Shadow Object here".

## Timing rules

- **`await settle()` before asserting on a View message.** `dispatchMessageToView()` hands the
  message to a microtask.
- **A View event is synchronous.** `sendViewEvent()` reaches `onViewEvent` on the same line.
- **A context value is readable one settle after a provider wrote it** — every value passes the
  entity's microtask collector.
- **A context nothing on that entity has touched yet needs one settle more**, because the
  `readContext()` call is itself what creates the entry and links it to the parent. In practice:
  settle, read (`undefined`), settle, read.
- **Read a context inside an effect or a memo**, never as a bare value in a constructor body.
  `useParentContext()` is the exception.

`settle()` drains the whole microtask cascade, not one generation — a single
`await Promise.resolve()` lies about the rest. It hops over a `MessageChannel`, not a `setTimeout`,
so it still resolves under fake timers.

## Kernel errors

The Kernel runs every teardown through `runGuarded()`: it catches, reports through the
`ConsoleLogger` and carries on — there is no caller left to decide anything. Without the recorder a
test sees a green run over a broken `onDestroy`.

`t.errors` holds `{level: 'error'|'warn', args, error?}`. `dispose()` throws over an unacknowledged
`error`; a `warn` never fails a run (`importModule()` warns about a module two `extends` chains
share, which is a graph shape, not a mistake). Where the error is the point of the test:

```typescript
expect(t.errors.filter((r) => r.level === 'error')).toHaveLength(1);
t.clearErrors();
t.dispose();
```

`{failOnKernelErrors: false}` switches the throw off; `{echoKernelErrors: true}` puts reports back
on the console while still recording. `recordKernelErrors(logger, echo?)` is the recorder on its
own, for a Kernel held directly: `records`, `clear()`, `unhook()`.

## Two things the utility cannot do

- **A farewell message dispatched during `dispose()` is lost** — `dispose()` releases the recorder
  while that message sits in a microtask. Destroy the entity and `await settle()` first, then read
  `viewMessages`, then dispose.
- **Nothing clones, in either direction.** A property or context value arrives by identity — DOM
  node and WebGL handle included — and `ViewMessageRecord.data` is the very object dispatched. That
  is more than a local `ShadowEnv` gives without `disableStructuredClone`, and it means a green test
  proves nothing about surviving a worker boundary.

## Registry isolation

Each test kernel gets its own `Registry` and `dispose()` empties it — two tests never see each
other's definitions. A `Registry` handed in through `registry` is the caller's and is **never**
cleared by `dispose()`. Reaching the process-wide default is the deliberate bridge to classes that
registered themselves with `@ShadowObject`:

```typescript
const t = createTestKernel({registry: Registry.get()});   // isolation is gone from here on
```

## Integration test with a real environment

```typescript
const env = new ShadowEnv();
const localProxy = new LocalShadowObjectEnv();
localProxy.disableStructuredClone = true;

env.view = ComponentContext.get('test');
env.envProxy = localProxy;

await localProxy.importModule(myModule);
await env.ready();
// create components, await env.syncWait(), assert on entity state
```

Slower, but it covers the change trail, the clone, the sync tick and the proxy. Tear down with
`env.destroy()` then `ctx.dispose()`.
