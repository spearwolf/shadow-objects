import {createSignal, Signal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import type {NamespaceType} from '../types.ts';
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
 * An element that leaves the tree and stays out is torn down: every effect, every `onChange`
 * subscription and every link it holds comes off, and with them the last thing on the module level
 * that pointed at it — signalize registers each of those under a signal id in a global queue, so
 * releasing them is what makes the element collectable. The decision waits one microtask, so a move
 * inside a single task — every re-render is one — costs the element nothing.
 *
 * What the element carries as state it keeps. Its signals are not destroyed: they hold their
 * identity and their values, a write between the teardown and a return lands in the value, and a
 * return into the tree subscribes to them again through {@link ShaeElement.restore}. Destroying
 * them would make the teardown one-way for no gain — a destroyed signal cannot be revived, and it
 * is not what holds the element anyway.
 *
 * A subclass whose teardown *is* final refuses the return in its own `connectedCallback` — see
 * `ShaeWorkerElement`, whose teardown takes an environment with it that cannot be rebuilt.
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
  #pendingReflections?: Map<string, () => void>;

  #destroyed = false;

  readonly #teardown = new DeferredTeardown(() => this.destroy());

  /** Takes the namespace reflection off again. */
  #nsReflection?: () => void;

  /** Whether this element has been torn down. */
  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  constructor() {
    super();

    // The subscription stands before the first read, and that order is observable: the read
    // normalises what the attribute spells — `ns="  local  "` becomes `local` — and only a handler
    // that is already listening carries the normalised value back onto the attribute.
    this.#subscribe();

    updateNamespace(this, this.ns$);
  }

  /**
   * Take up everything this element listens to.
   *
   * Private rather than overridable: this runs from the constructor of the base class, at which
   * point the field initialisers of a subclass have not run yet, and a subclass extending the
   * method here would reach for signals that do not exist at that moment. A subclass adds its own
   * subscriptions in {@link ShaeElement.restore} and in its own constructor instead.
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
   * The counterpart to {@link ShaeElement.destroy}: subscribe to everything again, and catch up on
   * what changed while nothing was listening.
   *
   * Called from `connectedCallback` for an element that comes back after a teardown, and from
   * nowhere else — a constructor in particular, where the subclass fields these subscriptions read
   * are not there yet.
   *
   * The catch-up is the half that is easy to leave out and expensive to miss. A released element
   * still takes writes — the signals are alive — but nothing carries them onto the attributes, so
   * the two drift apart. Writing the signal's value back here settles that before anything reads an
   * attribute again: without it, the attribute read on the way in would push the *old* value back
   * into the signal and the write would be lost without a word.
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
   * A constructor must not give its element an attribute — the browser aborts the upgrade over it.
   * Signals do change during construction, though: the initial attribute read happens there, and
   * whatever it normalises reaches the reflecting handler right away. So a write that arrives
   * before the first connect is parked instead of being dropped, and a later write for the same
   * attribute replaces it — only the value the signal ends up with is worth writing.
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
    // first, before anything reads or writes: being in the tree is the condition the deferred
    // teardown waits on, so arriving here calls a booked teardown off
    this.#teardown.cancel();

    // and an element whose teardown already ran takes its subscriptions up again — the signals
    // behind them stood untouched through it, so this is a reconnect and not a rebuild
    if (this.#destroyed) {
      this.#destroyed = false;
      this.restore();
    }

    ensureDisplayContentsRule(this.getRootNode(), this.localName);

    // the gate is "has been connected once", not "is connected now": what is held back is only
    // what accrues before the very first connect. An element between its teardown and its return
    // reflects nothing for a different reason — it has no reflecting handler at that point, and
    // `restore()` settles the difference on the way back in. And the flag is set before the parked
    // writes run, so a write that triggers another one goes straight through instead of landing in
    // a map nobody reads again
    this.#wasConnected = true;

    const pending = this.#pendingReflections;
    this.#pendingReflections = undefined;
    if (pending) {
      for (const write of pending.values()) {
        write();
      }
    }
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
   * `#pendingReflections` is left alone on purpose: it only ever holds writes from before the very
   * first connect, and an element that was never connected is never torn down either.
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