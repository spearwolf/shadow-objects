import {connect, createEffect, createSignal, value, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {generateUUID} from '../generateUUID.js';
import {toNamespace} from '../toNamespace.js';
import type {NamespaceType} from '../types.js';
import type {IShadowElement} from './IShadowElement.js';
import {RequestContextEventName, ShadowElementType} from './constants.js';
import type {RequestContextEvent} from './events.js';
import {isShadowElement} from './isShadowElement.js';

// TODO sync dom children order to shadow tree order

type SignalFuncs<T> = [SignalReader<T>, SignalWriter<T>];

// TODO rename to ShadowEntity <shadow-entity>

export class ShadowEntsBase extends HTMLElement implements IShadowElement {
  static observedAttributes = ['ns'];

  static readonly relevantParentTypes: readonly ShadowElementType[] = [
    ShadowElementType.ShadowEntsBase,
    ShadowElementType.ShadowEnv,
  ];

  readonly isShadowElement = true;

  readonly uuid = generateUUID();

  readonly shadowTypes: Set<ShadowElementType> = new Set([ShadowElementType.ShadowEntsBase]);

  readonly #ns: SignalFuncs<NamespaceType> = createSignal(GlobalNS);

  #contextElements = new Map<ShadowElementType, SignalFuncs<IShadowElement | undefined>>();

  // readonly #childQueue = eventize({});

  constructor() {
    super();
    connect(this.ns$, this.#onNamespaceChange);
  }

  /**
   * the shadow namespace
   */
  get ns(): NamespaceType {
    return value(this.#ns[0]);
  }

  get ns$(): SignalReader<NamespaceType> {
    return this.#ns[0];
  }

  set ns(value: NamespaceType | null | undefined) {
    this.#ns[1](toNamespace(value));
  }

  #getRelevantParentTypes(): readonly ShadowElementType[] {
    return Object.getPrototypeOf(this).constructor.relevantParentTypes as readonly ShadowElementType[];
  }

  /**
   * Returns the parent element of _shadow-type_.
   *
   * This is the _shadow-context_ element.
   * Only the types defined in {@link ShadowEntsBase.relevantParentTypes} can have context elements.
   */
  getParentByType(shadowType: ShadowElementType): IShadowElement | undefined {
    const getParent = this.getParentByType$(shadowType)?.[0];
    return getParent ? value(getParent) : undefined;
  }

  setParentByType(element: IShadowElement, type: ShadowElementType) {
    this.getParentByType$(type)?.[1](element ?? undefined);
  }

  getParentByType$(shadowType: ShadowElementType): SignalFuncs<IShadowElement | undefined> {
    if (!this.#contextElements.has(shadowType) && this.#getRelevantParentTypes().includes(shadowType)) {
      const parent$$ = createSignal<IShadowElement | undefined>();
      this.#contextElements.set(shadowType, parent$$);

      const [updateParent] = createEffect(
        () => {
          const parent = value(parent$$[0]);
          if (parent != null) {
            this.onAttachedToParent(parent, shadowType);
            return () => {
              parent.onChildRemoved(this, shadowType);
            };
          }
        },
        {dependencies: [parent$$[0]]},
      );

      // TODO destroy the effect?

      updateParent();

      return parent$$;
    }

    return this.#contextElements.get(shadowType);
  }

  hasContextElements(): boolean {
    return Array.from(this.#contextElements.values()).some(([el]) => value(el) != null);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    switch (name) {
      case 'ns':
        {
          const nextNs = toNamespace(newValue);
          if (toNamespace(oldValue) !== nextNs) {
            this.#ns[1](nextNs);
          }
        }
        break;
    }
  }

  connectedCallback() {
    console.debug('connectedCallback', {shadowEntsBase: this});

    this.#registerListener();

    // we want to create our context here:
    // find a parent element for each relevant shadow type
    this.#dispatchRequestContextEvent();
  }

  disconnectedCallback() {
    console.debug('disconnectedCallback', {shadowEntsBase: this});

    // this is the opposite of context finding:
    // we take this element out of the shadow tree
    this.#disconnectFromShadowTree();

    this.#unregisterListener();
  }

  adoptedCallback() {
    // TODO disconnect and reconnect to shadow tree
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument
    console.warn('TODO adoptedCallback', {shadowEntsBase: this});
  }

  onChildRemoved(child: IShadowElement, type: ShadowElementType) {
    console.debug('onChildRemoved', {parent: this, type, child});
  }

  onAttachedToParent(parent: IShadowElement, type: ShadowElementType) {
    console.debug('onAttachedToParent', {me: this, type, parent});
  }

  #registerListener(): void {
    this.addEventListener(RequestContextEventName, this.#onRequestContext, {capture: false, passive: false});
  }

  #unregisterListener(): void {
    this.removeEventListener(RequestContextEventName, this.#onRequestContext, {capture: false});
  }

  #onNamespaceChange = () => {
    console.debug('onNamespaceChange', {uuid: this.uuid, ns: this.ns, shadowEntsBase: this});

    // TODO changing the namespace should re-connect all descendants

    if (this.isConnected && this.hasContextElements()) {
      this.#disconnectFromShadowTree();
      this.#dispatchRequestContextEvent();
    }

    // TODO  we need to store all shadow-elements without a parentShadowElement somewhere
    // so we could re-request-context on namespace change
  };

  #onRequestContext = (event: RequestContextEvent) => {
    const requester = event.detail?.requester;
    if (requester != null && requester !== this && isShadowElement(requester) && requester.ns === this.ns) {
      const wantedTypes = event.detail!.types;

      if (wantedTypes.length === 0) {
        event.stopPropagation();
        return;
      }

      const shadowTypes = wantedTypes.filter((type) => this.shadowTypes.has(type));

      if (shadowTypes.length === 0) return;

      for (const type of shadowTypes) {
        wantedTypes.splice(wantedTypes.indexOf(type), 1);
        requester.setParentByType(this, type);
      }

      if (wantedTypes.length === 0) {
        event.stopPropagation();
      }
    }
  };

  #dispatchRequestContextEvent(): void {
    const types = this.#getRelevantParentTypes();
    if (types.length > 0) {
      this.dispatchEvent(
        new CustomEvent(RequestContextEventName, {
          bubbles: true,
          detail: {requester: this, types: [...types]},
        }),
      );
    }
  }

  #disconnectFromShadowTree() {
    for (const [, setParent] of this.#contextElements.values()) {
      setParent(undefined);
    }
  }
}
