import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  start(): Promise<void>;

  importScript(url: URL | string): Promise<void>;

  applyChangeTrail(data: ChangeTrailType): Promise<void>;

  destroy(): void;
}
