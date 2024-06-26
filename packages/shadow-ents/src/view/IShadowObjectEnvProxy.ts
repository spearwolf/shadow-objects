import type {MessageToViewEvent} from '../core.js';
import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  start(): Promise<void>;

  importScript(url: URL | string): Promise<void>;

  applyChangeTrail(data: ChangeTrailType): Promise<void>;

  destroy(): void;

  onMessageToView?: (event: Omit<MessageToViewEvent, 'transferables'>) => any;
}
