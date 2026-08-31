import {createSignal, hibernate, Signal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import type {NamespaceType} from '../types.js';
import {readNamespaceAttribute} from '../utils/attr-utils.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {MicrotaskCollector} from '../utils/MicrotaskCollector.js';
import {runGuarded} from '../utils/runGuarded.js';
import {toNamespace} from '../utils/toNamespace.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ATTR_NS} from './constants.js';
import {ShaeLifecycleElement} from './ShaeLifecycleElement.js';

const updateNamespace = (el: HTMLElement, ns: Signal<NamespaceType>) => {
  ns.set(readNamespaceAttribute(el));
};

const logger = new ConsoleLogger('ShaeElement');

// Module-wide, and one collector for every element in the realm: the key *is* the namespace and
// `ShadowEnv.get(ns)` resolves it realm-wide, so two environments of one realm can take nothing
// from each other here.
//
// One hand-over is one namespace: the call for each of them stands on its own, so none can take
// the rest of the round with it, and what comes up while handing one over is reported instead of
// carried out of the loop. What becomes of the trail is settled inside the environment, a
// microtask later, and does not travel back through here.
const syncCollector = new MicrotaskCollector<NamespaceType>((namespaces) => {
  for (const ns of namespaces.keys()) {
    runGuarded(logger, () => ShadowEnv.get(ns)?.sync(), 'a namespace could not be synced:', ns);
  }
});

const collectForSync = (ns: NamespaceType) => {
  syncCollector.add(ns);
};

/**
 * The base of the custom elements that pick an environment through their `ns` attribute.
 *
 * What it adds to {@link ShaeLifecycleElement} is the namespace: the `ns` attribute, the signal
 * behind it, the reflection back onto the attribute, and the two ways to hand an environment on to
 * the next sync. When such an element starts listening and when it lets go is the base's answer,
 * and it is the same answer `<shae-prop>` gets, which shares that base without this layer.
 */
export class ShaeElement extends ShaeLifecycleElement {
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

  /** Takes the namespace reflection off again. */
  #nsReflection?: (() => void) | undefined;

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
   * Take the namespace subscription up, and catch up on what changed while nothing was listening.
   * The namespace half of {@link ShaeLifecycleElement.restore}.
   *
   * The catch-up is the half that is easy to leave out and expensive to miss. A released element
   * still takes writes — the signals are alive — but nothing carries them onto the attributes, so
   * the two drift apart. Writing the signal's value back here settles that before anything reads an
   * attribute again: without it, the attribute read on the way in would push the *old* value back
   * into the signal and the write would be lost without a word. At the first connect the same
   * write is what carries the normalisation of the constructor's attribute read onto the attribute.
   */
  protected override restore(): void {
    super.restore();

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

  override connectedCallback() {
    // the whole body outside whatever reactive context the caller is in, for the reason spelled out
    // in `ShaeLifecycleElement.connectedCallback`. Nesting is fine: `super.connectedCallback()`
    // opens a frame of its own inside this one
    hibernate(() => {
      super.connectedCallback();

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

  /**
   * Release the namespace reflection. The namespace half of {@link ShaeLifecycleElement.teardown}.
   *
   * `#pendingReflections` is left alone on purpose: it holds every write parked before the
   * element's first connect, and that connect is what drains it — a `destroy()` reached first
   * leaves the map standing for whichever connect comes next.
   */
  protected override teardown(): void {
    this.#nsReflection?.();
    this.#nsReflection = undefined;

    super.teardown();
  }

  attributeChangedCallback(name: string) {
    if (name === ATTR_NS) {
      updateNamespace(this, this.ns$);
    }
  }

  /**
   * Hand the environment of this element's namespace on to the next `sync()` -- the unconfirmed
   * path.
   *
   * Over a worker it learns nothing of a confirmation the Shadow Environment refused, and no
   * `syncfailed` event follows. Whoever needs to know switches `auto-sync` off and runs
   * `syncWait()` from their own loop.
   */
  syncShadowObjects() {
    collectForSync(this.ns);
  }

  /**
   * Sync the environment of `ns` instead of the one this element sits in right now.
   *
   * For the moment an element changes namespaces: the environment it leaves has a change trail
   * waiting for it, and `this.ns` no longer points at it.
   */
  protected syncShadowObjectsOf(ns: NamespaceType) {
    collectForSync(ns);
  }
}
