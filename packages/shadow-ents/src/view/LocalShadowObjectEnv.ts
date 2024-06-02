import {ShadowObjectsExport} from '../constants.js';
import {Kernel} from '../entities/Kernel.js';
import type {Registry} from '../entities/Registry.js';
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

  applyChangeTrail(data: ChangeTrailType): Promise<void> {
    const syncData: SyncEvent = {changeTrail: cloneChangeTrail(data)};
    this.kernel.run(syncData);
    return Promise.resolve();
  }

  async importScript(url: string): Promise<void> {
    const module = await import(/* @vite-ignore */ url);
    if (module[ShadowObjectsExport]) {
      await this.importModule(module[ShadowObjectsExport]);
    }
  }

  async importModule(module: ShadowObjectsModule): Promise<void> {
    if (this.#importedModules.has(module)) {
      console.warn('LocalShadowObjectEnv: skipping already imported module', module);
      return;
    } else {
      this.#importedModules.add(module);
    }

    if (module.define) {
      for (const [token, constructor] of Object.entries(module.define)) {
        this.registry.define(token, constructor);
      }
    }

    if (module.routes) {
      for (const [token, routes] of Object.entries(module.routes)) {
        this.registry.appendRoute(token, routes);
      }
    }

    await (module.initialize?.({
      define: (token, constructor) => this.registry.define(token, constructor),
      kernel: this.kernel,
      registry: this.registry,
    }) ?? Promise.resolve());

    this.kernel.upgradeEntities();
  }

  destroy(): void {
    this.kernel.destroy();
    this.registry.clear();
    this.#importedModules.clear();
  }
}
