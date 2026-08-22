import type {MessageToViewEvent} from '../shadow-objects.js';
import type {ChangeTrailType} from '../types.js';

export interface IShadowObjectEnvProxy {
  start(): Promise<void>;

  importScript(url: URL | string): Promise<void>;

  /**
   * Hand a change trail to the Shadow Environment behind this proxy.
   *
   * An implementation that can say how far the Kernel got before it stopped rejects with a
   * {@link ChangeTrailRefusedError}: its `appliedCount` names the length of the prefix the Kernel
   * applied, and {@link ShadowEnv} folds exactly that prefix into its bookkeeping and sends the
   * rest again with the next trail.
   *
   * Every other reason is read as "the whole trail counts as applied" -- a confirmation window
   * that ran out or a proxy that says nothing about its Kernel leaves an environment that may
   * well hold all of it, and a creation sent a second time to a Kernel that holds the entity is
   * refused, so a trail kept pending on a guess would come back to that refusal cycle after
   * cycle. An implementation that has always rejected with something else therefore keeps
   * behaving exactly as it did.
   *
   * @param waitForConfirmation whether the caller waits for the environment to confirm the trail.
   *   A proxy that can only report a refusal on the confirmed route says nothing about a trail
   *   sent without it -- {@link RemoteWorkerEnv} is one of those.
   */
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