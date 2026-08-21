import {on} from '@spearwolf/eventize';
import {beQuiet, createEffect, createSignal} from '@spearwolf/signalize';
import {VoidToken} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {
  ATTR_FORWARD_CUSTOM_EVENTS,
  ATTR_TOKEN,
  RequestEntParentEventName,
  ReRequestEntHostEventName,
  ReRequestEntParentEventName,
} from './constants.js';
import {type EntAncestorRequest, requestEntAncestor} from './requestEntAncestor.js';
import {ShaeElement} from './ShaeElement.js';

/**
 * The parent of `node` in the flattened tree: the slot it is assigned to, otherwise its parent
 * node, and for a node sitting directly under a shadow root the host of that root.
 */
const flattenedParentOf = (node: Node): Node | undefined =>
  (node as Element).assignedSlot ?? node.parentNode ?? (node as unknown as ShadowRoot).host ?? undefined;

/**
 * Whether `node` sits below `ancestor`, across shadow boundaries and slot projections.
 *
 * One ascent per candidate, and a peer round runs once per entity that connects — so n entity
 * siblings under one parent pay n²/2 ascents while the tree around them builds. The test is the
 * cheap half of that, not the expensive one: with the round left in but the test taken out, the
 * same build costs roughly four and a half times as much. What the test buys back grows with the
 * candidate set and with nothing else — under a hundred siblings under one parent it does not show
 * up at all, at six hundred it adds some two hundred fifty milliseconds to a build that would
 * otherwise take about seventy.
 *
 * A cheaper test would not remove the quadratic term, because every round still visits every
 * candidate; only one round for all the entities connecting in the same task would. Deciding on
 * the sending side instead runs into two walls: the root channel carries no sender to decide
 * about, and an ancestor test that skips the ascent cannot see through a closed shadow boundary —
 * which is why the caller drops the ancestor for an element inside a closed tree and asks
 * everyone.
 *
 * Numbers above are for 600 siblings under one parent, measured 2026-08-18 in Chromium via
 * Playwright 1.62.1 — a snapshot, not a guarantee; see `Backlog.md`'s Performance section for
 * the full size series and how to reproduce it.
 */
const isBelow = (node: Node, ancestor: Node): boolean => {
  for (let current = flattenedParentOf(node); current != null; current = flattenedParentOf(current)) {
    if (current === ancestor) return true;
  }
  return false;
};

/**
 * Whether `node` sits inside a closed shadow tree, at any level.
 *
 * This is the one question {@link isBelow} cannot answer for itself. A node projected into a
 * closed shadow root reports no `assignedSlot`, so the ascent steps from it straight to the host
 * and skips the slot along with everything the closed tree holds. It rejoins the real event path
 * at that host, which means the only nodes it can ever miss are the ones inside a closed tree —
 * and an ancestor it cannot see is one it must not rule out.
 */
const isInClosedShadowTree = (node: Node): boolean => {
  for (let root = node.getRootNode() as ShadowRoot; root?.host != null; root = root.host.getRootNode() as ShadowRoot) {
    if (root.mode === 'closed') return true;
  }
  return false;
};

/**
 * The entity that answers for a `<slot>`, written on either of the two occasions an entity comes
 * to answer for one: the slot reports an assignment and the closest entity above it takes it up,
 * or an entity enters the tree and takes up the slots below it. The reporting writer takes the
 * slot as it finds it: `slotchange` announces every change of an assignment, one that has just
 * become empty included, so an entry can name a slot that projects nothing at this moment. What
 * no entry ever names is a slot that has not reported at all — and the entering writer holds that
 * line by skipping a slot with an empty assignment, because a name put on such a slot would let
 * its first report, under whatever entity it sits below by then, read as a change of hands.
 *
 * `slotchange` fires after the move and therefore at the new location; the place the slot came
 * from cannot be read from there any more — this register is the only place where it still has a
 * name. A `WeakMap` so a slot that is gone holds nothing, and a `WeakRef` as its value so a slot
 * that stays does not hold the entity it left: a slot can outlive its entity, and an entry read
 * back as empty is one more way of saying "not the entity asking now", which is the only thing
 * the register is ever asked.
 *
 * An entry of `null` names no entity and is still an entry: it says that the entity which answered
 * for this slot has let go of it. That is a different statement from `undefined`, which is a slot
 * nobody has ever reported.
 */
const entHostOfSlot = new WeakMap<Element, WeakRef<ShaeEntElement> | null>();

/** The `slotchange` events whose re-request round has already run. */
const reRequestedForSlotChange = new WeakSet<Event>();

/**
 * Everything the slot projects hangs on the entity above the slot, and the slot just took a
 * different one. There is no named counterpart to inform: the projected nodes can sit in any
 * namespace, below any entity, and the entities involved are not reachable from here. So the
 * request goes to every candidate there is, in every namespace: a property binds to the closest
 * entity above it whatever namespace that entity carries, and an entity from another namespace can
 * be projected through the same slot.
 *
 * Both sides of a move see the same event — the entity losing the slot as a listener on the slot
 * itself, the one gaining it while the event bubbles — and the round either of them would start is
 * the same round over the whole document. Whoever gets here first runs it.
 */
const askEveryoneToReRequest = (event: Event): void => {
  if (reRequestedForSlotChange.has(event)) return;
  reRequestedForSlotChange.add(event);
  for (const context of ComponentContext.getContextsMap().values()) {
    context.broadcastEvent(ComponentContext.ReRequestParent);
    context.broadcastEvent(ComponentContext.ReRequestEntHost);
  }
};

interface ReRequestParentData {
  newAncestor?: ShaeEntElement;
}

/** An allow-list without entries forwards nothing — the same thing `false` says. */
const isEmptyFilter = (val: Set<string> | boolean): boolean => val instanceof Set && val.size === 0;

/**
 * Whether two filter values are the same value — a `Set` by its entries rather than by identity.
 *
 * This is not the question {@link isEmptyFilter} answers. An empty `Set` and `false` forward the
 * same nothing, and they are still two different values: only a write that replaces the one with
 * the other reaches the subscribers of the signal, and the read-back on connect depends on it.
 */
const isSameFilter = (a: Set<string> | boolean, b: Set<string> | boolean): boolean => {
  if (a === b) return true;
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const type of a) {
      if (!b.has(type)) return false;
    }
    return true;
  }
  return false;
};

export class ShaeEntElement extends ShaeElement {
  static override observedAttributes = [...ShaeElement.observedAttributes, ATTR_TOKEN, ATTR_FORWARD_CUSTOM_EVENTS];

  readonly isShaeEntElement = true;

  readonly componentContext$ = createSignal<ComponentContext | undefined>();
  readonly viewComponent$ = createSignal<ViewComponent | undefined>();
  readonly token$ = createSignal<string | undefined>();
  readonly forwardCustomEvents$ = createSignal<Set<string> | boolean>(false);

  get componentContext(): ComponentContext | undefined {
    return this.componentContext$.value;
  }

  get viewComponent(): ViewComponent | undefined {
    return this.viewComponent$.value;
  }

  get uuid(): string | undefined {
    return this.viewComponent?.uuid;
  }

  get token(): string | undefined {
    return this.token$.value;
  }

  set token(token: string | undefined) {
    this.token$.set(token);
  }

  entParentNode?: ShaeEntElement;

  /**
   * Whether this element already sat in a live tree while its constructor ran.
   *
   * An element created by the parser or by `createElement` runs its constructor before it enters
   * the tree, so everything below it connects after it and finds it on the first request. Only an
   * element upgraded in place can have entities below it that bound to a further ancestor while it
   * was not yet answering. Markup written into a connected node through `innerHTML` reports the
   * same, because the fragment parser builds the element undefined and upgrades it on insertion —
   * that keeps the guard on the safe side, it errs towards asking too often.
   */
  readonly #wasUpgradedInPlace = this.isConnected;

  #parentObserver?: MutationObserver;

  /**
   * Bumped whenever the subscriptions this element holds on its component have to be set up again.
   *
   * Ending a component takes every subscription off it, this element's among them, and the
   * component itself stays where it is — so nothing about `viewComponent$` changes and the effects
   * below have no reason of their own to run again. This signal is that reason.
   */
  readonly #reSubscribe$ = createSignal(0);

  #reSubscribePending = false;

  /**
   * The wait for the next microtask is the point, not a detail: the subscriptions come off right
   * behind the announcement, so a listener set up inside the handler would be taken off with them.
   * And a context tearing itself down walks its own set of instances — the element stays out of
   * that walk and comes back once it is over. However many announcements arrive in one task, one
   * round of setting up answers them all.
   */
  #reSubscribeToViewComponent() {
    if (this.#reSubscribePending) return;
    this.#reSubscribePending = true;
    queueMicrotask(() => {
      this.#reSubscribePending = false;
      this.#reSubscribe$.set(this.#reSubscribe$.value + 1);
    });
  }

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      // the order below is what makes the change symmetric: every entity that could be affected by
      // it is told before this element settles into its new context, and the element asks for its
      // own parent only once it is there

      // the entities hanging on this element stay in the namespace they are in, and this element
      // is about to leave it. `this.ns` already carries the new value at this point, so a child
      // that asks again right away is turned away by #onRequestParent
      const previousContext = this.componentContext;
      const previousNs = previousContext?.ns;
      const previousViewComponent = this.viewComponent;
      if (previousContext != null && previousViewComponent != null) {
        previousContext.dispatchReRequestParentChildren(previousViewComponent);
      }

      // this element's own binding: it belongs to the namespace it is leaving. Clearing it here
      // takes nothing but this element out of its parent's children
      this.#setParent(undefined);

      this.componentContext$.set(ComponentContext.get(ns));

      if (this.isConnected) {
        this.#dispatchRequestParent();
        // ...and this element may well be the closest ancestor for entities that were already
        // there when it arrived in this namespace
        this.#askPeersToReRequestParent();
      }

      // The properties below this element are deliberately left alone here. A property belongs to
      // the closest entity above it whatever namespace that entity is in, and a namespace change
      // moves no element — the closest one is still the closest one.

      // the environment it leaves holds the destruction of this entity and hears about it from
      // nobody else: `syncShadowObjects()` without an argument reads `this.ns`, which carries the
      // new value by now. The call is cheap — the namespaces are collected in a set and worked
      // through in one microtask
      if (previousNs != null && previousNs !== ns) {
        this.syncShadowObjectsOf(previousNs);
      }
    });

    this.#updateTokenValue();

    this.token$.onChange((token) => {
      if (token == null) {
        this.removeAttribute(ATTR_TOKEN);
      } else if (this.getAttribute(ATTR_TOKEN) !== token) {
        this.setAttribute(ATTR_TOKEN, token);
      }
    });

    this.#updateForwardCustomEventsValue();

    this.forwardCustomEvents$.onChange((val) => {
      if (!val || isEmptyFilter(val)) {
        this.removeAttribute(ATTR_FORWARD_CUSTOM_EVENTS);
      } else if (val === true) {
        // `getAttribute` answers `null` for an absent attribute, and `null !== ''` — the one
        // comparison covers both the missing attribute and a value that says something else
        if (this.getAttribute(ATTR_FORWARD_CUSTOM_EVENTS) !== '') {
          this.setAttribute(ATTR_FORWARD_CUSTOM_EVENTS, '');
        }
      } else {
        const str = Array.from(val).join(',');
        if (this.getAttribute(ATTR_FORWARD_CUSTOM_EVENTS) !== str) {
          this.setAttribute(ATTR_FORWARD_CUSTOM_EVENTS, str);
        }
      }
    });

    createEffect(() => {
      const vc = this.viewComponent$.get();
      // both reads stand before the early return, otherwise the dependency on the re-subscribe
      // signal would hang on there being a component at the moment the effect first runs
      this.#reSubscribe$.get();
      if (!vc) return;

      const unsubscribe = [
        on(vc, ComponentContext.ReRequestParentRoots, () => this.#reRequestParentAsRoot()),
        on(vc, ComponentContext.ReRequestParent, (data?: ReRequestParentData) => this.#reRequestParent(data?.newAncestor)),
        on(vc, ComponentContext.ReRequestEntHost, () => this.#askPropertiesToReRequestHost()),
        // this one hangs on the same component as the three above and comes off with them, which
        // is exactly why it belongs in the same effect: it is what puts all four back
        on(vc, ViewComponent.Destroyed, () => this.#reSubscribeToViewComponent()),
      ];

      return () => {
        for (const un of unsubscribe) un();
      };
    });

    createEffect(() => {
      const vc = this.viewComponent$.get();
      // the teardown of a component drops an own `dispatchEvent` along with the subscriptions, so
      // the patch is set again on the same signal that puts those back
      this.#reSubscribe$.get();
      if (!vc) return;

      // Make sure we are patching the instance method, not the prototype
      const originalDispatchEvent = Object.hasOwn(vc, 'dispatchEvent')
        ? Object.getPrototypeOf(vc).dispatchEvent
        : vc.dispatchEvent;

      const filter = this.forwardCustomEvents$.get();
      if (!filter || isEmptyFilter(filter)) return;

      const allowedTypes = filter instanceof Set ? filter : undefined;

      const newDispatch = (type: string, data: unknown, traverseChildren: boolean) => {
        originalDispatchEvent.call(vc, type, data, traverseChildren);

        // the internal signals of the parent resolution never leave the view side as a DOM event,
        // not even under `forward-custom-events` without a filter list
        if (
          type === ComponentContext.ReRequestParentRoots ||
          type === ComponentContext.ReRequestParent ||
          type === ComponentContext.ReRequestEntHost
        )
          return;

        if (allowedTypes && !allowedTypes.has(type)) return;

        this.dispatchEvent(
          new CustomEvent(type, {
            bubbles: true,
            composed: true,
            detail: data,
          }),
        );
      };

      // We use defineProperty to ensure it is writable and configurable
      Object.defineProperty(vc, 'dispatchEvent', {
        value: newDispatch,
        writable: true,
        configurable: true,
      });

      return () => {
        if (Object.hasOwn(vc, 'dispatchEvent') && vc.dispatchEvent === newDispatch) {
          // the property lives on the instance (defineProperty above), the method it shadows lives on
          // the prototype: deleting the own property restores the original, it does not remove the method
          delete (vc as {dispatchEvent?: ViewComponent['dispatchEvent']}).dispatchEvent;
        }
      };
    });

    this.token$.onChange((token) => {
      const vc = this.viewComponent$.value;
      if (vc) {
        vc.token = token;
        this.syncShadowObjects();
      }
    });

    this.style.display = 'contents';
  }

  #unsubscribeViewComponentEffect?: () => void;

  #applyComponentContext = (context: ComponentContext | undefined) => {
    const token = this.token$.value;

    let vc = this.viewComponent$.value;

    if (vc) {
      vc.context = context;
    } else if (context) {
      vc = new ViewComponent(token ?? VoidToken, {context});
      this.viewComponent$.set(vc);
    }

    this.syncShadowObjects();
  };

  #setupViewComponentEffect() {
    this.#unsubscribeViewComponentEffect?.();

    const unsubscribeComponentContext = this.componentContext$.onChange(this.#applyComponentContext);

    this.#unsubscribeViewComponentEffect = () => {
      unsubscribeComponentContext();
    };
  }

  #destroyViewComponentEffect() {
    this.#unsubscribeViewComponentEffect?.();
    this.#unsubscribeViewComponentEffect = undefined;
  }

  // `getRootNode()` answers for every state of the tree — the shadow root for a node inside
  // one, and the topmost node of its own chain for a node outside every tree. This reads `.host`
  // off the result without checking for a `ShadowRoot` first: only a shadow root has one, so a
  // node outside every tree reads no host, the same answer a check would have given
  #readShadowRootHost(): HTMLElement | undefined {
    return (this.getRootNode() as ShadowRoot)?.host as HTMLElement | undefined;
  }

  #shadowRootHost?: HTMLElement;
  #shadowRootHostNeedsUpdate = true;

  findShadowRootHost(): HTMLElement | undefined {
    if (this.#shadowRootHostNeedsUpdate) {
      this.#shadowRootHostNeedsUpdate = false;
      this.#shadowRootHost = this.#readShadowRootHost();
    }
    return this.#shadowRootHost;
  }

  protected getParentNodeForObserver(): Node | undefined {
    // a node still sitting in a tree answers from the first term, and for one placed directly
    // under a shadow root that term is the shadow root itself. Once it has no parent left it is
    // its own root, so the host lookup comes up empty too and the answer is: no parent
    return this.parentNode ?? this.#readShadowRootHost() ?? undefined;
  }

  connectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.addEventListener('slotchange', this.#onSlotChange, {capture: false, passive: false});
    this.addEventListener(RequestEntParentEventName, this.#onRequestParent, {capture: false, passive: false});

    this.#setupViewComponentEffect();

    // --- token ---
    beQuiet(() => this.#updateTokenValue());

    // --- forward-custom-events ---
    // the patch on the ViewComponent's dispatchEvent hangs on this signal, so the read-back has to
    // reach it: a write nothing observes would leave the patch standing on a filter the element no
    // longer carries. A list is a fresh Set on every read and would count as a change by identity
    // alone, so an unchanged filter is left alone instead of written again
    const forwardCustomEvents = this.#readForwardCustomEventsAttribute();
    if (!isSameFilter(forwardCustomEvents, this.forwardCustomEvents$.value)) {
      this.forwardCustomEvents$.set(forwardCustomEvents);
    }

    // --- componentContext | viewComponent ---
    if (this.componentContext == null) {
      this.componentContext$.set(ComponentContext.get(this.ns));
    } else {
      // the namespace may have been set or changed while the element was outside the tree. The
      // context signal then already stands on its new value, nothing is going to fire for it
      // again, and the element would sit in a namespace without ever becoming an entity in it.
      // In the ordinary case this hands over the very same context the component already has,
      // which the setter answers with a return
      this.#applyComponentContext(this.componentContext);
    }

    // --- viewComponent.parent ---
    this.#dispatchRequestParent();

    // --- parents ---
    // the order matters: before the line above, this element's own parent is not settled and the
    // candidate set would be the wrong one.
    //
    // The guard decides in constant time whether the question arises at all, and it has to,
    // because this runs on every connect. It cannot hide a case the request would have found: an
    // element constructed before it entered the tree is answering by the time anything below it
    // connects. What this element holds is no such question — a shadow root can be attached to it
    // before it is defined, and a closed one is invisible from the inside, so `shadowRoot` reads
    // null while the entities in it are bound to an ancestor further up. An empty element is not
    // an element with nothing below it.
    //
    // --- properties ---
    // The same reasoning carries the second call, and so does the same limit: an element built in
    // a detached subtree and inserted afterwards does *not* announce itself, because the
    // properties below it connect after it and find it on their own. A property already connected
    // and then projected into that subtree is reached by the `#onSlotChange` call further down.
    if (this.#wasUpgradedInPlace) {
      this.#askPeersToReRequestParent();
      this.#askPropertiesToReRequestHost();
    }

    // --- hosted slots ---
    this.#collectHostedSlots();

    this.#createParentObserver();

    // --- sync! ---
    this.syncShadowObjects();
  }

  #createParentObserver() {
    this.#destroyParentObserver();
    const parent = this.getParentNodeForObserver();
    if (parent) {
      this.#parentObserver = new MutationObserver((mutations, _observer) => {
        for (const {target, removedNodes} of mutations) {
          if (target === parent) {
            for (const node of removedNodes) {
              if (node === this) {
                this.#destroyParentObserver();
                this.onParentChanged(this.getParentNodeForObserver(), parent);
                break;
              }
            }
          }
        }
      });
      this.#parentObserver.observe(parent, {childList: true, subtree: false, attributes: false});
    }
  }

  onParentChanged(_newParent: Node | undefined, _oldParent: Node) {
    this.#setParent(undefined);
    this.#dispatchRequestParent();
    // the observation watches one specific parent node, so it has to travel with the element:
    // left at the old position it would report the next move of a node that is no longer here.
    // The call is idempotent — #createParentObserver starts with #destroyParentObserver
    this.#createParentObserver();
  }

  #destroyParentObserver() {
    this.#parentObserver?.disconnect();
    this.#parentObserver = undefined;
  }

  override attributeChangedCallback(name: string) {
    super.attributeChangedCallback(name);
    if (name === ATTR_TOKEN) {
      this.#updateTokenValue();
    } else if (name === ATTR_FORWARD_CUSTOM_EVENTS) {
      this.#updateForwardCustomEventsValue();
    }
  }

  disconnectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.#destroyParentObserver();

    // an entity outside the tree answers for no slot any more, and its listeners must not outlive
    // what it is itself
    this.#releaseHostedSlots();

    this.removeEventListener('slotchange', this.#onSlotChange, {capture: false});
    this.removeEventListener(RequestEntParentEventName, this.#onRequestParent, {capture: false});

    // after the listener came off, never before: a property that asks again because of this must
    // not be answered by this element any more. The element is out of the tree by now, so the
    // event reaches only whoever listens on the element itself — which is exactly the set of
    // properties bound to it
    this.#askPropertiesToReRequestHost();

    this.#setParent(undefined);

    // an entity that hung on this element can outlive its departure: it stays connected whenever
    // only the way between them is cut, which is what happens to everything projected into a slot
    // this element holds. Leaving the context detaches the ViewComponent — it keeps everything on
    // it and can be taken back in — and promotes those entities to roots, so they have to look for
    // an ancestor again; this element is past answering by now, its listener came off a few lines
    // above. An entity that leaves the tree
    // along with this one is not affected: it turns the message down while disconnected
    const vc = this.viewComponent;
    if (vc != null) {
      this.componentContext?.dispatchReRequestParentChildren(vc);
    }

    this.componentContext$.set(undefined);

    this.syncShadowObjects();

    this.#destroyViewComponentEffect();
  }

  #reRequestParentAsRoot() {
    if (this.isConnected) {
      this.#setParent(undefined);
      this.#dispatchRequestParent();
    }
  }

  // nothing is cleared here: an element already bound to its closest ancestor gets the same answer
  // back and #setParent turns around without touching anything, so the round leaves every
  // correctly bound sibling standing in its parent's children. Only an element that gets no answer
  // at all loses its binding, and that one sits below nothing any more
  #reRequestParent(newAncestor?: ShaeEntElement) {
    if (!this.isConnected) return;

    // the peers of an entity are its siblings in the component context, which says nothing about
    // where their elements sit. Only one below `newAncestor` can get a different answer, and
    // walking up to find out costs a few pointer hops against a bubbling event through the whole
    // ancestor chain. A signal that carries no ancestor asks unconditionally — the sender leaves
    // it out wherever the ascent could not see the whole way
    if (newAncestor != null && !isBelow(this, newAncestor)) return;

    this.#dispatchRequestParent();
  }

  // An element that becomes an entity while the tree around it already stands can be the new
  // closest ancestor for entities that bound while it was not yet answering. Those entities are
  // its peers in the component context — the children of its own parent, or the roots while it
  // has none — and they are asked to request their parent once more.
  #askPeersToReRequestParent() {
    const vc = this.viewComponent;
    if (vc == null) {
      this.componentContext?.dispatchReRequestParentRoots();
    } else {
      // the peer decides from the element tree whether it really sits below this element, and it
      // can only do so while the way up to here stays visible to it. From inside a closed shadow
      // tree it does not: the ascent of a projected peer steps over the closed tree and would
      // rule out exactly the case that needs correcting. The filter is an optimization, so where
      // it cannot see, it does not travel — every peer is then asked and answers for itself
      const newAncestor = isInClosedShadowTree(this) ? undefined : this;
      this.componentContext?.dispatchReRequestParentSiblings(vc, {newAncestor} satisfies ReRequestParentData);
    }
  }

  // Properties below this element bind to the closest entity above them. This element becoming
  // one — or ceasing to be one — changes that answer, and no component context can carry the
  // message: a <shae-prop> has no view component to receive it. The event travels the same
  // ascent every request travels, so it passes exactly the entities a property could be bound
  // to right now, and nothing else.
  #askPropertiesToReRequestHost() {
    this.dispatchEvent(new CustomEvent(ReRequestEntHostEventName, {bubbles: true, composed: true, detail: {requester: this}}));
  }

  #dispatchRequestParent() {
    let entParent: ShaeEntElement | undefined;
    // an entity takes only an ancestor from its own namespace as a parent
    requestEntAncestor(this, {ns: this.ns, answer: (entNode) => (entParent = entNode)});
    // `requestEntAncestor` sends a synchronous `dispatchEvent`, so by the time it returns it is
    // settled whether anyone answered. No answer is an answer as well: an entity nobody claims is
    // a root of its context, and that is what gets written here
    this.#setParent(entParent);
  }

  #unsubscribeFromParent?: () => void;

  #setParent(parent?: ShaeEntElement) {
    if (this.entParentNode === parent) return;

    if (this.entParentNode) {
      this.entParentNode.removeEventListener(ReRequestEntParentEventName, this.#onReRequestParent, {capture: false});
    }

    this.entParentNode = parent;

    if (this.entParentNode) {
      this.entParentNode.addEventListener(ReRequestEntParentEventName, this.#onReRequestParent, {
        capture: false,
        passive: false,
      });
    }

    this.#unsubscribeFromParent?.();
    this.#unsubscribeFromParent = undefined;

    if (parent) {
      const e = createEffect(() => {
        const vc = this.viewComponent$.get();
        if (vc) {
          const parentVC = parent.viewComponent$.get();
          // a parent link needs a ComponentContext, and the same one on both sides: an entity
          // that holds none stands in no entity tree at all, and two entities of different
          // ComponentContexts stand in two trees that never meet
          const ctx = vc.context;
          vc.parent = ctx != null && parentVC?.context === ctx ? parentVC : undefined;
          if (vc.parent == null) {
            queueMicrotask(() => {
              this.#dispatchRequestParent();
            });
          }
          this.syncShadowObjects();
        }
      });
      this.#unsubscribeFromParent = () => e.destroy();
    } else {
      const vc = this.viewComponent;
      if (vc?.parent) {
        vc.parent = undefined;
        this.syncShadowObjects();
      }
    }
  }

  // Whether this element is the closest entity above `slot`. The ascent goes over `parentElement`
  // and nothing else, and both callers stand on the same ground for it: `slotchange` bubbles along
  // the node tree of one shadow root, so the slot and every entity that can hear it sit in the same
  // tree, and a slot found by `querySelectorAll` never leaves the node tree it was searched in
  // either. The flattened parent is not the question here. Without the test every entity of the
  // chain would write the register and the outermost one would win — the answer a projected node
  // gets comes from the closest.
  #isClosestEntAbove(slot: Element): boolean {
    for (let current = slot.parentElement; current != null; current = current.parentElement) {
      if (current === this) return true;
      if ((current as ShaeEntElement).isShaeEntElement) return false;
    }
    return false;
  }

  // The `<slot>`s this element currently answers for. A listener on the slot itself is the only
  // thing that tells the side losing a slot about the loss: `slotchange` fires at the slot,
  // wherever it has landed, and the ascent from there is the one reading of "is this still mine"
  // that survives the move. `WeakRef` for the same reason as in the register — a slot that is gone
  // is held by nobody here.
  readonly #hostedSlots = new Set<WeakRef<Element>>();

  #watchHostedSlot(slot: Element) {
    for (const ref of this.#hostedSlots) {
      const el = ref.deref();
      if (el === undefined) this.#hostedSlots.delete(ref);
      else if (el === slot) return;
    }
    this.#hostedSlots.add(new WeakRef(slot));
    slot.addEventListener('slotchange', this.#onHostedSlotChange, {capture: false, passive: false});
  }

  #releaseHostedSlot(slot: Element) {
    slot.removeEventListener('slotchange', this.#onHostedSlotChange, {capture: false});
    for (const ref of this.#hostedSlots) {
      const el = ref.deref();
      if (el === undefined || el === slot) this.#hostedSlots.delete(ref);
    }
  }

  #releaseHostedSlots() {
    for (const ref of this.#hostedSlots) {
      ref.deref()?.removeEventListener('slotchange', this.#onHostedSlotChange, {capture: false});
    }
    this.#hostedSlots.clear();
  }

  /**
   * Take up the `<slot>`s below this element that project something.
   *
   * A slot is answered for from the moment it reports an assignment, and an entity leaving the
   * tree lets go of every slot it holds. Entering the tree is the counterpart: the entity takes
   * up the slots below it, because the assignment inside a shadow root does not change while
   * its host is out of the document — nothing reports on the way back in, so the entity has to
   * look for itself.
   *
   * Only inside a shadow root, and that test is exact rather than an optimization: a `<slot>`
   * in a node tree that is not a shadow tree has no assignment and never reports one, so there
   * is nothing below such an element to take up.
   */
  #collectHostedSlots() {
    if (this.findShadowRootHost() == null) return;

    for (const slot of this.querySelectorAll('slot')) {
      if (slot.assignedNodes().length === 0) continue;
      if (!this.#isClosestEntAbove(slot)) continue;
      entHostOfSlot.set(slot, new WeakRef(this));
      this.#watchHostedSlot(slot);
    }
  }

  // `currentTarget` rather than `target`: a `<slot>` can stand in the fallback content of another
  // slot, and what reports then is the inner one while the slot this listener hangs on is the one
  // in question. The early return on "still mine" hands the whole job — register and round alike —
  // to the bubbling listener, which would otherwise do it a second time. And the `null` entry: a
  // slot that comes back to this entity has changed hands twice, and the round has to run for the
  // second change as well.
  #onHostedSlotChange = (event: Event) => {
    const slot = event.currentTarget as Element;
    if (this.#isClosestEntAbove(slot)) return;

    this.#releaseHostedSlot(slot);
    if (entHostOfSlot.get(slot)?.deref() === this) {
      entHostOfSlot.set(slot, null);
    }
    askEveryoneToReRequest(event);
  };

  #onSlotChange = (event: Event) => {
    // this stands before the shadow-root condition below, and that is where the two channels part
    // ways: the entity channel only cares about a slot change inside a shadow root, because that
    // is what moves a parent binding across the boundary. For a property every changed slot
    // assignment counts — it moves what sits below this element.
    this.#askPropertiesToReRequestHost();

    const slot = event.target as Element;
    if (this.#isClosestEntAbove(slot)) {
      const previous = entHostOfSlot.get(slot);
      entHostOfSlot.set(slot, new WeakRef(this));
      this.#watchHostedSlot(slot);
      // the gate in front of the round, and it is closed twice. What a slot reporting for the
      // first time projects is reached by the two calls that frame this block, so the first
      // registration writes the register and pays nothing beyond it. Afterwards a slot whose
      // entity above it is the same one as last time reports changed content, and content moves
      // no binding. What is left is the slot that arrived here from somewhere else — and an entry
      // naming nobody is such an arrival too: that slot stood under no entity in between
      if (previous !== undefined && previous?.deref() !== this) {
        askEveryoneToReRequest(event);
      }
    }

    const shadowRootHost = this.findShadowRootHost();
    if (shadowRootHost == null) return;
    this.dispatchEvent(
      new CustomEvent(ReRequestEntParentEventName, {
        bubbles: true,
        composed: true,
        detail: {requester: this, shadowRootHost},
      }),
    );
  };

  #onReRequestParent = (event: CustomEvent) => {
    const requester = event.detail?.requester as ShaeEntElement | undefined;

    if (requester === this) return;
    if (!requester?.isShaeEntElement) return;
    if (requester.ns !== this.ns) return;

    const shadowRootHost = event.detail?.shadowRootHost as HTMLElement | undefined;

    if (shadowRootHost) {
      this.#dispatchRequestParent();
    }
  };

  #onRequestParent = (event: CustomEvent<EntAncestorRequest>) => {
    const request = event.detail;

    // a request has to name its sender, or this element could end up answering itself
    if (request?.requester == null || request.requester === this) return;
    // only a request built by `requestEntAncestor` carries a way to answer it
    if (typeof request.answer !== 'function') return;

    // an ancestor in another namespace *skips* the request, it does not block it: the `return`
    // stands before the `stopPropagation()` so the event keeps travelling to the next one.
    // A request without a namespace takes the closest ancestor the DOM shows — that is how a
    // property asks
    if (request.ns !== undefined && request.ns !== this.ns) return;

    event.stopPropagation();

    request.answer(this);
  };

  #updateTokenValue() {
    if (this.hasAttribute(ATTR_TOKEN)) {
      const token = this.getAttribute(ATTR_TOKEN)?.trim() || undefined;
      this.token$.set(token);
    } else {
      // both ways of taking the token away end in the same place: the entity falls back to
      // VoidToken, and the reflection has nothing left to write
      this.token$.set(undefined);
    }
  }

  /** The filter the `forward-custom-events` attribute currently spells out. */
  #readForwardCustomEventsAttribute(): Set<string> | boolean {
    if (!this.hasAttribute(ATTR_FORWARD_CUSTOM_EVENTS)) return false;

    const val = this.getAttribute(ATTR_FORWARD_CUSTOM_EVENTS);
    if (!val || val.trim().length === 0) return true;

    const types = new Set(
      val
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );

    // a reflected empty string is the spelling for "all events" — a list that names none of
    // them has to mean the opposite, so it falls back to the signal's own default instead of
    // becoming a Set that would round-trip into that same empty string
    return types.size > 0 ? types : false;
  }

  // the write is unconditional on purpose: a list read from the attribute is a fresh Set every
  // time, and it is that change of identity which drives the normalization of the attribute back
  // to its canonical spelling
  #updateForwardCustomEventsValue() {
    this.forwardCustomEvents$.set(this.#readForwardCustomEventsAttribute());
  }
}