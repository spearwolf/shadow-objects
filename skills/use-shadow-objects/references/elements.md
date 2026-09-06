# Web components

```javascript
import '@spearwolf/shadow-objects/elements.js';   // all three
// or one each: …/shae-worker.js, …/shae-ent.js, …/shae-prop.js
```

Entities do **not** have to sit inside `<shae-worker>` in the DOM — they connect by `ns`.

## Truthy value ≠ presence

`local`, `no-autostart`, `expose-to-model-context`, `auto-destruct` and `no-trim` count as **set**
only for `on`, `true`, `yes`, `local`, `1` (case-insensitive, surrounding whitespace ignored) or for
the bare attribute (a whitespace-only value reads as bare). `="false"` and `="0"` mean **unset**.
`no-structured-clone` is the one that asks for presence alone.

## `<shae-worker>`

| Attribute | Values | Notes |
|---|---|---|
| `src` | URL | The module whose `shadowObjects` export is the Registry. Trimmed; a runtime change re-imports. **A trust boundary** — never from unvalidated input |
| `local` | truthy | Kernel on the main thread. Decided once when the environment is built; a later write is refused and reset |
| `ns` | string | Namespace of the `ComponentContext` |
| `auto-sync` | `frame`/`on`/`yes`/`true`/`auto-sync` (default), `60fps`, `100` (ms), `no`/`off`/`false` | `Nfps` with N ≤ 0 warns and does not sync; anything unreadable is reported at error level and switches syncing off |
| `no-structured-clone` | presence | Local only; silently without effect without `local` |
| `no-autostart` | truthy | Call `start()` yourself. **Not observed** — read once at connect |
| `load-timeout`, `configure-timeout`, `change-trail-timeout`, `inspect-timeout`, `destroy-timeout` | ms, 1…2147483647 | Defaults 60000/60000/5000/5000/5000. Not observed, read once when the environment is built, no effect under `local` |
| `expose-to-model-context` | truthy | Shares this environment with the page's WebMCP registration. Observed |
| `redact-props` | `"a, b c"` | Property names the agent never sees; cumulates across shares. Read at every call |

`observedAttributes`: `ns`, `local`, `src`, `no-structured-clone`, `auto-sync`,
`expose-to-model-context`.

**JS API.** `start()`, `importScript(src)` (async — a blank `src` rejects, it does not throw at the
call site), `syncShadowObjects()` (unconfirmed path, collected per namespace, one microtask later —
needed with `auto-sync="off"`), `destroy()`. Properties: `shadowEnv`, `isDestroyed`, `logger`,
`autostart`, `shouldAutostart`, `redactProps`, `modelContextExposure`
(`Promise<ExposeHandle> | undefined`), `autoSync`, `frameLoop`, `ns`, `isShaeWorkerElement`.
Signals `isConnected$`, `autoSync$`, `src$`, `ns$` are public.

`el.autoSync = 30` is **not** `auto-sync="30"`: writing accepts strings only, any other value reads
as a flag (truthy → `"frame"`, falsy → `"no"`).

**DOM events**, all `bubbles: false`, no `composed`, `detail` always carries `shadowEnv`:
`contextcreated`, `contextlost`, `proxyfailed` (`{reason}`), `syncfailed`
(`{reason, changeTrail}`). `ShadowEnv.AfterSync` is deliberately not mirrored.

**Teardown is strong here.** Leaving the tree destroys the environment one microtask later, for
good; back in the tree before that microtask and nothing happens. A torn-down `<shae-worker>` put
back into the document stays torn down — build a new one. `<shae-ent>` elements of the same
namespace keep their `ViewComponent`s; only the environment behind them goes.

Calling `start()` before the first connect costs the `contextcreated`/`contextlost` events (no
listeners yet) and pins `shadowEnv.view` to the namespace it was started with.

## `<shae-ent>`

| Attribute | Values | Notes |
|---|---|---|
| `token` | string | Optional; without it the entity carries `#void` |
| `ns` | string | A runtime change moves the entity **and its properties** into the other environment |
| `forward-custom-events` | absent / empty / comma list | Empty or whitespace-only: every event. A list: only those types. Absent, or a list naming nothing: no DOM event at all |
| `auto-destruct` | truthy | The entity goes down with its parent instead of being promoted to a root. Not observed, read once when the `ViewComponent` is built. Read by the **Kernel** — removing a DOM subtree does not cascade |

`observedAttributes`: `ns`, `token`, `forward-custom-events`.

**Parent binding is namespace-scoped.** An entity takes its parent from its own namespace only; a
`<shae-ent>` of another namespace in between is invisible and does not block. (`<shae-prop>` binds by
the opposite rule.)

**JS API.** `token`, `ns`, `uuid`, `viewComponent`, `componentContext`, `entParentNode` (writable —
the next lookup decides again), `findShadowRootHost()`, `onParentChanged(new, old)`,
`syncShadowObjects()`, `destroy()`, `isDestroyed`. Signals `token$`, `viewComponent$`,
`componentContext$`, `forwardCustomEvents$`, `ns$` are public. There is **no** `forwardCustomEvents`
accessor — the signal is the only JS way to set the filter:

```javascript
ent.forwardCustomEvents$.set(true);                        // attribute becomes ""
ent.forwardCustomEvents$.set(new Set(['score-changed']));
ent.forwardCustomEvents$.set(false);                       // attribute removed
```

**Teardown is weak here.** Leaving the tree releases the subscriptions one microtask later
(`isDestroyed === true`); reconnecting takes them up again with the same `ViewComponent`, uuid and
values. A `token`/`ns`/`forward-custom-events` written while released lands in the signal and is
written out to the attribute on reconnect — the signal wins.

**A rejected `ComponentContext`** (uuid collision, or a disposed context) never escapes the element;
it is reported through the element's own logger. A uuid collision costs the entity its context; a
disposed target costs it nothing it did not already lack. The way back is the next *change* of `ns`
or a leave-and-rejoin.

Subclassing: override `teardown()` (call `super` last) **and** `restore()` (call `super` first, and
write reflecting signals out again). Overriding one without the other works exactly once. A
subclass constructor must take no subscriptions — read attributes into signals and stop there.

## `<shae-prop>`

| Attribute | Values | Notes |
|---|---|---|
| `name` | string | Trimmed; empty or whitespace-only binds nothing |
| `value` | string | Cast by `type`. `value=""` counts as **no value** — the name never appears on the entity |
| `type` | see table | An unknown name is reported at `warn` and the string passes through |
| `no-trim` | truthy | Without it `value="   "` trims to `''`, and with `type="number"` that is `0` |

`observedAttributes`: `name`, `value`, `type`, `no-trim`.

**Host binding is by proximity and ignores namespace.** The host is the closest entity above the
element in the *flattened* tree — through shadow roots, along slot projections, across closed
boundaries. It is re-decided whenever the element moves and whenever something above it changes: a
tag registered late, a shadow root attached afterwards, a changed slot assignment, the `<slot>`
itself moving, a host leaving the tree. A move binds immediately; a change above the element takes
effect one microtask later. With no entity above it, the property is set nowhere and reported once
per element at `warn`. Removing, renaming or moving the element to another entity clears the
property; a move within one tick is a move, not a removal.

### `type` values

| Type | Result |
|---|---|
| `string`, `text` | plain string (default) |
| `number` | `Number()` |
| `float` | `parseFloat` |
| `int`, `integer` / `hex`, `hexadecimal` / `oct`, `octal` / `bin`, `binary` | `parseInt` base 10 / 16 / 8 / 2 |
| `bigint` | `BigInt()` |
| `boolean`, `bool` | `true` only for `on`, `true`, `yes`, `local`, `1` (case-insensitive). `"0"` and `"2"` are `false` |
| `json` | `JSON.parse` |
| `number[]`, `float[]`, `int[]`, `integer[]` | split on **whitespace only** — `"1,2,3"` stays one element |
| `[]`, `string[]`, `text[]`, `hex[]`, `oct[]`, `bin[]`, `bool[]`, … | split on any run of non-word characters |
| `float32array`, `float64array` | typed array, whitespace only |
| `int8array`, `uint8array`, `bigint64array`, … | typed array, any non-word run |

**Two failure channels.** A value that does not convert is reported at **error** level (ungated) and
leaves the property `undefined` — nothing throws. An unknown **type name** is reported at **warn**
(gated behind `ConsoleLogger.sharedConfig.enable`) and the string passes through. A numeric type
whose conversion still yields a number belongs to the first channel: `type="int" value="12abc"` is
`12`; `type="number" value="12abc"` sets nothing.

**JS API.** `name`, `value` (writing bypasses the attribute and feeds the conversion directly; `0`,
`false` and `''` are values, only `null`/`undefined` clear), `shouldTrim`, `entNode` (writable),
`viewComponent`, `destroy()`, `isDestroyed`. This element does **not** extend `ShaeElement` — no
`ns`, no `isShaeElement` — and keeps its signals `protected`.

On reconnect it re-reads `name`, `type` and `no-trim`, and `value` only where that attribute carries
something: an `entNode` or a `value` written while released is replaced rather than applied, unless
the `value` attribute is absent or empty.

## Registering your own element tags

Registration order does **not** decide the entity tree. An element that becomes an entity while the
markup already stands announces itself downwards: `<shae-ent>` children look for their parent again,
`<shae-prop>` children for their host, and they get the tree as it is now. A wrapper that is not an
entity is skipped on the way up.

Timing is the catch: everything that becomes an entity in one task is answered by **one** round, one
microtask later. `customElements.define()` returns before that. Assert afterwards only behind
`await Promise.resolve()`.

## Framework integration

**React 19** writes a prop of a custom element as a property where one exists (`name`, `value`,
`token`) and as an attribute otherwise, so numbers and booleans arrive as they are. A lowercase
`on…` prop with a function value becomes a listener named by what follows the `on` — `ontick` hears
`tick`; `onTick` would listen for `Tick`. Under React 18 every prop is an attribute: pass
`value={String(x)}` and attach listeners through a `ref` + `addEventListener`.

**Vue 3** needs `compilerOptions.isCustomElement = (tag) => tag.startsWith('shae-')`. It writes
`value` as a property, and `@tick`/`@done` work directly because a forwarded event is a plain
bubbling `CustomEvent`. Svelte behaves like Vue.

`type` therefore only matters for a string — the case where the element upgrades after the framework
has rendered it and the value went in as an attribute.

Both: a re-render writing the same value changes nothing; unmounting removes the `<shae-ent>` and the
entity goes down with it, cleanups included; the first message back is asynchronous, so seed local
state from the prop instead of rendering nothing.

Use the imperative `ViewComponent` API where there is no DOM node per entity (canvas, scene graph,
recycling list) or where a value cannot be spelled in an attribute.
