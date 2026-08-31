import {ChangeTrailPhase, ComponentChangeType, VoidToken} from '../constants.js';
import type {
  ComponentPropertiesType,
  IChangeToken,
  IComponentChangeType,
  IComponentEvent,
  ICreateEntitiesChange,
  IDestroyEntitiesChange,
  IPropertiesChange,
  ISendEvents,
  ISetParentChange,
  IUpdateOrderChange,
} from '../types.js';
import {appendToEnd, removeFrom} from '../utils/array-utils.js';

const ROOT = '#root';

/**
 * The value a property carries in this bookkeeping when it is set without one — the third form
 * of {@link ComponentPropertiesType}, which travels as a one-element `[key]`. `undefined`
 * cannot say it: that is what a removal reads as, and the two have to stay apart all the way
 * to the entry.
 *
 * It never leaves the View Layer. A change trail runs through `structuredClone()` on its way
 * to a worker, and a symbol on that wire is a `DataCloneError` — so every method that builds
 * an entry turns it back into the one-element form, and the one reader outside this class,
 * `ComponentContext.transferPropertiesTo()`, tests for it before it hands a value on.
 */
export const PropertyWithoutValue = Symbol('shadow-objects/property-without-value');

/**
 * Tracks one component's outstanding changes between two change trails as four written ↔
 * pending pairs: `#token`/`#nextToken`, `#parentUuid`/`#nextParentUuid`, `#order`/`#nextOrder`
 * and `#properties`/`#nextProperties`. The `make*` methods read the pending half and leave it
 * where it is: a trail entry is a request, and until the Shadow Environment has applied it the
 * change is still owed. {@link ComponentChanges.commitChange} is what moves the line — it folds
 * one applied entry into the written half and releases exactly the pending values that entry
 * carried, so a value that changed again while the entry was on its way goes out with the next
 * trail instead of being lost.
 *
 * Whether anything is outstanding follows from those pairs rather than from a counter, which is
 * what lets a partly applied trail leave the rest of the component untouched.
 *
 * The create/destroy counts behind {@link ComponentChanges.isCreated} and {@link
 * ComponentChanges.isDestroyed} belong to the uuid, not to a {@link ViewComponent} instance. They
 * carry the rule {@link ComponentContext.addComponent} keeps: a uuid names one component of a
 * {@link ComponentContext} at a time, so a later component takes this bookkeeping over only once its predecessor
 * has counted its own `destroy()`. A count pair that outlives its component therefore describes an
 * entity, and the successor on that uuid continues the same entity rather than starting a second.
 */
export class ComponentChanges {
  readonly #uuid: string;

  get uuid(): string {
    return this.#uuid;
  }

  constructor(uuid: string) {
    this.#uuid = uuid;
  }

  #isNew = true;
  #createCount = 0;
  #destroyCount = 0;

  /**
   * Whether this component owes the next change trail anything: a creation, a destruction, or a
   * pending value in one of the four written ↔ pending pairs.
   */
  hasChanges(): boolean {
    return (
      (this.#isNew && this.isCreated) ||
      this.isDestroyed ||
      (this.#nextToken !== undefined && this.#nextToken !== this.#token) ||
      this.#hasPendingParent() ||
      (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) ||
      this.#propsChangeOrder.length > 0 ||
      this.#events.length > 0
    );
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  get isCreated(): boolean {
    return this.#createCount > 0 && this.#createCount > this.#destroyCount;
  }

  get isDestroyed(): boolean {
    return this.#destroyCount > 0 && this.#destroyCount >= this.#createCount;
  }

  #token: string = VoidToken;
  #parentUuid?: string | undefined;
  #order: number = 0;
  #autoDestructionOnParentRemoval = false;

  #nextToken?: string | undefined;
  #nextParentUuid?: string | undefined;
  #nextOrder?: number | undefined;

  create(token: string = VoidToken, parentUuid?: string, order: number = 0, autoDestructionOnParentRemoval = false) {
    this.#createCount++;

    this.#nextToken = token;
    this.#nextParentUuid = parentUuid ?? ROOT;
    this.#nextOrder = !order ? undefined : order;
    this.#autoDestructionOnParentRemoval = autoDestructionOnParentRemoval;
  }

  destroy() {
    this.#destroyCount++;
  }

  /**
   * Whether the pending parent asks for something the confirmed one is not already. A pending
   * value that has come back to the confirmed parent is a change that cancelled itself out.
   */
  #hasPendingParent(): boolean {
    if (this.#nextParentUuid === undefined) return false;
    return (this.#nextParentUuid === ROOT ? undefined : this.#nextParentUuid) !== this.#parentUuid;
  }

  /**
   * Drop every pending value without writing any of them forward.
   *
   * This is the way out for a component whose bookkeeping is about to be replaced wholesale —
   * {@link ComponentContext.reCreateChanges} does exactly that. A trail that has gone out is
   * settled with {@link ComponentChanges.commitChange} instead.
   */
  clear() {
    this.#nextToken = undefined;
    this.#nextParentUuid = undefined;
    this.#nextOrder = undefined;

    this.#nextProperties.clear();
    this.#propsChangeOrder.length = 0;
    this.#travellingProperties = undefined;

    this.#events.length = 0;
    this.#transferables.clear();
  }

  /**
   * The three scalar pairs below all answer the same question the same way: is anything owed once
   * the entry that is on its way out has landed?
   *
   * The written half alone cannot answer it. It is the last *confirmed* value and stays behind
   * until the entry is committed, so a value the caller sets back to it while the entry travels
   * would look like "nothing to do" — and the entry would then be the last word, leaving the
   * Shadow Environment holding a value the view has already moved on from. So the pending half is
   * only released where there is nothing in flight to contradict it; where there is, the new value
   * takes the pending slot and the emitting side decides, against the written half it settles on.
   */
  changeToken(token: string | undefined) {
    // an absent token means the void token everywhere else, so normalize here too;
    // otherwise `undefined` would mark the component dirty without ever emitting a change
    token ??= VoidToken;

    // nothing pending and the confirmed token is the wanted one: nothing to queue. A component
    // that has not been flushed yet is the exception — it still owes the trail its create-token,
    // and dropping it here would emit a CreateEntities change without any token at all.
    if (token === this.#token && this.#nextToken === undefined && !this.#isNew) return;

    this.#nextToken = token;
  }

  setParent(parentUuid?: string) {
    const nextParentUuid = parentUuid ?? ROOT;

    if (nextParentUuid === (this.#parentUuid ?? ROOT) && this.#nextParentUuid === undefined) return;

    this.#nextParentUuid = nextParentUuid;
  }

  changeOrder(order: number) {
    if (order === this.#order && this.#nextOrder === undefined) return;

    this.#nextOrder = order;
  }

  #properties: Map<string, unknown> = new Map();
  #nextProperties: Map<string, unknown> = new Map();
  #propsChangeOrder: string[] = []; // we use an Array here and not a Set, because we want to keep the change order

  /**
   * The keys an entry on its way out carries, until that entry is settled. For those keys the
   * written half is behind, and {@link ComponentChanges.changeProperty} must not cancel against it.
   */
  #travellingProperties?: Map<string, unknown> | undefined;

  /**
   * @returns `true` if the value differs from the last value this component asked for
   */
  changeProperty<T = unknown>(key: string, value: T, isEqual?: (a: T, b: T) => boolean): boolean {
    const equals = (a: T, b: T) =>
      // a registered rule compares values, and the marker is not one -- handed to it, a rule
      // would be asked about a property it never saw, and one that reaches into its arguments
      // throws on a symbol. Where either side is the marker the only question left is whether
      // it is still the same third form, and identity answers that.
      (a as unknown) === PropertyWithoutValue || (b as unknown) === PropertyWithoutValue
        ? (a as unknown) === (b as unknown)
        : isEqual == null
          ? a === b
          : isEqual(a, b);

    const isQueued = this.#propsChangeOrder.includes(key);
    const isTravelling = this.#travellingProperties?.has(key) ?? false;

    // the value this component last said the property should have: the pending half where
    // something is queued, else what an entry on its way out carries, else the confirmed value.
    // A key that is none of the three reads as `undefined`, and a registered rule decides that
    // comparison too -- a rule that calls the value equal to `undefined` says there is nothing
    // to send.
    let prevValue: T;
    if (isQueued) {
      prevValue = this.#nextProperties.get(key) as T;
    } else if (isTravelling) {
      prevValue = this.#travellingProperties!.get(key) as T;
    } else {
      prevValue = this.#properties.get(key) as T;
    }

    const valueChanged = !equals(value, prevValue);

    // The pending half is released only where the confirmed value is the wanted one and no entry
    // carrying another one is on its way out -- such an entry would otherwise be the last word.
    // The travelling test comes first because it decides the branch on its own, and a comparison
    // rule can be expensive on a path that runs once per frame. Where nothing is queued the
    // comparison above was already the one against the confirmed value, so it is reused.
    const nothingToSend = !isTravelling && (isQueued ? equals(value, this.#properties.get(key) as T) : !valueChanged);

    if (nothingToSend) {
      this.#nextProperties.delete(key);
      removeFrom(this.#propsChangeOrder, key);
    } else {
      this.#nextProperties.set(key, value);
      appendToEnd(this.#propsChangeOrder, key);
    }

    return valueChanged;
  }

  /**
   * Mark `key` as set without giving it a value: the next trail carries an entry that names
   * only the key. A later {@link ComponentChanges.changeProperty} replaces it with a value,
   * and {@link ComponentChanges.removeProperty} takes it away like any other property.
   *
   * @returns `true` if this differs from the last value this component asked for
   */
  setPropertyWithoutValue(key: string): boolean {
    return this.changeProperty(key, PropertyWithoutValue as unknown);
  }

  removeProperty(key: string) {
    const isQueued = this.#propsChangeOrder.includes(key);

    this.#nextProperties.delete(key);

    if (!this.#properties.has(key) && !this.#travellingProperties?.has(key)) {
      // nothing confirmed and nothing travelling: there is nothing to remove
      removeFrom(this.#propsChangeOrder, key);
      return;
    }

    // a key that was already queued keeps the place it took: the entry carries the changes in
    // the order they happened, and a removal is not a second change to the same key
    if (!isQueued) {
      appendToEnd(this.#propsChangeOrder, key);
    }
  }

  /**
   * The properties this component holds at this moment: the ones a change trail has already
   * carried, overlaid with everything that has accrued since.
   *
   * The overlay is what makes the result the current state instead of the state of the last
   * trail — `#properties` is only written forward while a trail is being built
   * ({@link ComponentChanges.makeCreateEntityChange}, {@link ComponentChanges.makeChangePropertyChange}).
   * A key whose accrued value is `undefined` and a key queued for change without an accrued value
   * are both removals, and neither appears in the result. A key that is set without a value stands
   * in the result with {@link PropertyWithoutValue}.
   */
  getProperties(): Map<string, unknown> {
    const properties = new Map(this.#properties);

    for (const key of this.#propsChangeOrder) {
      const value = this.#nextProperties.get(key);
      if (value === undefined) {
        properties.delete(key);
      } else {
        properties.set(key, value);
      }
    }

    return properties;
  }

  #events: IComponentEvent[] = [];
  #transferables = new Set<Transferable>();

  createEvent(type: string, data: unknown, transferables?: Transferable[]) {
    this.#events.push({type, data});
    for (const transferable of transferables ?? []) {
      this.#transferables.add(transferable);
    }
  }

  transferEventsTo(changes: ComponentChanges) {
    if (this.#events.length > 0) {
      changes.#events.push(...this.#events);
      this.#events.length = 0;
    }
    if (this.#transferables.size > 0) {
      changes.#transferables = new Set([...changes.#transferables, ...this.#transferables]);
      this.#transferables.clear();
    }
  }

  buildChangeTrail(trail: IComponentChangeType[], trailPhase: ChangeTrailPhase) {
    const {isNew, isCreated, isDestroyed} = this;

    if (isNew && isDestroyed) return;

    switch (trailPhase) {
      case ChangeTrailPhase.StructuralChanges:
        if (isNew) {
          trail.push(this.makeCreateEntityChange());
        } else if (!isDestroyed) {
          if (this.#hasPendingParent()) {
            trail.push(this.makeSetParentChange());
          } else if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
            trail.push(this.makeUpdateOrderChange());
          }
          if (this.#nextToken !== undefined && this.#nextToken !== this.#token) {
            trail.push(this.makeChangeToken());
          }
        }
        break;

      case ChangeTrailPhase.ContentUpdates:
        if (!isNew && isCreated && this.#propsChangeOrder.length > 0) {
          trail.push(this.makeChangePropertyChange());
        }
        if (this.#events.length > 0) {
          trail.push(this.makeEvents());
        }
        break;

      case ChangeTrailPhase.Removal:
        if (isDestroyed) {
          trail.push(this.makeDestroyEntityChange());
        }
        break;
    }
  }

  makeEvents(): ISendEvents {
    const event: ISendEvents = {
      type: ComponentChangeType.SendEvents,
      uuid: this.#uuid,
      events: this.#events.slice(0),
    };
    if (this.#transferables.size > 0) {
      event.transferables = Array.from(this.#transferables);
    }
    return event;
  }

  makeCreateEntityChange(): ICreateEntitiesChange {
    // never emit a create without a token: the kernel would register an entity that no
    // shadow object can ever be looked up for
    const token = this.#nextToken ?? this.#token;

    const entry: ICreateEntitiesChange = {
      type: ComponentChangeType.CreateEntities,
      uuid: this.#uuid,
      token,
    };

    if (this.#nextParentUuid !== undefined && this.#nextParentUuid !== ROOT) {
      entry.parentUuid = this.#nextParentUuid;
    }

    if (this.#nextProperties.size > 0) {
      // a create carries only the keys that have a value or are set without one; where nothing
      // is left, the field stays off the entry — an absent `properties` and an empty one say
      // the same thing, and the shorter one is what travels. The note is taken either way: it
      // records what this entry carries, and an entry with no property is travelling with none
      const properties: ComponentPropertiesType = [];
      for (const [key, value] of this.#nextProperties) {
        if (value === PropertyWithoutValue) {
          properties.push([key]);
        } else if (value !== undefined) {
          properties.push([key, value]);
        }
      }
      this.#noteTravellingProperties(properties);
      if (properties.length > 0) {
        entry.properties = properties;
      }
    }

    if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
      entry.order = this.#nextOrder;
    }

    if (this.#autoDestructionOnParentRemoval) {
      entry.autoDestructionOnParentRemoval = true;
    }

    return entry;
  }

  makeDestroyEntityChange(): IDestroyEntitiesChange {
    return {
      type: ComponentChangeType.DestroyEntities,
      uuid: this.#uuid,
    };
  }

  makeSetParentChange(): ISetParentChange {
    const entry: ISetParentChange = {
      type: ComponentChangeType.SetParent,
      uuid: this.#uuid,
      parentUuid: this.#nextParentUuid === ROOT ? undefined : this.#nextParentUuid,
    };

    if (this.#nextOrder !== undefined && this.#nextOrder !== this.#order) {
      entry.order = this.#nextOrder;
    }

    return entry;
  }

  makeUpdateOrderChange(): IUpdateOrderChange {
    return {
      type: ComponentChangeType.UpdateOrder,
      uuid: this.#uuid,
      order: this.#nextOrder ?? 0,
    };
  }

  makeChangeToken(): IChangeToken {
    return {
      type: ComponentChangeType.ChangeToken,
      uuid: this.#uuid,
      token: this.#nextToken ?? VoidToken,
    };
  }

  makeChangePropertyChange(): IPropertiesChange {
    // a key without a pending value is a removal, and so is a pending value of `undefined` --
    // `get()` answers the same for both, which is what the receiving side reads them as. A key
    // set without a value is the third form and travels as the bare key
    const properties: ComponentPropertiesType = this.#propsChangeOrder.map((key) => {
      const value = this.#nextProperties.get(key);
      return value === PropertyWithoutValue ? [key] : [key, value];
    });

    this.#noteTravellingProperties(properties);

    return {
      type: ComponentChangeType.ChangeProperties,
      uuid: this.#uuid,
      properties,
    };
  }

  /** Records the keys of an entry that is going out, so a later change knows the written half is behind. */
  #noteTravellingProperties(properties: ComponentPropertiesType): void {
    // the arity carries the meaning on the wire, the marker carries it in here
    this.#travellingProperties = new Map(
      properties.map((entry) => [entry[0], entry.length === 1 ? PropertyWithoutValue : entry[1]]),
    );
  }

  /**
   * Fold one trail entry into the written half of this component's bookkeeping: the values the
   * entry carries become the values the next diff is taken against, and the pending half that
   * produced them is released. Called once per entry the Shadow Environment has applied.
   *
   * A pending value is released only while it is still the value the entry carried. Between the
   * build of a trail and its confirmation lies a round trip, and whatever changed in that window
   * is owed to the Shadow Environment — releasing it here would leave the two sides holding
   * different values with nothing left to correct them.
   */
  commitChange(entry: IComponentChangeType): void {
    switch (entry.type) {
      case ComponentChangeType.CreateEntities:
        this.#commitToken(entry.token);
        this.#commitParentUuid(entry.parentUuid);
        this.#commitOrder(entry.order ?? this.#order);
        this.#commitProperties(entry.properties);
        // a create carries only the properties that have a value; a pending removal of a key the
        // entity was never given has nothing left to ask for and is released along with it
        for (const key of this.#propsChangeOrder.slice(0)) {
          if (this.#nextProperties.get(key) === undefined && !this.#properties.has(key)) {
            this.#nextProperties.delete(key);
            removeFrom(this.#propsChangeOrder, key);
          }
        }
        this.#travellingProperties = undefined;
        this.#isNew = false;
        break;

      case ComponentChangeType.SetParent:
        this.#commitParentUuid(entry.parentUuid);
        this.#commitOrder(entry.order ?? this.#order);
        break;

      case ComponentChangeType.UpdateOrder:
        this.#commitOrder(entry.order);
        break;

      case ComponentChangeType.ChangeToken:
        this.#commitToken(entry.token);
        break;

      case ComponentChangeType.ChangeProperties:
        this.#commitProperties(entry.properties);
        this.#travellingProperties = undefined;
        break;

      case ComponentChangeType.SendEvents:
        // the entry carries a snapshot taken while the trail was built; anything that arrived
        // behind it is still waiting to go out
        this.#events.splice(0, entry.events.length);
        for (const transferable of entry.transferables ?? []) {
          this.#transferables.delete(transferable);
        }
        break;

      case ComponentChangeType.DestroyEntities:
        // The entity behind this uuid is gone. Usually the component entry goes with it, but a
        // uuid its holder has left is free again, and a component that took it over in the
        // meantime keeps the entry alive. The written half describes an entity that no longer
        // exists, so it is reset to what a component nobody knows yet looks like -- otherwise the
        // successor would diff against it and ask for a change to something that is not there.
        this.#token = VoidToken;
        this.#parentUuid = undefined;
        this.#order = 0;
        this.#properties.clear();
        this.#travellingProperties = undefined;
        this.#isNew = true;
        break;
    }
  }

  #commitToken(token: string): void {
    this.#token = token;
    if (this.#nextToken === token) {
      this.#nextToken = undefined;
    }
  }

  #commitParentUuid(parentUuid: string | undefined): void {
    this.#parentUuid = parentUuid;
    if ((this.#nextParentUuid === ROOT ? undefined : this.#nextParentUuid) === parentUuid) {
      this.#nextParentUuid = undefined;
    }
  }

  #commitOrder(order: number): void {
    this.#order = order;
    if (this.#nextOrder === order) {
      this.#nextOrder = undefined;
    }
  }

  #commitProperties(properties: ComponentPropertiesType | undefined): void {
    for (const entry of properties ?? []) {
      const key = entry[0];
      // an entry that names only the key is the third form and not a removal: the written
      // half has to hold it, or the next diff reads the key as one that was never set
      const value = entry.length === 1 ? PropertyWithoutValue : entry[1];

      if (value === undefined) {
        this.#properties.delete(key);
      } else {
        this.#properties.set(key, value);
      }

      if (this.#nextProperties.get(key) === value) {
        this.#nextProperties.delete(key);
        removeFrom(this.#propsChangeOrder, key);
      }
    }
  }
}
