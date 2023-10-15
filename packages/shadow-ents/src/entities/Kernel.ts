import {Eventize} from '@spearwolf/eventize';
import {batch} from '@spearwolf/signalize';
import {EntityChangeType} from '../constants.js';
import type {EntitiesSyncEvent, EntityChangeEntryType} from '../types.js';
import {Registry} from './Registry.js';
import {Uplink} from './Uplink.js';
import {OnCreate, OnDestroy, OnInit} from './events.js';

/**
 * The _entity kernel_ is the central hub for all _entity uplinks_.
 *
 * The entities are created, destroyed, parented, etc. based on the entity _view change log_.
 * The entity components are created based on the _tokens_ and the _entity registry_.
 */
export class Kernel extends Eventize {
  registry: Registry;

  #entities: Map<string, Uplink> = new Map();

  constructor(registry?: Registry) {
    super();
    this.registry = registry ?? Registry.get();
  }

  getEntity(uuid: string): Uplink {
    const entity = this.#entities.get(uuid);
    if (!entity) {
      throw new Error(`Entity with uuid "${uuid}" not found.`);
    }
    return entity;
  }

  run(event: EntitiesSyncEvent) {
    batch(() => {
      for (const entry of event.changeTrail) {
        this.parse(entry);
      }
    });
  }

  parse(entry: EntityChangeEntryType) {
    switch (entry.type) {
      case EntityChangeType.CreateEntity:
        this.createEntity(entry.uuid, entry.token, entry.parentUuid, entry.order, entry.properties);
        break;

      case EntityChangeType.DestroyEntity:
        this.destroyEntity(entry.uuid);
        break;

      case EntityChangeType.SetParent:
        this.setParent(entry.uuid, entry.parentUuid, entry.order);
        break;

      case EntityChangeType.UpdateOrder:
        this.updateOrder(entry.uuid, entry.order);
        break;

      case EntityChangeType.ChangeProperties:
        this.changeProperties(entry.uuid, entry.properties);
        break;
    }
  }

  createEntity(uuid: string, token: string, parentUuid?: string, order = 0, properties?: [string, unknown][]) {
    const entity = new Uplink(this, uuid);

    entity.order = order;

    this.#entities.set(uuid, entity);

    this.createEntityComponents(token, entity);

    if (parentUuid) {
      entity.parentUuid = parentUuid;
    }

    if (properties) {
      entity.setProperties(properties);
    }

    entity.emit(OnInit, entity, this);
  }

  destroyEntity(uuid: string) {
    const entity = this.getEntity(uuid);
    entity.emit(OnDestroy, this);
    this.#entities.delete(uuid);
  }

  setParent(uuid: string, parentUuid?: string, order = 0) {
    const entity = this.getEntity(uuid);
    entity.removeFromParent();
    entity.order = order;
    entity.parentUuid = parentUuid;
  }

  updateOrder(uuid: string, order: number) {
    this.getEntity(uuid).order = order;
  }

  changeProperties(uuid: string, properties: [string, unknown][]) {
    this.getEntity(uuid).setProperties(properties);
  }

  createEntityComponents(token: string, uplink?: Uplink) {
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
