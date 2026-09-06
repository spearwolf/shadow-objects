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
} from './types.js';

class TestKernelImpl implements TestKernel, TestKernelInternals {
  readonly kernel: Kernel;
  readonly registry: Registry;

  readonly #handles = new Map<string, TestEntityImpl>();
  readonly #importedModules = new Set<ShadowObjectsModule>();
  readonly #recorder: KernelErrorRecorder;
  readonly #unsubscribeMessageToView: () => void;
  // Only a Registry this test kernel made is a Registry it may empty. One the caller handed in is
  // the caller's, default or not, and clearing it would take the rest of the suite's definitions.
  readonly #ownsRegistry: boolean;

  #disposed = false;

  constructor(options: TestKernelOptions) {
    this.#ownsRegistry = options.registry === undefined;
    this.registry = options.registry ?? new Registry();
    this.kernel = new Kernel(this.registry);
    this.#recorder = recordKernelErrors(this.kernel.logger, options.echoKernelErrors ?? false);

    // Nothing clones the payload on the way here, unlike `LocalShadowObjectEnv`, which runs it
    // through `structuredClone`. A test asserts on the object the Shadow Object sent.
    this.#unsubscribeMessageToView = on(this.kernel, MessageToView, (message: MessageToViewEvent) => {
      this.#handles.get(message.uuid)?.recordViewMessage(message);
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

    // The handle goes in before the Kernel call, because a Shadow Object constructor may already
    // dispatch a message towards the View, and the recorder has to find a handle to put it on.
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
      this.#handles.delete(uuid);
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

    this.#recorder.unhook();
    this.#handles.clear();
    this.#importedModules.clear();
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
