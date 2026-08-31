import {batch, createEffect, createSignal, Effect, hibernate, link} from '@spearwolf/signalize';
import {readBooleanAttribute} from '../utils/attr-utils.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {MicrotaskGate} from '../utils/MicrotaskGate.js';
import type {ViewComponent} from '../view/ViewComponent.js';
import {ATTR_NAME, ATTR_NO_TRIM, ATTR_TYPE, ATTR_VALUE, ReRequestEntHostEventName} from './constants.js';
import {DeferredTeardown} from './deferredTeardown.js';
import {ensureDisplayContentsRule} from './displayContentsRule.js';
import {propValueConverters} from './propValueConverters.js';
import {requestEntAncestor} from './requestEntAncestor.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

/**
 * How many `<shae-prop>` elements declare a given name on a given view component right now.
 *
 * A property belongs to the entity, not to the element that wrote it last: two elements may
 * declare the same name, and the entity keeps the property until the last of them lets go. The
 * count is keyed the way the binding is — (view component, name) — and lives beside the elements
 * because no single one of them can answer the question.
 */
const declarantsPerComponent = new WeakMap<ViewComponent, Map<string, number>>();

const addDeclarant = (vc: ViewComponent, name: string) => {
  let names = declarantsPerComponent.get(vc);
  if (names == null) {
    names = new Map();
    declarantsPerComponent.set(vc, names);
  }
  names.set(name, (names.get(name) ?? 0) + 1);
};

/** @returns `true` if this was the last element declaring `name` on `vc`. */
const removeDeclarant = (vc: ViewComponent, name: string): boolean => {
  const names = declarantsPerComponent.get(vc);
  if (names == null) return true;

  const remaining = (names.get(name) ?? 1) - 1;
  if (remaining > 0) {
    names.set(name, remaining);
    return false;
  }

  names.delete(name);
  if (names.size === 0) {
    declarantsPerComponent.delete(vc);
  }
  return true;
};

/**
 * Sets a property on the entity above it.
 *
 * Unlike `<shae-ent>` and `<shae-worker>`, this element does not extend `ShaeElement` and has
 * no namespace of its own. `ShaeElement` exists for elements that pick an environment: their
 * `ns` attribute names the one they live in, and what they do goes there by default —
 * `ShaeElement.syncShadowObjectsOf()` is the explicit way to reach a different one, as
 * `<shae-ent>` does on a namespace change. A property picks nothing. It belongs to the closest
 * entity above it in the flattened tree, whatever namespace that entity happens to be in —
 * proximity decides, not membership. An `ns` on a `<shae-prop>` would therefore be an attribute
 * that changes no answer, and the convention both siblings follow — spreading
 * `ShaeElement.observedAttributes` into their own — would put it into `observedAttributes` for
 * every reader to trip over.
 *
 * That is also why the sync runs through the host: the environment that has to hear about a
 * property is the one the host entity lives in, and this element is the wrong place to ask.
 * `entNode.syncShadowObjects()` reaches it; a sync of this element's own would target the
 * global namespace instead — nothing happens if no environment answers to that, and if one
 * does, it still leaves the namespaced host waiting.
 *
 * The marker for this element is `isShaePropElement`, beside `isShaeEntElement` and
 * `isShaeWorkerElement`. Each names one tag for consumers and tests to check — this file's own
 * spec included — not for the host lookup itself: that is decided by `ShaeEntElement`'s
 * `#onRequestParent`, the only listener registered for the request, and it checks `requester`,
 * `answer` and `ns`, never a flag. A `<shae-prop>` never answers a host request because it never
 * listens for one, not because its marker reads differently.
 */
export class ShaePropElement extends HTMLElement {
  static observedAttributes = [ATTR_NAME, ATTR_VALUE, ATTR_TYPE, ATTR_NO_TRIM];

  readonly isShaePropElement = true;

  protected readonly entNode$ = createSignal<ShaeEntElement | undefined>();
  protected readonly viewComponent$ = createSignal<ViewComponent | undefined>();

  protected readonly name$ = createSignal<string | undefined>();
  protected readonly valueIn$ = createSignal();
  protected readonly valueOut$ = createSignal();
  protected readonly type$ = createSignal<string | undefined>();
  protected readonly shouldTrim$ = createSignal(true);

  readonly #logger = new ConsoleLogger('ShaePropElement');

  /** The logger this element reports through: a subclass reads it and does not replace it. */
  protected get logger(): ConsoleLogger {
    return this.#logger;
  }

  #destroyed = false;

  /**
   * Whether this element is listening right now.
   *
   * Its own field beside `#destroyed`, and the two must not be folded together: they disagree for a
   * freshly built element, which is listening to nothing and has been torn down by nobody. One
   * field would make `isDestroyed` report `true` for such an element — see `ShaeElement`, where the
   * same pair carries the same reasoning.
   */
  #subscribed = false;

  readonly #teardown = new DeferredTeardown(() => this.destroy());

  /** Binds this element to the entity above it, and carries that entity's component through. */
  #hostBinding?: (() => void) | undefined;

  /** Holds the property on the entity for as long as this element declares it. */
  #declareProperty?: Effect | undefined;

  /** Writes the value through to the entity. */
  #writePropertyValue?: Effect | undefined;

  /** Turns what the attribute spells into the value the property carries. */
  #convertValue?: Effect | undefined;

  /** Whether the missing-host warning has already gone out for this element. */
  #reportedMissingHost = false;

  /** The node this element listens on for a re-request of the host, so the listener can come off the same one. */
  #reRequestHostTarget?: EventTarget | undefined;

  readonly #hostLookup = new MicrotaskGate(() => {
    if (this.isConnected) {
      this.#findEntNode();
    }
  });

  /** Whether this element has been torn down. */
  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  get name(): string | undefined {
    return this.name$.value;
  }

  get value(): unknown {
    return this.valueOut$.value;
  }

  set value(val: unknown) {
    this.valueIn$.set(val);
  }

  get shouldTrim(): boolean {
    return this.shouldTrim$.value;
  }

  get entNode(): ShaeEntElement | undefined {
    return this.entNode$.value;
  }

  set entNode(el: ShaeEntElement | undefined) {
    this.entNode$.set(el);
  }

  get viewComponent(): ViewComponent | undefined {
    return this.viewComponent$.value;
  }

  constructor() {
    super();

    // read with nothing listening yet: what this puts into the signals is the state the attributes
    // already spell out, and the effects read it on their first run at the first connect
    batch(() => {
      this.#readNameAttribute();
      this.#readValueAttribute();
      this.#readTypeAttribute();
      this.#readNoTrimAttribute();
    });
  }

  /**
   * Take up everything this element listens to.
   *
   * Called from {@link ShaePropElement.restore} and from nowhere else — that is the one place where
   * this element's subscriptions begin, at the first connect as well as after a teardown.
   */
  #subscribe(): void {
    this.#hostBinding = this.entNode$.onChange((entNode) => {
      if (entNode) {
        const con = link(entNode.viewComponent$, this.viewComponent$);
        return () => {
          con.destroy();
        };
      } else {
        this.viewComponent$.set(undefined);
      }
    });

    // The binding this element holds is the pair (view component, name). It ends in three ways —
    // the element leaves the tree, its name changes, or it moves to another entity — and each of
    // them moves one of these two signals. The cleanup takes the property back for exactly the
    // binding that ended, which is why the three need no code of their own.
    //
    // `valueOut$` is deliberately not read here: a value change would otherwise run a removal
    // against a set of the same key on every keystroke.
    //
    // Standing before the value effect is a matter of reading order, not of behaviour: the order a
    // rename ends up with in the trail is decided in `ComponentChanges.#propsChangeOrder`, where
    // `appendToEnd` moves a key that is already queued to the back. Measured both ways, the trail
    // reads `[['x', undefined], ['y', 7]]` either way.
    this.#declareProperty = createEffect(() => {
      const vc = this.viewComponent$.get();
      const name = this.name$.get();

      if (vc == null || !name) return;

      // untracked on purpose: the host is where the sync has to go, not something this binding
      // depends on. And it is the host and not this element, because the host carries the
      // namespace — the environment holding this property is its, and nothing else knows which.
      const entNode = this.entNode$.value;

      addDeclarant(vc, name);

      return () => {
        // only the last declarant clears the property — another element may be holding the same
        // name on the same entity, and the entity is what the property belongs to
        if (removeDeclarant(vc, name)) {
          vc.removeProperty(name);
          // no `isConnected` guard, unlike the value effect below: an element that is no longer
          // connected is precisely the case this has to reach
          entNode?.syncShadowObjects();
        }
      };
    });

    this.#writePropertyValue = createEffect(() => {
      const vc = this.viewComponent$.get();
      if (vc) {
        const name = this.name$.get();
        if (name) {
          const value = this.valueOut$.get();

          this.logger.debug(`[${this.name}] view-component set-property`, name, value, vc.uuid, {
            viewComponent: vc,
            shaeProp: this,
          });

          vc.setProperty(name, value);

          if (this.isConnected) {
            this.entNode?.syncShadowObjects();
          }
        }
      }
    });

    this.#convertValue = createEffect(() => {
      const type = this.type$.get();
      const shouldTrim = this.shouldTrim$.get();
      let value = this.valueIn$.get();

      if (shouldTrim && typeof value === 'string') {
        value = value.trim();
      }

      // only null and undefined mean "no value" — 0, false and the empty string are values
      value = value ?? undefined;

      if (typeof value === 'string' && type) {
        const convert = propValueConverters.get(type);
        if (convert != null) {
          // invalid input is an operating case for this element, not an exceptional state: it is
          // reported and clears the value instead of throwing out of a reactive effect. A numeric
          // type throws when its conversion does not come out as a number, and takes the same way
          // out of here as malformed JSON does.
          try {
            value = convert(value);
          } catch (error) {
            // reported through `error`, not `warn`: `warn` is gated behind
            // `ConsoleLogger.sharedConfig.enable`, which defaults to "the page is served from a
            // loopback host". A dropped property value has to stay visible in production too.
            this.logger.error(`[${this.name}] could not convert the value into the type "${type}"`, {
              value,
              error,
              shaeProp: this,
            });
            value = undefined;
          }
        }
        // an unrecognized type name — `convert == null` — passes the string through untouched and
        // unreported here. `type$` is `protected`; the only writer in this repository is
        // `#readTypeAttribute`, which already warns for every unknown name it sees, so this branch
        // stays silent on purpose rather than warning a second time for the same name.
      }

      this.valueOut$.set(value);
    });
  }

  /**
   * Take the subscriptions up. The counterpart to {@link ShaePropElement.teardown}.
   *
   * Called from `connectedCallback` and from nowhere else: on the first connect, where this element
   * has never listened to anything, and again for one that comes back after a teardown.
   * `<shae-ent>` carries the same pair of methods — see `ShaeElement`.
   *
   * There is nothing to catch up on here, unlike `<shae-ent>`: `connectedCallback` reads `value`,
   * `name`, `type` and `no-trim` off the attributes and looks the host up again straight after
   * this, so the attributes decide, and whatever was written to a released element through
   * `prop.value` or `prop.entNode` is replaced by what the tree and the markup say. That is this
   * element's rule in and out of a teardown alike — a `<shae-prop>` reads its position on every
   * connect — and the documentation states it as the difference it is.
   *
   * A subclass overrides this, calls `super.restore()` and takes its own subscriptions up
   * afterwards. Every subscription released in {@link ShaePropElement.teardown} has to come back
   * here, or it is gone for the rest of the element's life without a word.
   */
  protected restore(): void {
    this.#subscribe();
  }

  connectedCallback() {
    // the whole body outside any reactive context of the caller, for the reason spelled out in
    // `ShaeElement.connectedCallback`: an `append()` inside a foreign effect would otherwise own
    // the effects taken up here, and that effect's next run would release them
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

      // called by hand because this class extends `HTMLElement` directly: it shares no base with
      // `<shae-ent>` and `<shae-worker>`, so it cannot inherit the installation
      ensureDisplayContentsRule(this.getRootNode(), this.localName);

      batch(() => {
        this.#findEntNode();
        this.#readNameAttribute();
        this.#readValueAttribute();
        this.#readTypeAttribute();
        this.#readNoTrimAttribute();
      });
    });
  }

  attributeChangedCallback(name: string) {
    switch (name) {
      case ATTR_NAME:
        this.#readNameAttribute();
        break;

      case ATTR_VALUE:
        this.#readValueAttribute();
        break;

      case ATTR_TYPE:
        this.#readTypeAttribute();
        break;

      case ATTR_NO_TRIM:
        this.#readNoTrimAttribute();
        break;
    }
  }

  disconnectedCallback() {
    this.#stopListeningForHostChanges();
    this.#disconnectFromEntNode();

    // last, and the order is not a matter of taste. `#disconnectFromEntNode` queues a microtask of
    // its own that writes `entNode$`, and microtasks run in the order they were queued: booked
    // second, the teardown runs second, so the unbinding still reaches a subscription that is on
    // and the property is taken off the entity it left. The other way round the write would arrive
    // after the release and reach nobody
    this.#teardown.schedule();
  }

  /**
   * Let go of everything this element listens to, and leave what it is made of standing.
   *
   * Called for an element that has left the tree and stayed out, and callable by hand for one
   * whose end is known earlier. Every call after the first finds nothing left to do.
   *
   * The signals are not destroyed — they carry this element's state across a teardown, and
   * {@link ShaePropElement.restore} subscribes to them again on the way back in.
   */
  destroy(): void {
    if (this.#destroyed) return;
    // the flag falls in front of the work, and that is the whole reason this method is not the one
    // a subclass overrides: releasing what an element holds can call back into it, and a flag that
    // only fell at the end would let the second call run the whole teardown a second time.
    // `teardown()` is the extension point, and it runs with the flag already down and
    // `isDestroyed` already `true`
    this.#destroyed = true;
    this.#subscribed = false;

    this.teardown();
  }

  /**
   * Release what this element holds. The overridable half of {@link ShaePropElement.destroy}.
   *
   * A subclass releases its own subscriptions and calls `super.teardown()` last, so the element
   * comes apart from the outside in. Whatever is released here has to be taken up again in
   * {@link ShaePropElement.restore} — the two are one pair, and a subscription missing from either
   * side is a leak or a silently dead element.
   *
   * The `link()` between the host's `viewComponent$` and this element's own needs no line of its
   * own: it is built in the cleanup path of the `entNode$` subscription, and taking that
   * subscription off runs the cleanup that destroys it.
   */
  protected teardown(): void {
    this.#stopListeningForHostChanges();

    this.#hostBinding?.();
    this.#hostBinding = undefined;

    this.#declareProperty?.destroy();
    this.#declareProperty = undefined;

    this.#writePropertyValue?.destroy();
    this.#writePropertyValue = undefined;

    this.#convertValue?.destroy();
    this.#convertValue = undefined;
  }

  // Determines the host from where the element stands right now. The request runs *without* a
  // namespace: a property belongs to the closest entity above it, whatever namespace that entity
  // is in.
  //
  // Nobody answering means there is no entity above this position, and the element says so. A
  // binding without an answer belongs to a place that is no longer there — whether the element
  // moved or the entity above it did. The cleanup on `entNode$` then takes the property off the
  // entity that no longer holds it, instead of leaving the element writing into an entity it does
  // not sit under any more.
  #findEntNode = () => {
    let found: ShaeEntElement | undefined;
    requestEntAncestor(this, {answer: (entNode) => (found = entNode)});

    this.entNode$.set(found);

    // Reported once per element, not once per request: the re-request channel repeats this very
    // lookup, so a property that never gets a host would otherwise report again on every upgrade
    // happening anywhere above it.
    //
    // The `isConnected` term is what separates "no host" from "no position": an element on its way
    // out of the tree is not missing a host.
    //
    // The limit of this report belongs next to it: `logger.warn` hangs on
    // `ConsoleLogger.sharedConfig.enable`, which means "the page is served from a loopback host" —
    // elsewhere the case stays silent. `warn` and not `error`, because in the upgrade path this
    // framework supports by design, "no entity above me yet" is a state to pass through: a
    // <shae-prop> under an element whose tag is registered later reports once and finds its host
    // right afterwards.
    if (found == null && this.isConnected && !this.#reportedMissingHost) {
      this.#reportedMissingHost = true;
      this.logger.warn(`[${this.name}] no entity above this element, the property is set nowhere`, {
        shaeProp: this,
      });
    }

    this.#listenForHostChanges();
  };

  // Someone above started or stopped answering. Two things separate this from a lookup the
  // element makes on arrival, and both belong here, to the trigger — what an unanswered
  // request means is the same on either path.
  //
  // It waits a microtask: the message arrives while the tree is still moving. An entity that
  // announces its departure has left, but everything below it can be back in place before the
  // tick ends, and an ancestor answering *right now* can be one this element is about to
  // leave behind. Asking after the dust settles is asking once, about the tree that is
  // actually there.
  //
  // And it drops the question if this element has left in the meantime, for the same reason
  // `#reRequestParent` does in `ShaeEntElement`: an element that is out of the tree answers
  // nothing about its position any more. Whether its departure is a move or an end is
  // `#disconnectFromEntNode`'s to answer, one microtask later, and it is answered in one place.
  // Nothing observable turns on the test — a departing entity takes its properties with it
  // either way — so it stands as a rule, not as a measurement.
  //
  // `#hostLookup` bounds the cost: a page filling up with entities sends many messages through the
  // same ancestor chain, and the gate turns them into one lookup per microtask and per element.
  #onReRequestHost = () => {
    this.#hostLookup.schedule();
  };

  #listenForHostChanges = () => {
    // bound: the entity itself is on the ascent of every element that could take the property
    // away from it. Unbound: the document is the one node every such event reaches, out of any
    // tree, closed roots included
    const target: EventTarget = this.entNode$.value ?? this.ownerDocument;
    if (target === this.#reRequestHostTarget) return;
    this.#stopListeningForHostChanges();
    target.addEventListener(ReRequestEntHostEventName, this.#onReRequestHost);
    this.#reRequestHostTarget = target;
  };

  #stopListeningForHostChanges = () => {
    this.#reRequestHostTarget?.removeEventListener(ReRequestEntHostEventName, this.#onReRequestHost);
    this.#reRequestHostTarget = undefined;
  };

  #disconnectFromEntNode = () => {
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.entNode$.set(undefined);
      }
    });
  };

  #readNameAttribute = () => {
    this.name$.set(this.getAttribute(ATTR_NAME)?.trim() ?? undefined);
  };

  #readValueAttribute = () => {
    // an empty value attribute means "no value", exactly like a missing one. Everything else
    // goes in raw: valueIn$ is the source a no-trim switch recalculates from, so whitespace
    // has to survive until the trim decides what is left of it.
    const value = this.getAttribute(ATTR_VALUE);
    this.valueIn$.set(value === null || value === '' ? undefined : value);
  };

  #readTypeAttribute = () => {
    let type = this.getAttribute(ATTR_TYPE)?.trim().toLowerCase();
    if (type && !propValueConverters.has(type)) {
      this.logger.warn(`[${this.name}] unknown type "${type}"`, {
        shaeProp: this,
      });
      type = undefined;
    }
    this.type$.set(type);
  };

  #readNoTrimAttribute = () => {
    this.shouldTrim$.set(!readBooleanAttribute(this, ATTR_NO_TRIM));
  };
}
