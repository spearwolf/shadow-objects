import {emit, eventize, off, on, once, Priority} from '@spearwolf/eventize';
import {
  batch,
  type CompareFunc,
  createEffect,
  createMemo,
  createSignal,
  destroySignal,
  isSignal,
  link,
  type Signal,
  type SignalReader,
} from '@spearwolf/signalize';
import {ComponentChangeType, MessageToView} from '../constants.js';
import type {
  ComponentPropertiesType,
  IComponentChangeType,
  IComponentEvent,
  Maybe,
  ProvideContextOptions,
  ShadowObjectConstructor,
  ShadowObjectType,
  SignalValueOptions,
  SyncEvent,
} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {toMaybe} from '../utils/toMaybe.js';
import {Entity} from './Entity.js';
import {type OnCreate, type OnDestroy, onCreate, onDestroy, onParentChanged, onViewEvent} from './events.js';
import {Registry} from './Registry.js';
import {SignalsPath} from './SignalsPath.js';

export interface MessageToViewEvent {
  uuid: string;
  type: string;
  data?: unknown;
  transferables?: Transferable[];
  traverseChildren?: boolean;
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

const getDisplayName = (construct: ShadowObjectConstructor) => construct.displayName || construct.name;

let provideContextOptionsDeprecatedShown = false;
let provideGlobalContextOptionsDeprecatedShown = false;
let useContextOptionsDeprecatedShown = false;
let useParentContextOptionsDeprecatedShown = false;
let usePropertyOptionsDeprecatedShown = false;

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

  #allEntities: Entity[] = [];
  #allEntitiesReversed: Entity[] = [];
  #allEntitiesNeedUpdate = true;

  #rootContexts: Map<string | symbol, SignalsPath> = new Map();

  /**
   * The teardown of a shadow-object, keyed by the shadow-object itself.
   *
   * `constructShadowObject()` builds the teardown as a closure over everything the creation API
   * handed out; `destroyShadowObject()` needs to reach it from the outside when a shadow-object
   * leaves the constructor set of an entity that stays alive. The teardown removes its own entry,
   * so nothing here outlives the shadow-object it belongs to.
   *
   * The key is the shadow-object instance, which assumes one instance per construction. A
   * constructor handing out the same instance twice — to a second entity, or to the same one
   * under another token — leaves only the later teardown reachable from here; the earlier one
   * still runs when its entity is destroyed.
   */
  readonly #shadowObjectTearDowns = new WeakMap<object, () => void>();

  constructor(registry?: Registry) {
    eventize(this);
    this.registry = Registry.get(registry);
  }

  getEntity(uuid: string): Entity {
    return this.#requireEntry(uuid).entity;
  }

  /**
   * The entity behind a uuid, or `undefined` when the kernel does not hold one.
   *
   * The counterpart to `getEntity()`, which throws. Which of the two a caller wants follows from what an
   * absent entity means to it: a change that describes the entity tree -- a new parent, a new order, new
   * properties -- names an entity the view believes to be there, and a uuid the kernel does not know is a
   * disagreement the caller has to hear about. An event is the other case: it carries no structure, and the
   * entity it was meant for may have been torn down between the two sides.
   */
  findEntity(uuid: string): Entity | undefined {
    return this.#entities.get(uuid)?.entity;
  }

  /**
   * The entry for an entity that is expected to exist.
   *
   * The uuid is the caller's responsibility: `getEntity()` hands the throw on to its own
   * callers, and `updateShadowObjects()` is reached only for an entity the caller has just
   * confirmed. Failing here names the uuid instead of failing later on an undefined field.
   */
  #requireEntry(uuid: string): EntityEntry {
    const entry = this.#entities.get(uuid);
    if (entry === undefined) {
      throw new Error(`entity with uuid "${uuid}" not found!`);
    }
    return entry;
  }

  hasEntity(uuid: string): boolean {
    return this.#entities.has(uuid);
  }

  /**
   * @returns all entities in breadth-first order
   *
   * The list belongs to the caller: sorting or reversing it changes nothing about what the next call
   * hands out. The walk behind it visits every entity once, which also carries it over a children list
   * that points back at an ancestor -- `Entity.addChild()` writes such a list without touching the parent
   * link, so no check along the parent chain can cover it.
   */
  traverseLevelOrderBFS(reverse = false): Entity[] {
    if (this.#allEntitiesNeedUpdate) {
      const lvl = new Map<number, Entity[]>();
      const visited = new Set<string>();

      const traverse = (uuid: string, depth: number) => {
        if (visited.has(uuid)) return;
        visited.add(uuid);

        const e = this.getEntity(uuid);

        const entities = lvl.get(depth);
        if (entities) {
          entities.push(e);
        } else {
          lvl.set(depth, [e]);
        }

        for (const child of e.children) {
          traverse(child.uuid, depth + 1);
        }
      };

      this.#rootEntities.forEach((uuid) => {
        traverse(uuid, 0);
      });

      this.#allEntities = Array.from(lvl.entries())
        .sort((a, b) => a[0] - b[0])
        .flatMap(([, entities]) => entities);

      this.#allEntitiesReversed = this.#allEntities.slice().reverse();
      this.#allEntitiesNeedUpdate = false;
    }

    return reverse ? this.#allEntitiesReversed.slice() : this.#allEntities.slice();
  }

  /**
   * The entity tree as nested nodes, one node per entity. The visited set is what makes that count
   * hold: a children list that points back at an ancestor would otherwise be walked forever, and this
   * is the one traversal a caller reaches for while debugging a tree that is already broken.
   */
  getEntityGraph(): EntityGraphNode[] {
    const visited = new Set<string>();
    return Array.from(this.#rootEntities)
      .map((uuid) => this.getEntityGraphNode(uuid, visited))
      .filter((node) => node !== undefined);
  }

  private getEntityGraphNode(uuid: string, visited: Set<string>): EntityGraphNode | undefined {
    if (visited.has(uuid)) return undefined;
    visited.add(uuid);

    const entry = this.#entities.get(uuid);
    if (entry === undefined) return undefined;

    const {token, entity} = entry;
    return {
      token,
      entity,
      props: Object.fromEntries(entity.propEntries()),
      // A node the kernel no longer holds drops out of the graph.
      children: entity.children.map((child) => this.getEntityGraphNode(child.uuid, visited)).filter((node) => node !== undefined),
    };
  }

  upgradeEntities(): void {
    const entityConstructors = new Map<string, Set<ShadowObjectConstructor>>();

    // Both loops walk a snapshot of the entity tree, and a lifecycle callback is free to destroy
    // an entity while the upgrade is running. An entry from the snapshot can therefore be gone by
    // the time its turn comes: it needs no upgrade, and the entities behind it still do.
    for (const entity of this.traverseLevelOrderBFS(true)) {
      if (!this.hasEntity(entity.uuid)) continue;
      entityConstructors.set(entity.uuid, this.updateShadowObjects(entity.uuid, ShadowObjectAction.DestroyOnly));
    }

    for (const entity of this.traverseLevelOrderBFS(false)) {
      if (!this.hasEntity(entity.uuid)) continue;
      this.updateShadowObjects(entity.uuid, ShadowObjectAction.JustCreate, entityConstructors.get(entity.uuid));
    }

    entityConstructors.clear();
  }

  run(event: SyncEvent): void {
    if (this.logger.isDebug) {
      this.logger.debug('sync', event);
    }
    batch(() => {
      for (const entry of event.changeTrail) {
        this.parse(entry);
      }
    });
  }

  private parse(entry: IComponentChangeType): void {
    switch (entry.type) {
      case ComponentChangeType.CreateEntities:
        this.createEntity(
          entry.uuid,
          entry.token,
          entry.parentUuid,
          entry.order,
          entry.properties,
          entry.autoDestructionOnParentRemoval,
        );
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

  createEntity(
    uuid: string,
    token: string,
    parentUuid?: string,
    order = 0,
    properties?: ComponentPropertiesType,
    autoDestructionOnParentRemoval = false,
  ): void {
    const e = new Entity(this, uuid);

    e.order = order;

    const entry: EntityEntry = {token, entity: e, usedConstructors: new Map()};

    this.#entities.set(uuid, entry);

    if (parentUuid) {
      e.parentUuid = parentUuid;
    }

    e.autoDestructionOnParentRemoval = autoDestructionOnParentRemoval;

    if (!e.hasParent) {
      this.#rootEntities.add(uuid);
    }

    if (properties) {
      e.setProperties(properties);
    }

    this.createShadowObjects(entry);
  }

  destroyEntity(uuid: string): void {
    const entry = this.#entities.get(uuid);
    if (entry === undefined) return;

    const {entity, usedConstructors} = entry;

    // Children with autoDestructionOnParentRemoval cascade; the rest are promoted
    // to root so they remain reachable instead of leaking inside the kernel.
    // Snapshot first because both branches mutate the children list.
    const childrenSnapshot = [...entity.children];
    for (const child of childrenSnapshot) {
      if (child.autoDestructionOnParentRemoval) {
        this.destroyEntity(child.uuid);
      } else {
        child.removeFromParent();
        this.#rootEntities.add(child.uuid);
      }
    }

    entity.removeFromParent();
    emit(entity, onDestroy, entity);

    usedConstructors.clear();

    this.#entities.delete(entity.uuid);
    this.#rootEntities.delete(entity.uuid);
    this.#allEntitiesNeedUpdate = true;
  }

  /**
   * @param order the new order, or `undefined` to keep the current one. A set-parent change
   *   only carries an order when it actually changed, so an absent order must not be read as
   *   a reset to `0` — that would silently drop the order the view side still holds.
   */
  setParent(uuid: string, parentUuid?: string, order?: number): void {
    const e = this.getEntity(uuid);

    const nextOrder = order ?? e.order;

    if (e.parentUuid === parentUuid && e.order === nextOrder) return;

    // Validate the new parent before detaching the current one, so a bad UUID
    // never leaves the entity orphaned (KERN-5).
    if (parentUuid && !this.#entities.has(parentUuid)) {
      throw new Error(`entity with uuid "${parentUuid}" not found!`);
    }

    // Before the detachment as well, and for the same reason: a parent that would close the entity
    // tree into a ring is refused while the entity still hangs where it was.
    if (parentUuid) {
      e.assertAttachableTo(this.getEntity(parentUuid));
    }

    // The detachment is what places the entity anew, which is the point of a call that keeps the
    // parent and changes the order alone. It skips the rebinding of the contexts whenever a parent
    // follows right away -- that parent binds them, and the root value in between would be visible
    // to every `useParentContext()` reader on the entity.
    e.removeFromParent(parentUuid == null);

    e.order = nextOrder;
    e.parentUuid = parentUuid;

    if (e.hasParent) {
      this.#rootEntities.delete(uuid);
    } else {
      this.#rootEntities.add(uuid);
    }

    queueMicrotask(() => {
      if (this.logger.isDebug) {
        this.logger.debug('entity.onParentChanged', {uuid, parentUuid, order: nextOrder, entity: e});
      }
      emit(e, onParentChanged, e);
    });
  }

  updateOrder(uuid: string, order: number): void {
    this.getEntity(uuid).order = order;
  }

  dispatchEventsToEntity(uuid: string, events: IComponentEvent[]): void {
    this.findEntity(uuid)?.dispatchViewEvents(events);
  }

  changeProperties(uuid: string, properties: ComponentPropertiesType): void {
    this.getEntity(uuid).setProperties(properties);
    this.updateShadowObjects(uuid);
  }

  changeToken(uuid: string, token: string): void {
    const entry = this.#entities.get(uuid);
    if (entry === undefined) return;

    if (entry.token === token) return;

    entry.token = token;

    this.updateShadowObjects(uuid);
  }

  dispatchMessageToView(message: MessageToViewEvent): void {
    queueMicrotask(() => {
      emit(this as Kernel, MessageToView, message);
    });
  }

  /**
   * Create or destroy the shadow-objects of an entity using the registered constructors.
   * After a token change or registry changes, an entity may be given different shadow-objects.
   */
  private updateShadowObjects(
    uuid: string,
    action = ShadowObjectAction.CreateAndDestroy,
    nextConstructors?: Set<ShadowObjectConstructor>,
  ): Set<ShadowObjectConstructor> {
    const entry = this.#requireEntry(uuid);
    nextConstructors ??= new Set(this.registry.findConstructors(entry.token, entry.entity.truthyProps()));

    const shouldDestroy = action === ShadowObjectAction.CreateAndDestroy || action === ShadowObjectAction.DestroyOnly;
    const shouldCreate = action === ShadowObjectAction.CreateAndDestroy || action === ShadowObjectAction.JustCreate;

    // destroy all shadow-objects created by constructors no longer in the list
    //
    if (shouldDestroy) {
      for (const [construct, shadowObjects] of entry.usedConstructors) {
        if (!nextConstructors.has(construct)) {
          entry.usedConstructors.delete(construct);
          for (const obj of shadowObjects) {
            this.destroyShadowObject(obj, entry.entity);
          }
        }
      }
    }

    // shadow-objects for new constructors are now created using the updated constructor list
    //
    if (shouldCreate) {
      for (const construct of nextConstructors) {
        if (!entry.usedConstructors.has(construct)) {
          this.constructShadowObject(construct, entry);
        }
      }
    }

    return nextConstructors;
  }

  private constructShadowObject(construct: ShadowObjectConstructor, entry: EntityEntry): ShadowObjectType {
    const unsubscribePrimary = new Set<() => any>();
    const unsubscribeSecondary = new Set<() => any>();

    const contextReaders = new Map<string | symbol, SignalReader<any>>();
    const contextReaderCompares = new Map<string | symbol, CompareFunc<any> | undefined>();
    const contextParentReaders = new Map<string | symbol, SignalReader<any>>();
    const contextParentReaderCompares = new Map<string | symbol, CompareFunc<any> | undefined>();
    const contextProviders = new Map<string | symbol, Signal<any>>();
    const contextRootProviders = new Map<string | symbol, Signal<any>>();

    const propertyReaders = new Map<string, SignalReader<any>>();
    const propertyCompares = new Map<string, CompareFunc<any> | undefined>();

    const getUseProperty = <T = any>(
      name: string,
      options?: SignalValueOptions<T> | CompareFunc<T | undefined>,
    ): SignalReader<Maybe<T>> => {
      if (!usePropertyOptionsDeprecatedShown && options != null && typeof options === 'function') {
        console.warn(
          '[shadow-objects] Deprecation Warning: The "isEqual" option of "useProperty()" is now passed as {compare} argument. Please update your code accordingly.',
        );
        usePropertyOptionsDeprecatedShown = true;
      }

      const opts = typeof options === 'function' ? {compare: options} : options;

      let propReader = propertyReaders.get(name);

      if (propReader === undefined) {
        propReader = createSignal<any>(undefined, opts).get;
        propertyReaders.set(name, propReader);
        propertyCompares.set(name, opts?.compare);
        const con = link(entry.entity.getPropertyReader(name), propReader);
        unsubscribeSecondary.add(con.destroy.bind(con));
      } else if (opts?.compare != null && propertyCompares.get(name) !== opts.compare) {
        console.warn(
          `[shadow-objects] useProperty("${name}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per property.`,
        );
      }

      return propReader;
    };

    const shadowObject = eventize(
      new construct({
        entity: entry.entity,

        provideContext<T = unknown>(
          name: string | symbol,
          sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
          options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
        ) {
          if (!provideContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
            console.warn(
              '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideContext()" is now passed as {compare} argument. Please update your code accordingly.',
            );
            provideContextOptionsDeprecatedShown = true;
          }

          const opts = typeof options === 'function' ? {compare: options} : options;

          let ctxProvider = contextProviders.get(name);

          if (ctxProvider == null) {
            const isSig = isSignal(sourceOrInitialValue);
            const initialValue = isSig ? undefined : toMaybe(sourceOrInitialValue as T);

            ctxProvider = createSignal(initialValue, opts?.compare ? {compare: opts.compare} : undefined);

            if (isSig) {
              const ln = link(sourceOrInitialValue as SignalReader<T>, ctxProvider);
              unsubscribeSecondary.add(ln.destroy.bind(ln));
            }

            const ln = link(ctxProvider, entry.entity.provideContext(name));
            unsubscribeSecondary.add(ln.destroy.bind(ln));
            contextProviders.set(name, ctxProvider);
          }

          if (ctxProvider != null && (opts?.clearOnDestroy ?? true)) {
            unsubscribeSecondary.add(() => {
              ctxProvider.set(undefined);
            });
          }

          return ctxProvider;
        },

        provideGlobalContext<T = unknown>(
          name: string | symbol,
          sourceOrInitialValue?: T | SignalReader<T> | SignalReader<T | undefined>,
          options?: ProvideContextOptions<T> | CompareFunc<T | undefined>,
        ) {
          if (!provideGlobalContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
            console.warn(
              '[shadow-objects] Deprecation Warning: The "isEqual" option of "provideGlobalContext()" is now passed as {compare} argument. Please update your code accordingly.',
            );
            provideGlobalContextOptionsDeprecatedShown = true;
          }

          const opts = typeof options === 'function' ? {compare: options} : options;

          let ctxProvider = contextRootProviders.get(name);

          if (ctxProvider == null) {
            const isSig = isSignal(sourceOrInitialValue);
            const initialValue = isSig ? undefined : toMaybe(sourceOrInitialValue as T);

            ctxProvider = createSignal(initialValue, opts?.compare ? {compare: opts.compare} : undefined);

            if (isSig) {
              const ln = link(sourceOrInitialValue as SignalReader<T>, ctxProvider);
              unsubscribeSecondary.add(ln.destroy.bind(ln));
            }

            const ln = link(ctxProvider, entry.entity.provideGlobalContext(name));
            unsubscribeSecondary.add(ln.destroy.bind(ln));
            contextRootProviders.set(name, ctxProvider);
          }

          if (ctxProvider != null && (opts?.clearOnDestroy ?? true)) {
            unsubscribeSecondary.add(() => {
              ctxProvider.set(undefined);
            });
          }

          return ctxProvider;
        },

        useContext<T = unknown>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>) {
          if (!useContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
            console.warn(
              '[shadow-objects] Deprecation Warning: The "isEqual" option of "useContext()" is now passed as {compare} argument. Please update your code accordingly.',
            );
            useContextOptionsDeprecatedShown = true;
          }

          const opts = typeof options === 'function' ? {compare: options} : options;

          let ctxReader = contextReaders.get(name);

          if (ctxReader === undefined) {
            ctxReader = createSignal<any>(undefined, opts).get;
            contextReaders.set(name, ctxReader);
            contextReaderCompares.set(name, opts?.compare);
            const ln = link(entry.entity.useContext(name), ctxReader);
            unsubscribeSecondary.add(ln.destroy.bind(ln));
          } else if (opts?.compare != null && contextReaderCompares.get(name) !== opts.compare) {
            console.warn(
              `[shadow-objects] useContext("${String(name)}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per context.`,
            );
          }

          return ctxReader;
        },

        useParentContext<T = unknown>(name: string | symbol, options?: SignalValueOptions<T> | CompareFunc<T | undefined>) {
          if (!useParentContextOptionsDeprecatedShown && options != null && typeof options === 'function') {
            console.warn(
              '[shadow-objects] Deprecation Warning: The "isEqual" option of "useParentContext()" is now passed as {compare} argument. Please update your code accordingly.',
            );
            useParentContextOptionsDeprecatedShown = true;
          }

          const opts = typeof options === 'function' ? {compare: options} : options;

          let ctxReader = contextParentReaders.get(name);

          if (ctxReader === undefined) {
            ctxReader = createSignal<any>(undefined, opts).get;
            contextParentReaders.set(name, ctxReader);
            contextParentReaderCompares.set(name, opts?.compare);
            const ln = link(entry.entity.useParentContext(name), ctxReader);
            unsubscribeSecondary.add(ln.destroy.bind(ln));
          } else if (opts?.compare != null && contextParentReaderCompares.get(name) !== opts.compare) {
            console.warn(
              `[shadow-objects] useParentContext("${String(name)}"): the cached signal already exists with a different (or no) {compare} function — the new options are ignored. Pass options only on the first call per parent context.`,
            );
          }

          return ctxReader;
        },

        dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren = false) {
          entry.entity.dispatchMessageToView(type, data, transferables, traverseChildren);
        },

        useProperty: getUseProperty,

        useProperties<T extends Record<string, unknown> = Record<string, unknown>>(
          props: {[K in keyof T]: string},
        ): {
          [K in keyof T]: SignalReader<Maybe<T[K]>>;
        } {
          const result = {} as {[K in keyof T]: SignalReader<Maybe<T[K]>>};
          for (const key in props) {
            if (Object.hasOwn(props, key)) {
              result[key] = getUseProperty(props[key]);
            }
          }
          return result;
        },

        createResource<T = unknown>(
          factory: () => T | undefined,
          cleanup?: (resource: NonNullable<T>) => unknown,
        ): Signal<Maybe<T>> {
          const resourceSignal = createSignal<Maybe<T>>();

          const effect = createEffect(() => {
            const resource = toMaybe(factory());
            resourceSignal.set(resource);

            if (resource !== undefined && cleanup) {
              return () => {
                cleanup(resource);
                resourceSignal.set(undefined);
              };
            }

            return () => {
              resourceSignal.set(undefined);
            };
          });

          unsubscribeSecondary.add(() => {
            effect.destroy();
            resourceSignal.set(undefined);
            destroySignal(resourceSignal);
          });

          return resourceSignal;
        },

        createEffect(...args: any[]): ReturnType<typeof createEffect> {
          // @ts-ignore
          const effect = createEffect(...args);
          unsubscribeSecondary.add(effect.destroy);
          return effect;
        },

        createSignal(...args: any[]): any {
          // @ts-ignore
          const sig = createSignal(...args);
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

        on(...args: any[]): ReturnType<typeof on> {
          const [firstArg] = args;
          if (typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)) {
            // @ts-ignore
            const unsub = on(entry.entity, ...args);
            unsubscribeSecondary.add(unsub);
            return unsub;
          }
          // @ts-ignore
          const unsub = on(...args);
          unsubscribeSecondary.add(unsub);
          // return unsub;
          return Object.assign(() => {
            unsubscribeSecondary.delete(unsub);
            unsub();
          }, unsub);
        },

        once(...args: any[]): ReturnType<typeof once> {
          const [firstArg] = args;
          if (typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)) {
            // @ts-ignore
            const unsub = once(entry.entity, ...args);
            unsubscribeSecondary.add(unsub);
            return unsub;
          }
          // @ts-ignore
          const unsub = once(...args);
          unsubscribeSecondary.add(unsub);
          // return unsub;
          return Object.assign(() => {
            unsubscribeSecondary.delete(unsub);
            unsub();
          }, unsub);
        },

        emit(...args: any[]): void {
          const [firstArg] = args;
          if (typeof firstArg === 'string' || typeof firstArg === 'symbol' || Array.isArray(firstArg)) {
            // @ts-ignore
            emit(entry.entity, ...args);
          } else {
            // @ts-ignore
            emit(...args);
          }
        },

        onViewEvent(callback: (type: string, data: unknown) => any) {
          const unsub = on(entry.entity, onViewEvent, (type: string, data: unknown) => {
            callback(type, data);
          });
          unsubscribeSecondary.add(unsub);
        },

        onDestroy(callback: () => any) {
          unsubscribePrimary.add(callback);
        },
      }),
    );

    if (this.logger.isInfo) {
      this.logger.info('create shadow-object', getDisplayName(construct), {shadowObject, entity: entry.entity});
    }

    // A shadow-object reaches its end on two independent paths: the entity is destroyed, or the
    // shadow-object leaves the constructor set of a still living entity (token or route change).
    // Both run the same teardown, and each path reaches it through a handle of its own.
    let unsubscribeFromEntityDestroy: (() => void) | undefined;

    const tearDown = () => {
      // Both handles on this closure are released before anything else runs, which is what makes
      // the teardown a one-time act: a destroy callback reaching back into the kernel finds no way
      // to start it a second time. Releasing them also ends the retention in both directions --
      // the map entry points from the shadow-object to a closure holding the entity, and the
      // subscription points from the entity to the same closure.
      this.#shadowObjectTearDowns.delete(shadowObject);
      unsubscribeFromEntityDestroy?.();

      if (this.logger.isInfo) {
        this.logger.info('destroy shadow-object', getDisplayName(construct), {shadowObject, entity: entry.entity});
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

      for (const sig of contextParentReaders.values()) {
        destroySignal(sig);
      }

      for (const sig of propertyReaders.values()) {
        destroySignal(sig);
      }

      for (const sig of contextProviders.values()) {
        destroySignal(sig);
      }

      for (const sig of contextRootProviders.values()) {
        destroySignal(sig);
      }

      unsubscribePrimary.clear();
      unsubscribeSecondary.clear();
      contextReaders.clear();
      contextParentReaders.clear();
      propertyReaders.clear();
      contextProviders.clear();
      contextRootProviders.clear();

      const otherShadowObjects = entry.usedConstructors.get(construct);
      if (otherShadowObjects) {
        otherShadowObjects.delete(shadowObject);
        if (otherShadowObjects.size === 0) {
          entry.usedConstructors.delete(construct);
        }
      }
    };

    unsubscribeFromEntityDestroy = once(entry.entity, onDestroy, Priority.Low, tearDown);

    this.#shadowObjectTearDowns.set(shadowObject, tearDown);

    // We want to keep track which shadow-objects are created by which constructors.
    // This will all
    //
    const createdBy = entry.usedConstructors.get(construct);
    if (createdBy) {
      createdBy.add(shadowObject);
    } else {
      entry.usedConstructors.set(construct, new Set([shadowObject]));
    }

    this.attachShadowObject(shadowObject, entry.entity);

    return shadowObject;
  }

  private createShadowObjects(entry: EntityEntry): void {
    this.registry.findConstructors(entry.token, entry.entity.truthyProps())?.forEach((construct) => {
      this.constructShadowObject(construct, entry);
    });
  }

  findShadowObjects(uuid: string): ShadowObjectType[] {
    const entry = this.#entities.get(uuid);
    if (entry === undefined) return [];

    const {usedConstructors} = entry;

    return Array.from(new Set(Array.from(usedConstructors.values()).flatMap((objs) => Array.from(objs))));
  }

  private attachShadowObject(shadowObject: object, entity: Entity): void {
    // Like all other objects, the new shadow-object should be able to respond to the events that the entity receives.
    //
    on(entity, shadowObject);

    // Finally, the `shadowObject.onCreate(entity)` callback is called on the shadow-object.
    //
    if (typeof (shadowObject as any)[onCreate] === 'function') {
      (shadowObject as OnCreate)[onCreate](entity);
    }
  }

  private destroyShadowObject(shadowObject: object, entity: Entity): void {
    if (typeof (shadowObject as any)[onDestroy] === 'function') {
      (shadowObject as OnDestroy)[onDestroy](entity);
    }

    emit(shadowObject, onDestroy, entity);

    // The teardown runs after the destroy notifications, so a shadow-object that reacts to its own
    // end still sees the signals, contexts and subscriptions the creation API gave it.
    this.#shadowObjectTearDowns.get(shadowObject)?.();

    off(entity, shadowObject);
  }

  findOrCreateRootContext(name: string | symbol): SignalsPath {
    let ctx = this.#rootContexts.get(name);
    if (!ctx) {
      ctx = new SignalsPath();
      this.#rootContexts.set(name, ctx);
    }
    return ctx;
  }

  destroy(): void {
    // Leaves first, and to the end: a callback that throws costs its own entity, not the ones behind it
    // in the sweep. The reversed order is already cached, so the walk does not turn its own result around.
    for (const entity of this.traverseLevelOrderBFS(true)) {
      try {
        this.destroyEntity(entity.uuid);
      } catch (error) {
        this.logger.error('entity teardown failed:', entity.uuid, error);
      }
    }

    // Whatever a failing callback left half torn down, the kernel holds none of it afterwards.
    this.#entities.clear();
    this.#rootEntities.clear();
    this.#allEntitiesNeedUpdate = true;

    // After the entities, not before: a shadow-object callback that reads a global context during its
    // teardown reaches the path the kernel held, not a fresh empty one.
    for (const ctx of this.#rootContexts.values()) {
      ctx.dispose();
    }
    this.#rootContexts.clear();
  }
}