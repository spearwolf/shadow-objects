import {Eventize} from '@spearwolf/eventize';
import {batch} from '@spearwolf/signalize';
import {ComponentChangeType} from '../constants.js';
import type {IComponentChangeType, SyncEvent} from '../types.js';
import {Entity} from './Entity.js';
import {Registry} from './Registry.js';
import {OnCreate, OnDestroy, OnInit} from './events.js';

/**
 * The entity kernel manages the lifecycle of all entities and shadow-objects.
 *
 * An entity is created for each view-component. The entities act as containers for the shadow-objects.
 *
 * Which shadow-objects are created is determined by the token.
 */
export class Kernel extends Eventize {
  registry: Registry;

  #entities: Map<string, Entity> = new Map();

  constructor(registry?: Registry) {
    super();
    this.registry = Registry.get(registry);
  }

  getEntity(uuid: string): Entity {
    const entity = this.#entities.get(uuid);
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
        this.createEntity(entry.uuid, entry.token, entry.parentUuid, entry.order, entry.properties);
        break;

      case ComponentChangeType.DestroyEntities:
        this.destroyEntity(entry.uuid);
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

  createEntity(uuid: string, token: string, parentUuid?: string, order = 0, properties?: [string, unknown][]) {
    const entity = new Entity(this, uuid);

    entity.order = order;

    this.#entities.set(uuid, entity);

    if (parentUuid) {
      entity.parentUuid = parentUuid;
    }

    if (properties) {
      entity.setProperties(properties);
    }

    this.createShadowObjects(token, entity);

    entity.emit(OnInit, entity, this);
  }

  destroyEntity(uuid: string) {
    const e = this.getEntity(uuid);
    e.emit(OnDestroy, this);
    this.#entities.delete(uuid);
  }

  setParent(uuid: string, parentUuid?: string, order = 0) {
    const e = this.getEntity(uuid);
    e.removeFromParent();
    e.order = order;
    e.parentUuid = parentUuid;
  }

  updateOrder(uuid: string, order: number) {
    this.getEntity(uuid).order = order;
  }

  changeProperties(uuid: string, properties: [string, unknown][]) {
    this.getEntity(uuid).setProperties(properties);
  }

  createShadowObjects(token: string, entity?: Entity) {
    return this.registry.findConstructors(token)?.map((constructor) => {
      const shadowObject = new constructor();
      if (entity) {
        entity.on(shadowObject);
        if (typeof (shadowObject as OnCreate)[OnCreate] === 'function') {
          (shadowObject as OnCreate)[OnCreate](entity);
        }
      }
      return shadowObject;
    });
  }
}
