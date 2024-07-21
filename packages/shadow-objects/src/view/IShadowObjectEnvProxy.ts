import type {MessageToViewEvent} from '../shadow-objects.js';
import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  start(): Promise<void>;

  importScript(url: URL | string): Promise<void>;

  applyChangeTrail(data: ChangeTrailType, waitForConfirmation: boolean): Promise<void>;

  destroy(): void;

  onMessageToView?: (event: Omit<MessageToViewEvent, 'transferables'>) => any;
}
