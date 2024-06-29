import {createSignal} from '@spearwolf/signalize';
import {GlobalNS} from '../constants.js';
import {toNamespace} from '../toNamespace.js';
import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {RemoteWorkerEnv} from '../view/RemoteWorkerEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';

const readNamespaceAttribute = (el: HTMLElement) => toNamespace(el.getAttribute('ns'));

const readBooleanAttribute = (el: HTMLElement, name: string) => {
  if (el.hasAttribute(name)) {
    const val = el.getAttribute(name)?.trim()?.toLowerCase() || 'on';
    return ['', 'true', 'on', 'yes', 'local'].includes(val);
  }
  return false;
};

const AttrNS = 'ns';
const AttrLocal = 'local';
const AttrNoAutostart = 'no-autostart';

export class ShaeWorkerElement extends HTMLElement {
  static observedAttributes = [AttrNS];

  readonly isShaeElement = true;
  readonly isShaeWorkerElement = true;

  readonly shadowEnv = new ShadowEnv();

  autostart = true;

  readonly #ns = createSignal<string | symbol>(GlobalNS);

  #shouldDestroy = false;
  #started = false;

  constructor() {
    super();

    this.#ns.onChange((ns) => {
      this.shadowEnv.view = ComponentContext.get(ns);
    });

    this.shadowEnv.on(ShadowEnv.ContextCreated, () => {
      this.dispatchEvent(
        new CustomEvent(ShadowEnv.ContextCreated.toLowerCase(), {
          bubbles: false,
          detail: {shadowEnv: this.shadowEnv},
        }),
      );
    });

    this.shadowEnv.on(ShadowEnv.ContextLost, () => {
      this.dispatchEvent(
        new CustomEvent(ShadowEnv.ContextLost.toLowerCase(), {
          bubbles: false,
          detail: {shadowEnv: this.shadowEnv},
        }),
      );
    });

    // XXX we don't expose ShadowEnv.AfterSync here, because the frequency of this event is too high
  }

  get ns(): string | symbol {
    return this.#ns.value;
  }

  set ns(ns: string | symbol) {
    if (typeof ns === 'symbol') {
      this.#ns.set(ns);
    } else {
      this.#ns.set(toNamespace(ns));
    }
  }

  get shouldAutostart(): boolean {
    return this.autostart && !readBooleanAttribute(this, AttrNoAutostart);
  }

  connectedCallback() {
    if (this.shouldAutostart) {
      this.start();
    }
  }

  disconnectedCallback() {
    this.#deferDestroy();
  }

  attributeChangedCallback(name: string) {
    if (name === AttrNS) {
      this.#ns.set(readNamespaceAttribute(this));
    }
    if (name === AttrLocal) {
      if (this.shadowEnv.envProxy != null) {
        throw new Error(
          '[ShaeWorkerElement] Changing the "local" attribute after the shadowEnv has been created is not supported.',
        );
      }
    }
  }

  start(): Promise<ShadowEnv> {
    if (!this.#started) {
      this.#shouldDestroy = false;

      if (this.shadowEnv.view == null) {
        this.shadowEnv.view = ComponentContext.get(this.#ns.value);
      }
      if (this.shadowEnv.envProxy == null) {
        const envProxy = readBooleanAttribute(this, AttrLocal) ? new LocalShadowObjectEnv() : new RemoteWorkerEnv();
        this.shadowEnv.envProxy = envProxy;
      }

      this.#started = true;
    }
    return this.shadowEnv.ready();
  }

  destroy() {
    this.shadowEnv.envProxy = undefined;
  }

  #deferDestroy() {
    if (!this.#shouldDestroy) {
      this.#shouldDestroy = true;
      queueMicrotask(() => {
        if (this.#shouldDestroy) {
          this.destroy();
        }
      });
    }
  }
}
