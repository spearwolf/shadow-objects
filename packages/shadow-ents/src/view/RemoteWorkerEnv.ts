import {
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  Loaded,
  WorkerConfigureTimeout,
  WorkerDestroyTimeout,
  WorkerLoadTimeout,
} from '../constants.js';
import {waitForMessageOfType} from '../elements/waitForMessageOfType.js';
import type {ChangeTrailType} from '../types.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

export class RemoteWorkerEnv implements IShadowObjectEnvProxy {
  static createWorker() {
    return new Worker(new URL('../shadow-ents.worker.js', import.meta.url), {type: 'module'});
  }

  #worker?: Worker;

  async start() {
    if (this.#worker) {
      console.warn('RemoteWorkerEnv: already started');
      return;
    }

    const worker = (this.#worker = RemoteWorkerEnv.createWorker());

    try {
      await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout);
      worker.addEventListener('message', this.onMessageFromWorker.bind(this));
    } catch (error) {
      console.error('RemoteWorkerEnv: failed to start', error);
      this.#worker = undefined;
      throw error;
    }
  }

  onMessageFromWorker(event: MessageEvent) {
    // TODO implement onMessageFromWorker
    console.log('RemoteWorkerEnv: message from worker', event);
  }

  applyChangeTrail(_data: ChangeTrailType): Promise<void> {
    // TODO implement applyChangeTrail
    return Promise.resolve();
  }

  importScript(url: string): Promise<void> {
    this.#worker.postMessage({type: Configure, importModule: url});
    return waitForMessageOfType(this.#worker, ImportedModule, WorkerConfigureTimeout, (data: {url?: string}) => data.url === url);
  }

  destroy(): void {
    if (!this.#worker) return;

    const worker = this.#worker;
    this.#worker = undefined;

    worker.postMessage({type: Destroy});

    waitForMessageOfType(worker, Destroyed, WorkerDestroyTimeout).finally(() => {
      worker.terminate();
    });
  }
}
