import {ComponentContext} from '../view/ComponentContext.js';
import {LocalShadowObjectEnv} from '../view/LocalShadowObjectEnv.js';
import {RemoteWorkerEnv} from '../view/RemoteWorkerEnv.js';
import {ShadowEnv} from '../view/ShadowEnv.js';
import {ShaeElement} from './ShaeElement.js';
import {readBooleanAttribute} from './attr-utils.js';
import {ATTR_LOCAL, ATTR_NO_AUTOSTART} from './constants.js';

export class ShaeWorkerElement extends ShaeElement {
  static override observedAttributes = [...ShaeElement.observedAttributes, ATTR_LOCAL];

  readonly isShaeWorkerElement = true;

  readonly shadowEnv = new ShadowEnv();

  autostart = true;

  #shouldDestroy = false;
  #started = false;

  constructor() {
    super();

    this.ns$.onChange((ns) => {
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

  get shouldAutostart(): boolean {
    return this.autostart && !readBooleanAttribute(this, ATTR_NO_AUTOSTART);
  }

  connectedCallback() {
    if (this.shouldAutostart) {
      this.start();
    }
  }

  disconnectedCallback() {
    this.#deferDestroy();
  }

  override attributeChangedCallback(name: string) {
    super.attributeChangedCallback(name);

    if (name === ATTR_LOCAL) {
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
        this.shadowEnv.view = ComponentContext.get(this.ns$.value);
      }

      if (this.shadowEnv.envProxy == null) {
        const envProxy = readBooleanAttribute(this, ATTR_LOCAL) ? new LocalShadowObjectEnv() : new RemoteWorkerEnv();
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
