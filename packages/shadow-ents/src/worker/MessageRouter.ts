import {
  AppliedChangeTrail,
  ChangeTrail,
  Configure,
  Destroy,
  Destroyed,
  ImportedModule,
  Init,
  MessageToView,
  Ready,
  ShadowObjectsExport,
} from '../constants.js';
import {Kernel, type MessageToViewEvent} from '../entities/Kernel.js';
import {shadowObjects} from '../entities/ShadowObject.js';
import {importModule} from '../entities/importModule.js';
import {toUrlString} from '../toUrlString.js';
import type {
  AppliedChangeTrailEvent,
  ImportedModuleEvent,
  ShadowObjectConstructor,
  ShadowObjectsModule,
  SyncEvent,
} from '../types.js';

// TODO(cleanup) remove InitPayloadData
interface InitPayloadData {
  importSrc?: string;
}

interface ConfigurePayloadData {
  importModule?: string;
}

export interface MessageRouterOptions {
  kernel?: Kernel;
  postMessage?: typeof self.postMessage;
}

export class MessageRouter {
  #importedModules: Set<ShadowObjectsModule> = new Set();

  kernel: Kernel;

  postMessage: typeof self.postMessage;

  constructor(options?: MessageRouterOptions) {
    this.kernel = options?.kernel ?? new Kernel();

    this.postMessage = options?.postMessage ?? self.postMessage.bind(self);

    this.kernel.on(MessageToView, 'onMessageToView', this);
  }

  route(event: MessageEvent) {
    switch (event.data.type) {
      case Init:
        // TODO(cleanup) remove Init event
        this.#onInit(event.data);
        break;

      case Configure:
        this.#configure(event.data);
        break;

      case ChangeTrail:
        this.#onChangeTrail(event.data);
        break;

      case Destroy:
        this.#onDestroy(event.data);
        break;

      default:
        console.warn('[MessageRouter] unknown message', event.data.type ?? event.data);
    }
  }

  onMessageToView(event: MessageToViewEvent) {
    const {transferables: transfer, ...data} = event;
    this.postMessage({type: MessageToView, data}, {transfer});
  }

  async #configure(data: ConfigurePayloadData) {
    try {
      const module = await import(/* @vite-ignore */ toUrlString(data.importModule));
      if (module[ShadowObjectsExport]) {
        await importModule(this.kernel, module[ShadowObjectsExport], this.#importedModules);
        this.postMessage({type: ImportedModule, url: data.importModule});
      } else {
        this.postMessage({
          type: ImportedModule,
          url: data.importModule,
          error: `module has no "${ShadowObjectsExport}" export`,
        } as ImportedModuleEvent);
      }
    } catch (error) {
      console.error('[MessageRouter] failed to import module', error);
      this.postMessage({type: ImportedModule, url: data.importModule, error: `${error}`} as ImportedModuleEvent);
    }
  }

  #onChangeTrail(data: SyncEvent) {
    // console.debug('[MessageRouter] parseChangeTrail', {data, kernel: this.kernel});

    try {
      this.kernel.run(data);
    } catch (error) {
      console.error('[MessageRouter] failed to apply change trail', error);
      this.postMessage({type: AppliedChangeTrail, serial: data.serial, error: error.toString()} as AppliedChangeTrailEvent);
    }

    if (data.serial) {
      this.postMessage({type: AppliedChangeTrail, serial: data.serial} as AppliedChangeTrailEvent);
    }
  }

  // TODO(cleanup) remove onInit
  #onInit(data: InitPayloadData) {
    // console.debug('[MessageRouter] on init', data);

    if ('importSrc' in data) {
      this.#loadScript(data.importSrc);
    } else {
      console.error('[MessageRouter] missing importSrc property!');
    }
  }

  #onDestroy(data: any) {
    console.debug('[MessageRouter] on destroy', data);
    this.kernel.off(this);
    this.#importedModules.clear();
    this.postMessage({type: Destroyed});
  }

  // TODO(cleanup) remove loadScript
  async #loadScript(src: string) {
    const mod = await import(/* @vite-ignore */ src);

    // console.debug('[MessageRouter] imported', vfxMod);

    if (typeof mod.onload === 'function') {
      mod.onload({
        shadowObjects: {
          define: (token: string, constructor: ShadowObjectConstructor) =>
            shadowObjects.define(token, constructor, this.kernel.registry),
        },
        kernel: this.kernel,
        registry: this.kernel.registry,
      });
    }

    this.postMessage({type: Ready});
  }
}
