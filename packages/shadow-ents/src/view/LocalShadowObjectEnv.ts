import {ShadowObjectsExport} from '../constants.js';
import {Kernel} from '../entities/Kernel.js';
import type {Registry} from '../entities/Registry.js';
import {importModule} from '../entities/importModule.js';
import {toUrlString} from '../toUrlString.js';
import type {ChangeTrailType, ShadowObjectsModule, SyncEvent} from '../types.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';
import {cloneChangeTrail} from './cloneChangeTrail.js';

export class LocalShadowObjectEnv implements IShadowObjectEnvProxy {
  #importedModules: Set<ShadowObjectsModule> = new Set();

  readonly kernel: Kernel;

  get registry(): Registry {
    return this.kernel.registry;
  }

  constructor(registry?: Registry) {
    this.kernel = new Kernel(registry);
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  applyChangeTrail(data: ChangeTrailType): Promise<void> {
    const syncData: SyncEvent = {changeTrail: cloneChangeTrail(data)};
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
    const module = await import(toUrlString(url));
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
