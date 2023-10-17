import {Eventize, Priority} from '@spearwolf/eventize';
import {toNamespace} from '../../toNamespace.js';
import type {IComponentChangeType, SyncEvent} from '../../types.js';
import {ComponentContext} from '../ComponentContext.js';

/**
 * The base class for all _entity environments_.
 *
 * An _entity environment_ is responsible for synchronising view components with entities.
 */
export class BaseEnv extends Eventize {
  static OnSync = Symbol('onSync');

  #namespace: string | symbol;

  get namespace(): string | symbol {
    return this.#namespace;
  }

  get view(): ComponentContext {
    return ComponentContext.get(this.#namespace);
  }

  #readyPromise: Promise<BaseEnv>;
  #readyResolve!: (value: BaseEnv) => void;

  get ready(): Promise<BaseEnv> {
    return this.#readyPromise;
  }

  #isReady = false;

  get isReady() {
    return this.#isReady;
  }

  #syncCallsBeforeReady = 0;

  constructor(namespace?: string | symbol) {
    super();

    this.#namespace = toNamespace(namespace);

    this.#readyPromise = new Promise<BaseEnv>((resolve) => {
      this.#readyResolve = resolve;
    });
  }

  sync(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReady) {
        this.#syncCallsBeforeReady++;
        if (this.#syncCallsBeforeReady > 1) {
          return this.once(BaseEnv.OnSync, Priority.Low, () => resolve());
        }
      }
      this.ready.then(() => {
        const syncEvent: SyncEvent = {
          changeTrail: this.getChangeTrail(),
        };
        this.emit(BaseEnv.OnSync, syncEvent);
        resolve();
      });
    });
  }

  protected start() {
    this.#isReady = true;
    this.#readyResolve(this);
  }

  protected getChangeTrail(): IComponentChangeType[] {
    return this.view.buildChangeTrails();
  }
}
