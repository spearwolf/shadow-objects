import {on} from '@spearwolf/eventize';
import {MessageToView, ShadowObjectsExport} from '../constants.js';
import {Kernel, type MessageToViewEvent} from '../in-the-dark/Kernel.js';
import type {Registry} from '../in-the-dark/Registry.js';
import {importModule} from '../in-the-dark/importModule.js';
import type {ChangeTrailType, ShadowObjectsModule, SyncEvent} from '../types.js';
import {toUrlString} from '../utils/toUrlString.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';
import {cloneChangeTrail} from './cloneChangeTrail.js';

export class LocalShadowObjectEnv implements IShadowObjectEnvProxy {
  #importedModules: Set<ShadowObjectsModule> = new Set();

  readonly kernel: Kernel;

  get registry(): Registry {
    return this.kernel.registry;
  }

  readonly isLocalEnv = true;

  disableStructuredClone = false;

  constructor(registry?: Registry) {
    this.kernel = new Kernel(registry);

    on(this.kernel, MessageToView, (message: MessageToViewEvent) => {
      if ((this as IShadowObjectEnvProxy).onMessageToView != null) {
        const {type, uuid, traverseChildren} = message;
        const data = structuredClone(message.data, {transfer: message.transferables});
        (this as IShadowObjectEnvProxy).onMessageToView({type, uuid, data, traverseChildren});
      }
    });
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  applyChangeTrail(data: ChangeTrailType, _waitForConfirmation: boolean): Promise<void> {
    const syncData: SyncEvent = {changeTrail: this.disableStructuredClone ? data : cloneChangeTrail(data)};
    let result: Promise<void>;
    try {
      this.kernel.run(syncData);
      result = Promise.resolve();
    } catch (error) {
      result = Promise.reject(error);
    }
    return result;
  }

  async importScript(url: URL | string): Promise<void> {
    const module = await import(/* @vite-ignore */ toUrlString(url));
    if (module[ShadowObjectsExport]) {
      await this.importModule(module[ShadowObjectsExport]);
    }
  }

  async importModule(module: ShadowObjectsModule): Promise<void> {
    return importModule(this.kernel, module, this.#importedModules);
  }

  destroy(): void {
    this.kernel.destroy();
    this.registry.clear();
    this.#importedModules.clear();
  }
}
