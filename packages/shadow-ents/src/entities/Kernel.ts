import {Eventize} from '@spearwolf/eventize';
import {batch} from '@spearwolf/signalize';
import {ComponentChangeType} from '../constants.js';
import type {IComponentChangeType, SyncEvent} from '../types.js';
import {Registry} from './Registry.js';
import {Uplink} from './Uplink.js';
import {OnCreate, OnDestroy, OnInit} from './events.js';

/**
 * The entity kernel manages the lifecycle of all uplinks and entity instances.
 *
 * An uplink is created for each view component. The uplinks act as containers for the entity instances.
 *
 * Which entities are created is determined by the token.
 */
export class Kernel extends Eventize {
  registry: Registry;

  #uplinks: Map<string, Uplink> = new Map();

  constructor(registry?: Registry) {
    super();
    this.registry = Registry.get(registry);
  }

  getUplink(uuid: string): Uplink {
    const entity = this.#uplinks.get(uuid);
    if (!entity) {
      throw new Error(`entity with uuid "${uuid}" not found!`);
    }
    return entity;
  }

  run(event: SyncEvent) {
    batch(() => {
      for (const entry of event.changeTrail) {
        this.parse(entry);
      }
    });
  }

  parse(entry: IComponentChangeType) {
    switch (entry.type) {
      case ComponentChangeType.CreateEntities:
        this.createUplink(entry.uuid, entry.token, entry.parentUuid, entry.order, entry.properties);
        break;

      case ComponentChangeType.DestroyEntities:
        this.destroyUplink(entry.uuid);
        break;

      case ComponentChangeType.SetParent:
        this.setParent(entry.uuid, entry.parentUuid, entry.order);
        break;

      case ComponentChangeType.UpdateOrder:
        this.updateOrder(entry.uuid, entry.order);
        break;

      case ComponentChangeType.ChangeProperties:
        this.changeProperties(entry.uuid, entry.properties);
        break;
    }
  }

  createUplink(uuid: string, token: string, parentUuid?: string, order = 0, properties?: [string, unknown][]) {
    const uplink = new Uplink(this, uuid);

    uplink.order = order;

    this.#uplinks.set(uuid, uplink);

    this.createEntityInstances(token, uplink);

    if (parentUuid) {
      uplink.parentUuid = parentUuid;
    }

    if (properties) {
      uplink.setProperties(properties);
    }

    uplink.emit(OnInit, uplink, this);
  }

  destroyUplink(uuid: string) {
    const uplink = this.getUplink(uuid);
    uplink.emit(OnDestroy, this);
    this.#uplinks.delete(uuid);
  }

  setParent(uuid: string, parentUuid?: string, order = 0) {
    const uplink = this.getUplink(uuid);
    uplink.removeFromParent();
    uplink.order = order;
    uplink.parentUuid = parentUuid;
  }

  updateOrder(uuid: string, order: number) {
    this.getUplink(uuid).order = order;
  }

  changeProperties(uuid: string, properties: [string, unknown][]) {
    this.getUplink(uuid).setProperties(properties);
  }

  createEntityInstances(token: string, uplink?: Uplink) {
    return this.registry.findConstructors(token)?.map((constructor) => {
      const instance = new constructor();
      if (uplink) {
        uplink.on(instance);
        if (typeof (instance as OnCreate)[OnCreate] === 'function') {
          (instance as OnCreate)[OnCreate](uplink);
        }
      }
      return instance;
    });
  }
}
