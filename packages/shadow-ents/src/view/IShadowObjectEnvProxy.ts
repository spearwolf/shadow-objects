import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  applyChangeTrail(data: ChangeTrailType): Promise<void>;

  importScript(url: string): Promise<void>;
  configure(data: unknown): void;

  destroy(): void;
}
