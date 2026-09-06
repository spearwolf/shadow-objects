import {on} from '@spearwolf/eventize';
import {MessageToView} from '../constants.js';
import {importModule as importShadowObjectsModule} from '../in-the-dark/importModule.js';
import {Kernel, type MessageToViewEvent} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import type {ShadowObjectConstructor, ShadowObjectsModule} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {type KernelErrorRecorder, recordKernelErrors} from './recordKernelErrors.js';
import {settle} from './settle.js';
import {TestEntityImpl, type TestKernelInternals, toPropertyEntries} from './TestEntity.js';
import type {
  AnyShadowObjectConstructor,
  CreateEntityOptions,
  KernelErrorRecord,
  TestEntity,
  TestKernel,
  TestKernelOptions,
  ViewMessageRecord,
} from './types.js';

/** What `viewMessagesOf()` answers for a uuid nothing was ever recorded for. */
const NoViewMessages: readonly ViewMessageRecord[] = Object.freeze([]);

class TestKernelImpl implements TestKernel, TestKernelInternals {
  readonly kernel: Kernel;
  readonly registry: Registry;

  readonly #handles = new Map<string, TestEntityImpl>();

  // The recording lives here rather than on the handles, because a message is dispatched for a uuid
  // long before anything asks for its handle: a Shadow Object that calls `entity.kernel.createEntity()`
  // makes one, and a handle built afterwards has to answer for what that Entity already sent.
  readonly #viewMessages = new Map<string, ViewMessageRecord[]>();

  readonly #importedModules = new Set<ShadowObjectsModule>();
  readonly #recorder: KernelErrorRecorder;
  readonly #unsubscribeMessageToView: () => void;
  // Only a Registry this test kernel made is a Registry it may empty. One the caller handed in is
  // the caller's, default or not, and clearing it would take the rest of the suite's definitions.
  readonly #ownsRegistry: boolean;
  readonly #failOnKernelErrors: boolean;

  #disposed = false;

  constructor(options: TestKernelOptions) {
    this.#ownsRegistry = options.registry === undefined;
    this.#failOnKernelErrors = options.failOnKernelErrors ?? true;
    this.registry = options.registry ?? new Registry();
    this.kernel = new Kernel(this.registry);
    this.#recorder = recordKernelErrors(this.kernel.logger, options.echoKernelErrors ?? false);

    // Nothing clones the payload on the way here, unlike `LocalShadowObjectEnv`, which runs it
    // through `structuredClone`. A test asserts on the object the Shadow Object sent.
    //
    // `traverseChildren` is recorded rather than acted on: the flag is an instruction to the View
    // layer, and there is no View layer here. The spread is conditional because
    // `exactOptionalPropertyTypes` forbids writing `undefined` into an optional field.
    this.#unsubscribeMessageToView = on(this.kernel, MessageToView, (message: MessageToViewEvent) => {
      const record: ViewMessageRecord = {
        type: message.type,
        data: message.data,
        ...(message.traverseChildren !== undefined ? {traverseChildren: message.traverseChildren} : {}),
      };

      const recorded = this.#viewMessages.get(message.uuid);
      if (recorded === undefined) {
        this.#viewMessages.set(message.uuid, [record]);
      } else {
        recorded.push(record);
      }
    });
  }

  get errors(): readonly KernelErrorRecord[] {
    return this.#recorder.records;
  }

  define(token: string, constructa: AnyShadowObjectConstructor): void {
    this.registry.define(token, constructa as ShadowObjectConstructor);
  }

  route(token: string, targets: string[]): void {
    this.registry.appendRoute(token, targets);
  }

  async importModule(module: ShadowObjectsModule): Promise<void> {
    await importShadowObjectsModule(this.kernel, module, this.#importedModules);
  }

  createEntity(token: string, props?: Record<string, unknown>, options?: CreateEntityOptions): TestEntity {
    const uuid = options?.uuid ?? generateUUID();

    // The handle goes in before the Kernel call, because a Shadow Object constructor may ask this
    // facade for its own handle, and the one it gets has to be the one this call hands back.
    const previous = this.#handles.get(uuid);
    const handle = new TestEntityImpl(this, uuid, token);
    this.#handles.set(uuid, handle);

    try {
      this.kernel.createEntity(
        uuid,
        token,
        options?.parent?.uuid,
        options?.order ?? 0,
        props ? toPropertyEntries(props) : undefined,
        options?.autoDestructionOnParentRemoval ?? false,
      );
    } catch (error) {
      // Restore rather than delete. `options.uuid` may name a uuid this facade already held a handle
      // for -- the Kernel refuses that creation with an `EntityUuidInUseError` -- and deleting would
      // evict a handle the caller still holds, leaving every later message for that uuid on the
      // replacement this failed call put in.
      if (previous === undefined) {
        this.#handles.delete(uuid);
      } else {
        this.#handles.set(uuid, previous);
      }
      throw error;
    }

    return handle;
  }

  entity(uuid: string): TestEntity | undefined {
    const known = this.#handles.get(uuid);
    if (known !== undefined) return known;

    const token = this.kernel.tokenOf(uuid);
    if (token === undefined) return undefined;

    const handle = new TestEntityImpl(this, uuid, token);
    this.#handles.set(uuid, handle);
    return handle;
  }

  /** What was recorded for a uuid, whether or not a handle for it existed at the time. @internal */
  viewMessagesOf(uuid: string): readonly ViewMessageRecord[] {
    return this.#viewMessages.get(uuid) ?? NoViewMessages;
  }

  /** Empties one uuid's recorded list, and no other's. @internal */
  clearViewMessagesOf(uuid: string): void {
    this.#viewMessages.delete(uuid);
  }

  settle(): Promise<void> {
    return settle();
  }

  clearErrors(): void {
    this.#recorder.clear();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    this.kernel.destroy();
    this.#unsubscribeMessageToView();

    if (this.#ownsRegistry) {
      this.registry.clear();
    }

    // Read before the unhook, because unhooking does not clear the records but a later read has no
    // reason to reach the recorder again.
    const errors = this.#recorder.records.filter((record) => record.level === 'error');

    this.#recorder.unhook();
    this.#handles.clear();
    this.#viewMessages.clear();
    this.#importedModules.clear();

    // Only `error`. A warning is recorded and readable, and never fails a run: `importModule()`
    // warns about a module two `extends` chains have in common, which is a shape of the module
    // graph and not a mistake.
    if (this.#failOnKernelErrors && errors.length > 0) {
      const first = errors[0]!;
      throw new Error(
        `the kernel reported ${errors.length} error(s) that this test did not acknowledge. ` +
          `The first one was: ${first.args.map((arg) => String(arg)).join(' ')}. ` +
          'Assert on testKernel.errors and call clearErrors(), or pass {failOnKernelErrors: false}.',
        ...(first.error !== undefined ? [{cause: first.error}] : []),
      );
    }
  }
}

/**
 * A Kernel for a unit test: its own Registry, object-shaped properties, recorded View messages,
 * recorded Kernel errors, and a `settle()` that drains the microtask cascade.
 *
 * Everything runs on the real Kernel. There is no DOM, no ShadowEnv and no worker in it, and no
 * `structuredClone` between the test and the Shadow Object -- a value handed in as a property or a
 * context arrives by identity, a DOM node and a WebGL handle included.
 */
export function createTestKernel(options: TestKernelOptions = {}): TestKernel {
  return new TestKernelImpl(options);
}
