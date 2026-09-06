import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import type {ComponentPropertiesType, ShadowObjectDescription, ShadowObjectType} from '../types.js';
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
    const reader = this.entity.useContext<T | undefined>(name);
    return reader();
  }

  setToken(_token: string): void {
    throw new Error('not implemented yet');
  }

  setParent(_parent: TestEntity | undefined, _order?: number): void {
    throw new Error('not implemented yet');
  }

  sendViewEvent(_type: string, _data?: unknown): void {
    throw new Error('not implemented yet');
  }

  emit(_eventName: string | symbol, ..._args: unknown[]): void {
    throw new Error('not implemented yet');
  }

  shadowObjects(): ShadowObjectType[] {
    throw new Error('not implemented yet');
  }

  instanceOf<C extends AnyShadowObjectConstructor>(_constructa: C): ShadowObjectInstance<C> {
    throw new Error('not implemented yet');
  }

  describe(): ShadowObjectDescription[] {
    throw new Error('not implemented yet');
  }

  clearViewMessages(): void {
    this.#viewMessages.length = 0;
  }

  destroy(): void {
    this.#kernel.destroyEntity(this.uuid);
  }
}
