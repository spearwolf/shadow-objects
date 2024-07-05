import {beQuiet, createEffect, createSignal} from '@spearwolf/signalize';
import {ComponentContext, ViewComponent} from '../core.js';
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

  get token(): string | undefined {
    return this.token$.value;
  }

  set token(token: string | undefined) {
    this.token$.set(token);
  }

  entParentNode?: ShaeEntElement;

  constructor() {
    super();

    this.#updateTokenValue();

    this.token$.onChange((token) => {
      if (token == null) {
        this.removeAttribute(ATTR_TOKEN);
      } else if (this.getAttribute(ATTR_TOKEN) !== token) {
        this.setAttribute(ATTR_TOKEN, token);
      }
    });

    this.ns$.onChange((ns) => {
      this.componentContext$.set(ComponentContext.get(ns));
    });

    this.viewComponent$.onChange((vc) => vc?.destroy.bind(vc));

    /* TODO unsubscribe */ createEffect(() => {
      const context = this.componentContext$.get();
      const token = this.token$.get();
      const vc = this.viewComponent$.get();
      if (vc) {
        if (context == null) {
          this.viewComponent$.set(undefined);
        } else if (token !== vc.token || context !== vc.context) {
          // TODO make token changeable (ViewComponent)
          this.viewComponent$.set(new ViewComponent(token, {context}));
        }
      } else if (context) {
        this.viewComponent$.set(new ViewComponent(token, {context}));
      } else {
        this.viewComponent$.set(undefined);
      }
    }, [this.componentContext$, this.token$]);
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

  override connectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.addEventListener('slotchange', this.#onSlotChange, {capture: false, passive: false});
    this.addEventListener(RequestEntParentEventName, this.#onRequestEntParent, {capture: false, passive: false});

    // --- token ---
    beQuiet(() => this.#updateTokenValue());

    // --- ns ---
    super.connectedCallback();

    // --- componentContext | viewComponent ---
    if (this.componentContext == null) {
      this.componentContext$.set(ComponentContext.get(this.ns));
    }

    // --- viewComponent.parent ---
    this.#dispatchRequestEntParent();

    // --- sync! ---
    this.syncShadowObjects();
  }

  override attributeChangedCallback(name: string) {
    super.attributeChangedCallback(name);

    if (name === ATTR_TOKEN) {
      this.#updateTokenValue();
    }
  }

  disconnectedCallback() {
    this.#shadowRootHostNeedsUpdate = true;

    this.removeEventListener('slotchange', this.#onSlotChange, {capture: false});
    this.removeEventListener(RequestEntParentEventName, this.#onRequestEntParent, {capture: false});

    this.#setEntParent(undefined);

    this.componentContext$.set(undefined);

    this.syncShadowObjects();
  }

  #dispatchRequestEntParent() {
    // https://pm.dartus.fr/blog/a-complete-guide-on-shadow-dom-and-event-propagation/
    this.dispatchEvent(
      new CustomEvent(RequestEntParentEventName, {
        bubbles: true,
        composed: true,
        detail: {requester: this},
      }),
    );
  }

  #unsubscribeFromEntParent?: () => void;
  #parentsOnTheWayToShae?: WeakSet<HTMLElement>;

  #setEntParent(parent?: ShaeEntElement) {
    if (this.entParentNode === parent) return;

    if (this.entParentNode) {
      this.entParentNode.removeEventListener(ReRequestEntParentEventName, this.#onReRequestEntParent, {capture: false});
    }

    this.entParentNode = parent;

    if (this.entParentNode) {
      this.entParentNode.addEventListener(ReRequestEntParentEventName, this.#onReRequestEntParent, {
        capture: false,
        passive: false,
      });
    }

    this.#parentsOnTheWayToShae = undefined;

    // we memorize all elements on the way to the <shae-ent> parent so that we can
    // request a new parent in case of a custom element upgrade with shae elements in the shadow dom
    if (parent) {
      const elements: HTMLElement[] = [];
      let current = this.parentElement;
      while (current && current !== parent) {
        elements.push(current);
        if (current.parentElement == null && current.parentNode) {
          current = (current.parentNode as ShadowRoot).host as HTMLElement;
        } else {
          current = current.parentElement;
        }
      }
      if (elements.length > 0) {
        this.#parentsOnTheWayToShae = new WeakSet(elements);
      }
    }

    this.#unsubscribeFromEntParent?.();
    this.#unsubscribeFromEntParent = undefined;
    if (parent) {
      const [, unsubscribe] = createEffect(() => {
        const vc = this.viewComponent$.get();
        if (vc) {
          // XXX fix me (componentContext can be different | request new parent)
          vc.parent = parent.viewComponent$.get();
        }
      });
      this.#unsubscribeFromEntParent = unsubscribe;
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

  #onReRequestEntParent = (event: CustomEvent) => {
    const requester = event.detail?.requester as ShaeEntElement | undefined;

    if (requester === this) return;
    if (!requester?.isShaeEntElement) return;
    if (requester.ns !== this.ns) return;

    const shadowRootHost = event.detail?.shadowRootHost as HTMLElement | undefined;

    if (shadowRootHost) {
      if (this.#parentsOnTheWayToShae?.has(shadowRootHost)) {
        this.#dispatchRequestEntParent();
      }
    }
  };

  #onRequestEntParent = (event: CustomEvent) => {
    const requester = event.detail?.requester as ShaeEntElement | undefined;

    if (requester === this) return;
    if (!requester?.isShaeEntElement) return;
    if (requester.ns !== this.ns) return;

    event.stopPropagation();

    requester.#setEntParent(this);
  };

  #updateTokenValue() {
    if (this.hasAttribute(ATTR_TOKEN)) {
      const token = this.getAttribute(ATTR_TOKEN)?.trim() || undefined;
      this.token$.set(token);
    }
  }
}
