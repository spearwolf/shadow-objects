import type {MessageToViewEvent} from '../shadow-objects.js';
import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  start(): Promise<void>;

  importScript(url: URL | string): Promise<void>;

  applyChangeTrail(data: ChangeTrailType, waitForConfirmation: boolean): Promise<void>;

  destroy(): void;

  onMessageToView?: (event: Omit<MessageToViewEvent, 'transferables'>) => any;

  /**
   * Called when the proxy has irrecoverably lost the environment it stands for.
   * {@link ShadowEnv} installs it on every proxy it is given; an implementation
   * that cannot fail simply never calls it.
   */
  onProxyFailed?: (reason: unknown) => any;
}