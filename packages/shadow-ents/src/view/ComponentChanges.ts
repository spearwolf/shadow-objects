import {appendToEnd, removeFrom} from '../array-utils.js';
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

  #nextToken?: string;
  #nextParentUuid?: string;
  #nextOrder?: number;

  create(token: string = VoidToken, parentUuid?: string, order: number = 0) {
    this.#serial++;
    this.#createCount++;

    this.#nextToken = token;
    this.#nextParentUuid = parentUuid;
    this.#nextOrder = !order ? undefined : order;
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

  changeToken(token: string) {
    if (token === this.#token) {
      this.#nextToken = undefined;
    } else {
      this.#nextToken = token;
      this.#serial++;
    }
  }

  setParent(parentUuid?: string) {
    if (parentUuid === this.#parentUuid) {
      this.#nextParentUuid = undefined;
    } else {
      this.#nextParentUuid = parentUuid ?? null;
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

  changeProperty<T = unknown>(key: string, value: T, isEqual?: (a: T, b: T) => boolean) {
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

  #events: IComponentEvent[] = [];
  #transferables = new Set<Transferable>();

  createEvent(type: string, data: unknown, transferables?: Transferable[]) {
    this.#events.push({type, data});
    transferables?.forEach((transferable) => this.#transferables.add(transferable));
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
          if (this.#nextParentUuid !== undefined && this.#nextParentUuid !== this.#parentUuid) {
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

  makeCreateEntityChange(): ICreateEntitiesChange {
    const entry: ICreateEntitiesChange = {
      type: ComponentChangeType.CreateEntities,
      uuid: this.#uuid,
      token: this.#nextToken,
    };

    this.#token = this.#nextToken;

    if (this.#nextParentUuid !== undefined) {
      entry.parentUuid = this.#parentUuid = this.#nextParentUuid;
    }

    if (this.#nextProperties.size > 0) {
      entry.properties = Array.from(this.#nextProperties.entries()).filter(([, value]) => value !== undefined);
      entry.properties.forEach(([key, value]) => this.#properties.set(key, value));
    }

    if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
      entry.order = this.#order = this.#nextOrder;
    }

    return entry;
  }

  makeDestroyEntityChange(): IDestroyEntitiesChange {
    return {
      type: ComponentChangeType.DestroyEntities,
      uuid: this.#uuid,
    };
  }

  makeSetParentChange(): ISetParentChange {
    this.#parentUuid = this.#nextParentUuid ?? undefined;

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

  makeUpdateOrderChange(): IUpdateOrderChange {
    this.#order = this.#nextOrder ?? 0;

    return {
      type: ComponentChangeType.UpdateOrder,
      uuid: this.#uuid,
      order: this.#order,
    };
  }

  makeChangeToken(): IChangeToken {
    this.#token = this.#nextToken ?? VoidToken;

    return {
      type: ComponentChangeType.ChangeToken,
      uuid: this.#uuid,
      token: this.#token,
    };
  }

  makeChangePropertyChange(): IPropertiesChange {
    const properties = this.#propsChangeOrder.map((key) => {
      if (this.#nextProperties.has(key)) {
        // set prop
        const nextValue = this.#nextProperties.get(key);
        this.#properties.set(key, nextValue);
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
