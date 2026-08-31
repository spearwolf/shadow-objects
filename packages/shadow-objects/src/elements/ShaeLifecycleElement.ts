import {hibernate} from '@spearwolf/signalize';
import {DeferredTeardown} from './deferredTeardown.js';
import {ensureDisplayContentsRule} from './displayContentsRule.js';

/**
 * The lifecycle every custom element of this library carries: when it starts listening, when it
 * lets go, and what it keeps across the two.
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
 * return into the tree subscribes to them again through {@link ShaeLifecycleElement.restore}.
 * Destroying them would make the teardown one-way for no gain — a destroyed signal cannot be
 * revived, and it is not what holds the element anyway.
 *
 * A subclass whose teardown *is* final refuses the return in its own `connectedCallback` — see
 * `ShaeWorkerElement`, whose teardown takes an environment with it that cannot be rebuilt. For such
 * an element {@link ShaeLifecycleElement.restore} runs exactly once, on the first connect.
 */
export class ShaeLifecycleElement extends HTMLElement {
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

  /** Whether this element has been torn down. */
  get isDestroyed(): boolean {
    return this.#destroyed;
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
   * second call run the whole teardown a second time. {@link ShaeLifecycleElement.teardown} is the
   * extension point; it runs with the flag already down and `isDestroyed` already `true`.
   */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#subscribed = false;

    this.teardown();
  }

  /**
   * Take the subscriptions up.
   *
   * Called from `connectedCallback` and from nowhere else — a constructor in particular, where the
   * subclass fields these subscriptions read are not there yet. It runs at the first connect, where
   * the element has never listened to anything, and again for one that comes back after a teardown;
   * the two are the same job, and the element between them is in the same state either way.
   *
   * A subclass overrides this, calls `super.restore()` first and takes its own subscriptions up.
   * Every subscription released in {@link ShaeLifecycleElement.teardown} has to come back here —
   * one that does not is gone for the rest of the element's life, silently.
   */
  protected restore(): void {
    // the extension point holds nothing of its own: what an element listens to belongs to the
    // element, and this class decides only when the subscriptions are taken up
  }

  /**
   * Release what this element holds. The overridable half of
   * {@link ShaeLifecycleElement.destroy}.
   *
   * A subclass releases its own subscriptions and calls `super.teardown()` last, so the element
   * comes apart from the outside in. Whatever is released here has to be taken up again in
   * {@link ShaeLifecycleElement.restore} — the two are one pair, and a subscription missing from
   * either side is a leak or a silently dead element.
   */
  protected teardown(): void {
    // the counterpart of `restore()`, and empty for the same reason
  }
}
