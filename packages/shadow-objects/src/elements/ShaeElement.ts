import {createSignal, Signal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {readNamespaceAttribute} from '../utils/attr-utils.js';
import {toNamespace} from '../utils/toNamespace.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ATTR_NS} from './constants.js';
import type {NamespaceType} from '../types.ts';

const updateNamespace = (el: HTMLElement, ns: Signal<NamespaceType>) => {
  ns.set(readNamespaceAttribute(el));
};

const SyncNamespaces = new Set<NamespaceType>();
let nextSyncIsScheduled = false;

const syncShadowObjects = (ns: NamespaceType) => {
  SyncNamespaces.add(ns);
  if (!nextSyncIsScheduled) {
    nextSyncIsScheduled = true;
    queueMicrotask(() => {
      nextSyncIsScheduled = false;
      for (const ns of SyncNamespaces) {
        ShadowEnv.get(ns)?.sync();
      }
      SyncNamespaces.clear();
    });
  }
};

export class ShaeElement extends HTMLElement {
  static observedAttributes = [ATTR_NS];

  readonly isShaeElement = true;

  readonly ns$ = createSignal<NamespaceType>(GlobalNS);

  get ns(): NamespaceType {
    return this.ns$.value;
  }

  set ns(ns: NamespaceType) {
    if (typeof ns === 'symbol') {
      this.ns$.set(ns);
    } else {
      this.ns$.set(toNamespace(ns));
    }
  }

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      if (typeof ns === 'string' && ns.length > 0) {
        if (this.getAttribute(ATTR_NS) !== ns) {
          this.setAttribute(ATTR_NS, ns);
        }
      } else {
        this.removeAttribute(ATTR_NS);
      }
    });

    updateNamespace(this, this.ns$);
  }

  attributeChangedCallback(name: string) {
    if (name === ATTR_NS) {
      updateNamespace(this, this.ns$);
    }
  }

  syncShadowObjects() {
    syncShadowObjects(this.ns);
  }
}
