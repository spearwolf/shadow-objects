import {ComponentChangeType, VoidToken} from '../constants.js';
import type {
  IChangeToken,
  IComponentChange,
  ICreateEntitiesChange,
  IDestroyEntitiesChange,
  ISetParentChange,
  IUpdateOrderChange,
} from '../types.js';

export interface ComponentState {
  token: string;
  parentUuid?: string;
  order?: number;
}

export class ComponentMemory {
  #components: Map<string, ComponentState> = new Map();

  clear() {
    this.#components.clear();
  }

  getComponent(uuid: string) {
    return this.#components.get(uuid);
  }

  write(changes: IComponentChange[]) {
    for (const change of changes) {
      switch (change.type) {
        case ComponentChangeType.CreateEntities:
          this.createEntity(change as ICreateEntitiesChange);
          break;

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
      }
    }
  }

  changeToken({uuid, token}: IChangeToken) {
    this.getComponent(uuid)!.token = token || VoidToken;
  }

  updateOrder({uuid, order}: IUpdateOrderChange) {
    this.getComponent(uuid)!.order = order ?? 0;
  }

  setParent({uuid, parentUuid, order}: ISetParentChange) {
    const c = this.getComponent(uuid)!;
    c.parentUuid = parentUuid;
    c.order = order ?? 0;
  }

  destroyEntity({uuid}: IDestroyEntitiesChange) {
    this.#components.delete(uuid);
  }

  createEntity({uuid, token, parentUuid, order}: ICreateEntitiesChange) {
    this.#components.set(uuid, {token: token || VoidToken, parentUuid, order: order ?? 0});
  }
}
