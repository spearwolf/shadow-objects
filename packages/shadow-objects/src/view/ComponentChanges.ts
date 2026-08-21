import {ChangeTrailPhase, ComponentChangeType, VoidToken} from '../constants.js';
import type {
  IChangeToken,
  IComponentChangeType,
  IComponentEvent,
  ICreateEntitiesChange,
  IDestroyEntitiesChange,
  IPropertiesChange,
  ISendEvents,
  ISetParentChange,
  IUpdateOrderChange,
} from '../types.js';
import {appendToEnd, removeFrom} from '../utils/array-utils.js';

const ROOT = '#root';

/**
 * Tracks one component's outstanding changes between two change trails as four written ↔
 * pending pairs: `#token`/`#nextToken`, `#parentUuid`/`#nextParentUuid`, `#order`/`#nextOrder`
 * and `#properties`/`#nextProperties`. Each `make*` method folds its pending half forward into
 * the written half as it turns the change into a trail entry, so {@link
 * ComponentChanges.clear} — which resets every pending value — must run only after all of them
 * have. {@link ComponentContext.buildChangeTrails} is the only caller that does both, in that
 * order.
 *
 * The create/destroy counts behind {@link ComponentChanges.isCreated} and {@link
 * ComponentChanges.isDestroyed} belong to the uuid, not to a {@link ViewComponent} instance. They
 * carry the rule {@link ComponentContext.addComponent} keeps: a uuid names one component of a
 * {@link ComponentContext} at a time, so a later component takes this bookkeeping over only once its predecessor
 * has counted its own `destroy()`. A count pair that outlives its component therefore describes an
 * entity, and the successor on that uuid continues the same entity rather than starting a second.
 */
export class ComponentChanges {
  readonly #uuid: string;

  get uuid(): string {
    return this.#uuid;
  }

  #serial = 0;

  constructor(uuid: string) {
    this.#uuid = uuid;
  }

  #isNew = true;
  #createCount = 0;
  #destroyCount = 0;

  hasChanges(): boolean {
    return this.#serial > 0;
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  get isCreated(): boolean {
    return this.#createCount > 0 && this.#createCount > this.#destroyCount;
  }

  get isDestroyed(): boolean {
    return this.#destroyCount > 0 && this.#destroyCount >= this.#createCount;
  }

  #token: string = VoidToken;
  #parentUuid?: string;
  #order: number = 0;
  #autoDestructionOnParentRemoval = false;

  #nextToken?: string;
  #nextParentUuid?: string;
  #nextOrder?: number;

  create(token: string = VoidToken, parentUuid?: string, order: number = 0, autoDestructionOnParentRemoval = false) {
    this.#serial++;
    this.#createCount++;

    this.#nextToken = token;
    this.#nextParentUuid = parentUuid ?? ROOT;
    this.#nextOrder = !order ? undefined : order;
    this.#autoDestructionOnParentRemoval = autoDestructionOnParentRemoval;
  }

  destroy() {
    this.#destroyCount++;
    this.#serial++;
  }

  clear() {
    this.#serial = 0;

    this.#isNew = false;

    this.#nextToken = undefined;
    this.#nextParentUuid = undefined;
    this.#nextOrder = undefined;

    this.#nextProperties.clear();
    this.#propsChangeOrder.length = 0;

    this.#events.length = 0;
    this.#transferables.clear();
  }

  changeToken(token: string | undefined) {
    // an absent token means the void token everywhere else, so normalize here too;
    // otherwise `undefined` would mark the component dirty without ever emitting a change
    token ??= VoidToken;

    if (token === this.#token) {
      // a component that has not been flushed yet still owes the trail its create-token:
      // #token is only the last *written* token, so dropping #nextToken here would emit a
      // CreateEntities change without any token at all
      this.#nextToken = this.#isNew ? token : undefined;
    } else {
      this.#nextToken = token;
      this.#serial++;
    }
  }

  setParent(parentUuid?: string) {
    if (parentUuid === this.#parentUuid) {
      this.#nextParentUuid = undefined;
    } else {
      this.#nextParentUuid = parentUuid ?? ROOT;
      this.#serial++;
    }
  }

  changeOrder(order: number) {
    if (order === this.#order) {
      this.#nextOrder = undefined;
    } else {
      this.#nextOrder = order;
      this.#serial++;
    }
  }

  #properties: Map<string, unknown> = new Map();
  #nextProperties: Map<string, unknown> = new Map();
  #propsChangeOrder: string[] = []; // we use an Array here and not a Set, because we want to keep the change order

  /**
   * @returns `true` if the value differs from the last value written to a change trail
   */
  changeProperty<T = unknown>(key: string, value: T, isEqual?: (a: T, b: T) => boolean): boolean {
    const prevValue = this.#properties.get(key) as T;
    const valueChanged = (isEqual == null && value !== prevValue) || (isEqual != null && !isEqual(value, prevValue));

    if (valueChanged) {
      this.#nextProperties.set(key, value);
      appendToEnd(this.#propsChangeOrder, key);
      this.#serial++;
    } else {
      this.#nextProperties.delete(key);
      removeFrom(this.#propsChangeOrder, key);
    }

    return valueChanged;
  }

  removeProperty(key: string) {
    const propExists = this.#properties.has(key);
    if (this.#nextProperties.has(key)) {
      this.#nextProperties.delete(key);
      if (!propExists) {
        removeFrom(this.#propsChangeOrder, key);
      }
    } else if (propExists) {
      appendToEnd(this.#propsChangeOrder, key);
      this.#serial++;
    }
  }

  /**
   * The properties this component holds at this moment: the ones a change trail has already
   * carried, overlaid with everything that has accrued since.
   *
   * The overlay is what makes the result the current state instead of the state of the last
   * trail — `#properties` is only written forward while a trail is being built
   * ({@link ComponentChanges.makeCreateEntityChange}, {@link ComponentChanges.makeChangePropertyChange}).
   * A key whose accrued value is `undefined` and a key queued for change without an accrued value
   * are both removals, and neither appears in the result.
   */
  getProperties(): Map<string, unknown> {
    const properties = new Map(this.#properties);

    for (const key of this.#propsChangeOrder) {
      const value = this.#nextProperties.get(key);
      if (value === undefined) {
        properties.delete(key);
      } else {
        properties.set(key, value);
      }
    }

    return properties;
  }

  #events: IComponentEvent[] = [];
  #transferables = new Set<Transferable>();

  createEvent(type: string, data: unknown, transferables?: Transferable[]) {
    this.#events.push({type, data});
    for (const transferable of transferables ?? []) {
      this.#transferables.add(transferable);
    }
    this.#serial++;
  }

  transferEventsTo(changes: ComponentChanges) {
    if (this.#events.length > 0) {
      changes.#events.push(...this.#events);
      this.#events.length = 0;
    }
    if (this.#transferables.size > 0) {
      changes.#transferables = new Set([...changes.#transferables, ...this.#transferables]);
      this.#transferables.clear();
    }
  }

  buildChangeTrail(trail: IComponentChangeType[], trailPhase: ChangeTrailPhase) {
    const {isNew, isCreated, isDestroyed} = this;

    if (isNew && isDestroyed) return;

    switch (trailPhase) {
      case ChangeTrailPhase.StructuralChanges:
        if (isNew) {
          trail.push(this.makeCreateEntityChange());
        } else if (!isDestroyed) {
          if (this.#nextParentUuid !== undefined && !(this.#nextParentUuid === ROOT && this.#parentUuid === undefined)) {
            trail.push(this.makeSetParentChange());
          } else if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
            trail.push(this.makeUpdateOrderChange());
          }
          if (this.#nextToken !== undefined && this.#nextToken !== this.#token) {
            trail.push(this.makeChangeToken());
          }
        }
        break;

      case ChangeTrailPhase.ContentUpdates:
        if (!isNew && isCreated && this.#propsChangeOrder.length > 0) {
          trail.push(this.makeChangePropertyChange());
        }
        if (this.#events.length > 0) {
          trail.push(this.makeEvents());
        }
        break;

      case ChangeTrailPhase.Removal:
        if (isDestroyed) {
          trail.push(this.makeDestroyEntityChange());
        }
        break;
    }
  }

  makeEvents(): ISendEvents {
    const event: ISendEvents = {
      type: ComponentChangeType.SendEvents,
      uuid: this.#uuid,
      events: this.#events.slice(0),
    };
    if (this.#transferables.size > 0) {
      event.transferables = Array.from(this.#transferables);
    }
    return event;
  }

  // folds every pending value this entry carries into its written counterpart
  makeCreateEntityChange(): ICreateEntitiesChange {
    // never emit a create without a token: the kernel would register an entity that no
    // shadow object can ever be looked up for
    const token = this.#nextToken ?? this.#token;

    const entry: ICreateEntitiesChange = {
      type: ComponentChangeType.CreateEntities,
      uuid: this.#uuid,
      token,
    };

    this.#token = token;

    if (this.#nextParentUuid !== undefined) {
      const nextParentUuid = this.#nextParentUuid === ROOT ? undefined : this.#nextParentUuid;
      this.#parentUuid = nextParentUuid;
      if (nextParentUuid !== undefined) {
        entry.parentUuid = nextParentUuid;
      }
    }

    if (this.#nextProperties.size > 0) {
      entry.properties = Array.from(this.#nextProperties.entries()).filter(([, value]) => value !== undefined);
      for (const [key, value] of entry.properties) {
        this.#properties.set(key, value);
      }
    }

    if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
      entry.order = this.#order = this.#nextOrder;
    }

    if (this.#autoDestructionOnParentRemoval) {
      entry.autoDestructionOnParentRemoval = true;
    }

    return entry;
  }

  makeDestroyEntityChange(): IDestroyEntitiesChange {
    return {
      type: ComponentChangeType.DestroyEntities,
      uuid: this.#uuid,
    };
  }

  // folds the pending parent (and, if due, the pending order) into their written counterparts
  makeSetParentChange(): ISetParentChange {
    this.#parentUuid = this.#nextParentUuid === ROOT ? undefined : this.#nextParentUuid;

    const entry: ISetParentChange = {
      type: ComponentChangeType.SetParent,
      uuid: this.#uuid,
      parentUuid: this.#parentUuid,
    };

    if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
      entry.order = this.#order = this.#nextOrder;
    }

    return entry;
  }

  // folds the pending order into its written counterpart
  makeUpdateOrderChange(): IUpdateOrderChange {
    this.#order = this.#nextOrder ?? 0;

    return {
      type: ComponentChangeType.UpdateOrder,
      uuid: this.#uuid,
      order: this.#order,
    };
  }

  // folds the pending token into its written counterpart
  makeChangeToken(): IChangeToken {
    this.#token = this.#nextToken ?? VoidToken;

    return {
      type: ComponentChangeType.ChangeToken,
      uuid: this.#uuid,
      token: this.#token,
    };
  }

  // folds every pending property into its written counterpart, key by key
  makeChangePropertyChange(): IPropertiesChange {
    const properties = this.#propsChangeOrder.map((key) => {
      if (this.#nextProperties.has(key)) {
        // set prop — an explicit `undefined` is a removal, exactly like removeProperty()
        const nextValue = this.#nextProperties.get(key);
        if (nextValue === undefined) {
          this.#properties.delete(key);
        } else {
          this.#properties.set(key, nextValue);
        }
        return [key, nextValue] as [string, unknown];
      } else {
        // remove prop
        this.#properties.delete(key);
        return [key, undefined] as [string, unknown];
      }
    });

    return {
      type: ComponentChangeType.ChangeProperties,
      uuid: this.#uuid,
      properties,
    };
  }
}