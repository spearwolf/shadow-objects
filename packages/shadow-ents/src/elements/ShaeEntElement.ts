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
    this.requestEntParent();
    this.#registerEntParentListener();
  }

  override attributeChangedCallback(name: string) {
    super.attributeChangedCallback(name);

    if (name === ATTR_TOKEN) {
      this.#updateTokenValue();
    }
  }

  disconnectedCallback() {
    this.#unregisterEntParentListener();

    this.setEntParent(undefined);

    // TODO inform children so that they can update their parent (request it again)

    this.componentContext$.set(undefined);
  }

  requestEntParent() {
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

  setEntParent(parent?: ShaeEntElement) {
    if (this.entParentNode === parent) return;

    this.entParentNode = parent;

    console.log('setEntParent', {self: this, parent});

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

  onRequestEntParent = (event: CustomEvent) => {
    const requester = event.detail?.requester;

    if (requester === this) return;
    if (!requester?.isShaeEntElement) return;
    if (requester.ns !== this.ns) return;

    requester.setEntParent(this);
  };

  #registerEntParentListener(): void {
    this.addEventListener(RequestEntParentEventName, this.onRequestEntParent, {capture: false, passive: false});
  }

  #unregisterEntParentListener(): void {
    this.removeEventListener(RequestEntParentEventName, this.onRequestEntParent, {capture: false});
  }

  #updateTokenValue() {
    if (this.hasAttribute(ATTR_TOKEN)) {
      const token = this.getAttribute(ATTR_TOKEN)?.trim() || undefined;
      this.token$.set(token);
    }
  }
}
