import {ComponentContext} from '@spearwolf/shadow-objects';

const containers = [];

/**
 * Builds a `<div>`, fills it with `html` via `innerHTML`, and appends it to `document.body`.
 * Uses the markup path on purpose: the Shae element constructors set
 * `this.style.display = 'contents'`, which the Custom Elements specification forbids during
 * construction — `document.createElement('shae-ent')` aborts the upgrade and leaves an
 * `HTMLUnknownElement` behind (tracked as DEFECT-1 in
 * `packages/shadow-objects-e2e/KNOWN-DEFECTS.md`, out of scope here). Only elements upgraded
 * through `innerHTML` reach a fully constructed state.
 */
export function mount(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  containers.push(container);
  return container;
}

/**
 * Removes every container `mount` created and clears the global `ComponentContext`. A spec that
 * mounts into a namespace of its own has to clear that context itself — this only ever touches
 * the one every other spec shares.
 */
export function unmountAll() {
  for (const container of containers) {
    container.remove();
  }
  containers.length = 0;
  ComponentContext.get().clear();
}