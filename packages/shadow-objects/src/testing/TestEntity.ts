import {emit} from '@spearwolf/eventize';
import {value} from '@spearwolf/signalize';
import {getDisplayName} from '../in-the-dark/displayName.js';
import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel, MessageToViewEvent} from '../in-the-dark/Kernel.js';
import type {ComponentPropertiesType, ShadowObjectConstructor, ShadowObjectDescription, ShadowObjectType} from '../types.js';
import type {
  AnyShadowObjectConstructor,
  CreateEntityOptions,
  ShadowObjectInstance,
  TestEntity,
  ViewMessageRecord,
} from './types.js';

/** What a `TestEntityImpl` needs from the test kernel that owns it. */
export interface TestKernelInternals {
  readonly kernel: Kernel;
  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity;
}

/**
 * Properties as a Kernel call wants them. `Object.entries()` drops symbol keys, which is right:
 * an Entity property is string-keyed. A value of `undefined` is a removal, which is what
 * `types.ts` says about a `ComponentPropertiesType` entry and what `removeProps()` relies on.
 */
export const toPropertyEntries = (props: Record<string, unknown>): ComponentPropertiesType =>
  Object.entries(props).map(([key, val]) => [key, val] as [string, unknown]);

export class TestEntityImpl implements TestEntity {
  readonly uuid: string;

  readonly #testKernel: TestKernelInternals;
  readonly #viewMessages: ViewMessageRecord[] = [];

  // The token the Kernel no longer answers for, once this Entity is destroyed. A handle stays
  // readable after its Entity is gone -- a test asserts on what it held, and a getter that threw
  // would turn that assertion into a crash.
  #lastKnownToken: string;

  constructor(testKernel: TestKernelInternals, uuid: string, token: string) {
    this.#testKernel = testKernel;
    this.uuid = uuid;
    this.#lastKnownToken = token;
  }

  get #kernel(): Kernel {
    return this.#testKernel.kernel;
  }

  get entity(): Entity {
    return this.#kernel.getEntity(this.uuid);
  }

  get token(): string {
    const current = this.#kernel.tokenOf(this.uuid);
    if (current !== undefined) {
      this.#lastKnownToken = current;
    }
    return this.#lastKnownToken;
  }

  get viewMessages(): readonly ViewMessageRecord[] {
    return this.#viewMessages;
  }

  createChild(token: string, props?: Record<string, unknown>, options?: Omit<CreateEntityOptions, 'parent'>): TestEntity {
    return this.#testKernel.createEntity(token, props, {...options, parent: this});
  }

  /**
   * Writes through the Kernel rather than through `Entity.setProperties()`: `changeProperties()`
   * re-resolves the constructor set afterwards, which is how a property route -- `token@prop` in a
   * module's `routes` -- puts a Shadow Object on an Entity or takes it off again.
   */
  setProps(props: Record<string, unknown>): void {
    this.#kernel.changeProperties(this.uuid, toPropertyEntries(props));
  }

  /** A property set to `undefined` is a removal; see `ComponentPropertiesType` in `src/types.ts`. */
  removeProps(...names: string[]): void {
    this.#kernel.changeProperties(
      this.uuid,
      names.map((name) => [name, undefined] as [string, unknown]),
    );
  }

  readProp<T = unknown>(name: string): T | undefined {
    return this.entity.getProperty<T | undefined>(name);
  }

  /**
   * The effective value of an Entity Context, the one `useContext()` reads. It arrives a microtask
   * after a provider wrote it -- `Entity` runs every context value through a `MicrotaskCollector` --
   * so a test reads it after `settle()`.
   */
  readContext<T = unknown>(name: string | symbol): T | undefined {
    return value(this.entity.useContext<T | undefined>(name));
  }

  setToken(token: string): void {
    this.#kernel.changeToken(this.uuid, token);
  }

  setParent(parent: TestEntity | undefined, order?: number): void {
    this.#kernel.setParent(this.uuid, parent?.uuid, order);
  }

  /**
   * Delivery is synchronous, the way `Kernel.dispatchEventsToEntity()` is: a View event carries no
   * structure, so nothing has to settle before a Shadow Object hears it.
   */
  sendViewEvent(type: string, data?: unknown): void {
    this.#kernel.dispatchEventsToEntity(this.uuid, [{type, data}]);
  }

  /**
   * Emits on the Entity's own event bus. Every Shadow Object of this Entity is attached there as an
   * eventize listener object, so a method named like the event is what receives it.
   */
  emit(eventName: string | symbol, ...args: unknown[]): void {
    emit(this.entity, eventName, ...args);
  }

  shadowObjects(): ShadowObjectType[] {
    return this.#kernel.findShadowObjects(this.uuid);
  }

  /**
   * The one Shadow Object on this Entity that came out of `constructa`.
   *
   * Two rules in order, because one does not cover both constructor shapes, and because the second
   * one is not exact. A class instance answers `instanceof` -- the `@ShadowObject` decorator wraps
   * the class in a subclass, which still does -- and so does an object from a function constructor
   * that returns nothing. Identity is asked first and, where anything answers it, alone.
   *
   * A function constructor that returns an object answers nothing: `new fn()` hands back that
   * object, and it carries none of `fn`'s prototype. Only there does the display name decide, and
   * only then, because a name is not an identity. `findShadowObjects()` and
   * `describeShadowObjects()` walk the same bookkeeping in the same order, so the two lists line up
   * index by index.
   */
  shadowObjectOf<C extends AnyShadowObjectConstructor>(constructa: C): ShadowObjectInstance<C> {
    const displayName = getDisplayName(constructa as ShadowObjectConstructor);
    const instances = this.shadowObjects();

    let matches = instances.filter((instance) => instance instanceof (constructa as unknown as new (...args: any[]) => object));

    // The display name is the fallback, never a second rule beside identity. Two constructors are
    // free to carry one display name, and an `||` between the two would then count the other one's
    // Shadow Object as a match and report an ambiguity that is not there. Identity, where it
    // answers at all, is exact.
    //
    // What no rule separates is two *function* constructors of one name on one Entity: neither
    // leaves a prototype behind, so nothing tells their objects apart. The throw below names that
    // for what it is and points at `shadowObjects()`.
    if (matches.length === 0) {
      const descriptions = this.describe();
      matches = instances.filter((_, index) => descriptions[index]?.displayName === displayName);
    }

    if (matches.length === 0) {
      throw new Error(`no shadow object built from "${displayName}" on entity ${this.uuid}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `${matches.length} shadow objects built from "${displayName}" on entity ${this.uuid}; use shadowObjects() and pick one`,
      );
    }

    return matches[0] as ShadowObjectInstance<C>;
  }

  describe(): ShadowObjectDescription[] {
    return this.#kernel.describeShadowObjects(this.uuid);
  }

  /**
   * Called by the test kernel for every message the Kernel emitted for this uuid. `traverseChildren`
   * is recorded rather than acted on: the flag is an instruction to the View layer, and there is no
   * View layer here.
   *
   * @internal
   */
  recordViewMessage(message: MessageToViewEvent): void {
    this.#viewMessages.push({
      type: message.type,
      data: message.data,
      ...(message.traverseChildren !== undefined ? {traverseChildren: message.traverseChildren} : {}),
    });
  }

  clearViewMessages(): void {
    this.#viewMessages.length = 0;
  }

  destroy(): void {
    this.#kernel.destroyEntity(this.uuid);
  }
}
