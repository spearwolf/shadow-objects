import {Eventize, Priority} from '@spearwolf/eventize';
import {EntityViewSpace} from './EntityViewSpace.js';
import type {EntitiesSyncEvent, EntityChangeEntryType} from './types.js';

/**
 * The base class for all _entity environments_.
 *
 * An _entity environment_ is responsible for synchronizing entities from a _view space_ with _entity components_ from a _kernel_.
 */
export class EntityEnv extends Eventize {
  static OnSync = Symbol('onSync');

  #namespace: string | symbol;

  get namespace(): string | symbol {
    return this.#namespace;
  }

  get view(): EntityViewSpace {
    return EntityViewSpace.get(this.#namespace);
  }

  #readyPromise: Promise<EntityEnv>;
  #readyResolve!: (value: EntityEnv) => void;

  get ready(): Promise<EntityEnv> {
    return this.#readyPromise;
  }

  #isReady = false;

  get isReady() {
    return this.#isReady;
  }

  #syncCallsBeforeReady = 0;

  constructor(namespace?: string | symbol) {
    super();

    this.#namespace = namespace ?? EntityViewSpace.GlobalNS;

    this.#readyPromise = new Promise<EntityEnv>((resolve) => {
      this.#readyResolve = resolve;
    });
  }

  sync(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReady) {
        this.#syncCallsBeforeReady++;
        if (this.#syncCallsBeforeReady > 1) {
          return this.once(EntityEnv.OnSync, Priority.Low, () => resolve());
        }
      }
      this.ready.then(() => {
        const syncEvent: EntitiesSyncEvent = {
          changeTrail: this.getChangeTrail(),
        };
        this.emit(EntityEnv.OnSync, syncEvent);
        resolve();
      });
    });
  }

  protected start() {
    this.#isReady = true;
    this.#readyResolve(this);
  }

  protected getChangeTrail(): EntityChangeEntryType[] {
    return this.view.buildChangeTrails();
  }
}
