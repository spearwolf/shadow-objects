import type {Entity} from '../in-the-dark/Entity.js';
import type {Kernel} from '../in-the-dark/Kernel.js';
import type {Registry} from '../in-the-dark/Registry.js';
import type {
  ShadowObjectConstructor,
  ShadowObjectConstructorFunc,
  ShadowObjectDescription,
  ShadowObjectsModule,
  ShadowObjectType,
} from '../types.js';

/** Either shape a Shadow Object can be defined in. */
export type AnyShadowObjectConstructor = ShadowObjectConstructor | ShadowObjectConstructorFunc;

/**
 * The instance a constructor produces. A function constructor that returns nothing yields
 * `object`, which is honest: there is an eventized instance, and it carries nothing a test can name.
 */
export type ShadowObjectInstance<C> = C extends new (
  ...args: any[]
) => infer R
  ? R
  : C extends (...args: any[]) => infer R
    ? R extends object
      ? R
      : object
    : object;

/** One report the Kernel made through its logger while a test kernel was recording. */
export interface KernelErrorRecord {
  level: 'error' | 'warn';
  /** The arguments as they were logged. `runGuarded()` puts its message first and the error last. */
  args: readonly unknown[];
  /** The last argument, where that argument is an `Error`. */
  error?: Error;
}

/** One message an Entity sent towards the View. */
export interface ViewMessageRecord {
  type: string;
  data: unknown;
  traverseChildren?: boolean;
}

export interface CreateEntityOptions {
  uuid?: string;
  order?: number;
  parent?: TestEntity;
  autoDestructionOnParentRemoval?: boolean;
}

/** One handle per Entity. The same uuid always answers with the same handle. */
export interface TestEntity {
  readonly uuid: string;
  /** The token the Kernel currently holds for this Entity. */
  readonly token: string;
  /** The Entity itself -- the way out for everything this handle does not cover. */
  readonly entity: Entity;
  /** What this Entity sent towards the View since the last `clearViewMessages()`. */
  readonly viewMessages: readonly ViewMessageRecord[];

  createChild(token: string, props?: Record<string, unknown>, options?: Omit<CreateEntityOptions, 'parent'>): TestEntity;

  setProps(props: Record<string, unknown>): void;
  removeProps(...names: string[]): void;
  readProp<T = unknown>(name: string): T | undefined;
  readContext<T = unknown>(name: string | symbol): T | undefined;

  setToken(token: string): void;
  setParent(parent: TestEntity | undefined, order?: number): void;

  /** Deliver a View event. Synchronous, as the Kernel's own delivery is. */
  sendViewEvent(type: string, data?: unknown): void;
  /** Emit on the Entity's event bus -- the channel Shadow Objects on one Entity talk to each other on. */
  emit(eventName: string | symbol, ...args: unknown[]): void;

  shadowObjects(): ShadowObjectType[];
  /** The one Shadow Object on this Entity built from `constructa`. Throws for none and for more than one. */
  instanceOf<C extends AnyShadowObjectConstructor>(constructa: C): ShadowObjectInstance<C>;
  describe(): ShadowObjectDescription[];

  clearViewMessages(): void;
  destroy(): void;
}

export interface TestKernelOptions {
  /**
   * The Registry to build on. Default: a fresh `new Registry()`, isolated from the default Registry
   * and from every other test kernel. Pass `Registry.get()` for Shadow Objects that registered
   * themselves through `@ShadowObject` without a registry of their own.
   */
  registry?: Registry;
  /** Fail `dispose()` when unacknowledged reports of level `error` were recorded. Default: `true`. */
  failOnKernelErrors?: boolean;
  /** Keep the Kernel's logger output on the console as well as recording it. Default: `false`. */
  echoKernelErrors?: boolean;
}

export interface TestKernel {
  /** The Kernel itself -- the way out for everything this facade does not cover. */
  readonly kernel: Kernel;
  readonly registry: Registry;
  /** What the Kernel reported through its logger since the last `clearErrors()`. */
  readonly errors: readonly KernelErrorRecord[];

  define(token: string, constructa: AnyShadowObjectConstructor): void;
  route(token: string, targets: string[]): void;
  importModule(module: ShadowObjectsModule): Promise<void>;

  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity;
  /**
   * The handle for a uuid, or `undefined` when the Kernel holds no such Entity. A uuid a Shadow
   * Object created through `testKernel.kernel.createEntity()` gets a handle here on first ask.
   */
  entity(uuid: string): TestEntity | undefined;

  settle(): Promise<void>;
  clearErrors(): void;
  dispose(): void;
}

export interface MountOptions {
  props?: Record<string, unknown>;
  /** Entity Contexts a synthetic parent Entity provides to the object under test. */
  contexts?: Record<string | symbol, unknown>;
  /** The token to register the constructor under. Default: a generated one. */
  token?: string;
  registry?: Registry;
  failOnKernelErrors?: boolean;
  echoKernelErrors?: boolean;
}

export interface MountedShadowObject<C> extends Omit<TestEntity, 'createChild' | 'destroy'> {
  readonly instance: ShadowObjectInstance<C>;
  readonly testKernel: TestKernel;
  settle(): Promise<void>;
  dispose(): void;
}
