import {Eventize, eventize} from '@spearwolf/eventize';
import {
  batch,
  connect,
  createSignal,
  destroySignal,
  type CompareFunc,
  type SignalFuncs,
  type SignalReader,
} from '@spearwolf/signalize';
import {ComponentChangeType} from '../constants.js';
import type {IComponentChangeType, IComponentEvent, ShadowObjectConstructor, SyncEvent} from '../types.js';
import {Entity} from './Entity.js';
import {Registry} from './Registry.js';
import {onCreate, onDestroy, type OnCreate, type OnDestroy} from './events.js';

interface EntityEntry {
  token: string;
  entity: Entity;
  usedConstructors: Map<ShadowObjectConstructor, Set<object>>;
}

/**
 * The entity kernel manages the lifecycle of all entities and shadow-objects.
 *
 * An entity is created for each view-component. The entities act as containers for the shadow-objects.
 *
 * Which shadow-objects are created is determined by the token.
 */
export class Kernel extends Eventize {
  /**
   * The `message` event is triggered when the kernel receives a message from the entities
   * XXX kernel message event is not used yet
   */
  static Message = 'message';

  registry: Registry;

  #entities: Map<string, EntityEntry> = new Map();

  constructor(registry?: Registry) {
    super();
    this.registry = Registry.get(registry);
  }

  getEntity(uuid: string): Entity {
    const entity = this.#entities.get(uuid)?.entity;
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

      case ComponentChangeType.ChangeToken:
        this.changeToken(entry.uuid, entry.token);
        break;

      case ComponentChangeType.SendEvents:
        this.emitEventsToEntity(entry.uuid, entry.events);
        break;
    }
  }

  createEntity(uuid: string, token: string, parentUuid?: string, order = 0, properties?: [string, unknown][]) {
    const entity = new Entity(this, uuid);

    entity.order = order;

    const entityEntry: EntityEntry = {token, entity, usedConstructors: new Map()};

    this.#entities.set(uuid, entityEntry);

    if (parentUuid) {
      entity.parentUuid = parentUuid;
    }

    if (properties) {
      entity.setProperties(properties);
    }

    this.createShadowObjects(token, entityEntry);
  }

  destroyEntity(uuid: string) {
    const e = this.getEntity(uuid);
    e.emit(onDestroy, this);
    this.#entities.delete(uuid);
  }

  setParent(uuid: string, parentUuid?: string, order = 0) {
    const e = this.getEntity(uuid);
    if (e.parentUuid === parentUuid && e.order === order) return;
    e.removeFromParent();
    e.order = order;
    e.parentUuid = parentUuid;
  }

  updateOrder(uuid: string, order: number) {
    this.getEntity(uuid).order = order;
  }

  emitEventsToEntity(uuid: string, events: IComponentEvent[]) {
    this.getEntity(uuid)?.emitViewEvents(events);
  }

  changeProperties(uuid: string, properties: [string, unknown][]) {
    this.getEntity(uuid).setProperties(properties);
  }

  /**
   * If the entity already exists, but the token is changed, then ..
   * - all shadow-objects created with the previous token are destroyed
   * - new shadow-objects are created based on the new token
   * - of course, shadow-objects associated with both the previous and the new token remain in place
   */
  changeToken(uuid: string, token: string) {
    if (!this.#entities.has(uuid)) return;

    const {token: previousToken, entity, usedConstructors} = this.#entities.get(uuid);

    if (previousToken === token) return;

    const nextConstructors = new Set(this.registry.findConstructors(token));

    // Destroy all shadow-objects that are no longer a match for the new token
    //
    for (const [shadowObjectConstructor, shadowObjects] of usedConstructors) {
      if (!nextConstructors.has(shadowObjectConstructor)) {
        usedConstructors.delete(shadowObjectConstructor);
        for (const shadowObject of shadowObjects) {
          this.destroyShadowObject(shadowObject, entity);
        }
      }
    }

    // Based on the new token, create the new shadow objects
    //
    for (const shadowObjectConstructor of nextConstructors) {
      if (!usedConstructors.has(shadowObjectConstructor)) {
        const constructedShadowObjects = new Set<object>();
        usedConstructors.set(shadowObjectConstructor, constructedShadowObjects);
        for (const shadowObject of constructedShadowObjects) {
          constructedShadowObjects.add(shadowObject);
          this.attachShadowObject(shadowObject, entity);
        }
      }
    }
  }

  createShadowObjects(token: string, entityEntry?: EntityEntry) {
    return this.registry.findConstructors(token)?.map((constructor) => {
      const unsubscribe = new Set<() => any>();

      const contextReaders = new Map<string | symbol, SignalReader<any>>();
      const contextProviders = new Map<string | symbol, SignalFuncs<any>>();
      const propertyReaders = new Map<string, SignalReader<any>>();

      const shadowObject = eventize(
        new constructor(
          entityEntry?.entity != null
            ? {
                entity: entityEntry.entity,

                provideContext<T = unknown>(name: string | symbol, initialValue?: T, isEqual?: CompareFunc<T>) {
                  let ctxProvider = contextProviders.get(name);
                  if (ctxProvider === undefined) {
                    ctxProvider = createSignal(initialValue, isEqual ? {compareFn: isEqual} : undefined);
                    contextProviders.set(name, ctxProvider);
                    const con = connect(ctxProvider[0], entityEntry.entity.provideContext(name)[0]);
                    unsubscribe.add(con.destroy.bind(con));
                  }
                  return ctxProvider;
                },

                useContext(name: string | symbol, isEqual?: CompareFunc<any>) {
                  let ctxReader = contextReaders.get(name);
                  if (ctxReader === undefined) {
                    ctxReader = createSignal<any>(undefined, isEqual ? {compareFn: isEqual} : undefined)[0];
                    contextReaders.set(name, ctxReader);
                    const con = connect(entityEntry.entity.useContext(name), ctxReader);
                    unsubscribe.add(con.destroy.bind(con));
                  }
                  return ctxReader;
                },

                useProperty(name: string, isEqual?: CompareFunc<any>) {
                  let propReader = propertyReaders.get(name);
                  if (propReader === undefined) {
                    propReader = createSignal<any>(undefined, isEqual ? {compareFn: isEqual} : undefined)[0];
                    propertyReaders.set(name, propReader);
                    const con = connect(entityEntry.entity.getPropertyReader(name), propReader);
                    unsubscribe.add(con.destroy.bind(con));
                  }
                  return propReader;
                },

                onDestroy(callback: () => any) {
                  unsubscribe.add(callback);
                },
              }
            : undefined,
        ),
      );

      shadowObject.once(onDestroy, () => {
        console.log('destroy shadow-object', shadowObject, Array.from(unsubscribe));

        for (const callback of unsubscribe) {
          callback();
        }

        for (const sig of contextReaders.values()) {
          destroySignal(sig);
        }
        contextReaders.clear();

        for (const sig of propertyReaders.values()) {
          destroySignal(sig);
        }
        propertyReaders.clear();

        for (const [sig] of contextProviders.values()) {
          destroySignal(sig);
        }
        contextProviders.clear();
      });

      if (entityEntry) {
        // We want to keep track which shadow-objects are created by which constructors.
        // This will allow us to destroy the shadow-objects at a later time when we change the token.
        //
        if (entityEntry.usedConstructors.has(constructor)) {
          entityEntry.usedConstructors.get(constructor).add(shadowObject);
        } else {
          entityEntry.usedConstructors.set(constructor, new Set([shadowObject]));
        }

        this.attachShadowObject(shadowObject, entityEntry.entity);
      }

      return shadowObject;
    });
  }

  attachShadowObject(shadowObject: Object, entity: Entity) {
    // Like all other objects, the new shadow-object should be able to respond to the events that the entity receives.
    //
    entity.on(shadowObject);

    // Finally, the `shadowObject.onCreate(entity)` callback is called on the shadow-object.
    //
    if (typeof (shadowObject as OnCreate)[onCreate] === 'function') {
      (shadowObject as OnCreate)[onCreate](entity);
    }
  }

  destroyShadowObject(shadowObject: Object, entity: Entity) {
    if (typeof (shadowObject as OnDestroy)[onDestroy] === 'function') {
      (shadowObject as OnDestroy)[onDestroy](entity);
    }

    // TODO inform the entity that the shadow-object has been destroyed

    entity.off(shadowObject);
  }
}
