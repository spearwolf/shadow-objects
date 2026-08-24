import {on} from '@spearwolf/eventize';
import {MessageToView, ShadowObjectsExport} from '../constants.js';
import {importModule, missingShadowObjectsExportMessage} from '../in-the-dark/importModule.js';
import {Kernel, type MessageToViewEvent} from '../in-the-dark/Kernel.js';
import {Registry} from '../in-the-dark/Registry.js';
import type {ChangeTrailType, ShadowObjectsModule, SyncEvent} from '../types.js';
import {toUrlString} from '../utils/toUrlString.js';
import {cloneChangeTrail} from './cloneChangeTrail.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

export class LocalShadowObjectEnv implements IShadowObjectEnvProxy {
  #importedModules: Set<ShadowObjectsModule> = new Set();
  readonly #usesDefaultRegistry: boolean;

  readonly kernel: Kernel;

  get registry(): Registry {
    return this.kernel.registry;
  }

  readonly isLocalEnv = true;

  disableStructuredClone = false;

  constructor(registry?: Registry) {
    this.kernel = new Kernel(registry);
    // The default registry is shared with every other environment in this thread and holds
    // everything `@ShadowObject` and `shadowObjects.define()` register without a registry of
    // their own, so `destroy()` must not clear it. This check only tells the default registry
    // apart from any other instance — a custom registry handed to more than one environment is
    // cleared by the first one of them to be destroyed, same as the default registry would be
    // without this guard.
    this.#usesDefaultRegistry = this.kernel.registry === Registry.get();

    on(this.kernel, MessageToView, (message: MessageToViewEvent) => {
      const onMessageToView = (this as IShadowObjectEnvProxy).onMessageToView;
      if (onMessageToView == null) return;

      const {type, uuid, traverseChildren} = message;
      const data = structuredClone(message.data, {transfer: message.transferables});
      // call() keeps the binding a plain method call would have given it: an outside
      // implementation of the proxy interface need not hand over a bound callback
      onMessageToView.call(this, {type, uuid, data, traverseChildren});
    });
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  applyChangeTrail(data: ChangeTrailType, waitForConfirmation: boolean): Promise<void> {
    const syncData: SyncEvent = {changeTrail: this.disableStructuredClone ? data : cloneChangeTrail(data)};
    let result: Promise<void>;
    try {
      this.kernel.run(syncData);
      result = Promise.resolve();
    } catch (error) {
      result = Promise.reject(error);
    }
    if (!waitForConfirmation) return result;
    // The kernel above still runs synchronously, in the same tick this method is called in; only
    // the settling of the returned promise is deferred here, by one microtask, so it never
    // settles in the same microtask as the call that made it. That is the guarantee this gives —
    // not the same relative ordering RemoteWorkerEnv has against its own promises, which settles
    // only after its worker round-trip and can land later still.
    return result.then(() => undefined);
  }

  async importScript(url: URL | string): Promise<void> {
    const module = await import(/* @vite-ignore */ toUrlString(url));
    // A module without this export is wrong in both environments, and a local run rejects it
    // right here instead of staying quiet -- so a developer sees it before switching to a worker.
    if (!module[ShadowObjectsExport]) {
      throw new Error(missingShadowObjectsExportMessage);
    }
    await this.importModule(module[ShadowObjectsExport]);
  }

  async importModule(module: ShadowObjectsModule): Promise<void> {
    return importModule(this.kernel, module, this.#importedModules);
  }

  destroy(): void {
    this.kernel.destroy();
    if (!this.#usesDefaultRegistry) {
      this.registry.clear();
    }
    this.#importedModules.clear();
  }
}