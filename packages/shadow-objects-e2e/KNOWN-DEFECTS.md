# Known defects

Framework defects that this E2E suite reproduces. Each one has tests that assert the **correct**
behaviour and are registered in the spec's `knownFailures`, so they run as expected failures:
the suite stays green while the defect exists, and turns red the moment it is fixed — which is
the reminder to delete the entry here and in the spec.

Found on 2026-08-02 while building the multi-environment and dynamic-DOM pages. Both reproduce
identically in Chromium and Firefox.

---

## DEFECT-1 — the custom elements cannot be created with `document.createElement()`

**Tests:** `tests/create-element.spec.ts` · **Page:** `pages/create-element.html`

```js
document.createElement('shae-ent');   // -> HTMLUnknownElement, never upgraded
```

All three elements are affected: `<shae-ent>`, `<shae-prop>` and `<shae-worker>`. The browser
logs `Failed to execute 'createElement' on 'Document': The result must not have attributes`,
aborts the upgrade and returns an `HTMLUnknownElement`. The element has no `viewComponent`, no
`uuid`, and never reaches the shadow environment. Creating the same markup through
`innerHTML` / `insertAdjacentHTML` works, which is why the defect stayed invisible: every test
page so far used parser-generated markup.

**Cause.** The custom elements spec forbids a constructor from giving its element attributes or
children. All three constructors do exactly that:

| File | What the constructor does |
|---|---|
| `elements/ShaeElement.ts` | `updateNamespace()` → `ns$.onChange` → `setAttribute('ns', …)` / `removeAttribute('ns')` |
| `elements/ShaeEntElement.ts` | `this.style.display = 'contents'` (writes a `style` attribute); `token$.onChange` → `removeAttribute('token')` |
| `elements/ShaePropElement.ts` | `this.style.display = 'contents'` |
| `elements/ShaeWorkerElement.ts` | `this.style.display = 'contents'` |

**Impact.** Any integration that builds elements programmatically instead of parsing markup gets
inert elements: React, Vue, Svelte and hand-written wrappers all go through `createElement`.

**Fix direction.** Move everything that touches attributes or styles out of the constructors and
into `connectedCallback`. `display: contents` is better expressed as a stylesheet rule than as an
inline style. The attribute reflection in the `onChange` handlers needs to be deferred until the
element is connected.

---

## DEFECT-2 — removing a `<shae-prop>` does not remove the property

**Test:** `dynamic-dom-removed-prop-is-gone` in `tests/dynamic-dom.spec.ts`

Removing a `<shae-prop>` element from the DOM leaves its property in place; the shadow object
keeps observing the last value it had. The DOM is supposed to be the source of truth, so removing
the element that declares a property should remove the property.

**Cause.** `ShaePropElement.disconnectedCallback` → `#disconnectFromEntNode()` clears `entNode$`
and therefore `viewComponent$`, which only stops the effect from writing further updates. Nothing
calls `ViewComponent.removeProperty(name)` — the method exists (`view/ViewComponent.ts`) and is
never used by the element layer.

**Fix direction.** Remember the last `(viewComponent, name)` the effect wrote to and call
`removeProperty()` when the element disconnects or its name changes. Note the existing
one-microtask delay in `#disconnectFromEntNode`, which is there so that moving an element within
a single tick is not mistaken for a removal — the removal must keep that behaviour.

---

## Related gap (not a defect, but untestable from the DOM)

`autoDestructionOnParentRemoval` cannot be set through `<shae-ent>`. There is no attribute for it,
and `ShaeEntElement` constructs its `ViewComponent` without the option, so the flag is reachable
only from the programmatic API. `tests/auto-destruct.spec.ts` therefore drives it through the
kernel API; a DOM-level test of the cascade is not currently possible.
