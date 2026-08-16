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
 * Removes every container `mount` created, clears every `ComponentContext`, and destroys every
 * `ShadowEnv` still registered under `globalThis.__shadowEnvs` — none of that depends on a spec
 * remembering to call `el.destroy()` itself, including a spec that throws before reaching it.
 * `ShadowEnv#destroy()` deletes its own namespace entry, so a snapshot of the current values is
 * iterated rather than the live map. Leaving a `ShadowEnv` behind does not leak a worker thread:
 * every case in this package starts its environment with the `local` attribute, so the proxy is
 * always a `LocalShadowObjectEnv`, whose `destroy()` tears down its `Kernel` synchronously and
 * holds no timer or thread of its own. Without this sweep, a stale entry on the next case that
 * reuses the same namespace only surfaces as an "overwrite a namespace already in use" warning —
 * silent unless something happens to read the console, and exactly the kind of order dependency
 * this whole cleanup exists to remove.
 */
export function unmountAll() {
  for (const container of containers) {
    container.remove();
  }
  containers.length = 0;
  for (const context of ComponentContext.getContextsMap().values()) {
    context.clear();
  }
  for (const shadowEnv of Array.from(globalThis.__shadowEnvs?.values() ?? [])) {
    shadowEnv.destroy();
  }
}