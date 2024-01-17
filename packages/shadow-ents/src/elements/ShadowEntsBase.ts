import {connect, createSignal, value, type SignalReader, type SignalWriter} from '@spearwolf/signalize';
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

  #parentShadowElements = new Map<ShadowElementType, SignalFuncs<IShadowElement | undefined>>();

  // readonly #childQueue = eventize({});

  /** the shadow ents namespace */
  get ns(): NamespaceType {
    return value(this.#ns[0]);
  }

  set ns(value: NamespaceType | null | undefined) {
    this.#ns[1](toNamespace(value));
  }

  #getRelevantParentTypes(): readonly ShadowElementType[] {
    return Object.getPrototypeOf(this).constructor.relevantParentTypes as readonly ShadowElementType[];
  }

  getParentByType$(shadowType: ShadowElementType): SignalFuncs<IShadowElement | undefined> {
    if (!this.#parentShadowElements.has(shadowType) && this.#getRelevantParentTypes().includes(shadowType)) {
      const sig = createSignal<IShadowElement | undefined>();
      this.#parentShadowElements.set(shadowType, sig);

      connect(sig[0], (parent) => {
        if (parent) {
          this.onAttachedToParent(parent, shadowType);
        }
      });
      // TODO when to destroy connection?

      return sig;
    }
    return this.#parentShadowElements.get(shadowType);
  }

  getParentByType(shadowType: ShadowElementType): IShadowElement | undefined {
    const getParent = this.getParentByType$(shadowType)?.[0];
    return getParent ? value(getParent) : undefined;
  }

  setParentByType(element: IShadowElement, type: ShadowElementType) {
    this.getParentByType$(type)?.[1](element ?? undefined);
  }

  hasTypedParents(): boolean {
    return Array.from(this.#parentShadowElements.values()).some(([sig]) => value(sig) != null);
  }

  constructor() {
    super();
    connect(this.#ns[0], this.#onNamespaceChange);
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

  onChildRemoved(child: IShadowElement) {
    console.debug('onChildRemoved', {parent: this, child});
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

    if (this.isConnected && this.hasTypedParents()) {
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
    for (const [getParent, setParent] of this.#parentShadowElements.values()) {
      const parent = value(getParent);
      if (parent) {
        // parent.#onChildRemoved(this); // move to an effect?
        // parent.#childQueue.off(this);
        setParent(undefined);
      }
    }
    // this.#childQueue.emit('onParentDisconnectedFromShadowTree', this);
  }

  // onParentDisconnectedFromShadowTree(element: ShadowEntsBase) {
  //   if (element === this) return;

  //   console.debug('onParentDisconnectedFromShadowTree', this.uuid, {self: this, parent: element});

  //   this.#disconnectFromShadowTree();
  //   if (this.isConnected) {
  //     this.#dispatchRequestContextEvent([element.shadowType]);
  //   }
  // }

  // onChildAddedToParent(parent: ShadowEntsBase, child: ShadowEntsBase) {
  //   if (parent === this || child === this) return;

  //   console.debug('onChildAddedToParent', this.uuid, {
  //     self: this,
  //     parent,
  //     child,
  //   });

  //   // this.#dispatchRequestContextEvent();
  // }
}
