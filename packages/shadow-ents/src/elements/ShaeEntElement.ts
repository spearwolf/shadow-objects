import {beQuiet, createEffect, createSignal} from '@spearwolf/signalize';
import {ComponentContext, ViewComponent} from '../core.js';
import {ShaeElement} from './ShaeElement.js';
import {ATTR_TOKEN, RequestEntParentEventName} from './constants.js';

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
        } else if (token !== vc.token) {
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

  override connectedCallback() {
    // --- token ---
    beQuiet(() => this.#updateTokenValue());

    // --- ns ---
    super.connectedCallback();

    // --- componentContext | viewComponent ---
    if (this.componentContext == null) {
      this.componentContext$.set(ComponentContext.get(this.ns));
    }

    // --- viewComponent.parent ---
    this.#requestEntParent();
    this.#registerEntParentListener();

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
    this.#unregisterEntParentListener();

    this.#setEntParent(undefined);

    this.componentContext$.set(undefined);

    this.syncShadowObjects();
  }

  #requestEntParent() {
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
  #nonShaeParents?: WeakSet<HTMLElement>;

  #setEntParent(parent?: ShaeEntElement) {
    if (this.entParentNode === parent) return;

    this.entParentNode = parent;

    this.#nonShaeParents = undefined;

    // we memorize all elements on the way to the <shae-ent> parent so that we can
    // request a new parent in case of a custom element upgrade with shae elements in the shadow dom
    if (parent) {
      const elements: HTMLElement[] = [];
      let current = this.parentElement;
      while (current && current !== parent) {
        elements.push(current);
        current = current.parentElement;
      }
      if (elements.length > 0) {
        this.#nonShaeParents = new WeakSet(elements);
        console.log('nonShaeParents', {shaeEnt: this, parentsOnTheWayToShae: elements, weakSet: this.#nonShaeParents});
      }
    }

    // TODO dispatch ReRequestEntParent if we are inside a shadowDom!

    this.#unsubscribeFromEntParent?.();

    if (parent) {
      const [, unsubscribe] = createEffect(() => {
        const vc = this.viewComponent$.get();
        if (vc) {
          vc.parent = parent.viewComponent$.get();
        }
      });
      this.#unsubscribeFromEntParent = unsubscribe;
    } else {
      this.#unsubscribeFromEntParent = undefined;
    }
  }

  #onRequestEntParent = (event: CustomEvent) => {
    const requester = event.detail?.requester as ShaeEntElement | undefined;

    if (requester === this) return;
    if (!requester?.isShaeEntElement) return;
    if (requester.ns !== this.ns) return;

    requester.#setEntParent(this);
  };

  #registerEntParentListener() {
    this.addEventListener(RequestEntParentEventName, this.#onRequestEntParent, {capture: false, passive: false});
  }

  #unregisterEntParentListener() {
    this.removeEventListener(RequestEntParentEventName, this.#onRequestEntParent, {capture: false});
  }

  #updateTokenValue() {
    if (this.hasAttribute(ATTR_TOKEN)) {
      const token = this.getAttribute(ATTR_TOKEN)?.trim() || undefined;
      this.token$.set(token);
    }
  }
}
