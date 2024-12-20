import {emit, onceAsync, retain} from '@spearwolf/eventize';
import {
  AppliedChangeTrail,
  ChangeTrail,
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  Loaded,
  MessageToView,
  WorkerChangeTrailTimeout,
  WorkerConfigureTimeout,
  WorkerDestroyTimeout,
  WorkerLoadTimeout,
} from '../constants.js';
import createWorker from '../create-worker.js';
import type {AppliedChangeTrailEvent, ChangeTrailType, ImportedModuleEvent, TransferablesType} from '../types.js';
import {CONSOLE_LOGGER, ConsoleLogger} from '../utils/ConsoleLogger.js';
import {toUrlString} from '../utils/toUrlString.js';
import {waitForMessageOfType} from '../utils/waitForMessageOfType.js';
import type {IShadowObjectEnvProxy} from './IShadowObjectEnvProxy.js';

const removeTransferables = (changeTrail: ChangeTrailType): TransferablesType | undefined => {
  let transferables: TransferablesType | undefined;

  if (changeTrail != null && Array.isArray(changeTrail)) {
    for (const changeItem of changeTrail) {
      if (changeItem.transferables) {
        if (!transferables) {
          transferables = changeItem.transferables;
        } else {
          transferables = [...transferables, ...changeItem.transferables];
        }
        delete changeItem.transferables;
      }
    }
  }

  return transferables;
};

export class RemoteWorkerEnv implements IShadowObjectEnvProxy {
  static WorkerLoaded = 'workerLoaded';

  #worker?: Worker;
  #isDestroyed = false;
  #changeTrailSerial = 0;

  readonly logger = new ConsoleLogger('RemoteWorkerEnv');

  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  get workerLoaded(): Promise<RemoteWorkerEnv> {
    return onceAsync<RemoteWorkerEnv>(this, RemoteWorkerEnv.WorkerLoaded);
  }

  constructor() {
    retain(this, RemoteWorkerEnv.WorkerLoaded);
  }

  async start(): Promise<void> {
    if (this.#worker) {
      if (this.logger.isWarn) {
        this.logger.warn('already started');
      }

      return this.workerLoaded.then((): void => {
        if (this.isDestroyed) {
          throw 'worker was destroyed';
        }
        return undefined;
      });
    }

    const worker = (this.#worker = createWorker());

    this.configureConsoleLogger(worker);

    try {
      await waitForMessageOfType(worker, Loaded, WorkerLoadTimeout);

      if (this.isDestroyed) {
        throw 'worker was destroyed';
      }

      worker.addEventListener('message', this.onMessageFromWorker.bind(this));

      queueMicrotask(() => {
        emit(this, RemoteWorkerEnv.WorkerLoaded, this);
      });
    } catch (error) {
      this.logger.error('failed to start', error);
      this.#worker = undefined;
      throw error;
    }
  }

  onMessageFromWorker(event: MessageEvent) {
    if (event.data?.type === MessageToView) {
      (this as IShadowObjectEnvProxy).onMessageToView?.(event.data.data);
    } else if (this.logger.isDebug) {
      this.logger.debug('message from worker', event);
    }
  }

  applyChangeTrail(changeTrail: ChangeTrailType, waitForConfirmation: boolean): Promise<void> {
    const transferables = removeTransferables(changeTrail);
    const message = {type: ChangeTrail, changeTrail} as any;

    const serial = ++this.#changeTrailSerial;
    if (waitForConfirmation) {
      message.serial = serial;
    }

    this.#worker.postMessage(message, transferables);

    if (waitForConfirmation) {
      return waitForMessageOfType(this.#worker, AppliedChangeTrail, WorkerChangeTrailTimeout, (data: AppliedChangeTrailEvent) => {
        if (data.error) throw data.error;
        return data.serial === serial;
      });
    } else {
      return Promise.resolve();
    }
  }

  importScript(url: URL | string): Promise<void> {
    url = toUrlString(url);
    this.#worker.postMessage({type: Configure, importModule: url});
    return waitForMessageOfType(this.#worker, ImportedModule, WorkerConfigureTimeout, (data: ImportedModuleEvent) => {
      if (data.error) throw data.error;
      return data.url === url;
    });
  }

  destroy(): void {
    if (!this.#worker) return;

    const worker = this.#worker;
    this.#worker = undefined;

    this.#isDestroyed = true;

    worker.postMessage({type: Destroy});

    waitForMessageOfType(worker, Destroyed, WorkerDestroyTimeout).finally(() => {
      worker.terminate();
    });
  }

  private configureConsoleLogger(worker: Worker) {
    const workerConfigKey = `${CONSOLE_LOGGER}.RemoteWorkerEnv.workerConfig`;
    const workerConfig = JSON.parse(localStorage.getItem(workerConfigKey) ?? '{}');

    if (this.logger.isInfo) {
      this.logger.info('load console-logger worker config', {localStorageKey: workerConfigKey, workerConfig});
    }

    worker.postMessage({
      type: CONSOLE_LOGGER,
      config: {
        ...ConsoleLogger.sharedConfig,
        enable: this.logger.isEnabled,
        ...workerConfig,
        ...(ConsoleLogger.isEnabled ? {} : {enable: false}),
      },
    });
  }
}
