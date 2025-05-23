import {on} from '@spearwolf/eventize';
import {beQuiet, createEffect, createSignal} from '@spearwolf/signalize';
import {ComponentContext} from '../view/ComponentContext.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ViewComponent} from '../view/ViewComponent.js';
import {ShaeElement} from './ShaeElement.js';
import {ATTR_TOKEN, RequestEntParentEventName, ReRequestEntParentEventName} from './constants.js';

export class ShaeEntElement extends ShaeElement {
  static override observedAttributes = [...ShaeElement.observedAttributes, ATTR_TOKEN];

  readonly isShaeEntElement = true;

  readonly componentContext$ = createSignal<ComponentContext | undefined>();
  readonly viewComponent$ = createSignal<ViewComponent | undefined>();
  readonly token$ = createSignal<string | undefined>();

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

  #parentObserver?: MutationObserver;

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      this.componentContext$.set(ComponentContext.get(ns));
      if (this.isConnected) {
        this.#dispatchRequestParent();
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

    createEffect(() => {
      const vc = this.viewComponent$.get();
      if (vc) {
        const unsubcribe = on(vc, ComponentContext.ReRequestParentRoots, () => this.#reReuestParentRoot());
        const oldNs = vc.context?.ns;
        return () => {
          unsubcribe();
          vc.destroy();
          if (oldNs && oldNs !== this.ns) {
            ShadowEnv.get(oldNs)?.sync();
          } else {
            this.syncShadowObjects();
          }
        };
      }
    });

    this.token$.onChange((token) => {
      const vc = this.viewComponent$.value;
      if (vc) {
        vc.token = token;
        this.syncShadowObjects();
      }
    });
  }

  #unsubscribeViewComponentEffect?: () => void;

  #setupViewComponentEffect() {
    this.#unsubscribeViewComponentEffect?.();

    const unsubscribeComponentContext = this.componentContext$.onChange((context) => {
      const token = this.token$.value;

      let vc = this.viewComponent$.value;

      if (vc) {
        vc.context = context;
      } else if (context) {
        vc = new ViewComponent(token, {context});
        this.viewComponent$.set(vc);
      }

      this.syncShadowObjects();
    });

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

  protected getParentNodeForObserver() {
    const parent = this.parentNode;
    if (parent) return parent;
    return (parent as ShadowRoot).host ?? parent;
  }

  connectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.addEventListener('slotchange', this.#onSlotChange, {capture: false, passive: false});
    this.addEventListener(RequestEntParentEventName, this.#onRequestParent, {capture: false, passive: false});

    this.#setupViewComponentEffect();

    // --- token ---
    beQuiet(() => this.#updateTokenValue());

    // --- componentContext | viewComponent ---
    if (this.componentContext == null) {
      this.componentContext$.set(ComponentContext.get(this.ns));
    }

    // --- viewComponent.parent ---
    this.#dispatchRequestParent();

    // --- parents ---
    this.componentContext?.dispatchReRequestParentRoots();
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
  }

  #destroyParentObserver() {
    this.#parentObserver?.disconnect();
    this.#parentObserver = undefined;
  }

  override attributeChangedCallback(name: string) {
    super.attributeChangedCallback(name);
    if (name === ATTR_TOKEN) {
      this.#updateTokenValue();
    }
  }

  disconnectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.#destroyParentObserver();

    this.removeEventListener('slotchange', this.#onSlotChange, {capture: false});
    this.removeEventListener(RequestEntParentEventName, this.#onRequestParent, {capture: false});

    this.#setParent(undefined);

    this.componentContext$.set(undefined);

    this.syncShadowObjects();

    this.#destroyViewComponentEffect();
  }

  #reReuestParentRoot() {
    if (this.isConnected) {
      this.#setParent(undefined);
      this.#dispatchRequestParent();
    }
  }

  #dispatchRequestParent() {
    // https://pm.dartus.fr/blog/a-complete-guide-on-shadow-dom-and-event-propagation/
    this.dispatchEvent(
      new CustomEvent(RequestEntParentEventName, {
        bubbles: true,
        composed: true,
        detail: {requester: this},
      }),
    );
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
      if (vc.parent) {
        vc.parent = undefined;
        this.syncShadowObjects();
      }
    }
  }

  #onSlotChange = () => {
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

  #onRequestParent = (event: CustomEvent) => {
    const requester = event.detail?.requester as ShaeEntElement | undefined;

    if (requester === this) return;
    if (!requester?.isShaeEntElement) return;
    if (requester.ns !== this.ns) return;

    event.stopPropagation();

    requester.#setParent(this);
  };

  #updateTokenValue() {
    if (this.hasAttribute(ATTR_TOKEN)) {
      const token = this.getAttribute(ATTR_TOKEN)?.trim() || undefined;
      this.token$.set(token);
    }
  }
}
