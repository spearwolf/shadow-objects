import {emit, eventize, off, on} from '@spearwolf/eventize';
import {batch} from '@spearwolf/signalize';
import {ComponentChangeType, MessageToView} from '../constants.js';
import type {
  ComponentPropertiesType,
  IComponentChangeType,
  IComponentEvent,
  ShadowObjectConstructor,
  ShadowObjectType,
  SyncEvent,
} from '../types.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {Entity} from './Entity.js';
import {type OnCreate, type OnDestroy, onCreate, onDestroy, onParentChanged} from './events.js';
import {Registry} from './Registry.js';
import {ShadowObjectCreationScope} from './ShadowObjectCreationScope.js';
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
   * The creation scope of a shadow-object, keyed by the shadow-object itself.
   *
   * `destroyShadowObject()` needs to reach the scope from the outside when a shadow-object leaves the
   * constructor set of an entity that stays alive. The scope removes its own entry when it tears down,
   * so nothing here outlives the shadow-object it belongs to.
   *
   * The key is the shadow-object instance, which assumes one instance per construction. A
   * constructor handing out the same instance twice — to a second entity, or to the same one
   * under another token — leaves only the later scope reachable from here; the earlier one
   * still tears down when its entity is destroyed.
   */
  readonly #shadowObjectScopes = new WeakMap<object, ShadowObjectCreationScope>();

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

    // A shadow-object constructor may address the kernel with the uuid of the entity being created --
    // `createEntity(child, token, entity.uuid)` and `setParent(other, entity.uuid)` both look that uuid
    // up in `#entities` -- so the entry has to stand while the constructors run. Everything past it
    // therefore runs under the rollback: a creation that does not get through leaves no entity behind.
    try {
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
    } catch (error) {
      this.#rollbackFailedCreation(uuid);
      throw error;
    }
  }

  /**
   * Takes back what a creation managed before it failed. The teardown is the regular one, so a
   * shadow-object that already stands hears its `onDestroy` and its creation scope ends the way
   * it would on any other destruction; the entry, the root registration and the link to the
   * parent go with it. `destroyEntity()` clears the bookkeeping of the entity whatever a callback
   * along the way does, so there is nothing left here to take back by hand; only a failure of the
   * teardown itself is reported, because the creation error is the one the caller is waiting for.
   *
   * The rollback reaches this one entity, not the kernel around it. What a constructor did to other
   * entities before it threw stands, and the teardown even adds to it, because `destroyEntity()` walks
   * the children list: an entity the constructor hung under this one survives as a root, and one it
   * moved under this one is taken off the parent it came from -- or destroyed outright, where it
   * carries `autoDestructionOnParentRemoval`. Both leave an entity in a state that is neither the one
   * before the call nor the one the constructor built. A rollback that covers those cases needs a
   * snapshot of the kernel, which this path does not take.
   */
  #rollbackFailedCreation(uuid: string): void {
    try {
      this.destroyEntity(uuid);
    } catch (error) {
      this.logger.error('rollback of a failed entity creation failed:', uuid, error);
    }
  }

  destroyEntity(uuid: string): void {
    const entry = this.#entities.get(uuid);
    if (entry === undefined) return;

    const {entity, usedConstructors} = entry;

    try {
      // Children with autoDestructionOnParentRemoval cascade; the rest are promoted
      // to root so they remain reachable instead of leaking inside the kernel.
      // Snapshot first because both branches mutate the children list.
      const childrenSnapshot = [...entity.children];
      for (const child of childrenSnapshot) {
        // One guard per child, so that a cascade breaking off somewhere below still leaves the
        // siblings next to it with the treatment they were owed.
        try {
          if (child.autoDestructionOnParentRemoval) {
            this.destroyEntity(child.uuid);
          } else {
            child.removeFromParent();
            this.#rootEntities.add(child.uuid);
          }
        } catch (error) {
          this.logger.error('child of a destroyed entity could not be handed on:', child.uuid, error);
        }
      }

      entity.removeFromParent();

      // The list is read before the first notification goes out, because the bookkeeping behind it is
      // emptied while they run: every scope that tears down takes its shadow-object out of it.
      const shadowObjects = this.findShadowObjects(entity.uuid);

      for (const shadowObject of shadowObjects) {
        // One shadow-object at a time rather than through the entity-wide notification below, so that
        // a teardown that throws costs its own shadow-object and none of its siblings. The
        // subscription comes off first, because that notification would otherwise reach the same
        // shadow-object a second time -- it hangs on the entity as a listener object.
        //
        // This is the one point at which the two teardown paths differ, and it is worth knowing which
        // way round: a shadow-object that emits an event on the entity from inside its `[onDestroy]`
        // does not reach its own siblings here, because they are taken off one by one as their turn
        // comes. `destroyShadowObject()` leaves the subscription in place until after the hook for
        // exactly the opposite reason -- there the entity lives on, so there is no second delivery to
        // avoid. An entity that is being destroyed is no address for an event either way.
        off(entity, shadowObject);
        this.#notifyShadowObjectDestroy(shadowObject, entity);
      }

      // What is left listening here are the creation scopes at `Priority.Low` and the entity itself at
      // `Priority.Min`: the scopes tear down once every shadow-object has been told, and the entity
      // releases its properties, subscriptions and contexts last of all.
      try {
        emit(entity, onDestroy, entity);
      } catch (error) {
        this.logger.error('entity onDestroy notification failed:', entity.uuid, error);
      }
    } finally {
      // The kernel lets go of the entity whatever the notifications above did, so that a failing
      // teardown cannot leave an entity standing that nothing points at any more.
      usedConstructors.clear();

      this.#entities.delete(entity.uuid);
      this.#rootEntities.delete(entity.uuid);
      this.#allEntitiesNeedUpdate = true;
    }
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

    // The new parent is resolved before the current one is detached: an unknown UUID throws, and
    // a throw after the detachment would leave the entity with no parent at all instead of the
    // one it came in with.
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
    const scope = new ShadowObjectCreationScope(entry.entity, this.logger, getDisplayName(construct));

    let shadowObject: ShadowObjectType;

    try {
      shadowObject = eventize(new construct(scope.createAPI()));
    } catch (error) {
      // Until `bindTo()` below has run, nothing else can reach this scope: it is in neither
      // `#shadowObjectScopes` nor the destroy subscription of the entity. A constructor that does
      // not return therefore ends its own scope here, or nobody does.
      scope.tearDown();
      throw error;
    }

    this.#shadowObjectScopes.set(shadowObject, scope);

    scope.bindTo(
      shadowObject,
      () => {
        this.#shadowObjectScopes.delete(shadowObject);
      },
      () => {
        const otherShadowObjects = entry.usedConstructors.get(construct);
        if (otherShadowObjects) {
          otherShadowObjects.delete(shadowObject);
          if (otherShadowObjects.size === 0) {
            entry.usedConstructors.delete(construct);
          }
        }
      },
    );

    // `entry.usedConstructors` tracks, per constructor, the set of shadow-objects it created.
    // `updateShadowObjects()` reads this bookkeeping to tell which shadow-objects belong to a
    // constructor that has left the entity's current constructor set, so it knows which ones to
    // tear down. An entry disappears from the set above when the tear-down of its shadow-object
    // runs, so this bookkeeping never outlives what it describes.
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

  /**
   * Tells one shadow-object that it is about to end, in both halves the notification has: the
   * class-side `[onDestroy]` hook and the event other objects can listen for.
   *
   * Each half stands behind a guard of its own rather than a shared one, because neither is allowed to
   * cost the other: a hook that throws still lets the event go out, and a listener that throws leaves
   * the hook it came after untouched. Nothing is re-thrown -- the shadow-objects of one entity reach
   * their end in one sweep, and a failure at one of them may not take the sweep with it. Reports are
   * keyed by the name the scope carries rather than the one the instance would give -- see
   * `ShadowObjectCreationScope.displayName` for where the two part ways.
   */
  #notifyShadowObjectDestroy(shadowObject: object, entity: Entity): void {
    const displayName = this.#shadowObjectScopes.get(shadowObject)?.displayName;

    if (typeof (shadowObject as any)[onDestroy] === 'function') {
      try {
        (shadowObject as OnDestroy)[onDestroy](entity);
      } catch (error) {
        this.logger.error('shadow-object onDestroy hook failed:', displayName, error);
      }
    }

    // A listener a Shadow Object put directly on this one's own `onDestroy` notification -- through
    // `on(otherShadowObject, onDestroy, …)` -- runs here.
    try {
      emit(shadowObject, onDestroy, entity);
    } catch (error) {
      this.logger.error('shadow-object onDestroy notification failed:', displayName, error);
    }
  }

  private destroyShadowObject(shadowObject: object, entity: Entity): void {
    this.#notifyShadowObjectDestroy(shadowObject, entity);

    // The teardown runs after the destroy notifications, so a shadow-object that reacts to its own
    // end still sees the signals, contexts and subscriptions the creation API gave it.
    this.#shadowObjectScopes.get(shadowObject)?.tearDown();

    // Last of all, because the entity lives on and only this one object is leaving: nothing else is
    // being delivered to the entity in the meantime, so the subscription can stand until the object
    // has said everything it had to say -- an event its `[onDestroy]` emits on the entity still comes
    // back to it. `destroyEntity()` cannot afford that; the reason is named there.
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
    // Leaves first, and to the end. `destroyEntity()` keeps a failing callback to itself, so the guard
    // here covers what is left: whatever else fails at one entity, the ones behind it in the sweep still
    // reach their own teardown. The reversed order is already cached, so the walk does not turn its own
    // result around.
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