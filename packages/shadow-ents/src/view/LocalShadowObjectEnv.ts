import {Kernel} from '../entities/Kernel.js';
import type {Registry} from '../entities/Registry.js';
import type {ChangeTrailType, SyncEvent} from '../types.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';
import {cloneChangeTrail} from './cloneChangeTrail.js';

export class LocalShadowObjectEnv implements IShadowObjectEnvProxy {
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

  importScript(_url: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  configure(_data: unknown): void {
    throw new Error('Method not implemented.');
  }

  destroy(): void {
    // TODO this.kernel.destroy();
    this.registry.clear();
  }
}
