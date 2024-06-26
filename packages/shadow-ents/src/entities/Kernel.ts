import {Eventize, eventize} from '@spearwolf/eventize';
import {
  SignalObject,
  batch,
  connect,
  createSignal,
  destroySignal,
  type CompareFunc,
  type SignalReader,
} from '@spearwolf/signalize';
import {ComponentChangeType, MessageToView} from '../constants.js';
import type {IComponentChangeType, IComponentEvent, ShadowObjectConstructor, ShadowObjectType, SyncEvent} from '../types.js';
import {Entity} from './Entity.js';
import {Registry} from './Registry.js';
import {onCreate, onDestroy, type OnCreate, type OnDestroy} from './events.js';

export interface MessageToViewEvent {
  uuid: string;
  type: string;
  data?: unknown;
  transferables?: Transferable[];
}

interface EntityEntry {
  token: string;
  entity: Entity;
  usedConstructors: Map<ShadowObjectConstructor, Set<ShadowObjectType>>;
}

enum ShadowObjectAction {
  CreateAndDestroy = 0,
  JustCreate,
  DestroyOnly,
}

/**
 * The entity kernel manages the lifecycle of all entities and shadow-objects.
 *
 * An entity is created for each view-component. The entities act as containers for the shadow-objects.
 *
 * Which shadow-objects are created is determined by the token.
 */
export class Kernel extends Eventize {
  registry: Registry;

  #entities: Map<string, EntityEntry> = new Map();
  #rootEntities: Set<string> = new Set();

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

  /**
   * @returns all entities in breadth-first order
   */
  traverseLevelOrderBFS(): Entity[] {
    const lvl = new Map<number, Entity[]>();

    const traverse = (uuid: string, depth: number) => {
      const e = this.getEntity(uuid);

      if (lvl.has(depth)) {
        lvl.get(depth).push(e);
      } else {
        lvl.set(depth, [e]);
      }

      for (const child of e.children) {
        traverse(child.uuid, depth + 1);
      }
    };

    this.#rootEntities.forEach((uuid) => traverse(uuid, 0));

    return Array.from(lvl.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, entities]) => entities)
      .flat();
  }

  upgradeEntities(): void {
    const entities = this.traverseLevelOrderBFS();
    const reversedEntities = entities.slice().reverse();

    for (const entity of reversedEntities) {
      this.updateShadowObjects(entity.uuid, ShadowObjectAction.DestroyOnly);
    }

    for (const entity of entities) {
      this.updateShadowObjects(entity.uuid, ShadowObjectAction.JustCreate);
    }
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
        this.dispatchEventsToEntity(entry.uuid, entry.events);
        break;
    }
  }

  createEntity(uuid: string, token: string, parentUuid?: string, order = 0, properties?: [string, unknown][]): void {
    const e = new Entity(this, uuid);

    e.order = order;

    const entry: EntityEntry = {token, entity: e, usedConstructors: new Map()};

    this.#entities.set(uuid, entry);

    if (parentUuid) {
      e.parentUuid = parentUuid;
    }

    if (!e.hasParent) {
      this.#rootEntities.add(uuid);
    }

    if (properties) {
      e.setProperties(properties);
    }

    this.createShadowObjects(uuid);
  }

  destroyEntity(uuid: string): void {
    if (!this.#entities.has(uuid)) return;

    const entry = this.#entities.get(uuid);

    entry.entity.emit(onDestroy, this);

    entry.usedConstructors.clear();

    this.#entities.delete(entry.entity.uuid);
    this.#rootEntities.delete(entry.entity.uuid);
  }

  setParent(uuid: string, parentUuid?: string, order = 0): void {
    const e = this.getEntity(uuid);

    if (e.parentUuid === parentUuid && e.order === order) return;

    e.removeFromParent();

    e.order = order;
    e.parentUuid = parentUuid;

    if (e.hasParent) {
      this.#rootEntities.delete(uuid);
    } else {
      this.#rootEntities.add(uuid);
    }
  }

  updateOrder(uuid: string, order: number): void {
    this.getEntity(uuid).order = order;
  }

  dispatchEventsToEntity(uuid: string, events: IComponentEvent[]): void {
    this.getEntity(uuid)?.dispatchViewEvents(events);
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

  dispatchMessageToView(message: MessageToViewEvent): void {
    queueMicrotask(() => {
      this.emit(MessageToView, message);
    });
  }

  /**
   * Create or destroy the shadow-objects of an entity using the registered constructors.
   * After a token change or registry changes, an entity may be given different shadow-objects.
   */
  private updateShadowObjects(uuid: string, action = ShadowObjectAction.CreateAndDestroy): void {
    const entry = this.#entities.get(uuid);
    const nextConstructors = new Set(this.registry.findConstructors(entry.token));

    const shouldDestroy = action === ShadowObjectAction.CreateAndDestroy || action === ShadowObjectAction.DestroyOnly;
    const shouldCreate = action === ShadowObjectAction.CreateAndDestroy || action === ShadowObjectAction.JustCreate;

    // destroy all shadow-objects created by constructors no longer in the list
    //
    if (shouldDestroy) {
      for (const [constructor, shadowObjects] of entry.usedConstructors) {
        if (!nextConstructors.has(constructor)) {
          entry.usedConstructors.delete(constructor);
          for (const obj of shadowObjects) {
            this.destroyShadowObject(obj, entry.entity);
          }
        }
      }
    }

    // shadow-objects for new constructors are now created using the updated constructor list
    //
    if (shouldCreate) {
      for (const constructor of nextConstructors) {
        if (!entry.usedConstructors.has(constructor)) {
          this.constructShadowObject(constructor, entry);
        }
      }
    }
  }

  private constructShadowObject(constructor: ShadowObjectConstructor, entry: EntityEntry): ShadowObjectType {
    const unsubscribe = new Set<() => any>();

    const contextReaders = new Map<string | symbol, SignalReader<any>>();
    const contextProviders = new Map<string | symbol, SignalObject<any>>();
    const propertyReaders = new Map<string, SignalReader<any>>();

    const shadowObject = eventize(
      new constructor({
        entity: entry.entity,

        provideContext<T = unknown>(name: string | symbol, initialValue?: T, isEqual?: CompareFunc<T>) {
          let ctxProvider = contextProviders.get(name);
          if (ctxProvider === undefined) {
            ctxProvider = createSignal(initialValue, isEqual ? {compareFn: isEqual} : undefined);
            contextProviders.set(name, ctxProvider);
            const con = connect(ctxProvider, entry.entity.provideContext(name));
            unsubscribe.add(con.destroy.bind(con));
          }
          return ctxProvider;
        },

        useContext(name: string | symbol, isEqual?: CompareFunc<any>) {
          let ctxReader = contextReaders.get(name);
          if (ctxReader === undefined) {
            [ctxReader] = createSignal<any>(undefined, isEqual ? {compareFn: isEqual} : undefined);
            contextReaders.set(name, ctxReader);
            const con = connect(entry.entity.useContext(name), ctxReader);
            unsubscribe.add(con.destroy.bind(con));
          }
          return ctxReader;
        },

        useProperty(name: string, isEqual?: CompareFunc<any>) {
          let propReader = propertyReaders.get(name);
          if (propReader === undefined) {
            [propReader] = createSignal<any>(undefined, isEqual ? {compareFn: isEqual} : undefined);
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

      for (const sig of propertyReaders.values()) {
        destroySignal(sig);
      }

      for (const [sig] of contextProviders.values()) {
        destroySignal(sig);
      }

      contextReaders.clear();
      propertyReaders.clear();
      contextProviders.clear();

      const otherShadowObjects = entry.usedConstructors.get(constructor);
      if (otherShadowObjects) {
        otherShadowObjects.delete(shadowObject);
        if (otherShadowObjects.size === 0) {
          entry.usedConstructors.delete(constructor);
        }
      }
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

  private createShadowObjects(uuid: string): void {
    const entry = this.#entities.get(uuid);

    this.registry.findConstructors(entry.token)?.forEach((constructor) => {
      this.constructShadowObject(constructor, entry);
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

  private attachShadowObject(shadowObject: object, entity: Entity): void {
    // Like all other objects, the new shadow-object should be able to respond to the events that the entity receives.
    //
    entity.on(shadowObject);

    // Finally, the `shadowObject.onCreate(entity)` callback is called on the shadow-object.
    //
    if (typeof (shadowObject as OnCreate)[onCreate] === 'function') {
      (shadowObject as OnCreate)[onCreate](entity);
    }
  }

  private destroyShadowObject(shadowObject: object, entity: Entity): void {
    if (typeof (shadowObject as OnDestroy)[onDestroy] === 'function') {
      (shadowObject as OnDestroy)[onDestroy](entity);
    }

    entity.off(shadowObject);
  }

  destroy(): void {
    for (const entity of this.traverseLevelOrderBFS().reverse()) {
      this.destroyEntity(entity.uuid);
    }
  }
}
