import {eventize, type EventizeApi} from '@spearwolf/eventize';
import {Loaded, MessageFromWorker, WorkerLoadTimeout} from '../constants.js';
import {waitForMessageOfType} from '../elements/waitForMessageOfType.js';
import type {ChangeTrailType} from '../types.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

export interface RemoteWorkerEnv extends EventizeApi {}

export class RemoteWorkerEnv implements IShadowObjectEnvProxy {
  static createWorker() {
    return new Worker(new URL('../shadow-ents.worker.js', import.meta.url), {type: 'module'});
  }

  #worker?: Worker;

  constructor() {
    eventize(this);
  }

  async start() {
    if (this.#worker) {
      console.warn('RemoteWorkerEnv: already started');
      return;
    }

    const worker = (this.#worker = RemoteWorkerEnv.createWorker());

    try {
      await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout);

      worker.addEventListener('message', (event) => {
        this.emit(MessageFromWorker, event);
      });
    } catch (error) {
      console.error('RemoteWorkerEnv: failed to start', error);
      this.#worker = undefined;
      throw error;
    }
  }

  [MessageFromWorker](event: MessageEvent) {
    // TODO implement messageFromWorker
    console.log('RemoteWorkerEnv: message from worker', event);
  }

  applyChangeTrail(_data: ChangeTrailType): Promise<void> {
    // TODO implement applyChangeTrail
    return Promise.resolve();
  }

  async importScript(_url: string): Promise<void> {
    // TODO implement importScript
    return Promise.resolve();
  }

  destroy(): void {
    // TODO implement destroy
    //
    this.#worker?.terminate();
    this.#worker = undefined;
  }
}
