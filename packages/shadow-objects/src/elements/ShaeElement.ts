import {createSignal, Signal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import type {NamespaceType} from '../types.ts';
import {readNamespaceAttribute} from '../utils/attr-utils.js';
import {toNamespace} from '../utils/toNamespace.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ATTR_NS} from './constants.js';
import {ensureDisplayContentsRule} from './displayContentsRule.js';

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

  /** Whether this element has been in a tree at least once. */
  #wasConnected = false;

  /** Attribute writes that came in before the first connect, the latest one per attribute. */
  #pendingReflections?: Map<string, () => void>;

  constructor() {
    super();

    this.ns$.onChange((ns) => {
      this.reflectAttribute(ATTR_NS, () => {
        if (typeof ns === 'string' && ns.length > 0) {
          if (this.getAttribute(ATTR_NS) !== ns) {
            this.setAttribute(ATTR_NS, ns);
          }
        } else {
          this.removeAttribute(ATTR_NS);
        }
      });
    });

    updateNamespace(this, this.ns$);
  }

  /**
   * Writes an attribute back from a signal, or holds the write until the element first connects.
   *
   * A constructor must not give its element an attribute — the browser aborts the upgrade over it.
   * Signals do change during construction, though: the initial attribute read happens there, and
   * whatever it normalises reaches the reflecting handler right away. So a write that arrives
   * before the first connect is parked instead of being dropped, and a later write for the same
   * attribute replaces it — only the value the signal ends up with is worth writing.
   *
   * What is written back on connect is what the signals already carry, so the
   * `attributeChangedCallback` it triggers sets each signal to the value it is already on. For a
   * signal holding a scalar that is no change and reaches no handler at all; for one holding a
   * fresh object on every read — `forward-custom-events` builds a new `Set` per read — the write
   * counts as a change by identity and the reflecting handler runs once more, where the guard on
   * the attribute value it already wrote stops the second write. Either way the attribute ends up
   * on the value the signal carries.
   */
  protected reflectAttribute(name: string, write: () => void): void {
    if (this.#wasConnected) {
      write();
    } else {
      this.#pendingReflections ??= new Map();
      this.#pendingReflections.set(name, write);
    }
  }

  connectedCallback() {
    ensureDisplayContentsRule(this.getRootNode(), this.localName);

    // the gate is "has been connected once", not "is connected now": an element that leaves the
    // tree keeps reflecting, only what accrues before the very first connect is held back. And the
    // flag is set before the parked writes run, so a write that triggers another one goes straight
    // through instead of landing in a map nobody reads again
    this.#wasConnected = true;

    const pending = this.#pendingReflections;
    this.#pendingReflections = undefined;
    if (pending) {
      for (const write of pending.values()) {
        write();
      }
    }
  }

  attributeChangedCallback(name: string) {
    if (name === ATTR_NS) {
      updateNamespace(this, this.ns$);
    }
  }

  syncShadowObjects() {
    syncShadowObjects(this.ns);
  }

  /**
   * Sync the environment of `ns` instead of the one this element sits in right now.
   *
   * For the moment an element changes namespaces: the environment it leaves has a change trail
   * waiting for it, and `this.ns` no longer points at it.
   */
  protected syncShadowObjectsOf(ns: NamespaceType) {
    syncShadowObjects(ns);
  }
}