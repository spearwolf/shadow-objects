import {ComponentChangeType, VoidToken} from '../constants.js';
import type {
  ComponentPropertiesType,
  IChangeToken,
  IComponentChange,
  ICreateEntitiesChange,
  IDestroyEntitiesChange,
  IPropertiesChange,
  ISetParentChange,
  IUpdateOrderChange,
} from '../types.js';
import {applyPropsChanges} from './props-utils.js';

export interface ComponentState {
  token: string;
  parentUuid?: string;
  order?: number;
  properties?: ComponentPropertiesType;
}

/**
 * Stores the state of components and their hierarchy. The state is updated using a _change trail_.
 *
 * @internal
 * @see ComponentContext.buildChangeTrails
 */
export class ComponentMemory {
  #components: Map<string, ComponentState> = new Map();

  clear() {
    this.#components.clear();
  }

  getComponentState(uuid: string) {
    return this.#components.get(uuid);
  }

  write(changes: IComponentChange[]) {
    for (const change of changes) {
      if (change.type === ComponentChangeType.CreateEntities) {
        this.createEntity(change as ICreateEntitiesChange);
      } else if (this.#components.has(change.uuid)) {
        switch (change.type) {
          case ComponentChangeType.DestroyEntities:
            this.destroyEntity(change as IDestroyEntitiesChange);
            break;

          case ComponentChangeType.SetParent:
            this.setParent(change as ISetParentChange);
            break;

          case ComponentChangeType.UpdateOrder:
            this.updateOrder(change as IUpdateOrderChange);
            break;

          case ComponentChangeType.ChangeToken:
            this.changeToken(change as IChangeToken);
            break;

          case ComponentChangeType.ChangeProperties:
            this.changeProperties(change as IPropertiesChange);
            break;
        }
      }
    }
  }

  // propsEqual(uuid: string, changes: ComponentPropertiesType | undefined): boolean {
  //   return propsEqual(this.getComponentState(uuid).properties, changes);
  // }

  private changeProperties({uuid, properties}: IPropertiesChange) {
    const c = this.getComponentState(uuid)!;
    c.properties = applyPropsChanges(c.properties, properties);
  }

  private changeToken({uuid, token}: IChangeToken) {
    this.getComponentState(uuid)!.token = token || VoidToken;
  }

  private updateOrder({uuid, order}: IUpdateOrderChange) {
    this.getComponentState(uuid)!.order = order ?? 0;
  }

  private setParent({uuid, parentUuid, order}: ISetParentChange) {
    const c = this.getComponentState(uuid)!;
    c.parentUuid = parentUuid;
    c.order = order ?? 0;
  }

  private destroyEntity({uuid}: IDestroyEntitiesChange) {
    this.#components.delete(uuid);
  }

  private createEntity({uuid, token, parentUuid, order, properties}: ICreateEntitiesChange) {
    this.#components.set(uuid, {
      token: token || VoidToken,
      parentUuid,
      order: order ?? 0,
      properties: applyPropsChanges(undefined, properties),
    });
  }
}
