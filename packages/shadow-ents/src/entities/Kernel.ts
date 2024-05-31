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
import type {IComponentChangeType, IComponentEvent, ShadowObjectConstructor, ShadowObjectType, SyncEvent} from '../types.js';
import {Entity} from './Entity.js';
import {Registry} from './Registry.js';
import {onCreate, onDestroy, type OnCreate, type OnDestroy} from './events.js';

interface EntityEntry {
  token: string;
  entity: Entity;
  usedConstructors: Map<ShadowObjectConstructor, Set<ShadowObjectType>>;
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

  hasEntity(uuid: string): boolean {
    return this.#entities.has(uuid);
  }

  run(event: SyncEvent): void {
    batch(() => {
      for (const entry of event.changeTrail) {
        this.parse(entry);
      }
    });
  }

  private parse(entry: IComponentChangeType): void {
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

  createEntity(uuid: string, token: string, parentUuid?: string, order = 0, properties?: [string, unknown][]): void {
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

    this.createShadowObjects(uuid);
  }

  destroyEntity(uuid: string): void {
    const e = this.getEntity(uuid);
    e.emit(onDestroy, this);
    this.#entities.delete(uuid);
  }

  setParent(uuid: string, parentUuid?: string, order = 0): void {
    const e = this.getEntity(uuid);
    if (e.parentUuid === parentUuid && e.order === order) return;
    e.removeFromParent();
    e.order = order;
    e.parentUuid = parentUuid;
  }

  updateOrder(uuid: string, order: number): void {
    this.getEntity(uuid).order = order;
  }

  emitEventsToEntity(uuid: string, events: IComponentEvent[]): void {
    this.getEntity(uuid)?.emitViewEvents(events);
  }

  changeProperties(uuid: string, properties: [string, unknown][]): void {
    this.getEntity(uuid).setProperties(properties);
  }

  changeToken(uuid: string, token: string): void {
    if (!this.#entities.has(uuid)) return;

    const entry = this.#entities.get(uuid);

    if (entry.token === token) return;

    entry.token = token;

    this.updateShadowObjects(uuid);
  }

  /**
   * Create or destroy the shadow-objects of an entity using the registered constructors.
   * After a token change or registry changes, an entity may be given different shadow-objects.
   */
  updateShadowObjects(uuid: string): void {
    if (!this.#entities.has(uuid)) return;

    const entity = this.#entities.get(uuid);
    const nextConstructors = new Set(this.registry.findConstructors(entity.token));

    // destroy all shadow-objects created by constructors no longer in the list
    //
    for (const [constructor, shadowObjects] of entity.usedConstructors) {
      if (!nextConstructors.has(constructor)) {
        entity.usedConstructors.delete(constructor);
        for (const obj of shadowObjects) {
          this.destroyShadowObject(obj, entity.entity);
        }
      }
    }

    // shadow-objects for new constructors are now created using the updated constructor list
    //
    for (const constructor of nextConstructors) {
      if (!entity.usedConstructors.has(constructor)) {
        this.constructShadowObject(constructor, entity);
      }
    }
  }

  constructShadowObject(constructor: ShadowObjectConstructor, entry: EntityEntry): ShadowObjectType {
    const unsubscribe = new Set<() => any>();

    const contextReaders = new Map<string | symbol, SignalReader<any>>();
    const contextProviders = new Map<string | symbol, SignalFuncs<any>>();
    const propertyReaders = new Map<string, SignalReader<any>>();

    const shadowObject = eventize(
      new constructor({
        entity: entry.entity,

        provideContext<T = unknown>(name: string | symbol, initialValue?: T, isEqual?: CompareFunc<T>) {
          let ctxProvider = contextProviders.get(name);
          if (ctxProvider === undefined) {
            ctxProvider = createSignal(initialValue, isEqual ? {compareFn: isEqual} : undefined);
            contextProviders.set(name, ctxProvider);
            const con = connect(ctxProvider[0], entry.entity.provideContext(name)[0]);
            unsubscribe.add(con.destroy.bind(con));
          }
          return ctxProvider;
        },

        useContext(name: string | symbol, isEqual?: CompareFunc<any>) {
          let ctxReader = contextReaders.get(name);
          if (ctxReader === undefined) {
            ctxReader = createSignal<any>(undefined, isEqual ? {compareFn: isEqual} : undefined)[0];
            contextReaders.set(name, ctxReader);
            const con = connect(entry.entity.useContext(name), ctxReader);
            unsubscribe.add(con.destroy.bind(con));
          }
          return ctxReader;
        },

        useProperty(name: string, isEqual?: CompareFunc<any>) {
          let propReader = propertyReaders.get(name);
          if (propReader === undefined) {
            propReader = createSignal<any>(undefined, isEqual ? {compareFn: isEqual} : undefined)[0];
            propertyReaders.set(name, propReader);
            const con = connect(entry.entity.getPropertyReader(name), propReader);
            unsubscribe.add(con.destroy.bind(con));
          }
          return propReader;
        },

        onDestroy(callback: () => any) {
          unsubscribe.add(callback);
        },
      }),
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

    // We want to keep track which shadow-objects are created by which constructors.
    // This will all
    //
    if (entry.usedConstructors.has(constructor)) {
      entry.usedConstructors.get(constructor).add(shadowObject);
    } else {
      entry.usedConstructors.set(constructor, new Set([shadowObject]));
    }

    this.attachShadowObject(shadowObject, entry.entity);

    return shadowObject;
  }

  createShadowObjects(uuid: string): ShadowObjectType[] {
    const entry = this.#entities.get(uuid);
    return this.registry.findConstructors(entry.token)?.map((constructor) => {
      return this.constructShadowObject(constructor, entry);
    });
  }

  findShadowObjects(uuid: string): ShadowObjectType[] {
    if (!this.#entities.has(uuid)) return [];

    const {usedConstructors} = this.#entities.get(uuid);

    return Array.from(
      new Set(
        Array.from(usedConstructors.values())
          .map((objs) => Array.from(objs))
          .flat(),
      ),
    );
  }

  attachShadowObject(shadowObject: object, entity: Entity): void {
    // Like all other objects, the new shadow-object should be able to respond to the events that the entity receives.
    //
    entity.on(shadowObject);

    // Finally, the `shadowObject.onCreate(entity)` callback is called on the shadow-object.
    //
    if (typeof (shadowObject as OnCreate)[onCreate] === 'function') {
      (shadowObject as OnCreate)[onCreate](entity);
    }
  }

  destroyShadowObject(shadowObject: object, entity: Entity): void {
    if (typeof (shadowObject as OnDestroy)[onDestroy] === 'function') {
      (shadowObject as OnDestroy)[onDestroy](entity);
    }

    entity.off(shadowObject);
  }

  // TODO destroy all entities
}
