import {on} from '@spearwolf/eventize';
import {beQuiet, createEffect, createSignal} from '@spearwolf/signalize';
import {VoidToken} from '../constants.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
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

/** Whether `node` sits below `ancestor`, across shadow boundaries and slot projections. */
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

interface ReRequestParentData {
  newAncestor?: ShaeEntElement;
}

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
      if (!val) {
        this.removeAttribute(ATTR_FORWARD_CUSTOM_EVENTS);
      } else if (val === true) {
        if (!this.hasAttribute(ATTR_FORWARD_CUSTOM_EVENTS)) {
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
      if (vc) {
        const unsubcribe = on(vc, ComponentContext.ReRequestParentRoots, () => this.#reRequestParentAsRoot());
        const unsubscribeReRequestParent = on(vc, ComponentContext.ReRequestParent, (data?: ReRequestParentData) =>
          this.#reRequestParent(data?.newAncestor),
        );
        const oldNs = vc.context?.ns;
        return () => {
          unsubcribe();
          unsubscribeReRequestParent();
          vc.destroy();
          if (oldNs && oldNs !== this.ns) {
            ShadowEnv.get(oldNs)?.sync();
          } else {
            this.syncShadowObjects();
          }
        };
      }
    });

    createEffect(() => {
      const vc = this.viewComponent$.get();
      if (!vc) return;

      // Make sure we are patching the instance method, not the prototype
      const originalDispatchEvent = Object.hasOwn(vc, 'dispatchEvent')
        ? Object.getPrototypeOf(vc).dispatchEvent
        : vc.dispatchEvent;

      const filter = this.forwardCustomEvents$.get();
      if (!filter) return;

      const allowedTypes = filter instanceof Set ? filter : undefined;

      const newDispatch = (type: string, data: unknown, traverseChildren: boolean) => {
        originalDispatchEvent.call(vc, type, data, traverseChildren);

        // the internal signals of the parent resolution never leave the view side as a DOM event,
        // not even under `forward-custom-events` without a filter list
        if (type === ComponentContext.ReRequestParentRoots || type === ComponentContext.ReRequestParent) return;

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

  #shadowRootHost?: HTMLElement;
  #shadowRootHostNeedsUpdate = true;

  findShadowRootHost(): HTMLElement | undefined {
    if (this.#shadowRootHostNeedsUpdate) {
      this.#shadowRootHostNeedsUpdate = false;

      let current: HTMLElement = this;
      while (current) {
        if (current.parentElement == null) {
          const root = current.parentNode as ShadowRoot;
          if (root) {
            this.#shadowRootHost = root.host as HTMLElement;
          }
          break;
        }
        current = current.parentElement;
      }
    }
    return this.#shadowRootHost;
  }

  protected getParentNodeForObserver(): Node | undefined {
    // a node still sitting in a tree answers from the first term, and for one placed directly
    // under a shadow root that term is the shadow root itself. Once it has no parent left it is
    // its own root, so the host lookup comes up empty too and the answer is: no parent
    return this.parentNode ?? (this.getRootNode() as ShadowRoot)?.host ?? undefined;
  }

  connectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.addEventListener('slotchange', this.#onSlotChange, {capture: false, passive: false});
    this.addEventListener(RequestEntParentEventName, this.#onRequestParent, {capture: false, passive: false});

    this.#setupViewComponentEffect();

    // --- token ---
    beQuiet(() => this.#updateTokenValue());

    // --- forward-custom-events ---
    beQuiet(() => this.#updateForwardCustomEventsValue());

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
    // this element holds. Leaving the context destroys the ViewComponent and promotes those
    // entities to roots, so they have to look for an ancestor again — and this element is past
    // answering by now, its listener came off a few lines above. An entity that leaves the tree
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

  // nothing is cleared here: an element already bound to its closest ancestor gets the same
  // answer back and #setParent bails out. Clearing first would take every correctly bound
  // sibling out of its parent's children and append it again at the end
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
    // an entity takes only an ancestor from its own namespace as a parent
    requestEntAncestor(this, {ns: this.ns, answer: (entNode) => this.#setParent(entNode)});
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
          vc.parent = parentVC && parentVC.context === vc.context ? parentVC : undefined;
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

  #onSlotChange = () => {
    // this stands before the shadow-root condition below, and that is where the two channels part
    // ways: the entity channel only cares about a slot change inside a shadow root, because that
    // is what moves a parent binding across the boundary. For a property every changed slot
    // assignment counts — it moves what sits below this element.
    this.#askPropertiesToReRequestHost();

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
    }
  }

  #updateForwardCustomEventsValue() {
    if (this.hasAttribute(ATTR_FORWARD_CUSTOM_EVENTS)) {
      const val = this.getAttribute(ATTR_FORWARD_CUSTOM_EVENTS);
      if (!val || val.trim().length === 0) {
        this.forwardCustomEvents$.set(true);
      } else {
        this.forwardCustomEvents$.set(
          new Set(
            val
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          ),
        );
      }
    } else {
      this.forwardCustomEvents$.set(false);
    }
  }
}