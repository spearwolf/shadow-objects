import type {MessageToViewEvent} from '../shadow-objects.js';
import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  start(): Promise<void>;

  importScript(url: URL | string): Promise<void>;

  applyChangeTrail(data: ChangeTrailType, waitForConfirmation: boolean): Promise<void>;

  destroy(): void;

  /**
   * Called with a message on its way out of the Shadow Environment.
   * {@link ShadowEnv} installs it on every proxy it is given and takes it back off a proxy
   * it lets go -- one microtask after that proxy's `destroy()` has returned, so that what an
   * `onDestroy` hands to the view during the teardown still arrives.
   */
  onMessageToView?: (event: Omit<MessageToViewEvent, 'transferables'>) => any;

  /**
   * Called when the proxy has irrecoverably lost the environment it stands for.
   * {@link ShadowEnv} installs it on every proxy it is given and takes it back off a proxy
   * it lets go, the moment that proxy's `destroy()` has returned; an implementation
   * that cannot fail simply never calls it.
   */
  onProxyFailed?: (reason: unknown) => any;
}