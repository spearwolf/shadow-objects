import {createSignal, hibernate, Signal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import type {NamespaceType} from '../types.js';
import {readNamespaceAttribute} from '../utils/attr-utils.js';
import {toNamespace} from '../utils/toNamespace.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ATTR_NS} from './constants.js';
import {DeferredTeardown} from './deferredTeardown.js';
import {ensureDisplayContentsRule} from './displayContentsRule.js';

const updateNamespace = (el: HTMLElement, ns: Signal<NamespaceType>) => {
  ns.set(readNamespaceAttribute(el));
};

const SyncNamespaces = new Set<NamespaceType>();
let nextSyncIsScheduled = false;

const syncShadowObjects = (ns: NamespaceType) => {
  SyncNamespaces.add(ns);
  if (!nextSyncIsScheduled) {
    nextSyncIsScheduled = true;
    queueMicrotask(() => {
      nextSyncIsScheduled = false;
      for (const ns of SyncNamespaces) {
        ShadowEnv.get(ns)?.sync();
      }
      SyncNamespaces.clear();
    });
  }
};

/**
 * The base of the custom elements that pick an environment through their `ns` attribute.
 *
 * The subscriptions of such an element begin at its first connect, not at its construction. That is
 * what makes an element that is built and never used collectable at all: signalize registers every
 * effect and every `onChange` handler under a signal id in a module-level queue, so an element that
 * subscribed in its constructor would hang there for the lifetime of the page, however little the
 * application ever did with it. What the constructor does instead is read attributes into signals,
 * which nobody is listening to yet.
 *
 * An element that leaves the tree and stays out is torn down: every effect, every `onChange`
 * subscription and every link it holds comes off, and with them the last thing on the module level
 * that pointed at it. The decision waits one microtask, so a move inside a single task — every
 * re-render is one — costs the element nothing.
 *
 * What the element carries as state it keeps. Its signals are not destroyed: they hold their
 * identity and their values, a write between the teardown and a return lands in the value, and a
 * return into the tree subscribes to them again through {@link ShaeElement.restore}. Destroying
 * them would make the teardown one-way for no gain — a destroyed signal cannot be revived, and it
 * is not what holds the element anyway.
 *
 * A subclass whose teardown *is* final refuses the return in its own `connectedCallback` — see
 * `ShaeWorkerElement`, whose teardown takes an environment with it that cannot be rebuilt. For such
 * an element {@link ShaeElement.restore} runs exactly once, on the first connect.
 */
export class ShaeElement extends HTMLElement {
  static observedAttributes = [ATTR_NS];

  readonly isShaeElement = true;

  readonly ns$ = createSignal<NamespaceType>(GlobalNS);

  get ns(): NamespaceType {
    return this.ns$.value;
  }

  set ns(ns: NamespaceType) {
    if (typeof ns === 'symbol') {
      this.ns$.set(ns);
    } else {
      this.ns$.set(toNamespace(ns));
    }
  }

  /** Whether this element has been in a tree at least once. */
  #wasConnected = false;

  /** Attribute writes that came in before the first connect, the latest one per attribute. */
  #pendingReflections?: Map<string, () => void> | undefined;

  #destroyed = false;

  /**
   * Whether this element is listening right now.
   *
   * A separate field from `#destroyed`, and they must not be folded into one: the two disagree for
   * a freshly built element, which is listening to nothing and has been torn down by nobody. Read
   * off a single field, that element would have to report `isDestroyed === true` — which is a lie
   * the whole public surface would then carry: `destroy()` would find nothing to do, and the
   * documented promise that a new element reads `false` would be gone.
   */
  #subscribed = false;

  readonly #teardown = new DeferredTeardown(() => this.destroy());

  /** Takes the namespace reflection off again. */
  #nsReflection?: (() => void) | undefined;

  /** Whether this element has been torn down. */
  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  constructor() {
    super();

    // Nothing is listening at this point, and the read does not need anything to: it puts into the
    // signal what the attribute spells, normalised — `ns="  local  "` becomes `local`. The
    // normalised value reaches the attribute at the first connect, where `restore()` writes every
    // reflecting signal back out.
    updateNamespace(this, this.ns$);
  }

  /**
   * Take up everything this element listens to.
   *
   * Private rather than overridable, and called from {@link ShaeElement.restore} alone: a subclass
   * extends the pair `restore()`/`teardown()`, which is where its own signals are there to be
   * subscribed to.
   */
  #subscribe(): void {
    this.#nsReflection = this.ns$.onChange((ns) => this.#reflectNamespace(ns));
  }

  #reflectNamespace(ns: NamespaceType): void {
    this.reflectAttribute(ATTR_NS, () => {
      if (typeof ns === 'string' && ns.length > 0) {
        if (this.getAttribute(ATTR_NS) !== ns) {
          this.setAttribute(ATTR_NS, ns);
        }
      } else {
        this.removeAttribute(ATTR_NS);
      }
    });
  }

  /**
   * Take the subscriptions up, and catch up on what changed while nothing was listening.
   *
   * Called from `connectedCallback` and from nowhere else — a constructor in particular, where the
   * subclass fields these subscriptions read are not there yet. It runs at the first connect, where
   * the element has never listened to anything, and again for one that comes back after a teardown;
   * the two are the same job, and the element between them is in the same state either way.
   *
   * The catch-up is the half that is easy to leave out and expensive to miss. A released element
   * still takes writes — the signals are alive — but nothing carries them onto the attributes, so
   * the two drift apart. Writing the signal's value back here settles that before anything reads an
   * attribute again: without it, the attribute read on the way in would push the *old* value back
   * into the signal and the write would be lost without a word. At the first connect the same
   * write is what carries the normalisation of the constructor's attribute read onto the attribute.
   *
   * A subclass overrides this, calls `super.restore()`, takes its own subscriptions up and catches
   * up on its own signals in the same way. Every subscription this element loses in
   * {@link ShaeElement.destroy} has to come back here — one that does not is gone for the rest of
   * the element's life, silently.
   */
  protected restore(): void {
    this.#subscribe();
    this.#reflectNamespace(this.ns$.value);
  }

  /**
   * Writes an attribute back from a signal, or holds the write until the element first connects.
   *
   * A write is parked whenever it happens before the element has connected once — `restore()`'s
   * own writes on the very first connect are one source, carrying every reflecting signal out to
   * its attribute, including whatever the constructor's attribute read normalised; any other
   * write that lands ahead of that first connect is parked the same way. `restore()`'s call sits
   * in front of the gate on purpose: a `setAttribute` from inside it would re-enter
   * `attributeChangedCallback` while the subscriptions are still being set up, and running the
   * writes a few lines further on, once the element is whole, is cheaper than making every
   * subscription survive being read halfway through. A later write for the same attribute
   * replaces the parked one — only the value the signal ends up with is worth writing.
   *
   * What is written back on connect is what the signals already carry, so the
   * `attributeChangedCallback` it triggers sets each signal to the value it is already on. For a
   * signal holding a scalar that is no change and reaches no handler at all; for one holding a
   * fresh object on every read — `forward-custom-events` builds a new `Set` per read — the write
   * counts as a change by identity and the reflecting handler runs once more, where the guard on
   * the attribute value it already wrote stops the second write. Either way the attribute ends up
   * on the value the signal carries.
   */
  protected reflectAttribute(name: string, write: () => void): void {
    if (this.#wasConnected) {
      write();
    } else {
      this.#pendingReflections ??= new Map();
      this.#pendingReflections.set(name, write);
    }
  }

  connectedCallback() {
    // The whole body runs outside whatever reactive context the caller is in. An `append()` is an
    // ordinary call, and it can perfectly well stand inside a `createEffect()` of the application:
    // a new effect and an `onChange()` hang themselves on the effect that is running at the time,
    // so every subscription taken up below would become a child of that foreign effect, and its
    // next run would release them all. The element would go quiet with `isDestroyed` still reading
    // `false` and nothing said. `hibernate()` clears the effect stack for the duration, so the
    // subscriptions belong to the element and come off where the element decides.
    hibernate(() => {
      // first, before anything reads or writes: being in the tree is the condition the deferred
      // teardown waits on, so arriving here calls a booked teardown off
      this.#teardown.cancel();

      // an element that is not listening takes its subscriptions up: the one that has never
      // listened yet and the one whose teardown ran are the same case. The signals stood untouched
      // either way, so this is a subscribe and never a rebuild
      this.#destroyed = false;
      if (!this.#subscribed) {
        this.#subscribed = true;
        this.restore();
      }

      ensureDisplayContentsRule(this.getRootNode(), this.localName);

      // the gate is "has been connected once", not "is connected now": what is held back is only
      // what accrues before the very first connect — the reflections `restore()` just wrote among
      // them, which is why the flag falls behind that call. An element between its teardown and its
      // return reflects nothing for a different reason — it has no reflecting handler at that
      // point, and `restore()` settles the difference on the way back in. And the flag is set
      // before the parked writes run, so a write that triggers another one goes straight through
      // instead of landing in a map nobody reads again
      this.#wasConnected = true;

      const pending = this.#pendingReflections;
      this.#pendingReflections = undefined;
      if (pending) {
        for (const write of pending.values()) {
          write();
        }
      }
    });
  }

  disconnectedCallback(): void {
    this.#teardown.schedule();
  }

  /**
   * Tear this element down: let go of everything that listens, and keep everything that is state.
   *
   * Called for an element that has left the tree and stayed out, and callable by hand for one
   * whose end is known earlier. Every call after the first finds nothing left to do.
   *
   * The guard and the flag live here, in front of the work, and that is the whole reason this
   * method is not the one a subclass overrides: releasing what an element holds can call back into
   * it — an environment being torn down dispatches a DOM event on its way out, and a listener on
   * that event can reach `destroy()` again — and a flag that only fell at the end would let the
   * second call run the whole teardown a second time. {@link ShaeElement.teardown} is the
   * extension point; it runs with the flag already down and `isDestroyed` already `true`.
   */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#subscribed = false;

    this.teardown();
  }

  /**
   * Release what this element holds. The overridable half of {@link ShaeElement.destroy}.
   *
   * A subclass releases its own subscriptions and calls `super.teardown()` last, so the element
   * comes apart from the outside in. Whatever is released here has to be taken up again in
   * {@link ShaeElement.restore} — the two are one pair, and a subscription missing from either
   * side is a leak or a silently dead element.
   *
   * `#pendingReflections` is left alone on purpose: it holds every write parked before the
   * element's first connect, and that connect is what drains it — a `destroy()` reached first
   * leaves the map standing for whichever connect comes next.
   */
  protected teardown(): void {
    this.#nsReflection?.();
    this.#nsReflection = undefined;
  }

  attributeChangedCallback(name: string) {
    if (name === ATTR_NS) {
      updateNamespace(this, this.ns$);
    }
  }

  syncShadowObjects() {
    syncShadowObjects(this.ns);
  }

  /**
   * Sync the environment of `ns` instead of the one this element sits in right now.
   *
   * For the moment an element changes namespaces: the environment it leaves has a change trail
   * waiting for it, and `this.ns` no longer points at it.
   */
  protected syncShadowObjectsOf(ns: NamespaceType) {
    syncShadowObjects(ns);
  }
}
