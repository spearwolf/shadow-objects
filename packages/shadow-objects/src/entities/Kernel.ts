import {emit, eventize, off, on, once} from '@spearwolf/eventize';
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  destroySignal,
  link,
  Signal,
  type CompareFunc,
  type SignalReader,
} from '@spearwolf/signalize';
import {ComponentChangeType, MessageToView} from '../constants.js';
import type {IComponentChangeType, IComponentEvent, ShadowObjectConstructor, ShadowObjectType, SyncEvent} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {Entity} from './Entity.js';
import {Registry} from './Registry.js';
import {onCreate, onDestroy, onParentChanged, type OnCreate, type OnDestroy} from './events.js';

export interface MessageToViewEvent {
  uuid: string;
  type: string;
  data?: unknown;
  transferables?: Transferable[];
  traverseChildren?: boolean;
  // TODO(test) if MessageToView#traverseChildren is implemented all the way down
}

interface EntityEntry {
  token: string;
  entity: Entity;
  usedConstructors: Map<ShadowObjectConstructor, Set<ShadowObjectType>>;
}

interface EntityGraphNode {
  token: string;
  entity: Entity;
  props: Record<string, unknown>;
  children: EntityGraphNode[];
}

enum ShadowObjectAction {
  CreateAndDestroy = 0,
  JustCreate,
  DestroyOnly,
}

const getDisplayName = (constructor: ShadowObjectConstructor) => constructor.displayName || constructor.name;

/**
 * The entity kernel manages the lifecycle of all entities and shadow-objects.
 *
 * An entity is created for each view-component. The entities act as containers for the shadow-objects.
 *
 * Which shadow-objects are created is determined by the token.
 */
export class Kernel {
  registry: Registry;

  readonly logger = new ConsoleLogger('Kernel');

  #entities: Map<string, EntityEntry> = new Map();
  #rootEntities: Set<string> = new Set();

  #allEntities?: Entity[];
  #allEntitiesReversed?: Entity[];
  #allEntitiesNeedUpdate = true;

  constructor(registry?: Registry) {
    eventize(this);
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
  traverseLevelOrderBFS(reverse = false): Entity[] {
    if (this.#allEntitiesNeedUpdate) {
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

      this.#allEntities = Array.from(lvl.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, entities]) => entities)
        .flat();

      this.#allEntitiesReversed = this.#allEntities.slice().reverse();
      this.#allEntitiesNeedUpdate = false;
    }

    return reverse ? this.#allEntitiesReversed : this.#allEntities;
  }

  getEntityGraph(): EntityGraphNode[] {
    return Array.from(this.#rootEntities).map((uuid) => this.getEntityGraphNode(uuid)!);
  }

  private getEntityGraphNode(uuid: string): EntityGraphNode | undefined {
    if (!this.#entities.has(uuid)) return undefined;

    const {token, entity} = this.#entities.get(uuid);
    return {
      token,
      entity,
      props: Object.fromEntries(entity.propEntries()),
      children: entity.children.map((child) => this.getEntityGraphNode(child.uuid)),
    };
  }

  upgradeEntities(): void {
    for (const entity of this.traverseLevelOrderBFS(true)) {
      this.updateShadowObjects(entity.uuid, ShadowObjectAction.DestroyOnly);
    }

    for (const entity of this.traverseLevelOrderBFS(false)) {
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
        this.#allEntitiesNeedUpdate = true;
        break;

      case ComponentChangeType.DestroyEntities:
        this.destroyEntity(entry.uuid);
        this.#allEntitiesNeedUpdate = true;
        break;

      case ComponentChangeType.SetParent:
        this.setParent(entry.uuid, entry.parentUuid, entry.order);
        this.#allEntitiesNeedUpdate = true;
        break;

      case ComponentChangeType.UpdateOrder:
        this.updateOrder(entry.uuid, entry.order);
        this.#allEntitiesNeedUpdate = true;
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

    const {entity, usedConstructors} = this.#entities.get(uuid);

    entity.removeFromParent();
    emit(entity, onDestroy, this);

    usedConstructors.clear();

    this.#entities.delete(entity.uuid);
    this.#rootEntities.delete(entity.uuid);
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

    e.reSubscribeToParentContexts();

    queueMicrotask(() => {
      if (this.logger.isDebug) {
        this.logger.debug('entity.onParentChanged', {uuid, parentUuid, order, entity: e});
      }
      emit(e, onParentChanged, e);
    });
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
      emit(this, MessageToView, message);
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
    const unsubscribePrimary = new Set<() => any>();
    const unsubscribeSecondary = new Set<() => any>();

    const contextReaders = new Map<string | symbol, SignalReader<any>>();
    const contextProviders = new Map<string | symbol, Signal<any>>();

    const propertyReaders = new Map<string, SignalReader<any>>();

    const shadowObject = eventize(
      new constructor({
        entity: entry.entity,

        provideContext<T = unknown>(name: string | symbol, initialValue?: T, compare?: CompareFunc<T>) {
          let ctxProvider = contextProviders.get(name);
          if (ctxProvider === undefined) {
            ctxProvider = createSignal(initialValue, compare ? {compare} : undefined);
            contextProviders.set(name, ctxProvider);
            const con = link(ctxProvider, entry.entity.provideContext(name));
            unsubscribeSecondary.add(con.destroy.bind(con));
          }
          return ctxProvider;
        },

        useContext(name: string | symbol, compare?: CompareFunc<any>) {
          let ctxReader = contextReaders.get(name);
          if (ctxReader === undefined) {
            ctxReader = createSignal<any>(undefined, compare ? {compare} : undefined).get;
            contextReaders.set(name, ctxReader);
            const con = link(entry.entity.useContext(name), ctxReader);
            unsubscribeSecondary.add(con.destroy.bind(con));
          }
          return ctxReader;
        },

        useProperty<T = any>(name: string, compare?: CompareFunc<T>): SignalReader<T> {
          let propReader = propertyReaders.get(name);
          if (propReader === undefined) {
            propReader = createSignal<any>(undefined, compare ? {compare} : undefined).get;
            propertyReaders.set(name, propReader);
            const con = link(entry.entity.getPropertyReader(name), propReader);
            unsubscribeSecondary.add(con.destroy.bind(con));
          }
          return propReader;
        },

        createEffect(...args: Parameters<typeof createEffect>): ReturnType<typeof createEffect> {
          const effect = createEffect(...args);
          unsubscribeSecondary.add(effect.destroy);
          return effect;
        },

        createSignal<T = unknown>(...args: Parameters<typeof createSignal<T>>): ReturnType<typeof createSignal<T>> {
          const sig = createSignal<T>(...args);
          unsubscribeSecondary.add(() => {
            destroySignal(sig);
          });
          return sig;
        },

        createMemo<T = unknown>(...args: Parameters<typeof createMemo<T>>): SignalReader<T> {
          const sig = createMemo<T>(...args);
          unsubscribeSecondary.add(() => {
            destroySignal(sig);
          });
          return sig;
        },

        on(...args: Parameters<typeof on>): ReturnType<typeof on> {
          // @ts-ignore
          const unsub = on(...args);
          unsubscribeSecondary.add(unsub);
          return unsub;
        },

        once(...args: Parameters<typeof once>): ReturnType<typeof once> {
          // @ts-ignore
          const unsub = once(...args);
          unsubscribeSecondary.add(unsub);
          return unsub;
        },

        onDestroy(callback: () => any) {
          unsubscribePrimary.add(callback);
        },
      }),
    );

    if (this.logger.isInfo) {
      this.logger.info('create shadow-object', getDisplayName(constructor), {shadowObject, entity: entry.entity});
    }

    once(shadowObject, onDestroy, () => {
      if (this.logger.isInfo) {
        this.logger.info('destroy shadow-object', getDisplayName(constructor), {shadowObject, entity: entry.entity});
      }

      for (const callback of unsubscribePrimary) {
        callback();
      }

      for (const callback of unsubscribeSecondary) {
        callback();
      }

      for (const sig of contextReaders.values()) {
        destroySignal(sig);
      }

      for (const sig of propertyReaders.values()) {
        destroySignal(sig);
      }

      for (const sig of contextProviders.values()) {
        destroySignal(sig);
      }

      unsubscribePrimary.clear();
      unsubscribeSecondary.clear();
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
    on(entity, shadowObject);

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

    emit(shadowObject, onDestroy, entity);

    off(entity, shadowObject);
  }

  destroy(): void {
    for (const entity of this.traverseLevelOrderBFS().reverse()) {
      this.destroyEntity(entity.uuid);
    }
  }
}
