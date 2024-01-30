import {appendTo} from '../array-utils.js';
import {ChangeTrailPhase, ComponentChangeType} from '../constants.js';
import type {
  IComponentChangeType,
  ICreateEntitiesChange,
  IDestroyEntitiesChange,
  IPropertiesChange,
  ISetParentChange,
  IUpdateOrderChange,
} from '../types.js';

export class ComponentChanges {
  #uuid: string;

  #serial = 0;

  #isCreate = false;

  #token?: string;
  #order?: number;

  #isDestroy = false;

  #parentUuid: string | null | undefined = undefined;

  #properties: Map<string, unknown> = new Map();
  #changedProperties: string[] = []; // we use an Array here and not a Set, because we want to keep the insertion order

  #orderChanged = false;

  constructor(uuid: string) {
    this.#uuid = uuid;
  }

  create(token: string, order: number) {
    this.#isCreate = true;
    this.#isDestroy = false;

    this.#token = token;
    this.#order = order;

    this.#serial++;
  }

  destroy() {
    if (this.#isCreate) {
      this.#isCreate = false;
      this.#isDestroy = false;
      this.#serial++;
    } else if (!this.#isDestroy) {
      this.#isDestroy = true;
      this.#serial++;
    }
  }

  setParent(parentUuid?: string) {
    this.#parentUuid = parentUuid ?? null;
    this.#serial++;
  }

  changeProperty<T = unknown>(key: string, value: T, isEqual?: (a: T, b: T) => boolean) {
    const prevValue = this.#properties.get(key) as T;
    if ((isEqual == null && value !== prevValue) || (isEqual != null && !isEqual(value, prevValue))) {
      this.#properties.set(key, value);
      appendTo(this.#changedProperties, key);
      this.#serial++;
    }
  }

  changeOrder(order: number) {
    if (this.#order !== order) {
      this.#order = order;
      this.#orderChanged = true;
      this.#serial++;
    }
  }

  removeProperty(key: string) {
    if (this.#properties.has(key)) {
      this.#properties.delete(key);
      appendTo(this.#changedProperties, key);
      this.#serial++;
    }
  }

  hasChanges() {
    return this.#serial > 0;
  }

  clear() {
    this.#isCreate = false;
    this.#isDestroy = false;
    this.#parentUuid = undefined;
    this.#changedProperties.length = 0;
    this.#orderChanged = false;
    this.#serial = 0;
  }

  dispose() {
    this.clear();
    this.#properties.clear();
  }

  buildChangeTrail(trail: IComponentChangeType[], trailPhase: ChangeTrailPhase) {
    switch (trailPhase) {
      case ChangeTrailPhase.StructuralChanges:
        if (this.#isCreate) {
          trail.push(this.makeCreateEntityChange());
        }
        if (!this.#isCreate && !this.#isDestroy) {
          if (this.#parentUuid !== undefined) {
            trail.push(this.makeSetParentChange());
          } else if (this.#orderChanged) {
            trail.push(this.makeUpdateOrderChange());
          }
        }
        break;
      case ChangeTrailPhase.ContentUpdates:
        if (!this.#isCreate && !this.#isDestroy && this.#changedProperties.length > 0) {
          trail.push(this.makeChangePropertyChange());
        }
        break;
      case ChangeTrailPhase.Removal:
        if (this.#isCreate) {
          trail.push(this.makeDestroyEntityChange());
        }
        break;
    }
  }

  makeCreateEntityChange(): ICreateEntitiesChange {
    const entry: ICreateEntitiesChange = {
      type: ComponentChangeType.CreateEntities,
      uuid: this.#uuid,
      token: this.#token,
    };

    if (this.#parentUuid) {
      entry.parentUuid = this.#parentUuid;
    }

    if (this.#properties.size > 0) {
      entry.properties = Array.from(this.#properties.entries());
    }

    if (this.#order !== 0) {
      entry.order = this.#order;
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
    const entry: ISetParentChange = {
      type: ComponentChangeType.SetParent,
      uuid: this.#uuid,
      parentUuid: this.#parentUuid ?? undefined,
    };
    if (this.#orderChanged) {
      entry.order = this.#order;
    }
    return entry;
  }

  makeUpdateOrderChange(): IUpdateOrderChange {
    return {
      type: ComponentChangeType.UpdateOrder,
      uuid: this.#uuid,
      order: this.#order,
    };
  }

  makeChangePropertyChange(): IPropertiesChange {
    return {
      type: ComponentChangeType.ChangeProperties,
      uuid: this.#uuid,
      properties: this.#changedProperties.reduce(
        (entries, key) => [...entries, [key, this.#properties.get(key)]],
        [] as [string, unknown][],
      ),
    };
  }
}
